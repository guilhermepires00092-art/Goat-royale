const socket = io();

// ===========================================
// COLE SUA LISTA CLIENT_WORDS AQUI
// ===========================================
const CLIENT_WORDS = [
    // ... SUAS PALAVRAS AQUI ...
    "ABATA", "ABOCA"
];

// Elementos
const screens = {
    login: document.getElementById('login-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    setup: document.getElementById('lobby-setup-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen')
};

// --- INICIALIZAÇÃO E LOGIN ---
fetch('/api/me')
    .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not logged');
    })
    .then(user => {
        updateUserDisplay(user);
        switchScreen('dashboard');
    })
    .catch(() => switchScreen('login'));

function updateUserDisplay(user) {
    document.getElementById('user-name').innerText = user.username;
    document.getElementById('user-avatar').src = user.avatar;
    document.getElementById('user-energy').innerText = user.energy;
}

// --- NAVEGAÇÃO DE TELAS ---
document.getElementById('btn-play-now').addEventListener('click', () => switchScreen('setup'));
document.getElementById('btn-back-dash').addEventListener('click', () => switchScreen('dashboard'));

function switchScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if(screens[name]) screens[name].classList.add('active');
}

// --- PERFIL E RANKING ---
document.getElementById('btn-view-profile').addEventListener('click', () => {
    fetch('/api/me').then(r=>r.json()).then(user => {
        document.getElementById('p-score').innerText = user.score;
        document.getElementById('p-wins').innerText = user.wins;
        document.getElementById('p-games').innerText = user.gamesPlayed;
        document.getElementById('profile-modal').classList.remove('hidden');
    });
});

document.getElementById('btn-view-leaderboard').addEventListener('click', () => {
    fetch('/api/leaderboard').then(r=>r.json()).then(players => {
        const list = document.getElementById('global-leaderboard-list');
        list.innerHTML = players.map((p, i) => `
            <li style="display:flex; justify-content:space-between; padding:8px;">
                <span>${i+1}. <img src="${p.avatar}" style="width:20px; border-radius:50%; vertical-align:middle"> ${p.username}</span>
                <strong>${p.score}</strong>
            </li>`).join('');
        document.getElementById('leaderboard-modal').classList.remove('hidden');
    });
});

window.closeModals = () => document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));

// --- CRIAÇÃO E ENTRADA EM SALAS ---
document.getElementById('btn-create-room').addEventListener('click', () => {
    const isPublic = document.getElementById('public-room-check').checked;
    socket.emit('createRoom', { isPublic });
});

document.getElementById('btn-join-room').addEventListener('click', () => {
    const code = document.getElementById('room-code-input').value;
    if(code) socket.emit('joinRoom', { roomId: code });
});

// Renderização da Lista de Salas (Estilo Card)
socket.on('updateRoomList', (rooms) => {
    const container = document.getElementById('room-list-items');
    if (!container) return;
    container.innerHTML = '';
    
    if (rooms.length === 0) {
        return container.innerHTML = '<p style="text-align:center; color:#666; padding:10px;">Nenhuma sala pública encontrada.</p>';
    }
    
    rooms.forEach(r => {
        const el = document.createElement('div');
        el.className = 'room-item';
        const modeBadge = r.gameMode === 'competitive' ? '🏆' : '⚔️';
        
        el.innerHTML = `
            <div class="room-info">
                <strong>${r.hostName}'s Room <span class="room-badge">${modeBadge}</span></strong>
                <span>${r.playerCount} / 10 Jogadores</span>
            </div>
            <div class="material-icons" style="color: #666;">arrow_forward_ios</div>
        `;
        
        el.onclick = () => {
            // Efeito visual
            el.style.transform = "scale(0.98)";
            setTimeout(() => el.style.transform = "scale(1)", 100);
            document.getElementById('room-code-input').value = r.id;
            socket.emit('joinRoom', { roomId: r.id });
        };
        container.appendChild(el);
    });
});

// --- LÓGICA DO LOBBY ---
socket.on('roomJoined', (data) => {
    currentRoomId = data.roomId;
    myPlayerId = data.playerId;
    switchScreen('lobby');
    document.getElementById('lobby-code').innerText = data.roomId;
    
    const hostControls = document.getElementById('host-controls');
    const waitingMsg = document.getElementById('waiting-msg');
    
    if(data.isHost) {
        hostControls.style.display = 'block';
        waitingMsg.style.display = 'none';
    } else {
        hostControls.style.display = 'none';
        waitingMsg.style.display = 'block';
    }
});

// Renderização dos Jogadores no Lobby (GRID)
socket.on('updatePlayerList', (players) => {
    // 1. Lobby Grid
    const lobbyList = document.getElementById('player-list-lobby');
    const countBadge = document.getElementById('player-count-badge');
    
    if (lobbyList) {
        // Atualiza contador se ele existir no HTML (adicionei no HTML acima)
        if (document.querySelector('.list-container h3')) {
             document.querySelector('.list-container h3').innerText = `JOGADORES (${players.length}/10)`;
        }

        lobbyList.innerHTML = players.map(p => {
            const hostBadge = p.isHost ? '<div class="host-badge">HOST</div>' : '';
            const avatarUrl = p.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'; 
            return `
            <div class="player-card ${p.isHost ? 'is-host' : ''}">
                <img src="${avatarUrl}" alt="Avatar">
                ${hostBadge}
                <span>${p.name}</span>
            </div>
            `;
        }).join('');
    }
    // 2. Game Scoreboard
    updateGameScoreboard(players);
});

document.getElementById('btn-start-game').addEventListener('click', () => {
    const mode = document.querySelector('input[name="game-mode"]:checked').value;
    socket.emit('startGame', { roomId: currentRoomId, gameMode: mode });
});

// --- LÓGICA DO JOGO ---
let currentRoomId = null;
let currentRow = 0;
let currentTile = 0;
let currentGuess = "";
let isGameActive = false;
let isRoundSolved = false;
let myPlayerId = null;

socket.on('gameStarted', () => {
    switchScreen('game');
    createGrid();
    chatInput.disabled = false;
    document.getElementById('btn-send-chat').disabled = false;
});

socket.on('newRound', (data) => {
    resetRoundUI(data.roundNumber, data.totalRounds);
    isGameActive = true;
    isRoundSolved = false;
});

socket.on('timerUpdate', (time) => document.getElementById('timer').innerText = time);

socket.on('guessResult', ({ guess, result }) => {
    paintRow(currentRow, guess, result);
    updateKeyboard(guess, result);
    if (result.every(r => r === 'correct')) {
        isRoundSolved = true;
        showMessage("VOCÊ ACERTOU!", "#22c55e");
    } else {
        currentRow++;
        currentTile = 0;
        currentGuess = "";
        if (currentRow >= 6) {
            isGameActive = false;
            showMessage("FIM DAS TENTATIVAS", "#e11d48");
        }
    }
});

socket.on('roundSuccess', (msg) => setTimeout(() => showMessage(msg, "#22c55e"), 1500));
socket.on('roundEnded', (word) => { isGameActive = false; if(!isRoundSolved) showMessage(`PALAVRA: ${word}`, "#fff"); });
socket.on('gameOver', (players) => {
    const overlay = document.getElementById('game-over-overlay');
    const list = document.getElementById('final-results');
    const title = document.getElementById('game-over-title');
    players.sort((a,b) => b.score - a.score);
    
    if(title) title.innerHTML = `<span style="color:#eab308">${players[0].name}</span> É O GOAT 🐐`;

    list.innerHTML = players.map((p,i) => `<div style="margin:10px; font-size:1.2rem">${i===0?'👑':`#${i+1}`} <strong>${p.name}</strong>: ${p.score} pts</div>`).join('');
    overlay.classList.remove('hidden');
});

// --- CHAT ---
let isChatVisible = true;
let silencedPlayers = new Set();
const chatContainer = document.getElementById('chat-container');
const chatInput = document.getElementById('chat-input');
const chatToggleBtn = document.getElementById('btn-toggle-chat');

chatToggleBtn.addEventListener('click', () => {
    isChatVisible = !isChatVisible;
    const icon = chatToggleBtn.querySelector('.material-icons');
    if(isChatVisible) {
        chatContainer.style.display = 'flex';
        icon.innerText = 'chat';
        chatToggleBtn.style.opacity = '1';
    } else {
        chatContainer.style.display = 'none';
        icon.innerText = 'chat_bubble_outline';
        chatToggleBtn.style.opacity = '0.5';
    }
});

window.toggleMute = function(playerId, btnElement) {
    if (playerId === myPlayerId) return;
    if (silencedPlayers.has(playerId)) {
        silencedPlayers.delete(playerId);
        btnElement.innerText = 'volume_up';
        btnElement.style.color = '#888';
    } else {
        silencedPlayers.add(playerId);
        btnElement.innerText = 'volume_off';
        btnElement.style.color = '#e11d48';
    }
};

socket.on('chatMessage', (data) => {
    if (silencedPlayers.has(data.playerId)) return;
    const chatBox = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-usr-msg';
    let muteControl = data.playerId !== myPlayerId ? `<span class="material-icons mute-btn" onclick="toggleMute('${data.playerId}', this)">volume_up</span>` : '';
    div.innerHTML = `${muteControl} <span class="chat-name">${data.playerName}:</span> ${data.msg}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
});

function sendChatMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    socket.emit('chatMessage', { roomId: currentRoomId, msg: msg });
    chatInput.value = "";
    chatInput.focus();
}
document.getElementById('btn-send-chat').addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });

// --- UTILS DO JOGO ---
function createGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    for(let i=0; i<6; i++) {
        const row = document.createElement('div');
        row.className = 'grid-row';
        for(let j=0; j<5; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i}-${j}`;
            row.appendChild(tile);
        }
        grid.appendChild(row);
    }
    createKeyboard();
}

function createKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = `
    <div class="row">${'QWERTYUIOP'.split('').map(k=>`<button data-key="${k}">${k}</button>`).join('')}</div>
    <div class="row">${'ASDFGHJKL'.split('').map(k=>`<button data-key="${k}">${k}</button>`).join('')}</div>
    <div class="row"><button data-key="ENTER" class="wide-key action-btn">ENTER</button>${'ZXCVBNM'.split('').map(k=>`<button data-key="${k}">${k}</button>`).join('')}<button data-key="BACKSPACE" class="wide-key action-btn"><span class="material-icons">backspace</span></button></div>
    `;
    document.querySelectorAll('#keyboard button').forEach(btn => {
        btn.onclick = (e) => { e.preventDefault(); handleInput(btn.dataset.key); };
    });
}

function resetRoundUI(round, total) {
    currentRow = 0; currentTile = 0; currentGuess = "";
    document.getElementById('round-display').innerText = `${round}/${total}`;
    document.getElementById('message-area').style.opacity = '0';
    document.querySelectorAll('.tile').forEach(t => { t.innerText = ''; t.className = 'tile'; t.style.animation = 'none'; });
    createKeyboard();
}

function showMessage(msg, color) {
    const m = document.getElementById('message-area');
    m.innerText = msg; m.style.color = color; m.style.opacity = '1';
}

function handleInput(key) {
    if (!isGameActive || isRoundSolved) return;
    if (key === 'ENTER') return submitGuess();
    if (key === 'BACKSPACE') {
        if (currentTile > 0) {
            currentTile--; currentGuess = currentGuess.slice(0, -1);
            const t = document.getElementById(`tile-${currentRow}-${currentTile}`);
            t.innerText = ''; t.classList.remove('filled');
        }
        return;
    }
    if (currentTile < 5 && key.length === 1 && /[A-Z]/.test(key)) {
        const t = document.getElementById(`tile-${currentRow}-${currentTile}`);
        t.innerText = key; t.classList.add('filled');
        currentGuess += key; currentTile++;
    }
}

function submitGuess() {
    if (currentGuess.length !== 5) { showMessage("Muito curta", "#eab308"); setTimeout(()=>document.getElementById('message-area').style.opacity='0', 1500); return; }
    if (!CLIENT_WORDS.includes(currentGuess)) { showMessage("Palavra inválida", "#e11d48"); setTimeout(()=>document.getElementById('message-area').style.opacity='0', 1500); return; }
    socket.emit('submitGuess', { roomId: currentRoomId, guess: currentGuess });
}

function paintRow(row, guess, result) {
    for(let i=0; i<5; i++) {
        const t = document.getElementById(`tile-${row}-${i}`);
        setTimeout(() => { t.classList.add(result[i]); t.style.animation = "pop 0.3s ease"; }, i*150);
    }
}

function updateKeyboard(guess, result) {
    for(let i=0; i<5; i++) {
        const k = document.querySelector(`button[data-key="${guess[i]}"]`);
        if(k) {
            if(result[i] === 'correct') k.className = 'correct';
            else if(result[i] === 'present' && !k.classList.contains('correct')) k.className = 'present';
            else if(result[i] === 'absent' && !k.classList.contains('correct') && !k.classList.contains('present')) k.className = 'absent';
        }
    }
}

function updateGameScoreboard(players) {
    const list = document.getElementById('live-score-list');
    players.sort((a,b) => b.score - a.score);
    list.innerHTML = players.map((p,i) => `<li><span>${i+1}. ${p.name}</span><span style="color:#eab308">${p.score}</span></li>`).join('');
}

document.addEventListener('keydown', (e) => {
    if (document.activeElement === chatInput) return;
    const key = e.key.toUpperCase();
    if(key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) handleInput(key);
});

// Logout/Leave Logic
document.getElementById('btn-leave-match').addEventListener('click', () => document.getElementById('confirm-leave-overlay').classList.remove('hidden'));
document.getElementById('btn-cancel-leave').addEventListener('click', () => document.getElementById('confirm-leave-overlay').classList.add('hidden'));
document.getElementById('btn-confirm-leave').addEventListener('click', () => {
    document.getElementById('confirm-leave-overlay').classList.add('hidden');
    socket.emit('leaveMatch', currentRoomId);
});
socket.on('userDataUpdate', (user) => updateUserDisplay(user));
socket.on('matchLeft', () => window.location.reload());
socket.on('error', (msg) => alert(msg));
