let socket; 
let myPlayerId = null;

const CLIENT_WORDS = [
    "ABATA", "ABOCA" // MESMA LISTA DO SERVER
];

// Elementos Globais
const screens = {
    login: document.getElementById('login-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    setup: document.getElementById('lobby-setup-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen')
};

const messageArea = document.getElementById('message-area');
const chatInput = document.getElementById('chat-input');
const chatToggleBtn = document.getElementById('btn-toggle-chat'); 
const chatContainer = document.getElementById('chat-container');

// ESTADO DO JOGO COM CURSOR
let currentRoomId = null;
let currentRow = 0;
let currentTile = 0; // Índice do cursor (0 a 4)
let currentGuessArr = ["", "", "", "", ""]; 
let isGameActive = false;
let isRoundSolved = false;
let silencedPlayers = new Set();
let isChatVisible = true;

// === 1. INICIALIZAÇÃO ===
fetch('/api/me')
    .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not logged');
    })
    .then(user => {
        updateUserDisplay(user);
        initializeSocket();
        switchScreen('dashboard');
    })
    .catch(() => {
        switchScreen('login');
    });

function updateUserDisplay(user) {
    document.getElementById('user-name').innerText = user.username;
    document.getElementById('user-avatar').src = user.avatar;
    document.getElementById('user-energy').innerText = user.energy;
}

// === 2. SOCKET ===
function initializeSocket() {
    socket = io();

    socket.on('updateRoomList', (rooms) => {
        const container = document.getElementById('room-list-items');
        if (!container) return;
        container.innerHTML = '';
        if (rooms.length === 0) return container.innerHTML = '<p style="text-align:center; color:#666; font-size:0.9rem;">Nenhuma sala pública.</p>';
        rooms.forEach(r => {
            const el = document.createElement('div');
            el.className = 'room-item';
            const modeBadge = r.gameMode === 'competitive' ? '🏆' : '⚔️';
            el.innerHTML = `<div class="room-info"><strong>${r.hostName}'s Room <span class="room-badge">${modeBadge}</span></strong><span>${r.playerCount} / ${r.maxPlayers} Jogadores</span></div><span class="material-icons" style="color:#666; font-size:1rem;">arrow_forward_ios</span>`;
            el.onclick = () => { document.getElementById('room-code-input').value = r.id; socket.emit('joinRoom', { roomId: r.id }); };
            container.appendChild(el);
        });
    });

    socket.on('roomJoined', (data) => {
        currentRoomId = data.roomId;
        myPlayerId = data.playerId;
        switchScreen('lobby');
        document.getElementById('lobby-code').innerText = data.roomId;
        document.getElementById('lobby-chat-messages').innerHTML = '<div style="color:var(--accent-red); font-style:italic;">Entrou na sala.</div>';
        
        const ctrl = document.getElementById('host-controls');
        const wait = document.getElementById('waiting-msg');
        
        if(data.isHost) { ctrl.style.display = 'block'; wait.style.display = 'none'; } 
        else { ctrl.style.display = 'none'; wait.style.display = 'block'; }
    });

    socket.on('updatePlayerList', (players, maxPlayers) => {
        const lobbyList = document.getElementById('player-list-lobby');
        if (document.getElementById('player-count-badge')) {
            const limit = maxPlayers || 10;
            document.getElementById('player-count-badge').innerText = `${players.length}/${limit}`;
        }
        if (lobbyList) {
            lobbyList.innerHTML = players.map(p => {
                const hostBadge = p.isHost ? '<div class="host-badge">HOST</div>' : '';
                const avatarUrl = p.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'; 
                return `<div class="player-card ${p.isHost?'is-host':''}"><img src="${avatarUrl}" alt="Avatar">${hostBadge}<span>${p.name}</span></div>`;
            }).join('');
        }
        
        const myData = players.find(p => p.id === socket.id);
        const hostControls = document.getElementById('host-controls');
        const waitingMsg = document.getElementById('waiting-msg');
        
        if (myData && myData.isHost) {
            if(hostControls) hostControls.style.display = 'block';
            if(waitingMsg) waitingMsg.style.display = 'none';
        } else {
            if(hostControls) hostControls.style.display = 'none';
            if(waitingMsg) waitingMsg.style.display = 'block';
        }
        updateGameScoreboard(players);
    });

    socket.on('youAreHost', () => alert("Você é o novo anfitrião!"));
    socket.on('returnToLobby', () => { isGameActive = false; isRoundSolved = false; switchScreen('lobby'); });
    
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
            currentGuessArr = ["", "", "", "", ""];
            updateActiveTile();
            if (currentRow >= 6) {
                isGameActive = false;
                showMessage("FIM DAS TENTATIVAS", "#e11d48");
            }
        }
    });

    socket.on('roundSuccess', (msg) => setTimeout(() => showMessage(msg, "#22c55e"), 1500));
    socket.on('roundEnded', (word) => { isGameActive = false; if(!isRoundSolved) showMessage(`PALAVRA: ${word}`, "#fff"); });

    socket.on('gameOver', (players) => {
        document.getElementById('tiebreaker-prep-modal').classList.add('hidden');
        document.getElementById('tiebreaker-wait-modal').classList.add('hidden');
        const overlay = document.getElementById('game-over-overlay');
        players.sort((a,b) => b.score - a.score);
        document.getElementById('game-over-title').innerHTML = `<span style="color:#eab308">${players[0].name}</span> É O GOAT 🐐`;
        document.getElementById('final-results').innerHTML = players.map((p,i) => `<div style="margin:10px; font-size:1.2rem">${i===0?'👑':`#${i+1}`} <strong>${p.name}</strong>: ${p.score} pts</div>`).join('');
        overlay.classList.remove('hidden');
    });

    socket.on('tiebreakerAlert', (data) => {
        isGameActive = false;
        if (data.tiedPlayersIds.includes(socket.id)) {
            const m = document.getElementById('tiebreaker-prep-modal'); m.classList.remove('hidden');
            let c = 5; const el = document.getElementById('tiebreaker-countdown');
            const i = setInterval(() => { c--; el.innerText = c; if(c<=0) { clearInterval(i); m.classList.add('hidden'); } }, 1000);
        } else {
            document.getElementById('tiebreaker-wait-modal').classList.remove('hidden');
        }
    });

    socket.on('tiebreakerRoundStarted', (data) => {
        document.getElementById('tiebreaker-wait-modal').classList.add('hidden');
        if (!data.tiedPlayersIds.includes(socket.id)) {
            isGameActive = false;
            showMessage("MORTE SÚBITA EM ANDAMENTO...", "#eab308");
        } else {
            isGameActive = true; isRoundSolved = false; resetRoundUI("EXTRA", "GOAT");
            showMessage("ACERTE PRIMEIRO!", "#e11d48");
        }
    });

    socket.on('userDataUpdate', (user) => updateUserDisplay(user));
    socket.on('matchLeft', () => window.location.reload());
    socket.on('connect_error', (err) => { if(err.message === "unauthorized") switchScreen('login'); });
    socket.on('error', (msg) => alert(msg));
    
    socket.on('chatMessage', (data) => {
        if (silencedPlayers.has(data.playerId)) return;
        const gb = document.getElementById('chat-messages');
        if (gb && document.getElementById('game-screen').classList.contains('active')) {
            const d = document.createElement('div'); d.className = 'chat-usr-msg';
            let m = data.playerId !== myPlayerId ? `<span class="material-icons mute-btn" onclick="toggleMute('${data.playerId}', this)">volume_up</span>` : '';
            d.innerHTML = `${m} <span class="chat-name">${data.playerName}:</span> ${data.msg}`;
            gb.appendChild(d); gb.scrollTop = gb.scrollHeight;
        }
        const lb = document.getElementById('lobby-chat-messages');
        if (lb && document.getElementById('lobby-screen').classList.contains('active')) {
            const d = document.createElement('div'); d.style.marginBottom = "4px";
            d.innerHTML = `<strong style="color:#eab308">${data.playerName}:</strong> ${data.msg}`;
            lb.appendChild(d); lb.scrollTop = lb.scrollHeight;
        }
    });
}

// === NAVEGAÇÃO ===
document.getElementById('btn-play-now').onclick = () => switchScreen('setup');
document.getElementById('btn-back-dash').onclick = () => switchScreen('dashboard');
document.getElementById('btn-leave-lobby').onclick = () => { if(confirm('Sair da sala?')) socket.emit('leaveMatch', currentRoomId); };

function switchScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if(screens[name]) screens[name].classList.add('active');
}

const roomSizeSlider = document.getElementById('room-size-slider');
if (roomSizeSlider) {
    roomSizeSlider.addEventListener('input', (e) => {
        document.getElementById('player-limit-display').innerText = e.target.value;
    });
}

// === PERFIL & RANKING (ATUALIZADO) ===
document.getElementById('btn-view-profile').onclick = () => {
    fetch('/api/me').then(r=>r.json()).then(user => {
        document.getElementById('p-score').innerText = user.score || 0;
        document.getElementById('p-wins').innerText = user.wins || 0;
        document.getElementById('p-games').innerText = user.gamesPlayed || 0;
        document.getElementById('profile-modal').classList.remove('hidden');
    }).catch(console.error);
};

document.getElementById('btn-view-leaderboard').onclick = () => {
    fetch('/api/leaderboard').then(r=>r.json()).then(players => {
        const list = document.getElementById('global-leaderboard-list');
        if(players.length === 0) {
            list.innerHTML = '<li style="text-align:center;color:#888;">Sem dados.</li>';
        } else {
            list.innerHTML = players.map((p, i) => `
                <li style="display:flex; justify-content:space-between; padding:8px;">
                    <span>
                        <strong style="color: #888; margin-right: 10px;">${i+1}.</strong>
                        <img src="${p.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'}" style="width:24px; border-radius:50%; vertical-align:middle; margin-right:5px;"> 
                        ${p.username}
                    </span>
                    <strong style="color:#eab308">${p.score}</strong>
                </li>`).join('');
        }
        document.getElementById('leaderboard-modal').classList.remove('hidden');
    }).catch(console.error);
};
window.closeModals = () => document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));

document.getElementById('btn-create-room').onclick = () => {
    const pub = document.getElementById('public-room-check').checked;
    const size = document.getElementById('room-size-slider').value;
    socket.emit('createRoom', { isPublic: pub, roomSize: size });
};
document.getElementById('btn-join-room').onclick = () => {
    const code = document.getElementById('room-code-input').value;
    if(code) socket.emit('joinRoom', { roomId: code });
};
document.getElementById('btn-start-game').onclick = () => {
    const mode = document.querySelector('input[name="game-mode"]:checked').value;
    socket.emit('startGame', { roomId: currentRoomId, gameMode: mode });
};
document.getElementById('btn-restart').onclick = () => { document.getElementById('game-over-overlay').classList.add('hidden'); switchScreen('lobby'); };

// Chat
const lobbyChatInput = document.getElementById('lobby-chat-input');
const lobbyChatBtn = document.getElementById('btn-send-lobby-chat');
chatToggleBtn.addEventListener('click', () => {
    isChatVisible = !isChatVisible;
    const icon = chatToggleBtn.querySelector('.material-icons');
    if(isChatVisible) { chatContainer.style.display = 'flex'; icon.innerText = 'chat'; chatToggleBtn.style.opacity = '1'; }
    else { chatContainer.style.display = 'none'; icon.innerText = 'chat_bubble_outline'; chatToggleBtn.style.opacity = '0.5'; }
});
window.toggleMute = (pid, btn) => {
    if(pid===myPlayerId) return;
    if(silencedPlayers.has(pid)) { silencedPlayers.delete(pid); btn.innerText='volume_up'; btn.style.color='#888'; }
    else { silencedPlayers.add(pid); btn.innerText='volume_off'; btn.style.color='#e11d48'; }
};
function sendMsg(input) { const m = input.value.trim(); if(!m) return; socket.emit('chatMessage', { roomId: currentRoomId, msg: m }); input.value = ""; input.focus(); }
document.getElementById('btn-send-chat').onclick = () => sendMsg(chatInput);
chatInput.onkeypress = (e) => { if(e.key==='Enter') sendMsg(chatInput); };
if(lobbyChatBtn) lobbyChatBtn.onclick = () => sendMsg(lobbyChatInput);
if(lobbyChatInput) lobbyChatInput.onkeypress = (e) => { if(e.key==='Enter') sendMsg(lobbyChatInput); };

// Leave Logic
const confirmLeaveModal = document.getElementById('confirm-leave-overlay');
document.getElementById('btn-leave-match').onclick = () => confirmLeaveModal.classList.remove('hidden');
document.getElementById('btn-cancel-leave').onclick = () => confirmLeaveModal.classList.add('hidden');
document.getElementById('btn-confirm-leave').onclick = () => { confirmLeaveModal.classList.add('hidden'); socket.emit('leaveMatch', currentRoomId); };

// === GRID E TECLADO (COM CURSOR / SELECT) ===

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
            // CLICK TO SELECT (RESTAURADO)
            tile.onclick = () => {
                if (i === currentRow && isGameActive) {
                    currentTile = j;
                    updateActiveTile();
                }
            };
            row.appendChild(tile);
        }
        grid.appendChild(row);
    }
    createKeyboard();
    updateActiveTile();
}

function createKeyboard() {
    const k = document.getElementById('keyboard');
    k.innerHTML = `<div class="row">${'QWERTYUIOP'.split('').map(k=>`<button data-key="${k}">${k}</button>`).join('')}</div><div class="row">${'ASDFGHJKL'.split('').map(k=>`<button data-key="${k}">${k}</button>`).join('')}</div><div class="row"><button data-key="ENTER" class="wide-key action-btn">ENTER</button>${'ZXCVBNM'.split('').map(k=>`<button data-key="${k}">${k}</button>`).join('')}<button data-key="BACKSPACE" class="wide-key action-btn"><span class="material-icons">backspace</span></button></div>`;
    document.querySelectorAll('#keyboard button').forEach(b => b.onclick = (e) => { e.preventDefault(); handleInput(b.dataset.key); });
}

function updateActiveTile() {
    document.querySelectorAll('.tile').forEach(t => t.classList.remove('active-input'));
    if (isGameActive && !isRoundSolved) {
        const active = document.getElementById(`tile-${currentRow}-${currentTile}`);
        if (active) active.classList.add('active-input');
    }
}

function resetRoundUI(r, t) {
    currentRow = 0; currentTile = 0; currentGuessArr = ["", "", "", "", ""];
    document.getElementById('round-display').innerText = `${r}/${t}`;
    document.getElementById('message-area').style.opacity = '0';
    document.querySelectorAll('.tile').forEach(e => { e.innerText = ''; e.className = 'tile'; e.style.animation = 'none'; e.classList.remove('correct','present','absent','filled','active-input'); });
    createKeyboard();
    updateActiveTile();
}

function showMessage(m, c) {
    const el = document.getElementById('message-area');
    el.innerText = m; el.style.color = c; el.style.opacity = '1';
}

function handleInput(key) {
    if (!isGameActive || isRoundSolved) return;

    if (key === 'ENTER') {
        const guess = currentGuessArr.join('');
        return submitGuess(guess);
    }

    if (key === 'BACKSPACE') {
        if (currentGuessArr[currentTile] === "") {
            if (currentTile > 0) currentTile--;
        }
        currentGuessArr[currentTile] = "";
        const t = document.getElementById(`tile-${currentRow}-${currentTile}`);
        t.innerText = "";
        t.classList.remove('filled');
        updateActiveTile();
        return;
    }

    if (key === 'ARROWLEFT') {
        if (currentTile > 0) currentTile--;
        updateActiveTile();
        return;
    }

    if (key === 'ARROWRIGHT') {
        if (currentTile < 4) currentTile++;
        updateActiveTile();
        return;
    }

    if (key.length === 1 && /[A-Z]/.test(key)) {
        currentGuessArr[currentTile] = key;
        const t = document.getElementById(`tile-${currentRow}-${currentTile}`);
        t.innerText = key;
        t.classList.add('filled');
        t.style.animation = "pop 0.1s";
        if (currentTile < 4) currentTile++;
        updateActiveTile();
    }
}

function submitGuess(guess) {
    if (guess.length !== 5) { showMessage("Muito curta", "#eab308"); setTimeout(()=>document.getElementById('message-area').style.opacity='0', 1500); return; }
    if (!CLIENT_WORDS.includes(guess)) { showMessage("Palavra inválida", "#e11d48"); setTimeout(()=>document.getElementById('message-area').style.opacity='0', 1500); return; }
    socket.emit('submitGuess', { roomId: currentRoomId, guess: guess });
}

function paintRow(r, g, res) {
    for(let i=0; i<5; i++) { const t = document.getElementById(`tile-${r}-${i}`); setTimeout(() => { t.classList.add(res[i]); t.style.animation = "pop 0.3s ease"; }, i*150); }
}

function updateKeyboard(g, res) {
    for(let i=0; i<5; i++) {
        const k = document.querySelector(`button[data-key="${g[i]}"]`);
        if(k) {
            if(res[i] === 'correct') k.className = 'correct';
            else if(res[i] === 'present' && !k.classList.contains('correct')) k.className = 'present';
            else if(res[i] === 'absent' && !k.classList.contains('correct') && !k.classList.contains('present')) k.className = 'absent';
        }
    }
}

function updateGameScoreboard(players) {
    const list = document.getElementById('live-score-list');
    if(!list) return;
    players.sort((a,b) => b.score - a.score);
    list.innerHTML = players.map((p,i) => {
        const avatarUrl = p.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
        return `<li><div style="display:flex;align-items:center;gap:8px"><span style="color:#888;font-size:0.8rem">#${i+1}</span><img src="${avatarUrl}" class="score-avatar"><span>${p.name}</span></div><span style="color:#eab308;font-weight:bold">${p.score}</span></li>`;
    }).join('');
}

document.addEventListener('keydown', (e) => {
    if (document.activeElement === chatInput || document.activeElement === lobbyChatInput) return;
    let k = e.key.toUpperCase();
    if(e.key === 'ArrowLeft') k = 'ARROWLEFT';
    if(e.key === 'ArrowRight') k = 'ARROWRIGHT';
    if(k==='ENTER'||k==='BACKSPACE'||k==='ARROWLEFT'||k==='ARROWRIGHT'||/^[A-Z]$/.test(k)) handleInput(k);
});
