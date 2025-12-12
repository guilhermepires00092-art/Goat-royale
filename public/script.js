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
// Configuração essencial para o Google aceitar o https do Render
app.set('trust proxy', 1);

const server = http.createServer(app);

// Configuração do Socket para estabilidade
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
    energy: { type: Number, default: 5 }, 
    wins: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    lastIp: String,
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
                energy: 5
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
    // ATENÇÃO: Envia a lista E o maxPlayers para o frontend corrigir o contador (Ex: 1/20)
    io.to(roomId).emit('updatePlayerList', list, room.maxPlayers);
    io.to(roomId).emit('updateScoreboard', list);
    emitRoomList();
}

async function checkDailyReset(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) return null;
        const now = new Date();
        const lastLogin = new Date(user.lastDailyLogin);
        const isDifferentDay = now.getDate() !== lastLogin.getDate() || now.getMonth() !== lastLogin.getMonth() || now.getFullYear() !== lastLogin.getFullYear();

        if (isDifferentDay) {
            if (user.energy < 5) user.energy = 5;
            user.lastDailyLogin = now;
            await user.save();
        } else {
            user.lastDailyLogin = now;
            await user.save();
        }
        return user;
    } catch (e) { return null; }
}

// === SOCKET LOGIC ===
io.on('connection', async (socket) => {
    const user = socket.request.user;
    if(!user || io.engine.clientsCount > MAX_GLOBAL_PLAYERS) { socket.disconnect(); return; }

    const dbUser = await checkDailyReset(user._id);
    if (!dbUser) { socket.disconnect(); return; }

    console.log(`+1 Jogador: ${dbUser.username}`);
    socket.emit('userDataUpdate', dbUser);
    emitRoomList();

    // --- FUNÇÃO DE SAÍDA / HERANÇA ---
    async function handlePlayerExit(roomId, socketId) {
        const room = rooms[roomId];
        if (!room || !room.players[socketId]) return;

        const player = room.players[socketId];
        const wasHost = player.isHost;

        // Desconta energia se saiu durante o jogo
        if (room.state === 'PLAYING' || room.state === 'TIEBREAKER') {
            await User.findByIdAndUpdate(player.dbId, { $inc: { energy: -1, gamesPlayed: 1 } });
        }

        delete room.players[socketId];
        
        // Se sala vazia, deleta.
        if (Object.keys(room.players).length === 0) {
            clearInterval(room.timer);
            delete rooms[roomId];
            emitRoomList();
        } else {
            // Herança de Host
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

    socket.on('createRoom', async ({ isPublic, roomSize }) => {
        if (Object.keys(rooms).length >= MAX_ROOMS) return socket.emit('error', 'Limite de salas.');
        const u = await User.findById(user._id);
        if (u.energy < 1) return socket.emit('error', 'Sem energia!');

        // Validação do tamanho da sala
        let limit = parseInt(roomSize);
        if (isNaN(limit) || limit < 2) limit = 2;
        if (limit > 20) limit = 20;

        const roomId = generateRoomId();
        rooms[roomId] = {
            id: roomId, state: 'LOBBY', players: {}, host: socket.id,
            currentRound: 0, currentWord: "", timer: null, timeLeft: 0,
            solversCount: 0, isPublic: !!isPublic, 
            maxPlayers: limit, // Define o limite escolhido
            gameMode: 'default'
        };
        joinRoomLogic(socket, roomId, u, true);
    });

    socket.on('joinRoom', async ({ roomId }) => {
        const u = await User.findById(user._id);
        if (u.energy < 1) return socket.emit('error', 'Sem energia!');
        const room = rooms[roomId];
        // Permite entrar se estiver no LOBBY ou ENDED (para jogar novamente)
        if (!room || (room.state !== 'LOBBY' && room.state !== 'ENDED') || Object.keys(room.players).length >= room.maxPlayers) return socket.emit('error', 'Erro ao entrar.');
        joinRoomLogic(socket, roomId, u, false);
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
        if (!room) return;
        if (room.state !== 'PLAYING' && room.state !== 'TIEBREAKER') return;

        const player = room.players[socket.id];
        // Desempate: Só quem empatou joga
        if (room.state === 'TIEBREAKER' && !room.tiedPlayersIds.includes(socket.id)) return;

        if (player.solvedRound) return;
        if (WORDS.length > 0 && !WORDS.includes(guess)) return;

        player.roundAttempts++;
        const result = calculateWordleResult(guess, room.currentWord);
        const isCorrect = result.every(r => r === 'correct');

        socket.emit('guessResult', { guess, result });

        if (isCorrect) {
            player.solvedRound = true; room.solversCount++;
            let points = 0;

            if (room.state === 'TIEBREAKER') {
                player.score += 1;
                io.to(roomId).emit('roundSuccess', `${player.name} É O GOAT SUPREMO!`);
                endGameFinal(roomId);
                return;
            }

            if (room.gameMode === 'competitive') {
                points = Math.max(1, 11 - player.roundAttempts);
                player.score += points;
                User.findByIdAndUpdate(player.dbId, { $inc: { score: points } }).exec();
                io.to(roomId).emit('roundSuccess', `${player.name} VENCEU A RODADA! (+${points})`);
                emitPlayerUpdates(roomId);
                clearInterval(room.timer);
                io.to(roomId).emit('roundEnded', room.currentWord);
                setTimeout(() => startRound(roomId), 5000);
            } else {
                points = Math.max(1, 11 - room.solversCount);
                player.score += points;
                User.findByIdAndUpdate(player.dbId, { $inc: { score: points } }).exec();
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

    if (room.currentRound >= TOTAL_ROUNDS) { checkGameEnd(roomId); return; }

    room.currentRound++;
    room.currentWord = WORDS.length > 0 ? WORDS[Math.floor(Math.random() * WORDS.length)] : "TERMO";
    room.timeLeft = ROUND_TIME; room.solversCount = 0;
    Object.values(room.players).forEach(p => { p.solvedRound = false; p.roundAttempts = 0; });
    
    setupTimer(room);
    io.to(roomId).emit('newRound', { roundNumber: room.currentRound, totalRounds: TOTAL_ROUNDS, gameMode: room.gameMode });
}

function setupTimer(room) {
    clearInterval(room.timer);
    room.timer = setInterval(() => {
        room.timeLeft--;
        io.to(room.id).emit('timerUpdate', room.timeLeft);
        if (room.timeLeft <= 0) {
            clearInterval(room.timer);
            io.to(room.id).emit('roundEnded', room.currentWord);
            if(room.state === 'TIEBREAKER') setTimeout(() => startTiebreaker(room.id), 5000);
            else setTimeout(() => startRound(room.id), 5000);
        }
    }, 1000);
}

function checkGameEnd(roomId) {
    const room = rooms[roomId];
    if(!room) return;
    const players = Object.values(room.players).sort((a,b) => b.score - a.score);

    if (players.length > 1 && players[0].score === players[1].score) {
        room.state = 'TIEBREAKER';
        const maxScore = players[0].score;
        room.tiedPlayersIds = players.filter(p => p.score === maxScore).map(p => p.id);
        io.to(roomId).emit('tiebreakerAlert', { tiedPlayersIds: room.tiedPlayersIds });
        setTimeout(() => startTiebreaker(roomId), 5000);
    } else {
        endGameFinal(roomId);
    }
}

function startTiebreaker(roomId) {
    const room = rooms[roomId];
    if(!room) return;
    room.currentRound++; 
    room.currentWord = WORDS.length > 0 ? WORDS[Math.floor(Math.random() * WORDS.length)] : "TERMO";
    room.timeLeft = ROUND_TIME; room.solversCount = 0;
    Object.values(room.players).forEach(p => { p.solvedRound = false; p.roundAttempts = 0; });
    setupTimer(room);
    io.to(roomId).emit('tiebreakerRoundStarted', { tiedPlayersIds: room.tiedPlayersIds });
}

async function endGameFinal(roomId) {
    const room = rooms[roomId];
    if(!room) return;
    
    // PERSISTÊNCIA DA SALA (Permite jogar novamente)
    room.state = 'LOBBY';
    room.currentRound = 0;
    room.solversCount = 0;
    room.tiedPlayersIds = [];
    clearInterval(room.timer);

    const players = Object.values(room.players).sort((a,b) => b.score - a.score);
    if(players.length > 0) await User.findByIdAndUpdate(players[0].dbId, { $inc: { wins: 1 } });
    
    io.to(roomId).emit('gameOver', players);
    
    // Reseta status para a próxima
    Object.values(room.players).forEach(p => { p.score = 0; p.solvedRound = false; p.roundAttempts = 0; });
    
    emitRoomList();
    setTimeout(() => {
        io.to(roomId).emit('returnToLobby');
        emitPlayerUpdates(roomId); // Atualiza o lobby com os jogadores que ficaram
    }, 5000);
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
