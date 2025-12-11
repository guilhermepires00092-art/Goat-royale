const socket = io();

// ===========================================
// COLE A LISTA GIGANTE AQUI (CLIENT_WORDS)
// ===========================================
const CLIENT_WORDS = [ "ABATA", "ABOCA" ]; // Exemplo

// Elementos
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

// === INICIALIZAÇÃO ===
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

// === NAVEGAÇÃO ===
document.getElementById('btn-play-now').addEventListener('click', () => switchScreen('setup'));
document.getElementById('btn-back-dash').addEventListener('click', () => switchScreen('dashboard'));
document.getElementById('btn-leave-lobby').addEventListener('click', () => {
    if(confirm('Sair da sala?')) socket.emit('leaveMatch', currentRoomId);
});

function switchScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if(screens[name]) screens[name].classList.add('active');
}

// Slider Visual
const roomSizeSlider = document.getElementById('room-size-slider');
const roomSizeDisplay = document.getElementById('player-limit-display');
if (roomSizeSlider) {
    roomSizeSlider.addEventListener('input', (e) => {
        roomSizeDisplay.innerText = e.target.value;
    });
}

// === PERFIL & RANKING ===
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

// === JOGO E SOCKETS ===
document.getElementById('btn-create-room').addEventListener('click', () => {
    const isPublic = document.getElementById('public-room-check').checked;
    const size = document.getElementById('room-size-slider').value;
    socket.emit('createRoom', { isPublic: isPublic, roomSize: size });
});
document.getElementById('btn-join-room').addEventListener('click', () => {
    const code = document.getElementById('room-code-input').value;
    if(code) socket.emit('joinRoom', { roomId: code });
});
document.getElementById('btn-start-game').addEventListener('click', () => {
    const mode = document.querySelector('input[name="game-mode"]:checked').value;
    socket.emit('startGame', { roomId: currentRoomId, gameMode: mode });
});

// Lista de Salas
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
        el.onclick = () => { el.style.transform = "scale(0.98)"; setTimeout(() => el.style.transform = "scale(1)", 100); document.getElementById('room-code-input').value = r.id; socket.emit('joinRoom', { roomId: r.id }); };
        container.appendChild(el);
    });
});

// Lobby Logic
socket.on('roomJoined', (data) => {
    currentRoomId = data.roomId;
    myPlayerId = data.playerId;
    switchScreen('lobby');
    document.getElementById('lobby-code').innerText = data.roomId;
    document.getElementById('lobby-chat-messages').innerHTML = '<div style="color:var(--accent-red); font-style:italic;">Entrou na sala.</div>';
});

socket.on('updatePlayerList', (players) => {
    const lobbyList = document.getElementById('player-list-lobby');
    if (lobbyList) {
        document.getElementById('player-count-badge').innerText = `${players.length}/MAX`;
        lobbyList.innerHTML = players.map(p => {
            const hostBadge = p.isHost ? '<div class="host-badge">HOST</div>' : '';
            const avatarUrl = p.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'; 
            return `<div class="player-card ${p.isHost ? 'is-host' : ''}"><img src="${avatarUrl}" alt="Avatar">${hostBadge}<span>${p.name}</span></div>`;
        }).join('');
    }

    // Herança de Host
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

// --- JOGO ---
let currentRoomId = null; let currentRow = 0; let currentTile = 0; let currentGuess = ""; let isGameActive = false; let isRoundSolved = false; let silencedPlayers = new Set(); let isChatVisible = true;

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

// Chat & Mute
const lobbyChatInput = document.getElementById('lobby-chat-input');
const lobbyChatBtn = document.getElementById('btn-send-lobby-chat');

chatToggleBtn.addEventListener('click', () => {
    isChatVisible = !isChatVisible;
    const icon = chatToggleBtn.querySelector('.material-icons');
    if(isChatVisible) { chatContainer.style.display = 'flex'; icon.innerText = 'chat'; chatToggleBtn.style.opacity = '1'; }
    else { chatContainer.style.display = 'none'; icon.innerText = 'chat_bubble_outline'; chatToggleBtn.style.opacity = '0.5'; }
});
window.toggleMute = function(pid, btn) {
    if(pid === myPlayerId) return;
    if(silencedPlayers.has(pid)) { silencedPlayers.delete(pid); btn.innerText = 'volume_up'; btn.style.color = '#888'; }
    else { silencedPlayers.add(pid); btn.innerText = 'volume_off'; btn.style.color = '#e11d48'; }
};
socket.on('chatMessage', (data) => {
    if (silencedPlayers.has(data.playerId)) return;
    const gameBox = document.getElementById('chat-messages');
    if (gameBox && document.getElementById('game-screen').classList.contains('active')) {
        const d = document.createElement('div'); d.className = 'chat-usr-msg';
        let mute = data.playerId !== myPlayerId ? `<span class="material-icons mute-btn" onclick="toggleMute('${data.playerId}', this)">volume_up</span>` : '';
        d.innerHTML = `${mute} <span class="chat-name">${data.playerName}:</span> ${data.msg}`;
        gameBox.appendChild(d); gameBox.scrollTop = gameBox.scrollHeight;
    }
    const lobbyBox = document.getElementById('lobby-chat-messages');
    if (lobbyBox && document.getElementById('lobby-screen').classList.contains('active')) {
        const d = document.createElement('div'); d.style.marginBottom = "4px";
        d.innerHTML = `<strong style="color:#eab308">${data.playerName}:</strong> ${data.msg}`;
        lobbyBox.appendChild(d); lobbyBox.scrollTop = lobbyBox.scrollHeight;
    }
});

function sendMsg(input) { const m = input.value.trim(); if(!m) return; socket.emit('chatMessage', { roomId: currentRoomId, msg: m }); input.value = ""; input.focus(); }
document.getElementById('btn-send-chat').onclick = () => sendMsg(chatInput);
chatInput.onkeypress = (e) => { if(e.key==='Enter') sendMsg(chatInput); };
if(lobbyChatBtn) lobbyChatBtn.onclick = () => sendMsg(lobbyChatInput);
if(lobbyChatInput) lobbyChatInput.onkeypress = (e) => { if(e.key==='Enter') sendMsg(lobbyChatInput); };

// Leave & Utils
const confirmLeaveModal = document.getElementById('confirm-leave-overlay');
document.getElementById('btn-leave-match').onclick = () => confirmLeaveModal.classList.remove('hidden');
document.getElementById('btn-cancel-leave').onclick = () => confirmLeaveModal.classList.add('hidden');
document.getElementById('btn-confirm-leave').onclick = () => { confirmLeaveModal.classList.add('hidden'); socket.emit('leaveMatch', currentRoomId); };

socket.on('userDataUpdate', (user) => updateUserDisplay(user));
socket.on('matchLeft', () => window.location.reload());
socket.on('error', (msg) => alert(msg));

// GAME HELPERS
function createGrid() { const g = document.getElementById('grid'); g.innerHTML = ''; for(let i=0;i<6;i++){ const r=document.createElement('div'); r.className='grid-row'; for(let j=0;j<5;j++){ const t=document.createElement('div'); t.className='tile'; t.id=`tile-${i}-${j}`; r.appendChild(t); } g.appendChild(r); } createKeyboard(); }
function createKeyboard() { const k = document.getElementById('keyboard'); k.innerHTML = `<div class="row">${'QWERTYUIOP'.split('').map(k=>`<button data-key="${k}">${k}</button>`).join('')}</div><div class="row">${'ASDFGHJKL'.split('').map(k=>`<button data-key="${k}">${k}</button>`).join('')}</div><div class="row"><button data-key="ENTER" class="wide-key action-btn">ENTER</button>${'ZXCVBNM'.split('').map(k=>`<button data-key="${k}">${k}</button>`).join('')}<button data-key="BACKSPACE" class="wide-key action-btn"><span class="material-icons">backspace</span></button></div>`; document.querySelectorAll('#keyboard button').forEach(b => b.onclick = (e) => { e.preventDefault(); handleInput(b.dataset.key); }); }
function resetRoundUI(r, t) { currentRow = 0; currentTile = 0; currentGuess = ""; document.getElementById('round-display').innerText = `${r}/${t}`; document.getElementById('message-area').style.opacity = '0'; document.querySelectorAll('.tile').forEach(e => { e.innerText = ''; e.className = 'tile'; e.style.animation = 'none'; e.classList.remove('correct','present','absent','filled'); }); createKeyboard(); }
function showMessage(m, c) { const el = document.getElementById('message-area'); el.innerText = m; el.style.color = c; el.style.opacity = '1'; }
function handleInput(k) { if (!isGameActive || isRoundSolved) return; if (k === 'ENTER') return submitGuess(); if (k === 'BACKSPACE') { if (currentTile > 0) { currentTile--; currentGuess = currentGuess.slice(0, -1); const t = document.getElementById(`tile-${currentRow}-${currentTile}`); t.innerText = ''; t.classList.remove('filled'); } return; } if (currentTile < 5 && k.length === 1 && /[A-Z]/.test(k)) { const t = document.getElementById(`tile-${currentRow}-${currentTile}`); t.innerText = k; t.classList.add('filled'); currentGuess += k; currentTile++; } }
function submitGuess() { if (currentGuess.length !== 5) { showMessage("Muito curta", "#eab308"); setTimeout(()=>document.getElementById('message-area').style.opacity='0', 1500); return; } if (!CLIENT_WORDS.includes(currentGuess)) { showMessage("Palavra inválida", "#e11d48"); setTimeout(()=>document.getElementById('message-area').style.opacity='0', 1500); return; } socket.emit('submitGuess', { roomId: currentRoomId, guess: currentGuess }); }
function paintRow(r, g, res) { for(let i=0; i<5; i++) { const t = document.getElementById(`tile-${r}-${i}`); setTimeout(() => { t.classList.add(res[i]); t.style.animation = "pop 0.3s ease"; }, i*150); } }
function updateKeyboard(g, res) { for(let i=0; i<5; i++) { const k = document.querySelector(`button[data-key="${g[i]}"]`); if(k) { if(res[i] === 'correct') k.className = 'correct'; else if(res[i] === 'present' && !k.classList.contains('correct')) k.className = 'present'; else if(res[i] === 'absent' && !k.classList.contains('correct') && !k.classList.contains('present')) k.className = 'absent'; } } }
function updateGameScoreboard(players) { const list = document.getElementById('live-score-list'); if(!list) return; players.sort((a,b) => b.score - a.score); list.innerHTML = players.map((p,i) => `<li><div style="display:flex;align-items:center;gap:8px"><span style="color:#888;font-size:0.8rem">#${i+1}</span><img src="${p.avatar||'https://cdn-icons-png.flaticon.com/512/847/847969.png'}" class="score-avatar"><span>${p.name}</span></div><span style="color:#eab308;font-weight:bold">${p.score}</span></li>`).join(''); }
document.addEventListener('keydown', (e) => { if (document.activeElement === chatInput || document.activeElement === lobbyChatInput) return; const k = e.key.toUpperCase(); if(k==='ENTER'||k==='BACKSPACE'||/^[A-Z]$/.test(k)) handleInput(k); });
