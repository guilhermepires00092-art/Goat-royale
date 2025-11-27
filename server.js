const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// === CONFIGURAÇÕES DO JOGO ===
const ROUND_TIME = 45; 
const TOTAL_ROUNDS = 10;

// LISTA FINAL VERIFICADA (Apenas 5 letras)
const WORDS = [
    "ABATA", "ABOCA", "ABRIR", "ACASO", "ACATA", "ACENA", "ACESO", "ACIMA", "ACIDO", "ACOAR",
    "ACULA", "ACURA", "ADEUS", "ADIRA", "ADORA", "AEDOS", "AEREO", "AFETO", "AFLAR", "AGIDA",
    "AGITO", "AGNUS", "AGORA", "AGORO", "AGUDA", "AGUDO", "AGUIA", "AINDA", "AJEJO", "AJUDA",
    "ALBUM", "ALCAS", "ALGAS", "ALGOZ", "ALGUM", "ALHOS", "ALOES", "ALOJA", "ALPES", "ALTAR",
    "ALUNA", "ALUNO", "AMADA", "AMADO", "AMAGO", "AMANA", "AMIGA", "AMIGO", "AMORA", "AMPLO",
    "ANCIA", "ANDAR", "ANEIS", "ANEXO", "ANIMA", "ANIMO", "ANJOS", "ANSIA", "ANTES", "ANUAL",
    "ANUIR", "ANULA", "APEEI", "APELO", "APICE", "APITO", "APOIA", "APOIO", "APONA", "APTOS",
    "AQUEM", "AQUEU", "ARACA", "ARAME", "ARARA", "ARCAR", "ARCOS", "ARDEA", "AREIA", "ARENA",
    "ARIDO", "AROMA", "ARRAS", "ARROZ", "ARTES", "ASILO", "ASSAZ", "ASSIM", "ASTIL", "ASTRO",
    "ATEIA", "ATEUS", "ATLAS", "ATIVE", "ATRAS", "ATRIO", "ATROZ", "ATUAL", "ATURO", "AUDAZ",
    "AUDIO", "AURAS", "AUREA", "AUREO", "AUTOR", "AVARO", "AVAIA", "AVEIA", "AVELA", "AVEXA",
    "AVIAO", "AVIDE", "AVIDO", "AVINA", "AVISO", "AXIAL", "AZEDO", "AZUIS", "BABAR", "BACIA",
    "BACON", "BAFOS", "BAILE", "BAIAO", "BAIXO", "BAJUS", "BALAS", "BALAO", "BALDA", "BALDE",
    "BALIR", "BALSA", "BAMBU", "BANAL", "BANCA", "BANCO", "BANDA", "BANDO", "BANHO", "BANIR",
    "BARAU", "BARBA", "BARCO", "BARRA", "BARRO", "BASES", "BASTA", "BATER", "BATOM", "BAURU",
    "BAZAR", "BEATA", "BEATO", "BEBER", "BECOS", "BEIJA", "BEIJO", "BEIRA", "BELAS", "BELOS",
    "BENTO", "BERCO", "BERRO", "BESTA", "BICOS", "BINGO", "BIOMA", "BIQUE", "BISPO", "BLEFE",
    "BLOCO", "BLUSA", "BOATE", "BOCAL", "BODES", "BOFES", "BOIAS", "BOINA", "BOLAS", "BOLDO",
    "BOLHA", "BOLOS", "BOLSA", "BOMBA", "BONDE", "BONES", "BONUS", "BORDA", "BORDO", "BORRA",
    "BOSSA", "BOTAO", "BOTAR", "BRACO", "BRASA", "BRAVO", "BREJO", "BREVE", "BRIGA", "BRIOS",
    "BRISA", "BROCA", "BROTO", "BRUMA", "BRUTO", "BRUXA", "BUCAL", "BUCHA", "BUCHO", "BULAM",
    "BULIR", "BUQUE", "BURIL", "BURLA", "BURRO", "BUSCA", "BUSTO", "BUUNO", "CABAL", "CABER",
    "CABOS", "CABRA", "CACAU", "CACHO", "CACOA", "CAIXA", "CALCA", "CALCO", "CALDO", "CALHA",
    "CALMA", "CALMO", "CALOR", "CAMPO", "CANAL", "CANCE", "CANJA", "CANOA", "CANTE", "CANTO",
    "CANZO", "CAPAZ", "CAPUZ", "CARDA", "CARGA", "CARNE", "CARRO", "CARTA", "CASAL", "CASCA",
    "CASCO", "CASTA", "CAUDA", "CAULE", "CAUSA", "CAUSO", "CAVOS", "CEDER", "CEGAS", "CEIAS",
    "CEIFO", "CENAS", "CENSO", "CENTO", "CERCA", "CERCO", "CERNE", "CERNI", "CERTO", "CESTA",
    "CETIM", "CHAGA", "CHALE", "CHAMA", "CHAPA", "CHATA", "CHATO", "CHAVE", "CHEFE", "CHEIO",
    "CHEIRO", "CHIAS", "CHINA", "CHORO", "CHUMBO", "CHUTE", "CHUVA", "CICLO", "CIDRA", "CIFRA",
    "CINDA", "CINTO", "CINZA", "CIRCO", "CISMA", "CITAR", "CIVEL", "CIVIL", "CIUME", "CLAME",
    "CLARA", "CLARO", "CLASSE", "CLAVA", "CLIMA", "CLINA", "CLUBE", "COAVA", "COBRA", "COBRE",
    "COELHO", "COESO", "COEVA", "COFRE", "COIBA", "COIFA", "COISA", "COITE", "COLAR", "COMER",
    "COMIA", "COMUM", "CONDE", "CONTE", "CONTO", "COPAS", "COPOS", "CORAG", "CORAL", "CORAR",
    "CORDA", "COROA", "CORPO", "CORTE", "CORVO", "COSER", "COSTA", "COURO", "COVEM", "COXA",
    "COZER", "CRASE", "CRAVO", "CREEM", "CREME", "CRIAR", "CRISE", "CRIVO", "CRIME", "CRUEL",
    "CRUZ", "CUBO", "CUIA", "CUIDAR", "CULPA", "CULTO", "CUNHA", "CUNHO", "CUPOM", "CURTA",
    "CURTO", "CURVA", "CUSPO", "CUSTO", "DADOS", "DAMAS", "DANCA", "DARDO", "DATAS", "DECAI",
    "DECOA", "DEDOS", "DEGAS", "DENSO", "DENTE", "DESDE", "DESTA", "DETER", "DEVER", "DEVEM",
    "DIABO", "DIANTE", "DICAS", "DIETA", "DIGAM", "DIGNA", "DIGNO", "DIQUE", "DISCO", "DIULA",
    "DIVAS", "DIZER", "DIZEM", "DOBRA", "DOBRE", "DOCES", "DOGMA", "DOIDO", "DOLAR", "DOMAR",
    "DONAS", "DORSO", "DOSE", "DRAMA", "DROGA", "DUBIO", "DUELO", "DUETO", "DUNAS", "DUPLO",
    "DUQUE", "DURAS", "EBANO", "EDEMA", "EDITA", "EGIDE", "EGITO", "EIVAI", "EIXOS", "ELEVA",
    "ELIDA", "ELIDE", "ELITE", "ELMOS", "EMAIL", "EMITA", "EMPOS", "ENCER", "ENJOO", "ENSAR",
    "ENSEJO", "ENTAO", "ENTRA", "ENTRE", "ENVIA", "ENVIO", "EPICO", "EPIST", "EPOCA", "ERGAS",
    "ERROS", "ESCOE", "ESMAA", "ESTAO", "ESTAR", "ESTIA", "ESTIO", "ETICA", "ETNIA", "EXAME",
    "EXARA", "EXATA", "EXATO", "EXIBA", "EXIGE", "EXIJO", "EXIME", "EXITO", "EXODO", "EXPOR",
    "FABRO", "FACAO", "FACIL", "FALAR", "FALAS", "FALHA", "FALIR", "FALTA", "FALSO", "FAMOS",
    "FARAO", "FARDA", "FARDO", "FAROL", "FARPA", "FARTO", "FATAL", "FATOR", "FATOS", "FATUO",
    "FAUNA", "FAVOR", "FAZER", "FEIAS", "FEIRA", "FEITA", "FEITO", "FEIXE", "FELIZ", "FENDA",
    "FERIR", "FEROZ", "FERRO", "FERVE", "FESTA", "FEUDO", "FIADO", "FIAIS", "FIAPO", "FICHA",
    "FICAR", "FIEIS", "FILAS", "FILHO", "FILME", "FINAL", "FINOS", "FINTA", "FIRMA", "FITA",
    "FIXAR", "FLORA", "FLUIR", "FLUXO", "FOCAO", "FOCAR", "FOFAS", "FOFOCA", "FOGAO", "FOLGA",
    "FOLHA", "FOLIA", "FOLIO", "FONTE", "FORA", "FORAM", "FORCA", "FORMA", "FORTE", "FOSCO",
    "FOSSE", "FOSSO", "FRACO", "FRADE", "FRASE", "FREIO", "FRETE", "FREVO", "FRITA", "FROTA",
    "FRUTA", "FUGAZ", "FUGIR", "FUNDO", "FUNES", "FUNIL", "FURAR", "FURIA", "FUROU", "FUSCA",
    "FUTIL", "FUZIL", "GADUA", "GAIAS", "GALHO", "GAMA", "GANHO", "GARBO", "GARRA", "GASTO",
    "GATAS", "GEDAS", "GELO", "GEMA", "GENIO", "GENRO", "GENTE", "GERAI", "GERAL", "GERIA",
    "GERIR", "GESTO", "GINGA", "GIRAR", "GLEBA", "GLOBO", "GOLFE", "GOLFO", "GOLPE", "GORRO",
    "GOSMA", "GOSTA", "GRACA", "GRAMA", "GRANA", "GRATO", "GRAUS", "GRIFO", "GRIPE", "GRUPO",
    "GRUTA", "GUIAR", "GUIZO", "GURIA", "HABIL", "HASTE", "HAURE", "HAVER", "HAVIA", "HEROI",
    "HIENA", "HINOS", "HIRTO", "HONRA", "HORDA", "HORTO", "HOTEL", "HUMOR", "ICACO", "ICONE",
    "IDEAR", "IDEIA", "IDEAL", "IDOLA", "IDOLO", "IDONE", "IDOSO", "IGNES", "IGUAL", "ILHAS",
    "ILESO", "IMITA", "IMPOR", "IMUNE", "INCHA", "INCOE", "INCAS", "INDEZ", "INDIO", "INGER",
    "INIBA", "INATO", "IOGUE", "IRADO", "IRIS", "ISPIO", "ITENS", "JABOS", "JANTA", "JASPE",
    "JAULA", "JAZIA", "JECAS", "JEDAS", "JEITO", "JEJUM", "JEMBE", "JIPES", "JOGAR", "JOGOS",
    "JOIAS", "JOVEM", "JUIZA", "JUIZO", "JULGO", "JUNCO", "JUNTA", "JUROS", "JURAR", "JURIA",
    "JUROU", "JUSTO", "LABOR", "LAGOS", "LAICO", "LAMBA", "LAMES", "LAMPA", "LANAR", "LAPIS",
    "LAPSO", "LARGO", "LARVA", "LATES", "LATIR", "LAVOR", "LAZER", "LEAIS", "LEGAL", "LEIGO",
    "LEITE", "LEITO", "LENDA", "LENTO", "LESMA", "LESAO", "LETAL", "LETRA", "LEVAR", "LIAME",
    "LIDER", "LIMBO", "LIMPO", "LINDO", "LINHA", "LIRA", "LIRAS", "LIVRE", "LIVRO", "LIXAO",
    "LOCAO", "LOCAL", "LOCUS", "LOGAR", "LOGRA", "LOGRO", "LOIRA", "LOMBA", "LONGO", "LOTES",
    "LOUCA", "LOUCO", "LUCRO", "LUGAR", "LUNAR", "LUTAR", "LUXAR", "LUXOS", "LUVAS", "MACAR",
    "MACAO", "MACIA", "MACIO", "MAIOR", "MAJOR", "MAGIA", "MAGNA", "MAGOA", "MALES", "MALHA",
    "MALSA", "MANCO", "MANDA", "MANGA", "MANIA", "MANSA", "MANSO", "MANTO", "MAOME", "MARCO",
    "MARRA", "MASSA", "MATE", "MATIZ", "MEADA", "MECHA", "MEDIA", "MEDIR", "MEDOS", "MEIGO",
    "MEIOS", "MEIAS", "MELAO", "MEMIS", "MENOR", "MENOS", "MESAS", "MESMO", "METAL", "METIA",
    "METRO", "MEXER", "MIDIA", "MILHA", "MILHO", "MIOLO", "MISSA", "MISTO", "MITOS", "MOCAS",
    "MODA", "MOFOS", "MOIRA", "MOLES", "MONGE", "MORAL", "MORTE", "MORRO", "MORRE", "MOTIM",
    "MOTOS", "MOVEL", "MUDAR", "MUITO", "MUNDO", "MURAL", "MUROS", "MURRA", "MUSEU", "MUSGO",
    "MUTUA", "MUTUO", "NACAO", "NADAR", "NADIR", "NAFTA", "NANOS", "NARRA", "NASCE", "NATAL",
    "NATAS", "NAVAL", "NAVIO", "NEGAR", "NEGA", "NEGRO", "NESGA", "NESSA", "NESTA", "NETOS",
    "NEVE", "NICHO", "NIEVE", "NINFAS", "NINHO", "NIVEL", "NOBRE", "NOITE", "NOIVA", "NOME",
    "NORMA", "NORTE", "NOSSA", "NOSSO", "NOTAR", "NOTAS", "NULAS", "NULOS", "NUNCA", "NUVEM",
    "NUDEZ", "OBESO", "OBICE", "OBRAS", "OBTER", "OBVIO", "OBSTA", "OCIOS", "OCREM", "ODIAR",
    "OITIS", "OLHAM", "OLHAR", "OLHOS", "ONTEM", "OPACO", "OPIAM", "OPTAR", "OPTAS", "ORCAS",
    "ORDEM", "ORGAO", "ORNES", "OSSOS", "OTICA", "OTICO", "OTIMO", "OUFAS", "OUCAS", "OUSAR",
    "OUSAS", "OUTRO", "OUVEM", "OUVIR", "OVAIS", "OXALA", "PACOS", "PADEI", "PAGAR", "PAGUE",
    "PALCO", "PALHA", "PAMPA", "PANCA", "PANGA", "PANOS", "PAPEL", "PARCO", "PARDA", "PARES",
    "PARIA", "PARTE", "PASMO", "PASSA", "PASSE", "PASSO", "PASTA", "PATAS", "PATIO", "PAUSA",
    "PAUTA", "PAZES", "PECHA", "PEDRA", "PEITO", "PEIXE", "PELOS", "PELVE", "PENSO", "PERCO",
    "PERNA", "PESAM", "PESAR", "PESCA", "PIADA", "PIAVA", "PICAR", "PICHE", "PIFAS", "PIFIO",
    "PILHA", "PINOS", "PINTA", "PIRAI", "PIRES", "PISTA", "PLACA", "PLENA", "PLUMO", "PNEUS",
    "POCAS", "PODAR", "PODER", "POEMA", "POLAR", "PONDE", "PONTE", "PONTO", "PORAO", "POREM",
    "PORTA", "POSAM", "POSSE", "POSSO", "POSTO", "POUCO", "POUSO", "PRACA", "PRADO", "PRAIA",
    "PRATO", "PRAZO", "PRECE", "PREGO", "PRECO", "PRIVE", "PROLE", "PROSA", "PROVA", "PRUMO",
    "PUDER", "PUDIM", "PULAR", "PUNHO", "PUNES", "PURAS", "PURGA", "PUROS", "PUXAR", "QUASE",
    "QUERO", "QUICA", "QUILO", "QUOTA", "RACAM", "RADAR", "RAIAR", "RAIVA", "RALAR", "RAMOS",
    "RAMPA", "RANCO", "RANGO", "RAPAZ", "RAPTA", "RAROS", "RASOS", "RAZAO", "REAGIR", "REATA",
    "RECUO", "REGRA", "REINO", "RELVA", "RENDA", "RENTE", "RETER", "REVER", "REVES", "REZAR",
    "REZAS", "REZEI", "RICOS", "RIFAS", "RIGOR", "RIMA", "RISCO", "RITMO", "RITO", "RODAS",
    "ROER", "ROGAR", "RONCA", "ROSAS", "ROTOS", "ROUCO", "ROUPA", "RUBRO", "RUINA", "RUMOR",
    "RURAL", "SABER", "SABIA", "SABIO", "SABOR", "SAGAO", "SAGAZ", "SAIAS", "SAIDA", "SAIRA",
    "SALSA", "SALTO", "SALVA", "SALVO", "SANAR", "SANTO", "SAQUE", "SARAR", "SARGA", "SARJA",
    "SASSE", "SATIS", "SAUDA", "SAUDE", "SEARA", "SECAO", "SEGUE", "SEIOS", "SEITA", "SEIVA",
    "SELAR", "SELVA", "SENAO", "SENDA", "SENDO", "SENIL", "SENSO", "SENTA", "SENSATEZ", "SERES",
    "SERIA", "SERIE", "SERRA", "SESTA", "SETAS", "SEXTA", "SEXTO", "SICAR", "SIGLA", "SIGILO",
    "SINAL", "SINOS", "SINTO", "SIRVA", "SITUA", "SOBRE", "SOCAR", "SOCIO", "SODIO", "SOFAS",
    "SOLAR", "SOLTO", "SOMAR", "SONDA", "SONHO", "SOPRA", "SORRI", "SORTE", "SOVAR", "STAND",
    "SUADA", "SUAVE", "SUBIR", "SUCOS", "SUECO", "SUETA", "SUGOU", "SUJOS", "SUMIR", "SUMO",
    "SUPER", "SURRA", "SUTIL", "SUTIA", "TACAR", "TACAS", "TACAO", "TALAS", "TALAO", "TALCO",
    "TANGA", "TANGE", "TANTA", "TAPAR", "TARDE", "TARJA", "TATOS", "TAXAS", "TECEL", "TECNO",
    "TELAS", "TELHA", "TEMOR", "TEMOS", "TEMPO", "TENAZ", "TENDO", "TENRA", "TENSO", "TENTO",
    "TENUE", "TERAS", "TERCO", "TERMO", "TERNO", "TERRA", "TESAO", "TESTE", "TIGRE", "TINHA",
    "TINTA", "TIRAR", "TITIO", "TIVER", "TOCAR", "TOCAS", "TODOS", "TOLOS", "TONEL", "TONTO",
    "TOPAM", "TOPAR", "TOPO", "TORCO", "TORPE", "TORTO", "TOUCA", "TOURO", "TRACO", "TRAIR",
    "TRAJE", "TRAMA", "TRATO", "TRELA", "TRENS", "TREVA", "TREVO", "TRIBUTO", "TRIGO", "TROCA",
    "TROLE", "TROPA", "TRUCO", "TRUPE", "TRUQUE", "TUAS", "TUBOS", "TUMBA", "TUNEL", "TURVO",
    "UIVOS", "UMEDO", "UNIAO", "UNICO", "UNIDA", "UNIR", "URBAN", "URGIR", "URNAS", "UTERO",
    "VAGAS", "VAGEM", "VAGUE", "VALHA", "VALOR", "VALSA", "VARAO", "VARAR", "VARAS", "VARRE",
    "VASTA", "VASTO", "VAZAS", "VAZIO", "VEDAR", "VEDOU", "VELAM", "VELEI", "VELHO", "VELOZ",
    "VEMOS", "VENAL", "VENDA", "VENDO", "VENHA", "VENTO", "VERAO", "VERBA", "VERBO", "VERGA",
    "VERSO", "VETOR", "VIDAS", "VIDEO", "VIGOR", "VIMOS", "VINHO", "VIRAR", "VIRIA", "VIRIL",
    "VIROU", "VIRUS", "VISAM", "VISAO", "VISAR", "VISTA", "VISTO", "VIUVA", "VIVAZ", "VIVER",
    "VOCAL", "VOLTA", "VOLTE", "VOTOS", "VULGO", "VULTO", "XALE", "XINGA", "XISTO", "XUCRO",
    "ZANGA", "ZELO", "ZIPER", "ZUMBI"
];

// Estado Global
const rooms = {};

function generateRoomId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Listagem de Salas Públicas
function emitRoomList() {
    const availableRooms = Object.values(rooms)
        .filter(room => {
            const playerCount = Object.keys(room.players).length;
            return room.isPublic && 
                   playerCount < room.maxPlayers && 
                   room.state === 'LOBBY';
        })
        .map(room => ({
            id: room.id,
            hostName: room.players[room.host] ? room.players[room.host].name : 'Desconhecido',
            playerCount: Object.keys(room.players).length,
            maxPlayers: room.maxPlayers,
            gameMode: room.gameMode
        }));
    
    io.emit('updateRoomList', availableRooms);
}

// Atualização de Jogadores na Sala
function emitPlayerUpdates(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const playerList = Object.values(room.players);
    io.to(roomId).emit('updatePlayerList', playerList);
    io.to(roomId).emit('updateScoreboard', playerList);
    emitRoomList();
}

io.on('connection', (socket) => {
    console.log(`[Goat Royale] Conectado: ${socket.id}`);
    emitRoomList();

    // --- 1. CRIAR SALA ---
    socket.on('createRoom', ({ playerName, isPublic }) => {
        const roomId = generateRoomId();
        rooms[roomId] = {
            id: roomId,
            state: 'LOBBY',
            players: {},
            host: socket.id,
            currentRound: 0,
            currentWord: "",
            timer: null,
            timeLeft: 0,
            solversCount: 0,
            isPublic: isPublic || false,
            maxPlayers: 10,
            gameMode: 'default',
            // NOVAS PROPRIEDADES PARA CONTROLE DE PALAVRAS
            usedWords: [] 
        };
        joinRoomLogic(socket, roomId, playerName, true);
    });

    // --- 2. ENTRAR EM SALA ---
    socket.on('joinRoom', ({ roomId, playerName }) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('error', 'Sala não encontrada.');
            return;
        }
        if (room.state !== 'LOBBY') {
            socket.emit('error', 'O jogo já está em andamento.');
            return;
        }
        if (Object.keys(room.players).length >= room.maxPlayers) {
            socket.emit('error', 'A sala está cheia.');
            return;
        }
        joinRoomLogic(socket, roomId, playerName, false);
    });

    function joinRoomLogic(socket, roomId, playerName, isHost) {
        const room = rooms[roomId];
        socket.join(roomId);

        room.players[socket.id] = {
            id: socket.id,
            name: playerName || `Player ${socket.id.substr(0,4)}`,
            roomId: roomId,
            isHost: isHost,
            score: 0,
            wins: 0,
            solvedRound: false,
            roundAttempts: 0 
        };

        socket.emit('roomJoined', { roomId, isHost, playerId: socket.id });
        emitPlayerUpdates(roomId);
    }

    // --- 3. CHAT (Com ID para Silenciar) ---
    socket.on('chatMessage', ({ roomId, msg }) => {
        const room = rooms[roomId];
        if (room && room.players[socket.id]) {
            const player = room.players[socket.id];
            io.to(roomId).emit('chatMessage', {
                playerId: player.id, // ID necessário para o cliente silenciar
                playerName: player.name,
                msg: msg
            });
        }
    });

    // --- 4. INICIAR JOGO (Com Modo) ---
    socket.on('startGame', ({ roomId, gameMode }) => {
        const room = rooms[roomId];
        if (!room || room.host !== socket.id) return;
        
        if (Object.keys(room.players).length < 2) {
             socket.emit('error', 'Mínimo de 2 jogadores necessários.');
             return; 
        }

        // Define o modo
        room.gameMode = gameMode === 'competitive' ? 'competitive' : 'default';
        room.state = 'PLAYING';
        
        io.to(roomId).emit('gameStarted', { gameMode: room.gameMode });
        emitRoomList(); 
        startRound(roomId);
    });

    // --- 5. TENTATIVA (Lógica Híbrida) ---
    socket.on('submitGuess', ({ roomId, guess }) => {
        const room = rooms[roomId];
        if (!room || room.state !== 'PLAYING') return;

        const player = room.players[socket.id];
        if (player.solvedRound) return;

        if (!WORDS.includes(guess)) return; 

        // Incrementa tentativas
        player.roundAttempts++;

        const target = room.currentWord;
        const result = calculateWordleResult(guess, target);
        const isCorrect = result.every(r => r === 'correct');

        socket.emit('guessResult', { guess, result });

        if (isCorrect) {
            player.solvedRound = true;
            player.wins++;
            room.solversCount++;

            // === LÓGICA DE PONTUAÇÃO ===
            if (room.gameMode === 'competitive') {
                // MODO COMPETITIVO: 
                
                const points = Math.max(1, 11 - player.roundAttempts);
                player.score += points;

                io.to(roomId).emit('roundSuccess', `${player.name} VENCEU A RODADA! (+${points} pts)`);
                emitPlayerUpdates(roomId);

                // Encerra timer e round imediatamente
                clearInterval(room.timer);
                io.to(roomId).emit('roundEnded', room.currentWord);
                setTimeout(() => startRound(roomId), 5000);
                return; // Sai da função

            } else {
                // MODO DEFAULT (Battle Royale):
                
                const points = Math.max(1, 11 - room.solversCount);
                player.score += points;

                socket.emit('roundSuccess', `+${points} PONTOS!`);
                emitPlayerUpdates(roomId);
                
                // Se todos acertaram, acelera o timer
                if (Object.values(room.players).every(p => p.solvedRound)) {
                    room.timeLeft = 2;
                }
            }
        }
    });

    // --- 6. SAIR DA PARTIDA ---
    socket.on('leaveMatch', (roomId) => {
        const room = rooms[roomId];
        if (room && room.players[socket.id]) {
            const player = room.players[socket.id];
            const wasHost = player.isHost;
            
            delete room.players[socket.id];
            socket.leave(roomId);
            socket.emit('matchLeft');

            if (Object.keys(room.players).length === 0) {
                clearInterval(room.timer);
                delete rooms[roomId];
                emitRoomList();
            } else {
                if (wasHost) {
                    const nextHostId = Object.keys(room.players)[0];
                    room.players[nextHostId].isHost = true;
                }
                emitPlayerUpdates(roomId);
            }
        }
    });

    // --- DESCONEXÃO ---
    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.players[socket.id]) {
                const wasHost = room.players[socket.id].isHost;
                delete room.players[socket.id];
                
                if (Object.keys(room.players).length === 0) {
                    clearInterval(room.timer);
                    delete rooms[roomId];
                    emitRoomList();
                } else {
                    if (wasHost) {
                        const nextHostId = Object.keys(room.players)[0];
                        room.players[nextHostId].isHost = true;
                    }
                    emitPlayerUpdates(roomId);
                }
                break;
            }
        }
    });
});

function startRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    if (room.currentRound >= TOTAL_ROUNDS) {
        endGame(roomId);
        return;
    }

    room.currentRound++;
    
    // Lógica para não repetir palavras na mesma partida
    const availableWords = WORDS.filter(w => !room.usedWords.includes(w));
    // Se por acaso acabarem as palavras (improvável), usa a lista completa de novo
    const sourceList = availableWords.length > 0 ? availableWords : WORDS;

    room.currentWord = sourceList[Math.floor(Math.random() * sourceList.length)];
    room.usedWords.push(room.currentWord);

    room.timeLeft = ROUND_TIME;
    room.solversCount = 0;

    Object.values(room.players).forEach(p => {
        p.solvedRound = false;
        p.roundAttempts = 0;
    });

    io.to(roomId).emit('newRound', {
        roundNumber: room.currentRound,
        totalRounds: TOTAL_ROUNDS,
        gameMode: room.gameMode
    });

    clearInterval(room.timer);
    room.timer = setInterval(() => {
        room.timeLeft--;
        io.to(roomId).emit('timerUpdate', room.timeLeft);

        if (room.timeLeft <= 0) {
            clearInterval(room.timer);
            io.to(roomId).emit('roundEnded', room.currentWord);
            setTimeout(() => startRound(roomId), 5000); 
        }
    }, 1000);
}

function endGame(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    room.state = 'ENDED';
    io.to(roomId).emit('gameOver', Object.values(room.players));
    delete rooms[roomId];
    emitRoomList();
}

function calculateWordleResult(guess, target) {
    const res = Array(5).fill('absent');
    const targetArr = target.split('');
    const guessArr = guess.split('');

    guessArr.forEach((char, i) => {
        if (char === targetArr[i]) {
            res[i] = 'correct';
            targetArr[i] = null;
            guessArr[i] = null;
        }
    });

    guessArr.forEach((char, i) => {
        if (char !== null && targetArr.includes(char)) {
            res[i] = 'present';
            targetArr[targetArr.indexOf(char)] = null;
        }
    });

    return res;
}

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor Goat Royale rodando na porta ${PORT}`);
});
