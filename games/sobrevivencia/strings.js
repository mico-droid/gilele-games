// Apagão: Sobreviva — textos PT/EN/ES. Formato: chave: [pt, en, es].
// Chaves terminadas em "_k" são a versão infantil (até 12 anos) e substituem a normal quando existem.
import { addStrings, t } from "../../engine/ez.js";

const S = {
  title: ["Apagão: Sobreviva", "Blackout: Survive", "Apagón: Sobrevive"],
  sub: ["Capítulo 1 · As primeiras 72 horas", "Chapter 1 · The first 72 hours", "Capítulo 1 · Las primeras 72 horas"],
  newGame: ["Novo jogo", "New game", "Nuevo juego"],
  continue: ["Continuar", "Continue", "Continuar"],
  mode: ["Modo", "Mode", "Modo"],
  m_real: ["🌑 Apagão Real", "🌑 Real Blackout", "🌑 Apagón Real"],
  m_learn: ["📚 Aprendizado", "📚 Learning", "📚 Aprendizaje"],
  map: ["Mapa", "Map", "Mapa"],
  map_gyn: ["🟤 Goiânia (Cerrado)", "🟤 Goiânia (Cerrado)", "🟤 Goiânia (Cerrado)"],
  map_rio: ["🟢 Rio de Janeiro (Mata Atlântica)", "🟢 Rio de Janeiro (Atlantic Forest)", "🟢 Río de Janeiro (Mata Atlántica)"],
  age: ["Idade", "Age", "Edad"],
  age_kid: ["Até 12 anos", "Up to 12", "Hasta 12 años"],
  age_teen: ["13 anos ou mais", "13 or older", "13 años o más"],
  diff: ["Dificuldade", "Difficulty", "Dificultad"],
  d_easy: ["Fácil", "Easy", "Fácil"],
  d_hard: ["Difícil", "Hard", "Difícil"],
  d_easyInfo: ["Ao desmaiar, você acorda em casa e perde parte da mochila.", "If you pass out, you wake up at home and lose part of your backpack.", "Si te desmayas, despiertas en casa y pierdes parte de la mochila."],
  d_hardInfo: ["Tudo acaba mais rápido. Se cair, recomeça do Dia 0.", "Everything runs out faster. If you fall, you restart from Day 0.", "Todo se acaba más rápido. Si caes, vuelves al Día 0."],
  soon: ["em breve", "coming soon", "pronto"],
  start: ["Começar", "Start", "Empezar"],
  intro: ["Fim de tarde de um dia comum. Algo estranho está no noticiário. Você tem pouco tempo antes de a energia cair — e ninguém sabe quando ela volta.", "Late afternoon on an ordinary day. Something strange is on the news. You have little time before the power goes out — and nobody knows when it comes back.", "Final de la tarde de un día común. Algo extraño sale en las noticias. Tienes poco tiempo antes de que se corte la luz — y nadie sabe cuándo vuelve."],
  help: ["WASD/setas: andar · E: interagir · I: mochila · F: lanterna · Q: celular · Arraste: câmera", "WASD/arrows: move · E: interact · I: backpack · F: flashlight · Q: phone · Drag: camera", "WASD/flechas: mover · E: interactuar · I: mochila · F: linterna · Q: celular · Arrastra: cámara"],

  // HUD
  day: ["Dia {d}", "Day {d}", "Día {d}"],
  powerOn: ["⚡ Energia normal", "⚡ Power on", "⚡ Luz normal"],
  powerOff: ["🔌 Apagão · {h} h", "🔌 Blackout · {h} h", "🔌 Apagón · {h} h"],
  s_food: ["Fome", "Food", "Hambre"], s_water: ["Sede", "Water", "Sed"], s_energy: ["Energia", "Energy", "Energía"], s_health: ["Saúde", "Health", "Salud"], s_mood: ["Ânimo", "Mood", "Ánimo"],
  kg: ["{w}/{m} kg", "{w}/{m} kg", "{w}/{m} kg"],
  goals: ["Kit 72 horas", "72-hour kit", "Kit 72 horas"],
  inCrowd: ["⚠️ Aglomeração! Saia daqui.", "⚠️ Crowd! Get out of here.", "⚠️ ¡Aglomeración! Sal de aquí."],

  // Goals
  g_cash: ["Ter R$ 100 em dinheiro vivo", "Have R$ 100 in cash", "Tener R$ 100 en efectivo"],
  g_fuel: ["Combustível (tanque ou galão)", "Fuel (tank or can)", "Combustible (tanque o bidón)"],
  g_water: ["Guardar 10 L de água", "Store 10 L of water", "Guardar 10 L de agua"],
  g_food: ["4 porções de comida que não estraga", "4 portions of food that won't spoil", "4 porciones de comida que no se echa a perder"],
  g_light: ["Lanterna com pilhas", "Flashlight with batteries", "Linterna con pilas"],
  g_radio: ["Rádio funcionando", "Working radio", "Radio funcionando"],
  g_phone: ["Combinar ponto de encontro com a família", "Agree on a meeting point with family", "Acordar un punto de encuentro con la familia"],
  g_charge: ["Celular carregado (80%+)", "Phone charged (80%+)", "Celular cargado (80%+)"],

  // Interactables
  i_fridge: ["Geladeira", "Fridge", "Nevera"], i_cupboard: ["Armário", "Cupboard", "Armario"], i_sink: ["Torneira da cozinha", "Kitchen tap", "Grifo de la cocina"],
  i_stove: ["Fogão", "Stove", "Estufa"], i_bed: ["Cama", "Bed", "Cama"], i_shelf: ["Estante e tomada", "Shelf and outlet", "Estante y enchufe"],
  i_store: ["Água guardada em casa", "Water stored at home", "Agua guardada en casa"], i_yard: ["Quintal", "Backyard", "Patio"], i_car: ["Seu carro", "Your car", "Tu coche"],
  i_atm: ["Caixa eletrônico", "ATM", "Cajero automático"], i_market: ["Mercado", "Supermarket", "Supermercado"], i_pharma: ["Farmácia", "Pharmacy", "Farmacia"],
  i_gas: ["Posto de combustível", "Gas station", "Gasolinera"], i_ze: ["Seu Zé (vizinho, 82 anos)", "Mr. Zé (neighbor, 82)", "Don Zé (vecino, 82 años)"],
  i_cida: ["Dona Cida (vizinha)", "Ms. Cida (neighbor)", "Doña Cida (vecina)"], i_valdir: ["Seu Valdir (vizinho)", "Mr. Valdir (neighbor)", "Don Valdir (vecino)"],
  i_tower: ["Torre de celular", "Cell tower", "Torre de celular"], i_hospital: ["Hospital", "Hospital", "Hospital"], i_bus: ["Ponto de ônibus", "Bus stop", "Parada de autobús"],
  l_market: ["MERCADO", "MARKET", "MERCADO"], l_pharma: ["FARMÁCIA", "PHARMACY", "FARMACIA"], l_bank: ["BANCO 24h", "ATM 24h", "CAJERO 24h"], l_gas: ["POSTO", "GAS", "GASOLINERA"], l_square: ["Praça", "Square", "Plaza"], l_home: ["Sua casa", "Your home", "Tu casa"],

  // Items
  it_water: ["Água (L)", "Water (L)", "Agua (L)"], it_bottle: ["Garrafa vazia", "Empty bottle", "Botella vacía"], it_can: ["Enlatado", "Canned food", "Lata de comida"],
  it_biscuit: ["Biscoito", "Crackers", "Galletas"], it_rice: ["Arroz (porção, cozinhar)", "Rice (portion, cook it)", "Arroz (porción, cocinar)"],
  it_bread: ["Pão", "Bread", "Pan"], it_meat: ["Carne (geladeira)", "Meat (fridge)", "Carne (nevera)"], it_milk: ["Leite (geladeira)", "Milk (fridge)", "Leche (nevera)"],
  it_fruit: ["Banana", "Banana", "Plátano"], it_cooked: ["Prato quente", "Hot meal", "Plato caliente"], it_spoiled: ["Comida estragada", "Spoiled food", "Comida echada a perder"],
  it_flash: ["Lanterna", "Flashlight", "Linterna"], it_batt: ["Pilhas (pacote)", "Batteries (pack)", "Pilas (paquete)"], it_candle: ["Vela", "Candle", "Vela"],
  it_matches: ["Fósforos", "Matches", "Fósforos"], it_radio: ["Rádio a pilha", "Battery radio", "Radio a pilas"], it_pbank: ["Carregador portátil", "Power bank", "Batería portátil"],
  it_docs: ["Documentos", "Documents", "Documentos"], it_kit: ["Kit de primeiros socorros", "First-aid kit", "Botiquín"], it_ors: ["Soro de reidratação", "Oral rehydration salts", "Suero oral"],
  it_gascan: ["Galão de gasolina (5 L)", "Gas can (5 L)", "Bidón de gasolina (5 L)"],

  // Actions
  a_take: ["Pegar", "Take", "Tomar"], a_takeAll: ["Pegar tudo", "Take all", "Tomar todo"], a_eat: ["Comer", "Eat", "Comer"], a_drink: ["Beber 0,5 L", "Drink 0.5 L", "Beber 0,5 L"],
  a_use: ["Usar", "Use", "Usar"], a_drop: ["Largar 1", "Drop 1", "Soltar 1"], a_buy: ["Comprar", "Buy", "Comprar"], a_leave: ["Sair", "Leave", "Salir"],
  empty: ["Vazio.", "Empty.", "Vacío."], full: ["Mochila pesada demais!", "Backpack too heavy!", "¡Mochila demasiado pesada!"],
  bag: ["🎒 Mochila", "🎒 Backpack", "🎒 Mochila"], cash: ["Dinheiro vivo: R$ {v}", "Cash: R$ {v}", "Efectivo: R$ {v}"], bank: ["No banco (cartão): R$ {v}", "In the bank (card): R$ {v}", "En el banco (tarjeta): R$ {v}"],
  noCash: ["Dinheiro vivo insuficiente.", "Not enough cash.", "No tienes suficiente efectivo."], noMoney: ["Sem saldo.", "Not enough money.", "Sin saldo."],
  payCard: ["💳 Cartão", "💳 Card", "💳 Tarjeta"], payCash: ["💵 Dinheiro", "💵 Cash", "💵 Efectivo"],
  cardOff: ["A maquininha está sem sinal. Só dinheiro vivo!", "The card machine has no signal. Cash only!", "La terminal no tiene señal. ¡Solo efectivo!"],
  closed: ["Fechado.", "Closed.", "Cerrado."], queue: ["Fila: você perdeu {m} min.", "Queue: you lost {m} min.", "Fila: perdiste {m} min."],
  priceUp: ["Os preços subiram.", "Prices went up.", "Los precios subieron."], soldOut: ["Esgotado", "Sold out", "Agotado"],

  // House
  fillBottles: ["Encher as garrafas vazias", "Fill the empty bottles", "Llenar las botellas vacías"],
  fillBuckets: ["Encher baldes e panelas (+20 L em casa)", "Fill buckets and pots (+20 L at home)", "Llenar cubetas y ollas (+20 L en casa)"],
  drinkTap: ["Beber da torneira", "Drink from the tap", "Beber del grifo"],
  tapDry: ["A torneira secou. Sem energia, as bombas de água pararam.", "The tap is dry. Without power, the water pumps stopped.", "El grifo se secó. Sin luz, las bombas de agua se pararon."],
  tapTank: ["Água da caixa d'água: restam {v} L.", "Water from the roof tank: {v} L left.", "Agua del tanque: quedan {v} L."],
  homeWater: ["Em casa: {v} L guardados", "At home: {v} L stored", "En casa: {v} L guardados"],
  storeWater: ["Guardar 1,5 L da mochila em casa", "Store 1.5 L from backpack at home", "Guardar 1,5 L de la mochila en casa"],
  takeWater: ["Pôr 1,5 L na mochila", "Put 1.5 L in backpack", "Poner 1,5 L en la mochila"],
  drinkHome: ["Beber 0,5 L", "Drink 0.5 L", "Beber 0,5 L"],
  cookStove: ["Cozinhar no fogão (gás)", "Cook on the stove (gas)", "Cocinar en la estufa (gas)"],
  cookNeedMatch: ["O acendedor do fogão é elétrico e não funciona. Precisa de fósforos!", "The stove igniter is electric and doesn't work. You need matches!", "El encendedor de la estufa es eléctrico y no funciona. ¡Necesitas fósforos!"],
  cookNothing: ["Nada para cozinhar (arroz ou carne) — e precisa de 0,5 L de água.", "Nothing to cook (rice or meat) — and you need 0.5 L of water.", "Nada que cocinar (arroz o carne) — y necesitas 0,5 L de agua."],
  cooked: ["Prato quente pronto! 🍲", "Hot meal ready! 🍲", "¡Plato caliente listo! 🍲"],
  coalInside: ["Acender carvão aqui dentro (cozinha fechada)", "Light charcoal in here (closed kitchen)", "Encender carbón aquí dentro (cocina cerrada)"],
  coalYard: ["Cozinhar com carvão no quintal (ar livre)", "Cook with charcoal in the yard (open air)", "Cocinar con carbón en el patio (aire libre)"],
  coHurt: ["😵 Dor de cabeça e tontura… Monóxido de carbono! Você saiu correndo para o ar livre.", "😵 Headache and dizziness… Carbon monoxide! You rushed outside.", "😵 Dolor de cabeza y mareo… ¡Monóxido de carbono! Saliste corriendo al aire libre."],
  sleep: ["Dormir até de manhã (06:00)", "Sleep until morning (06:00)", "Dormir hasta la mañana (06:00)"],
  nap: ["Cochilar 3 horas", "Nap for 3 hours", "Dormir 3 horas"],
  sleepMp: ["No multijogador, só o dono da sala pode pular a noite.", "In multiplayer, only the host can skip the night.", "En multijugador, solo el anfitrión puede saltar la noche."],
  chargePhone: ["Carregar o celular na tomada", "Charge phone at the outlet", "Cargar el celular en el enchufe"],
  chargeBank: ["Carregar o carregador portátil", "Charge the power bank", "Cargar la batería portátil"],
  noPower: ["Sem energia na tomada.", "No power at the outlet.", "No hay luz en el enchufe."],
  lightCandle: ["Acender uma vela (4 h)", "Light a candle (4 h)", "Encender una vela (4 h)"],
  candleTip: ["Nunca deixe vela acesa sozinha ou perto de cortina.", "Never leave a candle burning alone or near curtains.", "Nunca dejes una vela encendida sola o cerca de cortinas."],
  carFuel: ["Tanque: {v}%", "Tank: {v}%", "Tanque: {v}%"],
  carCharge: ["Carregar celular no carro (gasta um pouco de combustível)", "Charge phone in the car (uses a little fuel)", "Cargar el celular en el coche (gasta un poco de combustible)"],
  pourCan: ["Pôr o galão no tanque", "Pour the can into the tank", "Echar el bidón al tanque"],

  // Places
  atmWithdraw: ["Sacar R$ {v}", "Withdraw R$ {v}", "Retirar R$ {v}"],
  atmOff: ["Tela apagada. Sem energia, o caixa eletrônico não funciona.", "Blank screen. Without power, the ATM doesn't work.", "Pantalla apagada. Sin luz, el cajero no funciona."],
  gasFill: ["Encher o galão de 5 L (R$ 35)", "Fill the 5 L can (R$ 35)", "Llenar el bidón de 5 L (R$ 35)"],
  gasTank: ["Encher o tanque do carro (R$ 250)", "Fill up the car (R$ 250)", "Llenar el tanque del coche (R$ 250)"],
  gasOff: ["As bombas são elétricas. Sem energia, não sai combustível.", "The pumps are electric. Without power, no fuel comes out.", "Las bombas son eléctricas. Sin luz, no sale combustible."],
  gasCarTip: ["Para encher o tanque, traga o carro (no jogo, basta ter o carro em casa: o frentista anota e você paga).", "To fill the tank you'd bring the car (in the game, having it at home is enough).", "Para llenar el tanque traerías el coche (en el juego, basta tenerlo en casa)."],

  // Neighbors
  zeAsk: ["\"A água aqui de casa acabou e eu não consigo carregar balde… Você me arruma um pouco?\"", "\"My water ran out and I can't carry buckets… Could you spare some?\"", "\"Se me acabó el agua y no puedo cargar cubetas… ¿Me das un poco?\""],
  zeGive: ["Dar 1,5 L de água", "Give 1.5 L of water", "Dar 1,5 L de agua"],
  zeThanks: ["\"Deus lhe pague! Vou lembrar disso.\" ❤️", "\"Bless you! I won't forget this.\" ❤️", "\"¡Dios te lo pague! No lo olvidaré.\" ❤️"],
  zeFine: ["\"Tudo certo por aqui, obrigado por passar!\"", "\"All good here, thanks for stopping by!\"", "\"Todo bien por aquí, ¡gracias por pasar!\""],
  cidaHi: ["\"Oi, vizinho! Se precisar, a gente troca coisas.\"", "\"Hi, neighbor! If you need anything, we can trade.\"", "\"¡Hola, vecino! Si necesitas algo, intercambiamos.\""],
  cidaT1: ["Trocar 3 L de água por 1 pacote de pilhas", "Trade 3 L of water for 1 pack of batteries", "Cambiar 3 L de agua por 1 paquete de pilas"],
  cidaT2: ["Trocar 1 enlatado por 2 velas e fósforos", "Trade 1 can for 2 candles and matches", "Cambiar 1 lata por 2 velas y fósforos"],
  cidaDone: ["\"Negócio fechado!\" 🤝", "\"Deal!\" 🤝", "\"¡Trato hecho!\" 🤝"],
  valdirIdle: ["\"Boa noite! Que apagão, hein?\"", "\"Evening! Some blackout, huh?\"", "\"¡Buenas noches! Vaya apagón, ¿eh?\""],
  valdirGen: ["Ele ligou um gerador dentro da garagem fechada. Dá para ouvir o motor e sentir o cheiro de fumaça.", "He turned on a generator inside the closed garage. You can hear the engine and smell the fumes.", "Encendió un generador dentro del garaje cerrado. Se oye el motor y huele a humo."],
  valdirWarn: ["Avisar: \"Gerador só do lado de fora, longe das janelas!\"", "Warn him: \"Generators only outside, away from windows!\"", "Avisar: \"¡El generador solo afuera, lejos de las ventanas!\""],
  valdirThanks: ["\"Nossa, não sabia! Vou levar lá pra fora agora.\"", "\"Wow, I didn't know! I'll move it outside now.\"", "\"¡Vaya, no lo sabía! Lo saco ahora mismo.\""],
  valdirSick: ["Seu Valdir passou mal com a fumaça do gerador. Os vizinhos o levaram para fora a tempo.", "Mr. Valdir got sick from the generator fumes. Neighbors got him outside in time.", "Don Valdir se sintió mal por el humo del generador. Los vecinos lo sacaron a tiempo."],
  valdirSick_k: ["Seu Valdir ficou tonto com a fumaça do gerador, mas os vizinhos ajudaram.", "Mr. Valdir got dizzy from the generator smoke, but neighbors helped.", "Don Valdir se mareó con el humo del generador, pero los vecinos ayudaron."],

  // Phone
  phone: ["📱 Celular", "📱 Phone", "📱 Celular"], battery: ["Bateria {v}%", "Battery {v}%", "Batería {v}%"],
  sig3: ["📶 Sinal bom", "📶 Good signal", "📶 Buena señal"], sig1: ["📶 Sinal fraco", "📶 Weak signal", "📶 Señal débil"], sig0: ["🚫 Sem sinal", "🚫 No signal", "🚫 Sin señal"],
  phoneDead: ["Bateria acabou.", "Battery is dead.", "Sin batería."],
  news: ["Notícias", "News", "Noticias"], msgFam: ["Mensagem para a família", "Message family", "Mensaje a la familia"],
  meetQ: ["Se a gente se perder, onde se encontra?", "If we get separated, where do we meet?", "Si nos separamos, ¿dónde nos encontramos?"],
  meet1: ["Casa da vó", "Grandma's house", "Casa de la abuela"], meet2: ["Escola do bairro", "Neighborhood school", "Escuela del barrio"], meet3: ["Aqui em casa", "Here at home", "Aquí en casa"],
  sent: ["Enviada ✓✓", "Sent ✓✓", "Enviado ✓✓"], notSent: ["Não enviou (sem sinal).", "Not sent (no signal).", "No se envió (sin señal)."],
  phoneLight: ["Lanterna do celular", "Phone flashlight", "Linterna del celular"],
  usePbank: ["Usar carregador portátil (+50%)", "Use power bank (+50%)", "Usar batería portátil (+50%)"],

  // Radio
  radio: ["📻 Rádio", "📻 Radio", "📻 Radio"], radioNone: ["Sem pilhas, o rádio não liga.", "Without batteries the radio won't turn on.", "Sin pilas la radio no enciende."],
  radioStatic: ["Chiado… Nenhum aviso novo agora.", "Static… No new bulletin right now.", "Estática… Ningún aviso nuevo ahora."],

  // Flashlight
  flashOn: ["🔦 Lanterna ligada", "🔦 Flashlight on", "🔦 Linterna encendida"], flashNoBatt: ["A lanterna está sem pilhas.", "The flashlight has no batteries.", "La linterna no tiene pilas."], noFlash: ["Você não tem lanterna na mochila.", "No flashlight in your backpack.", "No tienes linterna en la mochila."],

  // Events / news (feed). Cause variants.
  cause_solar: ["tempestade solar", "solar storm", "tormenta solar"], cause_cyber: ["ataque cibernético às empresas de energia", "cyberattack on power companies", "ciberataque a las eléctricas"], cause_grid: ["falha em cascata nas linhas de transmissão", "cascading failure on transmission lines", "falla en cascada en las líneas de transmisión"],
  n1: ["URGENTE: Especialistas alertam para {c}. Risco de instabilidade na rede elétrica em vários estados.", "BREAKING: Experts warn of a {c}. Risk of grid instability in several states.", "URGENTE: Expertos alertan de {c}. Riesgo de inestabilidad en la red eléctrica en varios estados."],
  n2: ["Defesa Civil recomenda: tenha água, dinheiro vivo, lanterna e celular carregado.", "Civil Defense advises: keep water, cash, a flashlight and a charged phone.", "Protección Civil recomienda: ten agua, efectivo, linterna y celular cargado."],
  n3: ["Quedas de energia em cidades vizinhas. Filas começam a se formar em postos e mercados.", "Outages in nearby cities. Lines are forming at gas stations and stores.", "Cortes en ciudades vecinas. Se forman filas en gasolineras y mercados."],
  nBlack: ["⚫ APAGÃO! Tudo ficou escuro. Vários estados sem energia.", "⚫ BLACKOUT! Everything went dark. Several states without power.", "⚫ ¡APAGÓN! Todo quedó a oscuras. Varios estados sin luz."],
  nCrowd: ["O mercado lotou. Tem gente brigando na fila.", "The market is packed. People are fighting in line.", "El mercado se llenó. Hay gente peleando en la fila."],
  nCrowd_k: ["O mercado lotou. Muita gente empurrando na fila.", "The market is packed. Lots of pushing in line.", "El mercado se llenó. Mucha gente empujando en la fila."],
  nSigWeak: ["O sinal do celular está fraco: as torres estão funcionando com baterias.", "Phone signal is weak: towers are running on batteries.", "La señal es débil: las torres funcionan con baterías."],
  nSigOff: ["As baterias das torres acabaram. Sem celular e sem internet.", "The towers' batteries ran out. No phone, no internet.", "Las baterías de las torres se agotaron. Sin celular ni internet."],
  nMarketClosed: ["O mercado fechou as portas. As prateleiras estão vazias.", "The market closed its doors. The shelves are empty.", "El mercado cerró. Los estantes están vacíos."],
  nPharmaClosed: ["A farmácia fechou.", "The pharmacy closed.", "La farmacia cerró."],
  nFridge: ["A comida da geladeira estragou (24 h sem frio).", "The food in the fridge spoiled (24 h without cold).", "La comida de la nevera se echó a perder (24 h sin frío)."],
  nTap: ["A água da rua parou. Agora só resta a caixa d'água.", "Street water stopped. Only the roof tank is left.", "El agua de la calle paró. Solo queda el tanque."],
  nHosp: ["Hospitais estão quase sem diesel para os geradores. Pacientes graves correm risco.", "Hospitals are almost out of diesel for generators. Critical patients are at risk.", "Los hospitales casi no tienen diésel para los generadores. Pacientes graves en riesgo."],
  nHosp_k: ["Os hospitais pedem diesel para manter os geradores ligados.", "Hospitals are asking for diesel to keep generators running.", "Los hospitales piden diésel para mantener los generadores."],
  nSewer: ["O esgoto começa a transbordar em alguns bairros. Não beba água da rua nem de córrego sem ferver.", "Sewage is overflowing in some areas. Don't drink street or creek water without boiling it.", "Las aguas residuales se desbordan en algunos barrios. No bebas agua de la calle ni de arroyos sin hervirla."],
  nZe: ["Seu Zé, o vizinho idoso, está na porta. Parece precisar de ajuda.", "Mr. Zé, the elderly neighbor, is at his door. He seems to need help.", "Don Zé, el vecino mayor, está en la puerta. Parece necesitar ayuda."],
  nCida: ["Dona Cida montou uma banquinha de trocas na calçada.", "Ms. Cida set up a little trading stand on the sidewalk.", "Doña Cida montó un puesto de trueque en la acera."],
  r0: ["📻 Defesa Civil: fiquem em casa, evitem aglomerações e economizem água.", "📻 Civil Defense: stay home, avoid crowds and save water.", "📻 Protección Civil: quédense en casa, eviten aglomeraciones y ahorren agua."],
  r1: ["📻 Gerador, churrasqueira e fogareiro só ao ar livre: a fumaça pode matar sem cheiro.", "📻 Generators, grills and stoves only outdoors: the fumes can kill without a smell.", "📻 Generadores, parrillas y hornillos solo al aire libre: el humo puede matar sin olor."],
  r1_k: ["📻 Gerador, churrasqueira e fogareiro só ao ar livre: a fumaça faz muito mal.", "📻 Generators, grills and stoves only outdoors: the smoke is very harmful.", "📻 Generadores, parrillas y hornillos solo al aire libre: el humo hace mucho daño."],
  r2: ["📻 Visitem vizinhos idosos e quem depende de remédio na geladeira.", "📻 Check on elderly neighbors and people who need refrigerated medicine.", "📻 Visiten a vecinos mayores y a quien necesita medicinas refrigeradas."],
  r3: ["📻 Ferva a água por 1 minuto antes de beber, se não tiver certeza de que ela é limpa.", "📻 Boil water for 1 minute before drinking if you're not sure it's clean.", "📻 Hierva el agua 1 minuto antes de beber si no está seguro de que es limpia."],
  r4: ["📻 Ainda sem previsão de volta da energia. Equipes trabalham para religar a rede aos poucos.", "📻 Still no estimate for power to return. Crews are restarting the grid bit by bit.", "📻 Aún sin previsión de que vuelva la luz. Equipos reinician la red poco a poco."],
  r5: ["📻 Pontos de distribuição de água serão montados nas escolas. Vá cedo e em grupo pequeno.", "📻 Water distribution points will be set up at schools. Go early, in small groups.", "📻 Habrá puntos de reparto de agua en las escuelas. Vaya temprano y en grupo pequeño."],

  // Crowd
  crowdLost: ["Na confusão, alguém levou R$ {v} do seu bolso.", "In the chaos, someone took R$ {v} from your pocket.", "En la confusión, alguien te sacó R$ {v} del bolsillo."],
  crowdLost_k: ["Na confusão, você deixou cair R$ {v}.", "In the chaos, you dropped R$ {v}.", "En la confusión, se te cayeron R$ {v}."],

  // Tips (mini-aulas)
  tipTitle: ["💡 Por quê?", "💡 Why?", "💡 ¿Por qué?"], gotIt: ["Entendi", "Got it", "Entendido"], tipsBook: ["📖 Dicas que você aprendeu", "📖 Tips you've learned", "📖 Consejos aprendidos"], noTips: ["Nenhuma ainda.", "None yet.", "Ninguno aún."],
  tip_signs: ["Sinais de risco: notícias de várias fontes, avisos da Defesa Civil e luz piscando. Quando os sinais aparecem, o melhor momento para se preparar é AGORA, antes de todo mundo.", "Warning signs: news from several sources, Civil Defense alerts and flickering lights. When signs appear, the best time to prepare is NOW, before everyone else.", "Señales de riesgo: noticias de varias fuentes, avisos de Protección Civil y luz parpadeando. Cuando aparecen, el mejor momento para prepararse es AHORA, antes que todos."],
  tip_cash: ["Sem energia, caixa eletrônico, Pix e maquininha param. Quem tem dinheiro vivo (em notas pequenas) consegue comprar.", "Without power, ATMs, instant payments and card machines stop. Whoever has cash (small bills) can still buy.", "Sin luz, cajeros, pagos digitales y terminales se paran. Quien tiene efectivo (billetes pequeños) puede comprar."],
  tip_fuel: ["As bombas dos postos são elétricas. Tanque cheio = poder sair da cidade e carregar o celular no carro.", "Gas pumps are electric. A full tank = being able to leave town and charge your phone in the car.", "Las bombas de las gasolineras son eléctricas. Tanque lleno = poder salir de la ciudad y cargar el celular en el coche."],
  tip_water: ["A água chega pelas torneiras graças a bombas elétricas. Encha baldes e garrafas logo: cada pessoa precisa de uns 3 L por dia só para beber e cozinhar.", "Water reaches your tap thanks to electric pumps. Fill buckets and bottles early: each person needs about 3 L a day just for drinking and cooking.", "El agua llega al grifo gracias a bombas eléctricas. Llena cubetas y botellas pronto: cada persona necesita unos 3 L al día solo para beber y cocinar."],
  tip_phone: ["As torres de celular têm baterias que duram poucas horas. Combine um ponto de encontro com a família ANTES de o sinal cair.", "Cell towers have batteries that last only a few hours. Agree on a family meeting point BEFORE the signal drops.", "Las torres tienen baterías que duran pocas horas. Acuerda un punto de encuentro con la familia ANTES de que caiga la señal."],
  tip_radio: ["Rádio a pilha (ou a manivela) é a fonte de notícia que sobra quando o celular e a internet caem.", "A battery (or crank) radio is the news source left when phones and internet go down.", "La radio a pilas (o a manivela) es la fuente de noticias que queda cuando caen el celular e internet."],
  tip_crowd: ["Em aglomeração tem empurrão, furto e briga — e doença se espalha. Vá cedo, vá rápido, ou não vá.", "Crowds mean shoving, theft and fights — and disease spreads. Go early, go fast, or don't go.", "En las aglomeraciones hay empujones, robos y peleas — y se contagian enfermedades. Ve temprano, rápido, o no vayas."],
  tip_crowd_k: ["Em aglomeração tem empurra-empurra, gente perdida e doença passando de um para outro. Vá cedo, vá rápido, ou não vá.", "Crowds mean pushing, people getting lost and germs spreading. Go early, go fast, or don't go.", "En las aglomeraciones hay empujones, gente perdida y gérmenes. Ve temprano, rápido, o no vayas."],
  tip_co: ["Gerador, carvão e fogareiro soltam monóxido de carbono: um gás sem cor e sem cheiro que pode matar. Use só ao ar livre, longe de janelas.", "Generators, charcoal and camp stoves release carbon monoxide: a colorless, odorless gas that can kill. Use them only outdoors, away from windows.", "Generadores, carbón y hornillos liberan monóxido de carbono: un gas sin color ni olor que puede matar. Úsalos solo al aire libre, lejos de ventanas."],
  tip_co_k: ["Gerador, carvão e fogareiro soltam um gás invisível e sem cheiro que faz muito mal. Use só ao ar livre, longe de janelas.", "Generators, charcoal and camp stoves give off an invisible, odorless gas that is very harmful. Use them only outdoors, away from windows.", "Generadores, carbón y hornillos sueltan un gas invisible y sin olor que hace mucho daño. Úsalos solo al aire libre."],
  tip_fridge: ["Sem energia, a geladeira segura o frio por umas 4 horas fechada (o freezer cheio, até 1 dia). Coma primeiro o que estraga; depois, os enlatados.", "Without power, a closed fridge stays cold for about 4 hours (a full freezer up to a day). Eat what spoils first; canned food later.", "Sin luz, la nevera cerrada mantiene el frío unas 4 horas (el congelador lleno, hasta un día). Come primero lo que se echa a perder; las latas después."],
  tip_matches: ["Muitos fogões têm acendedor elétrico. O gás continua saindo, mas para acender você precisa de fósforo ou isqueiro.", "Many stoves have electric igniters. Gas still flows, but you need matches or a lighter to light it.", "Muchas estufas tienen encendido eléctrico. El gas sigue saliendo, pero necesitas fósforos o encendedor."],
  tip_elder: ["Idosos, pessoas doentes e quem depende de aparelho ou remédio na geladeira sofrem primeiro. Ajudar o vizinho também protege você: grupo unido é mais seguro.", "The elderly, the sick and people who depend on devices or refrigerated medicine suffer first. Helping neighbors also protects you: a united group is safer.", "Los mayores, los enfermos y quien depende de aparatos o medicinas refrigeradas sufren primero. Ayudar a los vecinos también te protege: un grupo unido es más seguro."],
  tip_night: ["A primeira noite sem luz é a mais difícil. Tenha a lanterna à mão (não use só a do celular, que gasta a bateria).", "The first night without power is the hardest. Keep a flashlight handy (don't rely on the phone's, it drains the battery).", "La primera noche sin luz es la más difícil. Ten la linterna a mano (no uses solo la del celular, gasta la batería)."],
  tip_spoiled: ["Comida estragada dá diarreia e vômito, e isso faz perder água do corpo muito rápido. Na dúvida, jogue fora.", "Spoiled food causes diarrhea and vomiting, and that makes your body lose water fast. When in doubt, throw it out.", "La comida echada a perder causa diarrea y vómitos, y eso hace perder agua muy rápido. Ante la duda, tírala."],

  // Death / end
  faint: ["Você desmaiou…", "You passed out…", "Te desmayaste…"],
  faintEasy: ["Um vizinho te levou para casa. Você perdeu algumas coisas da mochila.", "A neighbor took you home. You lost a few things from your backpack.", "Un vecino te llevó a casa. Perdiste algunas cosas de la mochila."],
  faintHard: ["No modo Difícil, recomeça do Dia 0. O que faltou?", "In Hard mode you restart from Day 0. What was missing?", "En modo Difícil, vuelves al Día 0. ¿Qué faltó?"],
  restart: ["Recomeçar", "Restart", "Reiniciar"],
  endTitle: ["Você passou pelas primeiras 72 horas!", "You made it through the first 72 hours!", "¡Superaste las primeras 72 horas!"],
  endSub: ["A energia ainda não voltou. Veja o que você fez certo:", "Power still isn't back. Here's what you got right:", "La luz aún no vuelve. Mira lo que hiciste bien:"],
  score: ["Pontuação: {v}/100", "Score: {v}/100", "Puntuación: {v}/100"],
  best: ["Recorde: {v}", "Best: {v}", "Récord: {v}"],
  next: ["Próximo: Capítulo 2 · Semana 1 e 2 (crise de água e comida) — em breve", "Next: Chapter 2 · Weeks 1–2 (water and food crisis) — coming soon", "Próximo: Capítulo 2 · Semanas 1 y 2 (crisis de agua y comida) — pronto"],
  e_cash: ["Dinheiro vivo", "Cash", "Efectivo"], e_fuel: ["Combustível", "Fuel", "Combustible"], e_water: ["Água guardada", "Stored water", "Agua guardada"], e_food: ["Comida que não estraga", "Non-perishable food", "Comida no perecible"],
  e_light: ["Luz para a noite", "Light for the night", "Luz para la noche"], e_radio: ["Ouviu o rádio", "Listened to the radio", "Escuchó la radio"], e_meet: ["Ponto de encontro", "Meeting point", "Punto de encuentro"],
  e_crowd: ["Fugiu de aglomerações", "Avoided crowds", "Evitó aglomeraciones"], e_co: ["Cuidado com a fumaça (CO)", "Careful with fumes (CO)", "Cuidado con el humo (CO)"], e_help: ["Ajudou o vizinho idoso", "Helped the elderly neighbor", "Ayudó al vecino mayor"],
  e_spoiled: ["Comeu comida estragada (−5)", "Ate spoiled food (−5)", "Comió comida echada a perder (−5)"],
  // Learn mode placeholder
  learnSoon: ["O Modo Aprendizado (aulas da Era 0 à Era 6) vem nas próximas versões.", "Learning Mode (lessons from Era 0 to Era 6) is coming in the next versions.", "El Modo Aprendizaje (clases de la Era 0 a la Era 6) llega en las próximas versiones."],
};

const dict = { pt: {}, en: {}, es: {} };
for (const k in S) { dict.pt[k] = S[k][0]; dict.en[k] = S[k][1]; dict.es[k] = S[k][2]; }
addStrings(dict);

let kid = false;
export function setKidMode(v) { kid = !!v; }
/** Texto com versão infantil quando existir (chave + "_k"). */
export function tx(key, vars) {
  if (kid && S[key + "_k"]) return t(key + "_k", vars);
  return t(key, vars);
}
