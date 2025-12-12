const socket = io();

// ===========================================
// COLE A LISTA GIGANTE AQUI (CLIENT_WORDS)
// ===========================================
const CLIENT_WORDS = [
    // ... COLE AQUI ...
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

const messageArea = document.getElementById('message-area');
const chatInput = document.getElementById('chat-input');
const chatToggleBtn = document.getElementById('btn-toggle-chat'); 
const chatContainer = document.getElementById('chat-container');

// INICIALIZAÇÃO
fetch('/api/me').then(r => { if (r.ok) return r.json(); throw new Error('Not logged'); })
    .then(u => { updateUserDisplay(u); switchScreen('dashboard'); })
    .catch(() => switchScreen('login'));

function updateUserDisplay(u) {
    document.getElementById('user-name').innerText = u.username;
    document.getElementById('user-avatar').src = u.avatar;
    document.getElementById('user-energy').innerText = u.energy;
}

// NAVEGAÇÃO
document.getElementById('btn-play-now').onclick = () => switchScreen('setup');
document.getElementById('btn-back-dash').onclick = () => switchScreen('dashboard');
document.getElementById('btn-leave-lobby').onclick = () => { if(confirm('Sair?')) socket.emit('leaveMatch', currentRoomId); };

function switchScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if(screens[name]) screens[name].classList.add('active');
}

// SLIDER
const roomSizeSlider = document.getElementById('room-size-slider');
if (roomSizeSlider) roomSizeSlider.oninput = (e) => document.getElementById('player-limit-display').innerText = e.target.value;

// PERFIL & RANK
document.getElementById('btn-view-profile').onclick = () => {
    fetch('/api/me').then(r=>r.json()).then(u => {
        document.getElementById('p-score').innerText = u.score; document.getElementById('p-wins').innerText = u.wins;
        document.getElementById('p-games').innerText = u.gamesPlayed; document.getElementById('profile-modal').classList.remove('hidden');
    });
};
document.getElementById('btn-view-leaderboard').onclick = () => {
    fetch('/api/leaderboard').then(r=>r.json()).then(p => {
        document.getElementById('global-leaderboard-list').innerHTML = p.map((u, i) => `<li><span style="display:flex;align-items:center;gap:5px">#${i+1} <img src="${u.avatar}" style="width:20px;border-radius:50%">${u.username}</span><strong>${u.score}</strong></li>`).join('');
        document.getElementById('leaderboard-modal').classList.remove('hidden');
    });
};
window.closeModals = () => document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));

// SOCKETS CRIAÇÃO
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

socket.on('updateRoomList', (rooms) => {
    const c = document.getElementById('room-list-items'); if(!c) return; c.innerHTML = '';
    if(rooms.length===0) return c.innerHTML='<p style="text-align:center;color:#666;padding:10px">Nenhuma sala pública.</p>';
    rooms.forEach(r => {
        const el = document.createElement('div'); el.className='room-item';
        el.innerHTML = `<div class="room-info"><strong>${r.hostName} <span class="room-badge">${r.gameMode==='competitive'?'🏆':'⚔️'}</span></strong><span>${r.playerCount}/${r.maxPlayers}</span></div><span class="material-icons" style="color:#666">arrow_forward_ios</span>`;
        el.onclick = () => { document.getElementById('room-code-input').value = r.id; socket.emit('joinRoom', {roomId: r.id}); };
        c.appendChild(el);
    });
});

// LOBBY & JOGO
let currentRoomId = null, currentRow = 0, currentTile = 0, currentGuess = "", isGameActive = false, isRoundSolved = false, myPlayerId = null;

socket.on('roomJoined', (data) => {
    currentRoomId = data.roomId; myPlayerId = data.playerId; switchScreen('lobby');
    document.getElementById('lobby-code').innerText = data.roomId;
    document.getElementById('lobby-chat-messages').innerHTML = '';
    const ctrl = document.getElementById('host-controls'), wait = document.getElementById('waiting-msg');
    if(data.isHost) { ctrl.style.display = 'block'; wait.style.display = 'none'; } else { ctrl.style.display = 'none'; wait.style.display = 'block'; }
});

socket.on('updatePlayerList', (players) => {
    const l = document.getElementById('player-list-lobby');
    if(l) {
        document.getElementById('player-count-badge').innerText = `${players.length}/MAX`;
        l.innerHTML = players.map(p => `<div class="player-card ${p.isHost?'is-host':''}"><img src="${p.avatar||'https://cdn-icons-png.flaticon.com/512/847/847969.png'}">${p.isHost?'<div class="host-badge">HOST</div>':''}<span>${p.name}</span></div>`).join('');
    }
    const myData = players.find(p => p.id === socket.id);
    if(myData && myData.isHost) { document.getElementById('host-controls').style.display = 'block'; document.getElementById('waiting-msg').style.display = 'none'; }
    updateGameScoreboard(players);
});

socket.on('youAreHost', () => alert("Você é o novo anfitrião!"));

// === DESEMPATE ===
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
    if (!data.tiedPlayersIds.includes(socket.id)) {
        isGameActive = false;
        document.getElementById('tiebreaker-wait-modal').classList.add('hidden');
        showMessage("MORTE SÚBITA EM ANDAMENTO...", "#eab308");
    } else {
        isGameActive = true; isRoundSolved = false; resetRoundUI("EXTRA", "GOAT");
        showMessage("ACERTE PRIMEIRO!", "#e11d48");
    }
    resetRoundUI("EXTRA", "GOAT");
});

// EVENTOS JOGO
socket.on('gameStarted', () => { switchScreen('game'); createGrid(); document.getElementById('chat-input').disabled = false; });
socket.on('newRound', (d) => { resetRoundUI(d.roundNumber, d.totalRounds); isGameActive = true; isRoundSolved = false; });
socket.on('timerUpdate', (t) => document.getElementById('timer').innerText = t);
socket.on('guessResult', ({ guess, result }) => {
    paintRow(currentRow, guess, result); updateKeyboard(guess, result);
    if (result.every(r => r === 'correct')) { isRoundSolved = true; showMessage("VOCÊ ACERTOU!", "#22c55e"); }
    else { currentRow++; currentTile = 0; currentGuess = ""; if(currentRow >= 6) { isGameActive = false; showMessage("FIM DAS TENTATIVAS", "#e11d48"); } }
});
socket.on('roundSuccess', (msg) => setTimeout(() => showMessage(msg, "#22c55e"), 1500));
socket.on('roundEnded', (w) => { isGameActive = false; if(!isRoundSolved) showMessage(`PALAVRA: ${w}`, "#fff"); });
socket.on('gameOver', (players) => {
    document.getElementById('tiebreaker-prep-modal').classList.add('hidden');
    document.getElementById('tiebreaker-wait-modal').classList.add('hidden');
    players.sort((a,b) => b.score - a.score);
    document.getElementById('game-over-title').innerHTML = `<span style="color:#eab308">${players[0].name}</span> É O GOAT 🐐`;
    document.getElementById('final-results').innerHTML = players.map((p,i) => `<div style="margin:10px;font-size:1.2rem">${i===0?'👑':`#${i+1}`} <strong>${p.name}</strong>: ${p.score}</div>`).join('');
    document.getElementById('game-over-overlay').classList.remove('hidden');
});

// UTILS & CHAT
const lobbyChatInput = document.getElementById('lobby-chat-input');
const gameChatInput = document.getElementById('chat-input');
let silenced = new Set();

window.toggleMute = (pid, btn) => {
    if(pid===myPlayerId) return;
    if(silenced.has(pid)) { silenced.delete(pid); btn.innerText='volume_up'; btn.style.color='#888'; }
    else { silenced.add(pid); btn.innerText='volume_off'; btn.style.color='#e11d48'; }
};

socket.on('chatMessage', (data) => {
    if (silenced.has(data.playerId)) return;
    // Game Chat
    const gb = document.getElementById('chat-messages');
    if (gb && document.getElementById('game-screen').classList.contains('active')) {
        const d = document.createElement('div'); d.className = 'chat-usr-msg';
        let m = data.playerId !== myPlayerId ? `<span class="material-icons mute-btn" onclick="toggleMute('${data.playerId}', this)">volume_up</span>` : '';
        d.innerHTML = `${m} <span class="chat-name">${data.playerName}:</span> ${data.msg}`;
        gb.appendChild(d); gb.scrollTop = gb.scrollHeight;
    }
    // Lobby Chat
    const lb = document.getElementById('lobby-chat-messages');
    if (lb && document.getElementById('lobby-screen').classList.contains('active')) {
        const d = document.createElement('div'); d.style.marginBottom = "4px";
        d.innerHTML = `<strong style="color:#eab308">${data.playerName}:</strong> ${data.msg}`;
        lb.appendChild(d); lb.scrollTop = lb.scrollHeight;
    }
});

function sendMsg(input) { const m = input.value.trim(); if(!m) return; socket.emit('chatMessage', { roomId: currentRoomId, msg: m }); input.value = ""; input.focus(); }
document.getElementById('btn-send-chat').onclick = () => sendMsg(gameChatInput);
gameChatInput.onkeypress = (e) => { if(e.key==='Enter') sendMsg(gameChatInput); };
if(document.getElementById('btn-send-lobby-chat')) document.getElementById('btn-send-lobby-chat').onclick = () => sendMsg(lobbyChatInput);
if(lobbyChatInput) lobbyChatInput.onkeypress = (e) => { if(e.key==='Enter') sendMsg(lobbyChatInput); };

chatToggleBtn.addEventListener('click', () => {
    const c = document.getElementById('chat-container');
    const v = c.style.display !== 'none';
    c.style.display = v ? 'none' : 'flex';
    chatToggleBtn.innerHTML = `<span class="material-icons">${v ? 'chat_bubble_outline' : 'chat'}</span>`;
    chatToggleBtn.style.opacity = v ? '0.5' : '1';
});

// Leave
const leaveModal = document.getElementById('confirm-leave-overlay');
document.getElementById('btn-leave-match').onclick = () => leaveModal.classList.remove('hidden');
document.getElementById('btn-cancel-leave').onclick = () => leaveModal.classList.add('hidden');
document.getElementById('btn-confirm-leave').onclick = () => { leaveModal.classList.add('hidden'); socket.emit('leaveMatch', currentRoomId); };

socket.on('userDataUpdate', (user) => updateUserDisplay(user));
socket.on('matchLeft', () => window.location.reload());
socket.on('error', (msg) => alert(msg));

// Game Functions
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
