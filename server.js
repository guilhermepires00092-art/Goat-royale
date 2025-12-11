require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);
const io = new Server(server, {
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// === LIMITES DE SEGURANÇA ===
const MAX_GLOBAL_PLAYERS = 500; 
const MAX_ROOMS = 50;
const ROUND_TIME = 45; 
const TOTAL_ROUNDS = 10;

// ===========================================================================
// ÁREA DE COLAGEM DA LISTA DE PALAVRAS (SERVER)
// ===========================================================================
const WORDS = [
    // >>> COLE AQUI A SUA LISTA GIGANTE <<<
    "ABATA", "ABOCA" 
];

// === 1. CONEXÃO MONGODB ===
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Conectado'))
    .catch(err => console.error('❌ Erro Mongo:', err));

// === 2. MODELO DE USUÁRIO ===
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    username: String,
    avatar: String,
    score: { type: Number, default: 0 },
    // Alterado: Padrão 5 energias
    energy: { type: Number, default: 5 }, 
    wins: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    lastIp: String,
    // Novo campo para controlar o reset diário
    lastDailyLogin: { type: Date, default: Date.now }, 
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// === 3. PASSPORT ===
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.create({
                googleId: profile.id,
                username: profile.displayName,
                avatar: profile.photos[0].value,
                energy: 5 // Começa com 5
            });
        }
        return done(null, user);
    } catch (err) { return done(err, null); }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id).then(u => done(null, u)));

// === 4. MIDDLEWARES ===
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 24 * 60 * 60 * 1000, secure: true, sameSite: 'none' }
});

const loginLimiter = rateLimit({
    windowMs: 60 * 1000, max: 10, message: "Muitas tentativas.",
    standardHeaders: true, legacyHeaders: false,
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket, next) => {
    if (socket.request.user) next();
    else next(new Error('unauthorized'));
});

// Rotas
app.use('/auth/google', loginLimiter, (req, res, next) => {
    if (req.user) return next(); 
    if (io.engine.clientsCount >= MAX_GLOBAL_PLAYERS) return res.status(503).send('Servidor Lotado');
    next();
});
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => res.redirect('/'));
app.get('/auth/logout', (req, res, next) => { req.logout(err => { if(err) return next(err); res.redirect('/'); }); });
app.get('/api/me', (req, res) => { if (!req.user) return res.status(401).json({ error: 'Not logged' }); res.json(req.user); });
app.get('/api/leaderboard', async (req, res) => {
    try { const players = await User.find().sort({ score: -1 }).limit(20).select('username score avatar wins'); res.json(players); } 
    catch(e) { res.status(500).json([]); }
});

// Estado Global
const rooms = {};

function generateRoomId() { return Math.floor(100000 + Math.random() * 900000).toString(); }

function emitRoomList() {
    const availableRooms = Object.values(rooms)
        .filter(r => r.isPublic && Object.keys(r.players).length < r.maxPlayers && r.state === 'LOBBY')
        .map(r => ({
            id: r.id, hostName: r.players[r.host]?.name || '?', playerCount: Object.keys(r.players).length,
            maxPlayers: r.maxPlayers, gameMode: r.gameMode
        }));
    io.emit('updateRoomList', availableRooms);
}

function emitPlayerUpdates(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const list = Object.values(room.players);
    io.to(roomId).emit('updatePlayerList', list);
    io.to(roomId).emit('updateScoreboard', list);
    emitRoomList();
}

// === LÓGICA DE RESET DIÁRIO ===
async function checkDailyReset(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        const now = new Date();
        const lastLogin = new Date(user.lastDailyLogin);
        
        // Verifica se é um dia diferente (comparando dia, mês e ano)
        const isDifferentDay = 
            now.getDate() !== lastLogin.getDate() ||
            now.getMonth() !== lastLogin.getMonth() ||
            now.getFullYear() !== lastLogin.getFullYear();

        if (isDifferentDay) {
            // Reseta para 5 se tiver menos que 5
            // Se o cara comprou energia e tem 10, não tira dele.
            if (user.energy < 5) {
                user.energy = 5;
            }
            user.lastDailyLogin = now;
            await user.save();
            console.log(`Reset diário para ${user.username}: Energia ajustada.`);
        } else {
            // Só atualiza o login se for mesmo dia
            user.lastDailyLogin = now;
            await user.save();
        }
        return user;
    } catch (e) {
        console.error("Erro no daily reset:", e);
        return null;
    }
}


// === SOCKET LOGIC ===
io.on('connection', async (socket) => {
    const currentConnections = io.engine.clientsCount;
    if (currentConnections > MAX_GLOBAL_PLAYERS) {
        socket.emit('error', 'Servidor lotado!');
        socket.disconnect(true);
        return;
    }

    const sessionUser = socket.request.user;
    if(!sessionUser) { socket.disconnect(); return; }

    // Roda a verificação diária ao conectar
    const user = await checkDailyReset(sessionUser._id);
    if (!user) { socket.disconnect(); return; }

    console.log(`+1 Jogador: ${user.username} (Energia: ${user.energy})`);
    socket.emit('userDataUpdate', user);
    emitRoomList();

    // --- CRIAR SALA (ATUALIZADO COM TAMANHO VARIÁVEL) ---
    socket.on('createRoom', async ({ isPublic, roomSize }) => {
        if (Object.keys(rooms).length >= MAX_ROOMS) return socket.emit('error', 'Limite de salas.');
        
        // Verifica energia novamente no banco para garantir
        const dbUser = await User.findById(user._id);
        if (dbUser.energy < 1) return socket.emit('error', 'Sem energia!');

        // Valida tamanho da sala (mínimo 2, máximo 20)
        let limit = parseInt(roomSize);
        if (isNaN(limit) || limit < 2) limit = 2;
        if (limit > 20) limit = 20;

        const roomId = generateRoomId();
        rooms[roomId] = {
            id: roomId, state: 'LOBBY', players: {}, host: socket.id,
            currentRound: 0, currentWord: "", timer: null, timeLeft: 0,
            solversCount: 0, 
            isPublic: !!isPublic, 
            maxPlayers: limit, // Usa o limite definido pelo anfitrião
            gameMode: 'default'
        };
        joinRoomLogic(socket, roomId, dbUser, true);
    });

    socket.on('joinRoom', async ({ roomId }) => {
        const dbUser = await User.findById(user._id);
        if (dbUser.energy < 1) return socket.emit('error', 'Sem energia!');
        const room = rooms[roomId];
        if (!room || room.state !== 'LOBBY' || Object.keys(room.players).length >= room.maxPlayers) return socket.emit('error', 'Erro ao entrar (Cheia ou em jogo).');
        joinRoomLogic(socket, roomId, dbUser, false);
    });

    function joinRoomLogic(socket, roomId, dbUser, isHost) {
        const room = rooms[roomId];
        socket.join(roomId);
        room.players[socket.id] = {
            id: socket.id, dbId: dbUser._id, name: dbUser.username, avatar: dbUser.avatar,
            roomId: roomId, isHost: isHost, score: 0, wins: 0, solvedRound: false, roundAttempts: 0
        };
        socket.emit('roomJoined', { roomId, isHost, playerId: socket.id });
        emitPlayerUpdates(roomId);
    }

    // --- FUNÇÃO DE SAÍDA (HERANÇA DE HOST) ---
    async function handlePlayerExit(roomId, socketId) {
        const room = rooms[roomId];
        if (!room || !room.players[socketId]) return;

        const player = room.players[socketId];
        const wasHost = player.isHost;

        // Desconta energia se saiu no meio
        if (room.state === 'PLAYING') {
            await User.findByIdAndUpdate(player.dbId, { $inc: { energy: -1, gamesPlayed: 1 } });
            // Atualiza para o cliente saber que gastou
            const u = await User.findById(player.dbId);
            // Tenta enviar para o socket se ele ainda estiver "meio" conectado, ou ignora
            // O importante é o banco estar certo para a proxima vez
        }

        delete room.players[socketId];
        
        if (Object.keys(room.players).length === 0) {
            clearInterval(room.timer);
            delete rooms[roomId];
            emitRoomList();
        } else {
            if (wasHost) {
                const remainingIds = Object.keys(room.players);
                const nextHostId = remainingIds[0];
                room.players[nextHostId].isHost = true;
                room.host = nextHostId;
                io.to(nextHostId).emit('youAreHost'); 
            }
            emitPlayerUpdates(roomId);
        }
    }

    socket.on('chatMessage', ({ roomId, msg }) => {
        const room = rooms[roomId];
        if(room && room.players[socket.id]) {
            io.to(roomId).emit('chatMessage', { playerId: room.players[socket.id].dbId, playerName: room.players[socket.id].name, msg: msg.substring(0, 100) });
        }
    });

    socket.on('startGame', ({ roomId, gameMode }) => {
        const room = rooms[roomId];
        if (!room || room.host !== socket.id) return;
        if (Object.keys(room.players).length < 2) return socket.emit('error', 'Mínimo 2 jogadores.');
        room.gameMode = gameMode; room.state = 'PLAYING';
        io.to(roomId).emit('gameStarted', { gameMode });
        emitRoomList();
        startRound(roomId);
    });

    socket.on('submitGuess', async ({ roomId, guess }) => {
        const room = rooms[roomId];
        if (!room || room.state !== 'PLAYING') return;
        const p = room.players[socket.id];
        if (p.solvedRound || (WORDS.length > 0 && !WORDS.includes(guess))) return;

        p.roundAttempts++;
        const result = calculateWordleResult(guess, room.currentWord);
        const isCorrect = result.every(r => r === 'correct');
        socket.emit('guessResult', { guess, result });

        if (isCorrect) {
            p.solvedRound = true; room.solversCount++;
            let points = 0;
            if (room.gameMode === 'competitive') {
                points = Math.max(1, 11 - p.roundAttempts);
                p.score += points;
                User.findByIdAndUpdate(p.dbId, { $inc: { score: points } }).exec();
                io.to(roomId).emit('roundSuccess', `${p.name} VENCEU! (+${points})`);
                emitPlayerUpdates(roomId);
                clearInterval(room.timer);
                io.to(roomId).emit('roundEnded', room.currentWord);
                setTimeout(() => startRound(roomId), 5000);
            } else {
                points = Math.max(1, 11 - room.solversCount);
                p.score += points;
                User.findByIdAndUpdate(p.dbId, { $inc: { score: points } }).exec();
                socket.emit('roundSuccess', `+${points} PONTOS!`);
                emitPlayerUpdates(roomId);
                if (Object.values(room.players).every(pl => pl.solvedRound)) room.timeLeft = 2;
            }
        }
    });

    socket.on('leaveMatch', async (roomId) => {
        await handlePlayerExit(roomId, socket.id);
        socket.leave(roomId);
        socket.emit('matchLeft');
        const updatedUser = await User.findById(user._id);
        socket.emit('userDataUpdate', updatedUser);
    });

    socket.on('disconnect', async () => {
        for (const rid in rooms) {
            if (rooms[rid].players[socket.id]) {
                await handlePlayerExit(rid, socket.id);
                break;
            }
        }
    });
});

function startRound(roomId) {
    const room = rooms[roomId];
    if(!room) return;
    if (room.currentRound >= TOTAL_ROUNDS) { endGame(roomId); return; }
    room.currentRound++;
    room.currentWord = WORDS.length > 0 ? WORDS[Math.floor(Math.random() * WORDS.length)] : "TERMO";
    room.timeLeft = ROUND_TIME; room.solversCount = 0;
    Object.values(room.players).forEach(p => { p.solvedRound = false; p.roundAttempts = 0; });
    io.to(roomId).emit('newRound', { roundNumber: room.currentRound, totalRounds: TOTAL_ROUNDS, gameMode: room.gameMode });
    clearInterval(room.timer);
    room.timer = setInterval(() => {
        room.timeLeft--;
        io.to(roomId).emit('timerUpdate', room.timeLeft);
        if (room.timeLeft <= 0) { clearInterval(room.timer); io.to(roomId).emit('roundEnded', room.currentWord); setTimeout(() => startRound(roomId), 5000); }
    }, 1000);
}

async function endGame(roomId) {
    const room = rooms[roomId];
    if(!room) return;
    room.state = 'ENDED';
    const players = Object.values(room.players).sort((a,b) => b.score - a.score);
    if(players.length > 0) await User.findByIdAndUpdate(players[0].dbId, { $inc: { wins: 1 } });
    io.to(roomId).emit('gameOver', players);
    delete rooms[roomId];
    emitRoomList();
}

function calculateWordleResult(guess, target) {
    const res = Array(5).fill('absent');
    const targetArr = target.split(''); const guessArr = guess.split('');
    const targetFreq = {};
    targetArr.forEach(c => targetFreq[c] = (targetFreq[c] || 0) + 1);
    guessArr.forEach((c, i) => { if (c === targetArr[i]) { res[i] = 'correct'; targetFreq[c]--; } });
    guessArr.forEach((c, i) => { if (res[i] !== 'correct' && targetFreq[c] > 0) { res[i] = 'present'; targetFreq[c]--; } });
    return res;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
