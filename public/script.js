const socket = io();

// LISTA VERIFICADA (Mesma do Servidor - Copia de segurança)
// Para economizar espaço e evitar erros de colagem, assumimos que a lista WORDS
// deve ser copiada EXATAMENTE do arquivo server.js acima e colada aqui.
// Vou incluir a lista completa aqui também para garantir que funcione ao copiar.

const CLIENT_WORDS = [
    "ABATA", "ABOCA", "ABRIR", "ABUSO", "ACASO", "ACATA", "ACENA", "ACESA", "ACESO", "ACIMA",
    "ACIDO", "ACOAR", "ACOES", "ACOLA", "ACULA", "ACURA", "ADEUS", "ADENDO", "ADIAR", "ADIAS",
    "ADIDO", "ADIMO", "ADIOS", "ADIRA", "ADORA", "ADVER", "ADVEM", "ADVIR", "AEDOS", "AEREO",
    "AFAGO", "AFETO", "AFINS", "AFLAR", "AFORA", "AGAPE", "AGIDA", "AGITO", "AGNUS", "AGORA",
    "AGORO", "AGUDA", "AGUDO", "AGUIA", "AINDA", "AJEJO", "AJUDA", "ALADO", "ALBUM", "ALCAS",
    "ALGAS", "ALGOZ", "ALGUM", "ALHEIA", "ALHOS", "ALIAS", "ALIBI", "ALMAS", "ALOES", "ALOJA",
    "ALPES", "ALTAR", "ALUDE", "ALUNA", "ALUNO", "AMADA", "AMADO", "AMAGO", "AMANA", "AMARA",
    "AMBOS", "AMBAS", "AMENA", "AMENO", "AMIGA", "AMIGO", "AMORA", "AMPLO", "ANAIS", "ANCA",
    "ANCIA", "ANDAR", "ANEIS", "ANELO", "ANEXO", "ANIMA", "ANIMO", "ANJOS", "ANSIA", "ANTES",
    "ANTRO", "ANUAL", "ANUIR", "ANULA", "AONDE", "APEAR", "APEEI", "APEGO", "APELO", "APICE",
    "APITO", "APOIA", "APOIO", "APONA", "APTOS", "AQUEM", "AQUEU", "ARACA", "ARADO", "ARAME",
    "ARARA", "ARCAR", "ARCOS", "ARDEA", "ARDIL", "ARDIS", "ARDOR", "ARDUO", "AREIA", "ARELAS",
    "ARENA", "ARFAR", "ARIDO", "ARIO", "AROMA", "ARRAS", "ARROZ", "ARTES", "ARTUR", "ASILO",
    "ASSAZ", "ASSAR", "ASSIM", "ASTIL", "ASTRO", "ATALHO", "ATEIA", "ATEUS", "ATIMO", "ATLAS",
    "ATIVE", "ATOCHA", "ATRAS", "ATRIO", "ATROZ", "ATUAL", "ATUAR", "ATURO", "AUDAZ", "AUDIO",
    "AURAS", "AUREA", "AUREO", "AUTOS", "AUTOR", "AVARO", "AVAIA", "AVEIA", "AVELA", "AVEXA",
    "AVIAO", "AVIAR", "AVIDA", "AVIDE", "AVIDO", "AVINA", "AVISO", "AXIAL", "AXILA", "AZEDO",
    "AZUIS", "BABAR", "BACIA", "BACON", "BAFOS", "BAILE", "BAIAO", "BAIXA", "BAIXO", "BAJUS",
    "BALAS", "BALAO", "BALDA", "BALDE", "BALIR", "BALSA", "BAMBU", "BANAL", "BANCA", "BANCO",
    "BANDA", "BANDO", "BANHO", "BANIR", "BANTO", "BANZO", "BARAU", "BARBA", "BARCO", "BARRA",
    "BARRO", "BARAO", "BASES", "BASTA", "BATER", "BATOM", "BAURU", "BAZAR", "BEATA", "BEATO",
    "BEBER", "BECOS", "BEDEL", "BEIJA", "BEIJO", "BEIRA", "BELAS", "BELOS", "BENCA", "BENTO",
    "BERCO", "BERRO", "BESTA", "BICHOS", "BICOS", "BINOC", "BINGO", "BIOMA", "BIQUE", "BIRRA",
    "BISPO", "BLASE", "BLASF", "BLATER", "BLEFE", "BLOCO", "BLUSA", "BOATE", "BOATO", "BOCAL",
    "BODES", "BOFES", "BOIAS", "BOINA", "BOLAS", "BOLDO", "BOLHA", "BOLOS", "BOLSA", "BOLSO",
    "BOMBA", "BONDE", "BONES", "BONUS", "BORDA", "BORDO", "BORRA", "BOSSA", "BOTAO", "BOTAR",
    "BRABO", "BRACO", "BRADO", "BRASA", "BRAVA", "BRAVO", "BREGA", "BREJO", "BREVE", "BRIGA",
    "BRIOS", "BRISA", "BROCA", "BROTO", "BRUMA", "BRUTA", "BRUTO", "BRUXA", "BUCAL", "BUCHA",
    "BUCHO", "BUGRE", "BULAM", "BULIR", "BUQUE", "BURIL", "BURLA", "BURRA", "BURRO", "BUSCA",
    "BUSTO", "BUUNO", "CABAL", "CABER", "CABOS", "CABRA", "CACAU", "CACAO", "CACHO", "CACOA",
    "CAIXA", "CALCA", "CALCO", "CALDA", "CALDO", "CALHA", "CALMA", "CALMO", "CALOR", "CALVA",
    "CALVO", "CAMPA", "CAMPO", "CANAL", "CANCE", "CANIL", "CANJA", "CANOA", "CANSO", "CANTE",
    "CANTO", "CANZO", "CAPAZ", "CAPUZ", "CARDA", "CARGA", "CARMA", "CARNE", "CARGO", "CARRO",
    "CARTA", "CASAL", "CASAR", "CASCA", "CASCO", "CASTA", "CASTO", "CATRE", "CAUDA", "CAULE",
    "CAUSA", "CAUSO", "CAVOS", "CEDER", "CEGAS", "CEIFA", "CEITA", "CEIAS", "CEIFO", "CENAS",
    "CENHO", "CENSO", "CENTO", "CERCA", "CERCO", "CERNE", "CERNI", "CERTO", "CESTA", "CETIM",
    "CETRO", "CHAGA", "CHALE", "CHAMA", "CHAPA", "CHATA", "CHATO", "CHAVE", "CHEFE", "CHEIA",
    "CHEIO", "CHEIRO", "CHIAS", "CHINA", "CHORO", "CHOCA", "CHULA", "CHULO", "CHUMBO", "CHUTE",
    "CHUVA", "CICLO", "CIDRA", "CIFRA", "CINDA", "CINTO", "CINZA", "CIOSO", "CIRCO", "CISAO",
    "CISMA", "CITAR", "CIVEL", "CIVIL", "CIUME", "CLAME", "CLARA", "CLARO", "CLASSE", "CLAVA",
    "CLEAN", "CLERO", "CLIMA", "CLINA", "CLOSE", "CLUBE", "COAVA", "COBRA", "COBRE", "COCA",
    "COCAR", "COCHO", "COELHO", "COESO", "COEVA", "COEVO", "COFRE", "COIBA", "COIFA", "COISA",
    "COITE", "COITO", "COLAR", "COMER", "COMIA", "COMBO", "COMUM", "CONDE", "CONTE", "CONTO",
    "CONVEM", "COPAS", "COPIA", "COPOS", "CORAG", "CORAL", "CORAR", "CORDA", "CORJA", "COROA",
    "CORPO", "CORSO", "CORTE", "CORVO", "COSER", "COSMO", "COSTA", "COURO", "COUSA", "COVEM",
    "COVER", "COVIL", "COXA", "COZER", "CRASE", "CRAVO", "CREDO", "CREEM", "CREME", "CRIAR",
    "CRISE", "CRIVO", "CRIME", "CRUEL", "CRUZ", "CUBO", "CUIA", "CUIDAR", "CULPA", "CULTO",
    "CUNHA", "CUNHO", "CUPOM", "CURSO", "CURTA", "CURTO", "CURVA", "CUSPO", "CUSTO", "CUTIS",
    "DADOS", "DAMAS", "DANCA", "DAQUI", "DARDO", "DATAS", "DEBA", "DECAI", "DECOA", "DEDOS",
    "DEGAS", "DEIXA", "DEMAO", "DENGO", "DENSO", "DENTE", "DEPOR", "DERAM", "DESDE", "DESSE",
    "DESTA", "DESTE", "DETEM", "DETER", "DEUSA", "DEVAM", "DEVAS", "DEVEM", "DEVER", "DEVES",
    "DEVIA", "DEVIO", "DEVIR", "DIABO", "DIANTE", "DICAS", "DIETA", "DIGAM", "DIGNA", "DIGNO",
    "DIQUE", "DISCO", "DIULA", "DIVAS", "DIZER", "DIZEM", "DOBRA", "DOBRE", "DOCES", "DOCIL",
    "DOGMA", "DOIDO", "DOLAR", "DOMAR", "DONAS", "DORSO", "DOSE", "DOUTO", "DRAMA", "DROGA",
    "DROPS", "DUBIO", "DUELO", "DUETO", "DUNAS", "DUPLO", "DUQUE", "DURAS", "EBANO", "ECOAR",
    "EDEMA", "EDITA", "EGIDE", "EGITO", "EIVAI", "EIXOS", "ELEVA", "ELIDA", "ELIDE", "ELITE",
    "ELMOS", "EMAIL", "EMITA", "EMPOS", "ENCER", "ENFIM", "ENJOO", "ENSAR", "ENSEJO", "ENTAO",
    "ENTRA", "ENTRE", "ENVIA", "ENVIO", "EPICO", "EPIST", "EPOCA", "ERETO", "ERGAS", "ERROS",
    "ESCAL", "ESCOL", "ESCOE", "ESGAR", "ESMAA", "ESTAO", "ESTAR", "ESTIA", "ESTIO", "ETAPA",
    "ETICA", "ETICO", "ETNIA", "EXAME", "EXARA", "EXATA", "EXATO", "EXIBA", "EXIGE", "EXIJO",
    "EXIME", "EXITO", "EXODO", "EXPOR", "EXTRA", "FABRO", "FACAO", "FACIL", "FACAM", "FACTO",
    "FAINA", "FAIXA", "FALAR", "FALAS", "FALHA", "FALIR", "FALTA", "FALSO", "FAMOS", "FARAO",
    "FARDA", "FARDO", "FAROL", "FARPA", "FARTA", "FARTO", "FATAL", "FATOR", "FATOS", "FATUO",
    "FAUNA", "FAVOR", "FAZER", "FAZES", "FAZIA", "FEIAS", "FEIRA", "FEITA", "FEITO", "FEIXE",
    "FELIZ", "FENDA", "FERIR", "FEROZ", "FERPA", "FERRO", "FERVE", "FESTA", "FEUDO", "FIADO",
    "FIAIS", "FIAPO", "FICHA", "FICAR", "FIEIS", "FILAS", "FILHO", "FILME", "FINAL", "FINDA",
    "FINDO", "FINJO", "FINOS", "FINTA", "FIRMA", "FITA", "FIXAR", "FLORA", "FLUIR", "FLUXO",
    "FOCAO", "FOCAR", "FOFAS", "FOFOCA", "FOGAO", "FOLGA", "FOLHA", "FOLIA", "FOLIO", "FONTE",
    "FORA", "FORAM", "FORCA", "FOREM", "FORMA", "FORRO", "FORTE", "FOSCA", "FOSCO", "FOSSE",
    "FOSSO", "FRACO", "FRADE", "FRASE", "FREIO", "FRETE", "FREVO", "FRITA", "FROTA", "FRUTA",
    "FRUTO", "FUGAZ", "FUGIR", "FUGIU", "FUNDO", "FUNES", "FUNIL", "FURAR", "FURIA", "FUROU",
    "FUROR", "FUSCA", "FUTIL", "FUZIL", "GABAR", "GADUA", "GAIAS", "GALHO", "GAMA", "GANHO",
    "GARBO", "GARRA", "GASTO", "GATAS", "GEDAS", "GELO", "GEMA", "GEMER", "GENIO", "GENRO",
    "GENTE", "GERAI", "GERAL", "GERIA", "GERIR", "GESTO", "GINGA", "GIRAR", "GLEBA", "GLOBO",
    "GLOSA", "GOLFE", "GOLFO", "GOLPE", "GORRO", "GOSMA", "GOSTA", "GOSTO", "GRACA", "GRAMA",
    "GRANA", "GRATA", "GRATO", "GRAUS", "GRAVE", "GRIFO", "GRIPE", "GROTA", "GRUPO", "GRUTA",
    "GUETO", "GUIAR", "GUISA", "GUIZO", "GURIA", "HABIL", "HAREM", "HASTE", "HAURE", "HAVER",
    "HAVIA", "HEROI", "HIATO", "HIFEN", "HIENA", "HINOS", "HIRTO", "HOBBY", "HOMEM", "HONRA",
    "HORDA", "HORTA", "HORTO", "HOSTE", "HOTEL", "HOUVE", "HUMOR", "ICACO", "ICONE", "IDEAR",
    "IDEIA", "IDEAL", "IDOLA", "IDOLO", "IDONE", "IDOSO", "IGNEO", "IGNES", "IGUAL", "ILHAS",
    "ILESO", "IMITA", "IMPOR", "IMUNE", "INCHA", "INCOE", "INCAS", "INDEZ", "INDIO", "INGER",
    "INIBA", "INATO", "INTER", "INVES", "IOGUE", "IRADO", "IRIS", "IRMAO", "ISPIO", "ITENS",
    "JABOS", "JANTA", "JASPE", "JAULA", "JAZER", "JAZIA", "JECAS", "JEDAS", "JEITO", "JEJUM",
    "JEMBE", "JIPES", "JIRAU", "JOGAR", "JOGOS", "JOIAS", "JOVEM", "JUDEU", "JUIZA", "JUIZO",
    "JULGO", "JULIA", "JUNCO", "JUNTA", "JUROS", "JURIN", "JURAR", "JURIA", "JUROU", "JUSTA",
    "JUSTO", "LABIA", "LABOR", "LAGOS", "LAICO", "LAMBA", "LAMES", "LAMPA", "LANAR", "LAPIS",
    "LAPSO", "LARGO", "LARVA", "LASSO", "LATES", "LATIR", "LAUDO", "LAVRA", "LAVOR", "LAZER",
    "LEAIS", "LEGAL", "LEGUA", "LEIGO", "LEITE", "LEITO", "LENDA", "LENTO", "LESMA", "LESAO",
    "LESSE", "LESTO", "LETAL", "LETRA", "LEVAR", "LIAME", "LICAO", "LIDAR", "LIDER", "LIGAR",
    "LIMBO", "LIMPO", "LINDA", "LINDO", "LINHA", "LIRA", "LIRAS", "LIVRE", "LIVRO", "LIXAO",
    "LOCAO", "LOCAL", "LOCUS", "LOGAR", "LOGIA", "LOGOS", "LOGRA", "LOGRO", "LOIRA", "LOMBA",
    "LONGE", "LONGO", "LOTES", "LOUCA", "LOUCO", "LOUCA", "LOURO", "LUCRO", "LUGAR", "LUNAR",
    "LUTAR", "LUXAR", "LUXOS", "LUVAS", "MACAR", "MACAO", "MACIA", "MACIO", "MACRO", "MAGIA",
    "MAGNA", "MAGOA", "MAIOR", "MAJOR", "MALES", "MALHA", "MALSA", "MALTA", "MAMAE", "MANCO",
    "MANDA", "MANGA", "MANHA", "MANIA", "MANSA", "MANSO", "MANTO", "MAOME", "MARCA", "MARCO",
    "MARRA", "MASSA", "MATAR", "MATE", "MATIZ", "MEADA", "MEAO", "MECHA", "MEDIA", "MEDIR",
    "MEDOS", "MEIGA", "MEIGO", "MEIOS", "MEIAS", "MELAO", "MEMIS", "MENOR", "MENOS", "MERCÊ",
    "MESAS", "MESMA", "MESMO", "MESES", "METAL", "METIA", "METIE", "METRO", "MEXER", "MIDIA",
    "MILHA", "MILHO", "MIMAR", "MINAR", "MINHA", "MIOLO", "MIOPE", "MISSA", "MISTO", "MITOS",
    "MIXA", "MOCAS", "MOCAO", "MODA", "MODAL", "MOFOS", "MOIRA", "MOLDE", "MOLES", "MOLHO",
    "MONGE", "MONTA", "MONTE", "MORAL", "MORAR", "MORFO", "MORTE", "MORRO", "MORRE", "MOSTO",
    "MOTIM", "MOTOS", "MOVEL", "MOVER", "MUDAR", "MUITO", "MUNDO", "MURAL", "MUROS", "MURRA",
    "MUSEU", "MUSGO", "MUTUA", "MUTUO", "NACAO", "NACAR", "NADAR", "NADIR", "NAFTA", "NANOS",
    "NARCO", "NARIZ", "NARRA", "NASCE", "NATAL", "NATAS", "NAVAL", "NAVIO", "NEGAR", "NEGA",
    "NEGRO", "NENEM", "NESGA", "NESSA", "NESSE", "NESTA", "NESTE", "NETOS", "NEVE", "NICHO",
    "NIEVE", "NINFAS", "NINHO", "NIVEL", "NOBRE", "NOCAO", "NODOA", "NOITE", "NOIVA", "NOME",
    "NORMA", "NORTE", "NOSSA", "NOSSO", "NOTAR", "NOTAS", "NULAS", "NULOS", "NUNCA", "NUVEM",
    "NUDEZ", "OBESO", "OBICE", "OBITO", "OBRAS", "OBTER", "OBVIO", "OBSTA", "OCIOS", "OCREM",
    "OCASO", "ODIAR", "OITIS", "OLEO", "OLHAM", "OLHAR", "OLHOS", "ONDA", "ONCA", "ONTEM",
    "ONUS", "OPACO", "OPCAO", "OPIAM", "OPTAR", "OPTAS", "ORCAS", "ORDEM", "ORGAO", "ORNAR",
    "ORNES", "OSSO", "OSSOS", "OTICA", "OTICO", "OTIMO", "OUFAS", "OUCAS", "OURO", "OUSAR",
    "OUSAS", "OUTRA", "OUTRO", "OUVEM", "OUVIA", "OUVIR", "OUVIU", "OVADA", "OVADO", "OVAIS",
    "OXALA", "PACOS", "PACTO", "PADEI", "PAGAR", "PAGAO", "PAGUE", "PAIOL", "PAIRU", "PAIRA",
    "PALCO", "PALHA", "PAMPA", "PANCA", "PANGA", "PANOS", "PAPEL", "PARAR", "PARCO", "PARDA",
    "PARES", "PAREO", "PARIA", "PARTE", "PARVA", "PARVO", "PASMA", "PASMO", "PASSA", "PASSE",
    "PASSO", "PASTA", "PATAS", "PATIO", "PAUSA", "PAUTA", "PAZES", "PAVOR", "PECHA", "PEDIR",
    "PEDRA", "PEDRO", "PEGAR", "PEITA", "PEITO", "PEIXE", "PELOS", "PELVE", "PENA", "PENCA",
    "PENSO", "PENTA", "PENSO", "PERCO", "PERDA", "PERNA", "PERTO", "PERU", "PESAM", "PESAR",
    "PESCA", "PESTE", "PIADA", "PIAVA", "PICAR", "PICHE", "PIFAS", "PIFIO", "PILAR", "PILHA",
    "PINHO", "PINOS", "PINTA", "PIRAI", "PIRES", "PISAR", "PISTA", "PLACA", "PLAGA", "PLANA",
    "PLANO", "PLATO", "PLEBE", "PLENA", "PLENO", "PLUMA", "PLUMO", "PNEUS", "POCAS", "PODAR",
    "PODER", "PODIO", "POEMA", "POETA", "POLAR", "POLIS", "POMAR", "POMPA", "PONDE", "PONHA",
    "PONTE", "PONTO", "PORAO", "PORCA", "POREM", "PORTA", "PORTE", "POSAM", "POSSE", "POSSO",
    "POSTO", "POUCO", "POUSO", "PRACA", "PRADO", "PRAGA", "PRAIA", "PRATO", "PRAXE", "PRAZO",
    "PRECE", "PREGO", "PRECO", "PRESA", "PRESO", "PRETO", "PRIME", "PRIVE", "PROBO", "PROLE",
    "PROSA", "PROTO", "PROVA", "PRUMO", "PSICO", "PUDER", "PUDIM", "PUGNA", "PUIDO", "PULAR",
    "PULHA", "PUNHO", "PUNHA", "PUNES", "PURAS", "PURGA", "PUROS", "PUXAR", "QUAIS", "QUASE",
    "QUERO", "QUICA", "QUIETO", "QUILO", "QUOTA", "RACAM", "RACIO", "RADAR", "RADIO", "RAIAR",
    "RAIVA", "RAIO", "RALAR", "RAMOS", "RAMPA", "RANCO", "RANGO", "RANCO", "RAPAZ", "RAPTA",
    "RAROS", "RASOS", "RAZAO", "REACA", "REAGIR", "REATA", "RECEM", "RECUO", "REDOR", "REFEM",
    "REGER", "REGIO", "REGRA", "REINO", "RELES", "RELVA", "REME", "REMO", "RENDA", "RENTE",
    "REPOR", "RETER", "RETO", "RETRO", "RETER", "RETEM", "REVER", "REVES", "REZAR", "REZAS",
    "REZEI", "RICOS", "RIFAS", "RIGOR", "RIMA", "RISCO", "RISTE", "RITMO", "RITO", "ROCHA",
    "RODAS", "ROER", "ROGAR", "RONCA", "ROSAS", "ROTOS", "ROUCA", "ROUCO", "ROUPA", "RUBRO",
    "RUGE", "RUIDO", "RUIM", "RUINA", "RUMOR", "RUMO", "RURAL", "SABER", "SABIA", "SABIO",
    "SABOR", "SACAR", "SADIO", "SAGAO", "SAGAZ", "SAIAS", "SAIDA", "SAIRA", "SALDO", "SALMO",
    "SALSA", "SALTO", "SALVA", "SALVE", "SALVO", "SAMBA", "SANAR", "SANTO", "SAQUE", "SARAR",
    "SARAU", "SARCA", "SARGA", "SARJA", "SASSE", "SATIS", "SAUDA", "SAUDE", "SEARA", "SECAO",
    "SEGAR", "SEGUE", "SEIOS", "SEITA", "SEIVA", "SEIXO", "SELAR", "SELVA", "SENAO", "SENDA",
    "SENDO", "SENIL", "SENSO", "SENTA", "SENTE", "SERES", "SERIA", "SERIE", "SERRA", "SERVO",
    "SESTA", "SETAS", "SETOR", "SEXTA", "SEXTO", "SEXTA", "SICAR", "SIGLA", "SIGILO", "SIGNO",
    "SILVO", "SIMIO", "SINAL", "SINHA", "SINOS", "SINTO", "SIRVA", "SITIO", "SITUA", "SOBRE",
    "SOCAR", "SOCIO", "SODIO", "SOFAS", "SOFIA", "SOLAR", "SOLDA", "SOLDO", "SOLTA", "SOLTO",
    "SOMAR", "SONDA", "SONHO", "SONSA", "SONSO", "SOPRA", "SORRI", "SORTE", "SOSIA", "SOTAO",
    "SOVAR", "STAND", "SUADA", "SUAVE", "SUBIR", "SUCOS", "SUECO", "SUETA", "SUGAR", "SUGOU",
    "SUJOS", "SULCO", "SUMIR", "SUMO", "SUPER", "SUPOR", "SUPRA", "SURJA", "SURRA", "SURTO",
    "SUTIL", "SUTIA", "SWING", "TACAR", "TACAS", "TACAO", "TACHA", "TALAS", "TALAO", "TALCO",
    "TANGA", "TANGE", "TANTA", "TANTO", "TAPAR", "TARDE", "TARJA", "TATOS", "TAXAS", "TCHAU",
    "TECEL", "TECNO", "TECER", "TELAS", "TELHA", "TEMER", "TEMOR", "TEMOS", "TEMPO", "TENAZ",
    "TENDE", "TENDO", "TENIS", "TENRA", "TENRO", "TENSO", "TENTA", "TENTO", "TENUE", "TERAS",
    "TERCO", "TERMO", "TERNO", "TERRA", "TESAO", "TESTE", "TETRA", "TEXTO", "TIGRE", "TINHA",
    "TINTA", "TIRAR", "TICAO", "TITIO", "TIVER", "TOADA", "TOCAR", "TOCAS", "TODAS", "TODOS",
    "TOLOS", "TOMAR", "TONEL", "TONTO", "TOPAM", "TOPAR", "TOPO", "TOQUE", "TORCO", "TORNA",
    "TORPE", "TORSO", "TORTO", "TOSCO", "TOUCA", "TOURO", "TRACO", "TRAGA", "TRAGO", "TRAIR",
    "TRAJE", "TRAMA", "TRATO", "TRELA", "TRENS", "TRETA", "TREVA", "TREVO", "TRIBO", "TRIBUTO",
    "TRIGO", "TROCA", "TROCO", "TROLE", "TROPA", "TROCO", "TROCA", "TROCA", "TRUCO", "TRUPE",
    "TRUQUE", "TUAS", "TUBOS", "TUMBA", "TUNEL", "TURBA", "TURMA", "TURVA", "TURVO", "UBERE",
    "UIVOS", "UFANO", "UMAS", "UMEDO", "UMIDO", "UNIAO", "UNICA", "UNICO", "UNIDA", "UNIR",
    "URBAN", "URDIR", "URGIA", "URGIR", "URNAS", "USURA", "UTERO", "UTEIS", "VACUO", "VADIO",
    "VAGAR", "VAGAS", "VAGEM", "VAGUE", "VALER", "VALHA", "VALIA", "VALOR", "VALSA", "VARAO",
    "VARAR", "VARAS", "VAROA", "VARRE", "VASTA", "VASTO", "VAZAO", "VAZAS", "VAZIA", "VAZIO",
    "VEDAR", "VEDOU", "VELAM", "VELAR", "VELEI", "VELHA", "VELHO", "VELOZ", "VEMOS", "VENAL",
    "VENDA", "VENDO", "VENHA", "VENHO", "VENTO", "VENIA", "VERAO", "VERBA", "VERBO", "VERDE",
    "VERGA", "VERSA", "VERSO", "VERVE", "VETAR", "VETOR", "VEZES", "VICIO", "VIDAS", "VIDEO",
    "VIGIA", "VIGER", "VIGOR", "VILAO", "VIMOS", "VINHA", "VINHO", "VIRAM", "VIRAO", "VIRAR",
    "VIRIA", "VIRIL", "VIROU", "VIRUS", "VISAM", "VISAO", "VISAR", "VISSE", "VISTA", "VISTO",
    "VITAL", "VIUVA", "VIVAZ", "VIVER", "VOCAL", "VOILA", "VOLTA", "VOLTE", "VORAZ", "VOSSO",
    "VOTOS", "VULGO", "VULTO", "XALE", "XAMPU", "XEQUE", "XIBIU", "XINGA", "XISTO", "XUCRO",
    "ZANGA", "ZELAR", "ZELO", "ZIPER", "ZUMBI"
];

// === ESTADO ===
let currentRoomId = null;
let currentRow = 0;
let currentTile = 0;
let currentGuess = "";
let isGameActive = false;
let isRoundSolved = false;
let myPlayerId = null;

// Estado do Chat
let isChatVisible = true;
let silencedPlayers = new Set(); 

// === DOM ===
const screens = {
    login: document.getElementById('login-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen')
};

const messageArea = document.getElementById('message-area');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('btn-send-chat');
const chatToggleBtn = document.getElementById('btn-toggle-chat'); 
const chatContainer = document.getElementById('chat-container');

// Modais e Botões
const leaveBtn = document.getElementById('btn-leave-match');
const leaveModal = document.getElementById('confirm-leave-overlay');
const cancelLeaveBtn = document.getElementById('btn-cancel-leave');
const confirmLeaveBtn = document.getElementById('btn-confirm-leave');

// === LISTENERS ===

document.getElementById('btn-create').addEventListener('click', () => {
    const name = document.getElementById('username').value.trim();
    const checkbox = document.getElementById('public-room-check');
    const isPublic = checkbox ? checkbox.checked : false;
    
    if (!name) return alert('Por favor, digite seu nome!');
    socket.emit('createRoom', { playerName: name, isPublic: isPublic });
});

document.getElementById('btn-join').addEventListener('click', () => {
    const name = document.getElementById('username').value.trim();
    const code = document.getElementById('room-code-input').value.trim();
    if (!name || !code) return alert('Digite nome e código!');
    socket.emit('joinRoom', { roomId: code, playerName: name });
});

// Iniciar Jogo com Modo Selecionado
document.getElementById('btn-start-game').addEventListener('click', () => {
    const modeSelect = document.querySelector('input[name="game-mode"]:checked');
    const selectedMode = modeSelect ? modeSelect.value : 'default';
    socket.emit('startGame', { roomId: currentRoomId, gameMode: selectedMode });
});

document.getElementById('btn-restart').addEventListener('click', () => {
    location.reload();
});

// === CONTROLES DE CHAT ===

// 1. Alternar Visibilidade do Chat
if(chatToggleBtn) {
    chatToggleBtn.addEventListener('click', () => {
        isChatVisible = !isChatVisible;
        const icon = chatToggleBtn.querySelector('.material-icons');
        if (isChatVisible) {
            chatContainer.style.display = 'flex';
            icon.innerText = 'chat';
            chatToggleBtn.style.opacity = '1';
        } else {
            chatContainer.style.display = 'none';
            icon.innerText = 'chat_bubble_outline';
            chatToggleBtn.style.opacity = '0.5';
        }
    });
}

// 2. Função Global para Silenciar
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

function sendChatMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    socket.emit('chatMessage', { roomId: currentRoomId, msg: msg });
    chatInput.value = "";
    chatInput.focus();
}
if(chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
if(chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });

// === SAÍDA ===
if(leaveBtn) leaveBtn.addEventListener('click', () => leaveModal.classList.remove('hidden'));
if(cancelLeaveBtn) cancelLeaveBtn.addEventListener('click', () => leaveModal.classList.add('hidden'));
if(confirmLeaveBtn) confirmLeaveBtn.addEventListener('click', () => {
    leaveModal.classList.add('hidden');
    socket.emit('leaveMatch', currentRoomId);
});
socket.on('matchLeft', () => window.location.reload());

// === SOCKET EVENTOS ===

socket.on('roomJoined', (data) => {
    currentRoomId = data.roomId;
    myPlayerId = data.playerId;
    switchScreen('lobby');
    document.getElementById('lobby-code').innerText = data.roomId;
    
    // Controles do Host
    const hostControls = document.getElementById('host-controls');
    const waitingMsg = document.getElementById('waiting-msg');
    
    if (data.isHost) {
        if(hostControls) hostControls.style.display = 'block';
        if(waitingMsg) waitingMsg.style.display = 'none';
    } else {
        if(hostControls) hostControls.style.display = 'none';
        if(waitingMsg) waitingMsg.style.display = 'block';
    }
});

socket.on('updateRoomList', (availableRooms) => {
    const listContainer = document.getElementById('room-list-items');
    if (!listContainer) return;
    listContainer.innerHTML = ''; 
    if (availableRooms.length === 0) {
        listContainer.innerHTML = '<p style="color: #666; font-size: 0.9rem;">Nenhuma sala pública encontrada.</p>';
        return;
    }
    availableRooms.forEach(room => {
        const div = document.createElement('div');
        div.className = 'room-item';
        const modeBadge = room.gameMode === 'competitive' ? '🏆 Competitivo' : '⚔️ Battle Royale';
        div.innerHTML = `
            <div class="room-info">
                <strong>${room.hostName} <span style="font-size:0.7em; color:#eab308">${modeBadge}</span></strong>
                <span>${room.playerCount}/${room.maxPlayers} Jogadores</span>
            </div>
            <button class="btn-join-room">ENTRAR</button>
        `;
        div.addEventListener('click', () => {
            document.getElementById('room-code-input').value = room.id;
            const nameInput = document.getElementById('username');
            if(!nameInput.value) nameInput.focus();
            else document.getElementById('btn-join').focus();
        });
        listContainer.appendChild(div);
    });
});

socket.on('updatePlayerList', (players) => {
    updateLobbyList(players);
    updateGameScoreboard(players);
});
socket.on('updateScoreboard', (players) => {
    updateGameScoreboard(players);
});
socket.on('gameStarted', () => {
    switchScreen('game');
    createGrid();
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
});

// Handler de Chat
socket.on('chatMessage', (data) => {
    if (silencedPlayers.has(data.playerId)) return;

    const chatBox = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-usr-msg';
    
    let muteControl = '';
    if (data.playerId !== myPlayerId) {
        muteControl = `<span class="material-icons mute-btn" onclick="toggleMute('${data.playerId}', this)" title="Silenciar">volume_up</span>`;
    }

    div.innerHTML = `${muteControl} <span class="chat-name">${data.playerName}:</span> ${data.msg}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on('newRound', (data) => {
    resetRoundUI(data.roundNumber, data.totalRounds);
    isGameActive = true;
    isRoundSolved = false;
});
socket.on('timerUpdate', (time) => {
    const timerEl = document.getElementById('timer');
    if(timerEl) {
        timerEl.innerText = time;
        timerEl.style.color = time <= 10 ? '#e11d48' : '#eab308';
    }
});
socket.on('guessResult', ({ guess, result }) => {
    paintRow(currentRow, guess, result);
    updateKeyboard(guess, result);
    const isCorrect = result.every(r => r === 'correct');
    if (isCorrect) {
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
socket.on('roundSuccess', (msg) => { setTimeout(() => { showMessage(msg, "#22c55e"); }, 1500); });
socket.on('roundEnded', (word) => { isGameActive = false; if(!isRoundSolved) showMessage(`A palavra era: ${word}`, "#ffffff"); });
socket.on('gameOver', (players) => {
    const overlay = document.getElementById('game-over-overlay');
    const resultsDiv = document.getElementById('final-results');
    const title = document.getElementById('game-over-title');
    players.sort((a, b) => b.score - a.score);
    const winner = players[0];
    if(title) title.innerHTML = `<span style="color:#eab308">${winner.name}</span> É O GOAT 🐐`;
    resultsDiv.innerHTML = players.map((p, i) => `<div style="margin: 10px; font-size: 1.2rem;">${i===0 ? '👑' : `#${i+1}`} <strong>${p.name}</strong>: ${p.score} pts</div>`).join('');
    overlay.classList.remove('hidden');
});
socket.on('error', (msg) => alert(msg));

// UI FUNCTIONS
function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}
function updateLobbyList(players) {
    const list = document.getElementById('player-list-lobby');
    if(list) list.innerHTML = players.map(p => `<li>${p.name}</li>`).join('');
}
function updateGameScoreboard(players) {
    const list = document.getElementById('live-score-list');
    if (!list) return;
    players.sort((a, b) => b.score - a.score);
    list.innerHTML = players.map((p, i) => `<li><span>${i+1}. ${p.name}</span><span style="font-weight:bold; color:#eab308">${p.score}</span></li>`).join('');
}
function createGrid() {
    const grid = document.getElementById('grid');
    if(!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.className = 'grid-row';
        for (let j = 0; j < 5; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i}-${j}`;
            row.appendChild(tile);
        }
        grid.appendChild(row);
    }
}
function resetRoundUI(round, total) {
    currentRow = 0;
    currentTile = 0;
    currentGuess = "";
    document.getElementById('round-display').innerText = `${round}/${total}`;
    messageArea.innerText = "";
    messageArea.style.opacity = "0";
    document.querySelectorAll('.tile').forEach(t => { t.innerText = ''; t.className = 'tile'; t.style.animation = 'none'; t.style.transform = 'none'; });
    document.querySelectorAll('#keyboard button').forEach(btn => { const key = btn.dataset.key; btn.className = (key === 'ENTER' || key === 'BACKSPACE') ? 'wide-key action-btn' : ''; });
}
function showMessage(msg, color="white") {
    messageArea.innerText = msg;
    messageArea.style.color = color;
    messageArea.style.opacity = '1';
}
document.addEventListener('keydown', (e) => {
    if (!isGameActive || isRoundSolved) return;
    if (document.activeElement === chatInput) return;
    const key = e.key.toUpperCase();
    if (key === 'ENTER') handleInput('ENTER');
    else if (key === 'BACKSPACE') handleInput('BACKSPACE');
    else if (/^[A-Z]$/.test(key)) handleInput(key);
});
document.querySelectorAll('#keyboard button').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); if (!isGameActive || isRoundSolved) return; handleInput(btn.dataset.key); });
});
function handleInput(key) {
    if (key === 'ENTER') { submitGuess(); return; }
    if (key === 'BACKSPACE') {
        if (currentTile > 0) { currentTile--; currentGuess = currentGuess.slice(0, -1); const tile = document.getElementById(`tile-${currentRow}-${currentTile}`); tile.innerText = ''; tile.classList.remove('filled'); }
        return;
    }
    if (currentTile < 5) { const tile = document.getElementById(`tile-${currentRow}-${currentTile}`); tile.innerText = key; tile.classList.add('filled'); currentGuess += key; currentTile++; }
}
function submitGuess() {
    if (currentGuess.length !== 5) { showMessage("Muito curta!", "#eab308"); setTimeout(() => { if(messageArea.innerText === "Muito curta!") { messageArea.innerText = ""; messageArea.style.opacity = "0"; } }, 1500); return; }
    if (!CLIENT_WORDS.includes(currentGuess)) {
        showMessage("Palavra inválida", "#e11d48");
        const row = document.querySelector(`#grid .grid-row:nth-child(${currentRow + 1})`);
        row.style.transform = "translateX(5px)"; setTimeout(() => row.style.transform = "translateX(-5px)", 100); setTimeout(() => row.style.transform = "none", 200);
        setTimeout(() => { if (messageArea.innerText === "Palavra inválida") { messageArea.innerText = ""; messageArea.style.opacity = "0"; } }, 1500);
        return;
    }
    socket.emit('submitGuess', { roomId: currentRoomId, guess: currentGuess });
}
function paintRow(rowIdx, guess, result) {
    for (let i = 0; i < 5; i++) { const tile = document.getElementById(`tile-${rowIdx}-${i}`); setTimeout(() => { tile.classList.add(result[i]); tile.style.animation = "pop 0.3s ease"; }, i * 150); }
}
function updateKeyboard(guess, result) {
    for (let i = 0; i < 5; i++) {
        const letter = guess[i]; const status = result[i]; const btn = document.querySelector(`button[data-key="${letter}"]`);
        if (btn) {
            if (status === 'correct') btn.className = 'correct';
            else if (status === 'present' && !btn.classList.contains('correct')) btn.className = 'present';
            else if (status === 'absent' && !btn.classList.contains('correct') && !btn.classList.contains('present')) btn.className = 'absent';
        }
    }
}
