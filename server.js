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

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server);

// === 1. CONEXÃO MONGODB ===
// Importante: O erro pode estar aqui se a senha no .env estiver errada.
// Verifique os logs do Render para ver se aparece "Erro Mongo".
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Conectado'))
    .catch(err => console.error('❌ Erro Mongo:', err));

// === 2. MODELO DE USUÁRIO ===
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    username: String,
    avatar: String,
    score: { type: Number, default: 0 },
    energy: { type: Number, default: 10 },
    wins: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    lastIp: String,
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// === 3. CONFIGURAÇÃO PASSPORT (LOGIN GOOGLE) ===
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
                energy: 10
            });
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id).then(u => done(null, u)));

// === 4. MIDDLEWARES (SESSÃO E ESTÁTICOS) ===
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
});

// Servir a pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar Sessão e Passport
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Integração Socket.IO com Sessão
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

// Middleware de Socket: Só permite conexão se logado (ou trata erro depois)
io.use((socket, next) => {
    if (socket.request.user) {
        next();
    } else {
        // Permite conexão para redirecionar no front, mas o ideal é bloquear
        // next(new Error('unauthorized')); 
        // Vamos deixar passar e o front redireciona se não tiver user na API
        next(); 
    }
});

// === 5. ROTAS DE AUTENTICAÇÃO (ESSENCIAIS PARA O ERRO 'CANNOT GET') ===

// Inicia o login
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

// Retorno do Google
app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/'); // Volta para a home logado
    }
);

// Sair
app.get('/auth/logout', (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/');
    });
});

// API: Dados do Usuário
app.get('/api/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not logged in' });
    res.json(req.user);
});

// API: Ranking
app.get('/api/leaderboard', async (req, res) => {
    try {
        const players = await User.find().sort({ score: -1 }).limit(20).select('username score avatar wins');
        res.json(players);
    } catch (e) {
        res.status(500).json({ error: 'Erro ranking' });
    }
});

// === 6. CONFIGURAÇÕES DO JOGO E LISTA DE PALAVRAS ===
const ROUND_TIME = 45;
const TOTAL_ROUNDS = 10;
const MAX_ROOMS = 20;

// ==================================================================
// >>> COLE AQUI A SUA LISTA GIGANTE DE PALAVRAS (MUITO IMPORTANTE) <<<
// ==================================================================
const WORDS = [
   "ABATA", "ABOCA", "ABRIR" // ... (Cole o resto aqui)
];

const rooms = {};

function generateRoomId() { return Math.floor(100000 + Math.random() * 900000).toString(); }

function emitRoomList() {
    const availableRooms = Object.values(rooms)
        .filter(r => r.isPublic && Object.keys(r.players).length < r.maxPlayers && r.state === 'LOBBY')
        .map(r => ({
            id: r.id,
            hostName: r.players[r.host]?.name || '?',
            playerCount: Object.keys(r.players).length,
            maxPlayers: r.maxPlayers,
            gameMode: r.gameMode
        }));
    io.emit('updateRoomList', availableRooms);
}

function emitPlayerUpdates(roomId) {
    const room = rooms[roomId];
    if(!room) return;
    const list = Object.values(room.players);
    io.to(roomId).emit('updatePlayerList', list);
    io.to(roomId).emit('updateScoreboard', list);
    emitRoomList();
}

// === 7. LÓGICA DE SOCKET (JOGO) ===
io.on('connection', async (socket) => {
    const user = socket.request.user;
    
    // Se não tiver usuário na sessão (não logado), não deixa jogar
    if (!user) {
        socket.disconnect();
        return;
    }

    console.log(`Conectado: ${user.username}`);
    emitRoomList();

    socket.on('createRoom', async ({ isPublic }) => {
        const dbUser = await User.findById(user._id);
        if (dbUser.energy < 1) return socket.emit('error', 'Sem energia!');
        if (Object.keys(rooms).length >= MAX_ROOMS) return socket.emit('error', 'Servidor cheio.');

        const roomId = generateRoomId();
        rooms[roomId] = {
            id: roomId, state: 'LOBBY', players: {}, host: socket.id,
            currentRound: 0, currentWord: "", timer: null, timeLeft: 0,
            solversCount: 0, isPublic: !!isPublic, maxPlayers: 10, gameMode: 'default'
        };
        joinRoomLogic(socket, roomId, dbUser, true);
    });

    socket.on('joinRoom', async ({ roomId }) => {
        const dbUser = await User.findById(user._id);
        if (dbUser.energy < 1) return socket.emit('error', 'Sem energia!');
        const room = rooms[roomId];
        if (!room || room.state !== 'LOBBY' || Object.keys(room.players).length >= room.maxPlayers) {
            return socket.emit('error', 'Erro ao entrar.');
        }
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

    socket.on('chatMessage', ({ roomId, msg }) => {
        const room = rooms[roomId];
        if(room && room.players[socket.id]) {
            io.to(roomId).emit('chatMessage', {
                playerId: room.players[socket.id].dbId,
                playerName: room.players[socket.id].name,
                msg: msg
            });
        }
    });

    socket.on('startGame', ({ roomId, gameMode }) => {
        const room = rooms[roomId];
        if (!room || room.host !== socket.id) return;
        if (Object.keys(room.players).length < 2) return socket.emit('error', 'Mínimo 2 jogadores.');
        
        room.gameMode = gameMode;
        room.state = 'PLAYING';
        io.to(roomId).emit('gameStarted', { gameMode });
        emitRoomList();
        startRound(roomId);
    });

    socket.on('submitGuess', async ({ roomId, guess }) => {
        const room = rooms[roomId];
        if (!room || room.state !== 'PLAYING') return;
        const p = room.players[socket.id];
        if (p.solvedRound) return;
        
        if (WORDS.length > 0 && !WORDS.includes(guess)) return;

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
                await User.findByIdAndUpdate(p.dbId, { $inc: { score: points } });
                io.to(roomId).emit('roundSuccess', `${p.name} VENCEU! (+${points})`);
                emitPlayerUpdates(roomId);
                clearInterval(room.timer);
                io.to(roomId).emit('roundEnded', room.currentWord);
                setTimeout(() => startRound(roomId), 5000);
            } else {
                points = Math.max(1, 11 - room.solversCount);
                p.score += points;
                await User.findByIdAndUpdate(p.dbId, { $inc: { score: points } });
                socket.emit('roundSuccess', `+${points} PONTOS!`);
                emitPlayerUpdates(roomId);
                if (Object.values(room.players).every(pl => pl.solvedRound)) room.timeLeft = 2;
            }
        }
    });

    socket.on('leaveMatch', async (roomId) => {
        const room = rooms[roomId];
        if (room && room.players[socket.id]) {
            const p = room.players[socket.id];
            if (room.state === 'PLAYING') {
                await User.findByIdAndUpdate(p.dbId, { $inc: { energy: -1, gamesPlayed: 1 } });
            }
            const wasHost = p.isHost;
            delete room.players[socket.id];
            socket.leave(roomId);
            socket.emit('matchLeft');
            
            const updatedUser = await User.findById(p.dbId);
            socket.emit('userDataUpdate', updatedUser);

            if (Object.keys(room.players).length === 0) {
                clearInterval(room.timer); delete rooms[roomId]; emitRoomList();
            } else {
                if(wasHost) room.players[Object.keys(room.players)[0]].isHost = true;
                emitPlayerUpdates(roomId);
            }
        }
    });

    socket.on('disconnect', () => {
        for (const rid in rooms) {
            if (rooms[rid].players[socket.id]) {
                delete rooms[rid].players[socket.id];
                if (Object.keys(rooms[rid].players).length === 0) {
                    clearInterval(rooms[rid].timer); delete rooms[rid]; emitRoomList();
                } else {
                    emitPlayerUpdates(rid);
                }
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
