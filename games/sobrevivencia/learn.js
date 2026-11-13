// Apagão: Sobreviva — Modo Aprendizado (Era 0 e Era 1). Acampamento-escola no Cerrado + cidade-treino.
// Fluxo de cada aula: cartões → quiz (2 perguntas) → desafio prático → desbloqueio na árvore de tecnologia.
import {
  THREE, createWorld, createPhysics, endFrame, createInput, createFollowCamera, createPlayer, createBot,
  createRoom, createRemotePlayers, loadLook, randomLook, Audio, t, onLangChange, h, toast, screen, openAvatarEditor,
  openSettings, openRoomPanel, roomPill, openQuickChat, chatText, installButton, createAvatarPreview, registerPWA,
  track, initGTM, isTouch, isMobile, createStore, VERSION, part, getMat, addGround, addLabel, Character,
} from "../../engine/ez.js";
import "./strings.js";
import { ERAS, LESSONS, byId, ITEMS, itName, L } from "./lessons.js";

const GAME_ID = "sobrevivencia-aprender";
registerPWA("../../sw.js");
initGTM("GTM-54JJ46D9");
const store = createStore("apagao");
const T = (pt, en, es) => ({ pt, en, es });
const U = {
  title: T("📚 Aprendizado", "📚 Learning", "📚 Aprendizaje"),
  sub: T("Acampamento-escola · Era 0 e Era 1", "Camp school · Era 0 and Era 1", "Campamento-escuela · Era 0 y Era 1"),
  intro: T("Bem-vindo ao acampamento-escola! Fale com a professora Iara (❗) para começar. Cada aula tem cartões curtos, 2 perguntas e um desafio prático. Cada aula concluída desbloqueia as próximas. Para pegar galhos, capim, folhas e areia, é só encostar neles. Para falar ou usar algo, chegue perto e aperte E (ou ✋).", "Welcome to the camp school! Talk to teacher Iara (❗) to begin. Each lesson has short cards, 2 questions and a hands-on challenge. Each finished lesson unlocks the next ones. To pick up sticks, grass, leaves and sand, just walk into them. To talk or use something, walk up and press E (or ✋).", "¡Bienvenido al campamento-escuela! Habla con la profesora Iara (❗) para empezar. Cada clase tiene tarjetas cortas, 2 preguntas y un desafío práctico. Cada clase terminada desbloquea las siguientes. Para recoger ramas, pasto, hojas y arena, solo tócalos. Para hablar o usar algo, acércate y pulsa E (o ✋)."),
  startL: T("Começar as aulas", "Start the lessons", "Empezar las clases"), contL: T("Continuar as aulas", "Continue the lessons", "Continuar las clases"),
  real: T("🌑 Ir para o Apagão Real", "🌑 Go to Real Blackout", "🌑 Ir al Apagón Real"),
  tree: T("🌳 Árvore de tecnologia", "🌳 Tech tree", "🌳 Árbol tecnológico"),
  locked: T("🔒 Complete antes: {r}", "🔒 Finish first: {r}", "🔒 Completa antes: {r}"),
  soon: T("em breve", "coming soon", "pronto"),
  start: T("Começar a aula", "Start lesson", "Empezar la clase"), review: T("Rever a aula", "Review lesson", "Repasar la clase"),
  next: T("Próximo ▶", "Next ▶", "Siguiente ▶"), quiz: T("❓ Pergunta {i} de 2", "❓ Question {i} of 2", "❓ Pregunta {i} de 2"),
  right: T("✅ Isso!", "✅ Right!", "✅ ¡Eso!"), wrong: T("❌ Ainda não. Tente de novo.", "❌ Not yet. Try again.", "❌ Todavía no. Inténtalo de nuevo."),
  chal: T("🛠️ Desafio prático", "🛠️ Hands-on challenge", "🛠️ Desafío práctico"), go: T("Bora! 💪", "Let's go! 💪", "¡Vamos! 💪"),
  done: T("🏅 Aula concluída!", "🏅 Lesson complete!", "🏅 ¡Clase terminada!"), unlocked: T("Desbloqueou:", "Unlocked:", "Desbloqueaste:"),
  eraDone: T("Você terminou a Era 1! As Eras 2 a 6 (pedra, metais, vila, segurança e energia) chegam nas próximas versões.", "You finished Era 1! Eras 2–6 (stone, metals, village, security and energy) are coming in the next versions.", "¡Terminaste la Era 1! Las Eras 2 a 6 (piedra, metales, aldea, seguridad y energía) llegan en próximas versiones."),
  pick: T("Pegar", "Take", "Tomar"), progress: T("✅ {d}/{n} aulas", "✅ {d}/{n} lessons", "✅ {d}/{n} clases"),
  noLesson: T("Sem aula ativa. Toque em 🌳 ou fale com a professora.", "No active lesson. Tap 🌳 or talk to the teacher.", "Sin clase activa. Toca 🌳 o habla con la profesora."),
  bag: T("🎒 Mochila", "🎒 Backpack", "🎒 Mochila"), empty: T("Vazia.", "Empty.", "Vacía."), build: T("🔨 Construir", "🔨 Build", "🔨 Construir"),
  need: T("Falta: {x}", "Missing: {x}", "Falta: {x}"), leave: T("Sair", "Leave", "Salir"),
  b_fire: T("🔥 Fogueira (3 galhos + 2 capim + pederneira)", "🔥 Campfire (3 sticks + 2 grass + fire steel)", "🔥 Fogata (3 ramas + 2 pasto + pedernal)"),
  b_shelter: T("⛺ Abrigo (4 galhos + 4 folhas)", "⛺ Shelter (4 sticks + 4 leaves)", "⛺ Refugio (4 ramas + 4 hojas)"),
  b_filter: T("🫗 Filtro (água suja + areia + carvão)", "🫗 Filter (dirty water + sand + charcoal)", "🫗 Filtro (agua sucia + arena + carbón)"),
  b_rod: T("🎣 Vara (1 galho + linha e anzol)", "🎣 Rod (1 stick + line and hook)", "🎣 Caña (1 rama + hilo y anzuelo)"),
  b_trap: T("🪤 Arapuca (4 galhos + 1 cipó)", "🪤 Cage trap (4 sticks + 1 vine)", "🪤 Arapuca (4 ramas + 1 bejuco)"),
  wetNo: T("💦 Material úmido não pega: só faz fumaça. Procure galho e capim SECOS (no sol, em lugar alto) ou seque os úmidos perto de uma fogueira acesa.", "💦 Damp material won't catch: it only smokes. Find DRY sticks and grass (in the sun, on high ground) or dry the damp ones next to a burning fire.", "💦 Lo húmedo no prende: solo humea. Busca ramas y pasto SECOS (al sol, en lugar alto) o seca los húmedos junto a una fogata encendida."),
  f_dry: T("Secar o material úmido perto do fogo", "Dry the damp material by the fire", "Secar lo húmedo junto al fuego"), f_dried: T("☀️ Secou! Agora é material seco.", "☀️ Dried! Now it's dry material.", "☀️ ¡Se secó! Ahora es material seco."),
  fireBad: T("Aqui é mata fechada e seca: perigo de incêndio! Vá para um lugar aberto e limpo.", "This is dense, dry brush: wildfire risk! Go to an open, clear spot.", "¡Aquí es monte cerrado y seco: riesgo de incendio! Ve a un lugar abierto y limpio."),
  fireLit: T("🔥 Fogo aceso! Isca → gravetos → lenha.", "🔥 Fire lit! Tinder → twigs → logs.", "🔥 ¡Fuego encendido! Yesca → ramitas → leña."),
  shelterBad: T("Lugar baixo e úmido: com chuva, alaga. Procure o morrinho (lugar alto).", "Low, damp ground: it floods when it rains. Find the little hill (high ground).", "Lugar bajo y húmedo: con lluvia se inunda. Busca la lomita (lugar alto)."),
  shelterOk: T("⛺ Abrigo pronto, no alto e inclinado para a chuva escorrer!", "⛺ Shelter ready, on high ground and sloped for rain!", "⛺ ¡Refugio listo, en alto e inclinado para la lluvia!"),
  trapBad: T("Aqui não tem trilha de bicho. Procure a trilha com pegadas perto da água.", "No animal trail here. Find the trail with tracks near the water.", "Aquí no hay sendero de animales. Busca el sendero con huellas cerca del agua."),
  trapOk: T("🪤 Arapuca armada. Volte daqui a pouco para conferir.", "🪤 Trap set. Come back in a bit to check it.", "🪤 Arapuca armada. Vuelve en un rato para revisarla."),
  trapWait: T("Ainda vazia. Armadilha pede paciência…", "Still empty. Traps take patience…", "Aún vacía. La trampa requiere paciencia…"),
  trapGot: T("🐹 Pegou um preá, vivo! Você observou de perto e soltou — era só treino. Numa emergência real, isso seria comida.", "🐹 You caught a cavy, alive! You looked closely and let it go — it was just training. In a real emergency, this would be food.", "🐹 ¡Atrapaste un cuy silvestre, vivo! Lo miraste de cerca y lo soltaste — era solo práctica. En una emergencia real, sería comida."),
  trapGot_k: T("🐹 Pegou um preá! Ele está bem. Você olhou de pertinho e soltou — era só um treino!", "🐹 You caught a cavy! It's fine. You took a close look and let it go — just training!", "🐹 ¡Atrapaste un cuy! Está bien. Lo miraste de cerca y lo soltaste — ¡solo práctica!"),
  i_teacher: T("Professora Iara", "Teacher Iara", "Profesora Iara"), i_chest: T("Baú da mochila", "Backpack chest", "Baúl de la mochila"),
  i_fire: T("Sua fogueira", "Your campfire", "Tu fogata"), i_river: T("Rio", "River", "Río"), i_leo: T("Léo (cortou a mão)", "Léo (cut his hand)", "Léo (se cortó la mano)"),
  i_trap: T("Sua arapuca", "Your trap", "Tu arapuca"), i_news: T("Banca de notícias", "Newsstand", "Quiosco de noticias"), i_shelf: T("Estante da casa-treino", "Training house shelf", "Estante de la casa de práctica"),
  i_store: T("Depósito de água (casa-treino)", "Water storage (training house)", "Depósito de agua (casa de práctica)"), i_tap: T("Torneira", "Tap", "Grifo"),
  i_atm: T("Caixa eletrônico", "ATM", "Cajero"), i_gas: T("Bomba de combustível", "Fuel pump", "Surtidor"), i_board: T("Quadro de avisos", "Notice board", "Tablón de anuncios"),
  i_stranger: T("Estranho na esquina", "Stranger on the corner", "Extraño en la esquina"), i_gen: T("Gerador (na garagem)", "Generator (in the garage)", "Generador (en el garaje)"),
  i_safe: T("Lugar seguro do gerador", "Safe generator spot", "Lugar seguro del generador"), i_lurdes: T("Dona Lurdes, 84 anos", "Ms. Lurdes, 84", "Doña Lurdes, 84 años"),
  i_bad: T("Frutinha roxa (você não conhece)", "Purple berry (unknown to you)", "Frutita morada (no la conoces)"), i_brava: T("Pé de mandioca (mansa ou brava?)", "Cassava plant (sweet or bitter?)", "Planta de yuca (¿dulce o amarga?)"),
  i_tree: T("Pé de {f}", "{f} tree", "Árbol de {f}"), i_node: T("{f}", "{f}", "{f}"),
  badWarn: T("✋ Não conhece, não come! Melhor deixar no pé.", "✋ If you don't know it, don't eat it! Better leave it.", "✋ ¡Si no la conoces, no la comas! Mejor déjala."),
  bravaWarn: T("✋ Você não tem certeza se é mansa. Mandioca brava crua tem veneno. Deixe.", "✋ You're not sure it's the sweet kind. Raw bitter cassava is poisonous. Leave it.", "✋ No estás seguro de que sea dulce. La yuca amarga cruda es venenosa. Déjala."),
  leave: T("Deixar no pé", "Leave it", "Dejarla"), harvest: T("Colher", "Harvest", "Cosechar"),
  pequiTip: T("Pequi coletado. Lembre: roer a polpa, nunca morder o caroço (espinhos)!", "Pequi gathered. Remember: gnaw the pulp, never bite the pit (spines)!", "Pequi recolectado. Recuerda: roer la pulpa, ¡nunca morder el hueso (espinas)!"),
  r_dirty: T("Pegar água com a panela", "Collect water with the pot", "Tomar agua con la olla"), r_sand: T("Pegar areia da margem", "Take sand from the bank", "Tomar arena de la orilla"),
  r_drink: T("Beber direto do rio", "Drink straight from the river", "Beber directo del río"), r_drinkBad: T("⚠️ Pode ter micróbios! Água de rio só depois de filtrar e ferver.", "⚠️ It may have germs! River water only after filtering and boiling.", "⚠️ ¡Puede tener microbios! Agua de río solo tras filtrar y hervir."),
  r_fish: T("🎣 Pescar no remanso", "🎣 Fish in the backwater", "🎣 Pescar en el remanso"), r_noRod: T("Precisa de uma vara (🎒 → Construir).", "You need a rod (🎒 → Build).", "Necesitas una caña (🎒 → Construir)."),
  r_notHere: T("Aqui a correnteza é forte. Procure o remanso (a parte larga e parada do rio).", "The current is strong here. Find the backwater (the wide, calm part of the river).", "Aquí la corriente es fuerte. Busca el remanso (la parte ancha y quieta del río)."),
  noPot: T("Precisa da panela (lição Mochila).", "You need the pot (Backpack lesson).", "Necesitas la olla (clase Mochila)."),
  fishTitle: T("🎣 Toque em PUXAR quando o peixe estiver na faixa verde", "🎣 Tap PULL when the fish is in the green band", "🎣 Toca TIRAR cuando el pez esté en la franja verde"), pull: T("PUXAR!", "PULL!", "¡TIRAR!"),
  fishOk: T("🐟 Pegou!", "🐟 Got it!", "🐟 ¡Lo tienes!"), fishMiss: T("Escapou… tente de novo.", "It got away… try again.", "Se escapó… inténtalo de nuevo."),
  f_coal: T("Pegar carvão", "Take charcoal", "Tomar carbón"), f_boil: T("Ferver a água filtrada (1 min)", "Boil the filtered water (1 min)", "Hervir el agua filtrada (1 min)"), f_cook: T("Assar o peixe", "Grill the fish", "Asar el pez"),
  f_out: T("Apagar com água e terra", "Put out with water and dirt", "Apagar con agua y tierra"), f_outOk: T("Fogueira apagada e fria. Muito bem!", "Fire out and cold. Well done!", "Fogata apagada y fría. ¡Muy bien!"),
  boiled: T("💧 Água fervida: agora é potável!", "💧 Boiled water: now it's safe to drink!", "💧 Agua hervida: ¡ahora es potable!"), cooked: T("🍢 Peixe assado, bem passado!", "🍢 Fish grilled, well done!", "🍢 ¡Pez asado, bien cocido!"),
  eat: T("Comer", "Eat", "Comer"), drink: T("Beber", "Drink", "Beber"), yum: T("Hum! 😋", "Yum! 😋", "¡Mmm! 😋"),
  // Era 0
  newsQ: T("Esta notícia é…", "This news is…", "Esta noticia es…"), reliable: T("✅ Confiável", "✅ Reliable", "✅ Confiable"), rumor: T("❌ Boato", "❌ Rumor", "❌ Bulo"),
  newsAll: T("📰 Você separou tudo certo!", "📰 You sorted them all correctly!", "📰 ¡Separaste todo bien!"),
  kitQ: T("Marque o que vai no kit 72 horas e confirme:", "Check what goes in the 72-hour kit and confirm:", "Marca lo que va en el kit 72 horas y confirma:"), confirm: T("Confirmar", "Confirm", "Confirmar"),
  kitOk: T("🎒 Kit perfeito!", "🎒 Perfect kit!", "🎒 ¡Kit perfecto!"), kitBad: T("Ainda não: {n} item(ns) errado(s) ou faltando.", "Not yet: {n} item(s) wrong or missing.", "Todavía no: {n} objeto(s) mal o faltante(s)."),
  atmQ: T("O apagão pode vir hoje. Como você saca?", "The blackout may come today. How do you withdraw?", "El apagón puede llegar hoy. ¿Cómo retiras?"),
  gasQ: T("O aviso saiu. O que fazer no posto?", "The warning is out. What do you do at the station?", "Salió el aviso. ¿Qué haces en la gasolinera?"),
  tapFill: T("Encher um balde (pesado: 1 por vez)", "Fill a bucket (heavy: 1 at a time)", "Llenar una cubeta (pesada: 1 por vez)"), tapBottle: T("Encher uma garrafa", "Fill a bottle", "Llenar una botella"),
  storeIt: T("Guardar o balde tampado ({n}/3)", "Store the covered bucket ({n}/3)", "Guardar la cubeta tapada ({n}/3)"), haveBucket: T("Você já carrega um balde.", "You're already carrying a bucket.", "Ya llevas una cubeta."),
  boardQ: T("Escolha o ponto de encontro da família:", "Choose the family meeting point:", "Elige el punto de encuentro familiar:"),
  m1: T("🏫 Escola do bairro", "🏫 Neighborhood school", "🏫 Escuela del barrio"), m2: T("🌳 Praça da igreja", "🌳 Church square", "🌳 Plaza de la iglesia"), m3: T("🏠 Casa da tia", "🏠 Aunt's house", "🏠 Casa de la tía"),
  meetGo: T("Agora vá até a bandeira: {m}", "Now go to the flag: {m}", "Ahora ve a la bandera: {m}"), meetOk: T("📍 Você chegou ao ponto de encontro!", "📍 You reached the meeting point!", "📍 ¡Llegaste al punto de encuentro!"),
  gateA: T("Portão A: atravesse até o portão B sem entrar na multidão!", "Gate A: cross to gate B without entering the crowd!", "Portón A: ¡cruza al portón B sin entrar en la multitud!"),
  crowdFail: T("😣 Você entrou na multidão: empurrão! Volte ao portão A e vá pelas bordas.", "😣 You entered the crowd: shoved! Go back to gate A and use the edges.", "😣 Entraste en la multitud: ¡empujón! Vuelve al portón A y ve por los bordes."),
  crowdOk: T("👍 Passou pelas bordas, sem confusão!", "👍 You went along the edges, no trouble!", "👍 ¡Pasaste por los bordes, sin problemas!"),
  strangerQ: T("\"E aí, vizinho… você tem bastante comida guardada?\"", "\"Hey, neighbor… got plenty of food stored?\"", "\"Oye, vecino… ¿tienes mucha comida guardada?\""),
  s1: T("\"Estamos nos virando, como todo mundo.\"", "\"We're getting by, like everyone.\"", "\"Nos las arreglamos, como todos.\""), s2: T("\"Tenho a despensa cheia!\"", "\"My pantry is full!\"", "\"¡Tengo la despensa llena!\""), s3: T("\"Quer ver? Vem comigo!\"", "\"Want to see? Come with me!\"", "\"¿Quieres ver? ¡Ven conmigo!\""),
  sBad: T("Arriscado! Agora ele sabe que você tem estoque. Tente de novo.", "Risky! Now he knows you have supplies. Try again.", "¡Arriesgado! Ahora sabe que tienes provisiones. Inténtalo de nuevo."), sOk: T("🤫 Discreto e educado. Perfeito.", "🤫 Discreet and polite. Perfect.", "🤫 Discreto y educado. Perfecto."),
  genTake: T("Desligar e carregar o gerador para fora", "Switch off and carry the generator outside", "Apagar y llevar el generador afuera"), genDrop: T("Deixar o gerador aqui (longe das janelas)", "Leave the generator here (away from windows)", "Dejar el generador aquí (lejos de las ventanas)"),
  genOk: T("✅ Gerador ao ar livre, a mais de 6 m das janelas.", "✅ Generator outdoors, more than 6 m from windows.", "✅ Generador al aire libre, a más de 6 m de las ventanas."), genHere: T("O gerador está ligado DENTRO da garagem. Perigo!", "The generator is running INSIDE the garage. Danger!", "¡El generador está encendido DENTRO del garaje. Peligro!"),
  lurdesHi: T("\"Ai, meu filho, a água aqui acabou e eu não aguento carregar balde…\"", "\"Oh dear, my water ran out and I can't carry buckets…\"", "\"Ay, hijo, se me acabó el agua y no puedo cargar cubetas…\""), lurdesGive: T("Entregar a garrafa de água", "Give the water bottle", "Entregar la botella de agua"),
  lurdesThanks: T("\"Deus te abençoe! Que bom ter vizinho assim.\" ❤️", "\"Bless you! So good to have a neighbor like you.\" ❤️", "\"¡Dios te bendiga! Qué bueno tener un vecino así.\" ❤️"),
  aidQ: T("Qual é o próximo passo? ({i}/3)", "What's the next step? ({i}/3)", "¿Cuál es el siguiente paso? ({i}/3)"), aidOk: T("🩹 Léo está bem cuidado. Obrigado!", "🩹 Léo is well looked after. Thanks!", "🩹 Léo está bien atendido. ¡Gracias!"),
  north: T("🧭 Isso! Essa é a bandeira do NORTE.", "🧭 Yes! That's the NORTH flag.", "🧭 ¡Eso! Esa es la bandera del NORTE."), notNorth: T("Hmm, não é essa. É de manhã: o sol está a leste. Braço direito para o sol… a frente é o norte.", "Hmm, not this one. It's morning: the sun is in the east. Right arm to the sun… ahead is north.", "Mmm, no es esta. Es de mañana: el sol está al este. Brazo derecho al sol… al frente está el norte."),
  bagQ: T("Monte a mochila (até 10 kg). Peso: {w} kg", "Pack the bag (up to 10 kg). Weight: {w} kg", "Arma la mochila (hasta 10 kg). Peso: {w} kg"), bagHeavy: T("Pesada demais! Tire o que só pesa.", "Too heavy! Remove what's just weight.", "¡Demasiado pesada! Saca lo que solo pesa."),
  bagMiss: T("Faltam itens essenciais (lona, panela, pederneira, faca, cantil…).", "Essential items missing (tarp, pot, fire steel, knife, canteen…).", "Faltan objetos esenciales (lona, olla, pedernal, cuchillo, cantimplora…)."), bagOk: T("🎒 Mochila leve e completa!", "🎒 Light and complete pack!", "🎒 ¡Mochila ligera y completa!"),
  teacherHi: T("\"Olá! Escolha uma aula na árvore. Quando terminar o desafio, a próxima abre.\"", "\"Hi! Pick a lesson on the tree. Finish the challenge and the next one opens.\"", "\"¡Hola! Elige una clase en el árbol. Al terminar el desafío, se abre la siguiente.\""),
  age: T("Idade", "Age", "Edad"),
};
const u = (k, vars) => { let s = L(U[k]); if (vars) s = s.replace(/\{(\w+)\}/g, (_, x) => vars[x] ?? ""); return s; };
const ux = (k, vars) => (kid() && U[k + "_k"] ? u(k + "_k", vars) : u(k, vars));

// ---------------------------------------------------------------- progresso
const P0 = { done: [], cur: null, w: {}, cnt: {}, bag: {}, built: {} };
let P = Object.assign(structuredClone(P0), store.getJSON("learn", {}));
let cfg = store.getJSON("cfg", { age: "kid" });
const kid = () => cfg.age !== "teen";
const save = () => store.setJSON("learn", P);
const add = (k, n = 1) => { P.bag[k] = (P.bag[k] || 0) + n; if (P.bag[k] <= 0) delete P.bag[k]; };
const has = (k, n = 1) => (P.bag[k] || 0) >= n;
const isDone = (id) => P.done.includes(id);
const avail = (l) => !isDone(l.id) && l.req.every(isDone) && !ERAS[l.era].soon;

// ---------------------------------------------------------------- mundo
const world = createWorld({ canvas: document.getElementById("c"), sky: 0xbfe3ff, fog: [80, 230], shadowRange: 40 });
const phys = createPhysics();
const S = world.scene;
let playing = false, menuOpen = false;
addGround(world, phys, { size: 240, color: 0xb8b46a });
[[0, -118, 240, 2], [0, 118, 240, 2], [-118, 0, 2, 240], [118, 0, 2, 240]].forEach(([x, z, w, d]) => phys.addBox({ x, y: 3, z, w, h: 8, d, mesh: false }));
const deco = (w, hh, d, c, x, y, z) => part(w, hh, d, c, x, y, z, S);
const solid = (x, y, z, w, hh, d, color) => phys.addBox({ x, y, z, w, h: hh, d, color, scene: S });
const label = (txt, x, y, z, color = "#ffffff") => addLabel(world, txt, x, y, z, { color });

// árvore do Cerrado: tronco torto + copa baixa
function cerradoTree(x, z, s = 1, fruit) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); S.add(g);
  part(0.45, 1.6, 0.45, "#6b4423", 0, 0.8, 0, g).rotation.z = 0.15;
  part(0.35, 1.2, 0.35, "#6b4423", 0.35, 1.9, 0, g).rotation.z = -0.35;
  part(2.8, 1.1, 2.4, "#6b8e23", 0.3, 2.9, 0, g); part(1.8, 0.8, 1.8, "#7aa130", -0.4, 3.5, 0.3, g);
  if (fruit) for (let i = 0; i < 6; i++) part(0.28, 0.28, 0.28, fruit, -0.8 + (i % 3) * 0.9, 2.3 + (i % 2) * 0.3, -1 + (i * 0.7) % 2.2, g);
  phys.addBox({ x, y: 0.8 * s, z, w: 0.5 * s, h: 1.6 * s, d: 0.5 * s, mesh: false });
  return g;
}
function buriti(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
  part(0.6, 9, 0.6, "#8d6e4a", 0, 4.5, 0, g);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, m = part(3.4, 0.12, 0.8, "#4d7c0f", Math.cos(a) * 1.6, 9.1, Math.sin(a) * 1.6, g); m.rotation.y = -a; m.rotation.z = 0.35; }
  for (let i = 0; i < 4; i++) part(0.35, 0.35, 0.35, "#c2410c", Math.cos(i) * 0.6, 8.3, Math.sin(i) * 0.6, g);
  phys.addBox({ x, y: 4.5, z, w: 0.6, h: 9, d: 0.6, mesh: false });
}

// ---- acampamento (0,0)
[[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(([x, z]) => deco(0.3, 3.2, 0.3, "#78350f", x, 1.6, z));
const tentRoof = deco(11.5, 0.2, 11.5, "#f97316", 0, 3.3, 0);
deco(10, 0.06, 10, "#d6c08a", 0, 0.03, 0);
[[-2.5, 2], [2.5, 2]].forEach(([x, z]) => solid(x, 0.25, z, 3, 0.5, 0.8, "#a16207"));
solid(3, 1.2, -3.6, 3, 2, 0.2, "#166534"); // quadro
solid(-3.6, 0.45, 0.5, 1.6, 0.9, 1, "#7c2d12"); // baú
const campLabel = label("⛺ " + L(T("Acampamento-escola", "Camp school", "Campamento-escuela")), 0, 6, 0, "#fde68a");
const teacher = new Character(S, Object.assign(randomLook("Iara"), { g: "f", h: "ponytail", hc: "#1f1a17", a: "glasses" }), { kind: "remote" });
teacher.root.position.set(0, 0, -2.6);
const leo = new Character(S, Object.assign(randomLook("Léo"), { g: "m", h: "curly" }), { kind: "remote" });
leo.root.position.set(7, 0, 5); leo.root.rotation.y = -0.6;

// ---- Cerrado ao sul: rio, vereda, morrinho, trilha, clareira das bandeiras, mata
const RIVER_Z = 56;
deco(240, 0.05, 8, "#38bdf8", 0, 0.04, RIVER_Z);
deco(24, 0.05, 16, "#0ea5e9", 30, 0.05, RIVER_Z); // remanso
deco(240, 0.06, 2, "#e7d8a8", 0, 0.03, RIVER_Z - 5); // areia da margem
label("〰️ " + L(T("Remanso", "Backwater", "Remanso")), 30, 3, RIVER_Z, "#bae6fd");
for (let x = -30; x <= 10; x += 8) buriti(x, RIVER_Z - 8 + (x % 3));
// morrinho (lugar alto) a oeste
solid(-38, 0.25, 20, 20, 0.5, 20, "#a3a35a"); solid(-38, 0.75, 20, 14, 0.5, 14, "#9a9a52"); solid(-38, 1.25, 20, 9, 0.5, 9, "#8f8f4b");
label("⛰️ " + L(T("Morrinho", "Little hill", "Lomita")), -38, 4, 20, "#fef3c7");
const HILL = { x: -38, z: 20, r: 5.5 };
// trilha com pegadas (sudoeste, perto da água)
const TRAIL = { x: -66, z: 44, r: 6 };
for (let i = 0; i < 14; i++) deco(0.35, 0.03, 0.45, "#3f2d1a", -66 + Math.sin(i) * 0.8, 0.05, 34 + i * 1.4);
deco(3, 0.04, 22, "#9b8a5c", -66, 0.02, 44);
label("🐾 " + L(T("Trilha de bicho", "Animal trail", "Sendero de animales")), -66, 3, 40, "#fef3c7");
// mata fechada (oeste) — sem fogueira aqui
const MATA = { x0: -100, x1: -52, z0: -10, z1: 32 };
for (let i = 0; i < 26; i++) cerradoTree(-56 - (i * 7.3) % 42, -6 + (i * 11.7) % 36, 1 + (i % 3) * 0.15);
// clareira das bandeiras (leste): N = -z, S = +z, L = +x, O = -x. O sol fica a leste (+x), como de manhã.
const FLAGS = { c: { x: 46, z: 16 }, list: [["N", 46, 4, "#ef4444"], ["S", 46, 28, "#3b82f6"], ["L", 58, 16, "#facc15"], ["O", 34, 16, "#a855f7"]] };
FLAGS.list.forEach(([, x, z, c]) => { deco(0.2, 4, 0.2, "#e5e7eb", x, 2, z); deco(1.6, 1, 0.08, c, x + 0.8, 3.4, z); });
deco(0.18, 2, 0.18, "#57534e", FLAGS.c.x, 1, FLAGS.c.z); // estaca para ver a sombra
label("🧭 " + L(T("Clareira das bandeiras", "Flag clearing", "Claro de las banderas")), 46, 5.5, 16, "#fef3c7");
// árvores frutíferas e decorativas
const FRUITS = [["pequi", -14, 20, "#a3e635"], ["pequi", 18, 24, "#a3e635"], ["baru", -24, 32, "#92400e"], ["cagaita", 8, 34, "#facc15"], ["mangaba", 28, 30, "#bef264"], ["baru", -6, 40, "#92400e"], ["cagaita", 36, 40, "#facc15"]];
FRUITS.forEach(([, x, z, c]) => cerradoTree(x, z, 1.1, c));
[[20, 8], [-22, 8], [-30, 42], [60, 40], [70, 0], [-14, -16], [22, -16], [64, 22], [12, 46]].forEach(([x, z]) => cerradoTree(x, z, 0.9));
const BADS = [["bad", 14, 14], ["bad", -20, 26], ["brava", 40, 30], ["brava", 42, 33]];
BADS.forEach(([k, x, z]) => {
  if (k === "bad") { deco(1.6, 1, 1.6, "#4d7c0f", x, 0.5, z); for (let i = 0; i < 5; i++) deco(0.2, 0.2, 0.2, "#7e22ce", x - 0.6 + i * 0.3, 1.05, z + (i % 2) * 0.4 - 0.2); }
  else { deco(0.12, 1.6, 0.12, "#7c2d12", x, 0.8, z); for (let i = 0; i < 4; i++) { const m = deco(0.9, 0.05, 0.25, "#15803d", x, 1.5, z); m.rotation.y = i * 0.8; } }
});

// recursos que renascem (galhos, capim, folhas, cipó, areia)
const NODES = [];
const nodeMesh = { galho: () => { const g = new THREE.Group(); part(1.4, 0.15, 0.15, "#7c4a1e", 0, 0.08, 0, g).rotation.y = 0.5; part(0.9, 0.12, 0.12, "#8b5a2b", 0.2, 0.1, 0.2, g).rotation.y = -0.6; return g; },
  capim: () => { const g = new THREE.Group(); for (let i = 0; i < 5; i++) part(0.12, 0.8, 0.12, "#eab308", -0.3 + i * 0.15, 0.4, (i % 2) * 0.2, g).rotation.z = (i - 2) * 0.15; return g; },
  folhas: () => { const g = new THREE.Group(); part(1.6, 0.06, 0.6, "#65a30d", 0, 0.05, 0, g); part(1.2, 0.06, 0.5, "#4d7c0f", 0.2, 0.1, 0.4, g).rotation.y = 0.7; return g; },
  cipo: () => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) part(0.1, 0.1, 1.8, "#3f6212", i * 0.2, 0.08, 0, g).rotation.y = i * 0.4; return g; },
  areia: () => { const g = new THREE.Group(); part(1.2, 0.25, 1, "#e7d8a8", 0, 0.12, 0, g); return g; } };
function addNode(it, x, z) {
  const wet = it === "galhoUmido" || it === "capimUmido", base = wet ? it.replace("Umido", "") : it;
  const m = nodeMesh[base](); m.position.set(x, 0, z); S.add(m);
  if (wet) m.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.55); } });
  NODES.push({ it, x, z, m, back: 0 });
}
for (let i = 0; i < 16; i++) addNode("galho", -30 + ((i * 37) % 64), 6 + ((i * 23) % 36));
for (let i = 0; i < 6; i++) addNode("galhoUmido", -60 + i * 3, 10 + (i % 3) * 6); // sombra da mata: úmidos
for (let i = 0; i < 6; i++) addNode(i % 2 ? "capimUmido" : "galhoUmido", -26 + i * 7, RIVER_Z - 9); // beira do rio: úmidos
for (let i = 0; i < 10; i++) addNode("capim", -24 + ((i * 29) % 56), 12 + ((i * 17) % 26));
for (let x = -30; x <= 10; x += 8) addNode("folhas", x + 1.6, RIVER_Z - 6.5);
addNode("folhas", -2, 44); addNode("folhas", 6, 44);
for (let i = 0; i < 5; i++) addNode("cipo", -58 - i * 5, 4 + i * 5);
for (let i = 0; i < 4; i++) addNode("areia", -20 + i * 14, RIVER_Z - 5);

// ---- cidade-treino ao norte (Era 0)
deco(120, 0.05, 80, "#a8a29e", 0, 0.025, -66);
label("🏙️ " + L(T("Cidade-treino", "Training town", "Ciudad de práctica")), 0, 7, -28, "#e0e7ff");
// casa-treino aberta na frente (0,-55)
solid(0, 1.5, -61, 14, 3, 0.3, "#fef3c7"); solid(-7, 1.5, -55, 0.3, 3, 12, "#fef3c7"); solid(7, 1.5, -55, 0.3, 3, 12, "#fef3c7");
deco(14.6, 0.3, 12.6, "#b45309", 0, 3.15, -55);
solid(-4, 1, -60, 3, 2, 0.8, "#78350f"); // estante
for (let i = 0; i < 3; i++) deco(0.8, 0.7, 0.8, i < (P.cnt.buckets || 0) ? "#0ea5e9" : "#cbd5e1", 2 + i, 0.35, -59.5);
deco(1, 1, 0.1, "#fde68a", 7.2, 1.7, -55); // janela
// garagem (11,-55) aberta
solid(11, 1.5, -61, 8, 3, 0.3, "#e9d5ff"); solid(15, 1.5, -55, 0.3, 3, 12, "#e9d5ff"); deco(8.6, 0.3, 12.6, "#6b7280", 11, 3.15, -55);
const gen = new THREE.Group(); S.add(gen); part(1.2, 0.9, 0.8, "#f59e0b", 0, 0.45, 0, gen); part(0.2, 0.5, 0.2, "#111827", 0.4, 1.1, 0, gen);
const GEN_IN = { x: 11, z: -58 }, GEN_SAFE = { x: 26, z: -44 };
const safeDisc = deco(3, 0.06, 3, "#22c55e", GEN_SAFE.x, 0.05, GEN_SAFE.z);
label("✅ " + L(T("Gerador aqui (longe das janelas)", "Generator here (away from windows)", "Generador aquí (lejos de ventanas)")), GEN_SAFE.x, 2.6, GEN_SAFE.z, "#bbf7d0");
// banca, torneira, caixa, bomba, quadro
solid(-16, 1.2, -36, 4, 2.4, 2.5, "#1d4ed8"); deco(4.4, 0.3, 3, "#facc15", -16, 2.55, -36);
deco(0.25, 1.2, 0.25, "#64748b", -10, 0.6, -46); deco(0.6, 0.15, 0.15, "#94a3b8", -10, 1.15, -46.2);
solid(16, 1.5, -36, 3, 3, 2.4, "#1e3a8a"); deco(1, 0.8, 0.1, "#38bdf8", 16, 1.7, -34.75);
solid(32, 0.9, -42, 1, 1.8, 0.8, "#f8fafc"); deco(6, 0.3, 6, "#dc2626", 32, 4.2, -42); [[29, -45], [35, -45], [29, -39], [35, -39]].forEach(([x, z]) => deco(0.3, 4, 0.3, "#e5e7eb", x, 2, z));
solid(0, 1.3, -32, 4, 2.2, 0.2, "#166534");
// bandeiras dos pontos de encontro
const MEET = [{ k: "m1", x: -40, z: -92, c: "#3b82f6" }, { k: "m2", x: 40, z: -92, c: "#22c55e" }, { k: "m3", x: 0, z: -100, c: "#f97316" }];
MEET.forEach((m) => { deco(0.2, 4, 0.2, "#e5e7eb", m.x, 2, m.z); deco(1.6, 1, 0.08, m.c, m.x + 0.8, 3.4, m.z); label(u(m.k), m.x, 5, m.z); });
// rua da feira com multidão
const CROWD = { x: 0, z: -76, r: 4.5 }, GATE_A = { x: -28, z: -76 }, GATE_B = { x: 28, z: -76 };
solid(0, 1, -69, 52, 2, 0.3, "#94a3b8"); solid(0, 1, -83, 52, 2, 0.3, "#94a3b8");
deco(2, 0.06, 2, "#ef4444", GATE_A.x, 0.05, GATE_A.z); deco(2, 0.06, 2, "#22c55e", GATE_B.x, 0.05, GATE_B.z);
label("A", GATE_A.x, 3, GATE_A.z, "#fecaca"); label("B", GATE_B.x, 3, GATE_B.z, "#bbf7d0");
const crowdBots = Array.from({ length: isMobile ? 6 : 10 }, () => createBot({ world, phys, look: randomLook(""), area: { x0: -3.5, z0: -79, x1: 3.5, z1: -73 }, speed: 0.35 }));
crowdBots.forEach((b) => { b.ch.showLabel = false; b.ch.makeLabel(); });
const stranger = new Character(S, Object.assign(randomLook("?"), { a: "cap" }), { kind: "remote" }); stranger.root.position.set(-26, 0, -46); stranger.root.rotation.y = Math.PI / 2;
const lurdes = new Character(S, Object.assign(randomLook("Dona Lurdes"), { g: "f", h: "bob", hc: "#e5e7eb" }), { kind: "remote" }); lurdes.root.position.set(-34, 0, -60);
solid(-40, 1.6, -62, 8, 3.2, 6, "#fbcfe8");

// ---------------------------------------------------------------- construções do jogador
const built = { fire: null, shelter: null, trap: null };
function placeFire(x, z) {
  if (built.fire) S.remove(built.fire.g);
  const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; part(0.4, 0.3, 0.4, "#78716c", Math.cos(a) * 0.9, 0.15, Math.sin(a) * 0.9, g); }
  part(1, 0.15, 0.2, "#7c4a1e", 0, 0.2, 0, g).rotation.y = 0.6; part(1, 0.15, 0.2, "#7c4a1e", 0, 0.25, 0, g).rotation.y = -0.6;
  const fl = part(0.5, 0.8, 0.5, "#f97316", 0, 0.65, 0, g, false); fl.material = getMat("#f97316", 1.2);
  const fl2 = part(0.3, 0.5, 0.3, "#fde047", 0, 0.75, 0, g, false); fl2.material = getMat("#fde047", 1.4);
  const light = new THREE.PointLight(0xffa040, 8, 10, 1.4); light.position.y = 1.2; g.add(light);
  built.fire = { g, x, z, fl, fl2 }; P.built.fire = { x, z };
}
function placeShelter(x, z) {
  const g = new THREE.Group(); g.position.set(x, 1.5, z); S.add(g);
  part(0.2, 2.4, 0.2, "#7c4a1e", -1.2, 1.2, -1.2, g); part(0.2, 2.4, 0.2, "#7c4a1e", 1.2, 1.2, -1.2, g);
  const r = part(3, 0.12, 3.4, "#65a30d", 0, 1.3, 0.2, g); r.rotation.x = 0.7;
  built.shelter = { g }; P.built.shelter = { x, z };
}
function placeTrap(x, z, t0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
  for (let i = 0; i < 5; i++) { part(1.2 - i * 0.18, 0.08, 0.08, "#8b5a2b", 0, 0.1 + i * 0.12, 0.55 - i * 0.09, g); part(1.2 - i * 0.18, 0.08, 0.08, "#8b5a2b", 0, 0.1 + i * 0.12, -0.55 + i * 0.09, g); part(0.08, 0.08, 1.2 - i * 0.18, "#7c4a1e", 0.55 - i * 0.09, 0.16 + i * 0.12, 0, g); part(0.08, 0.08, 1.2 - i * 0.18, "#7c4a1e", -0.55 + i * 0.09, 0.16 + i * 0.12, 0, g); }
  built.trap = { g, x, z, t0 }; P.built.trap = { x, z, t0 };
}
if (P.built.fire) placeFire(P.built.fire.x, P.built.fire.z);
if (P.built.shelter) placeShelter(P.built.shelter.x, P.built.shelter.z);
if (P.built.trap && !P.w.trap_check) placeTrap(P.built.trap.x, P.built.trap.z, Date.now());
if (P.w.co_ok) gen.position.set(GEN_SAFE.x, 0, GEN_SAFE.z); else gen.position.set(GEN_IN.x, 0, GEN_IN.z);

// ---------------------------------------------------------------- jogador e rede
const cam = createFollowCamera(world.camera, { phys, dist: 9, maxDist: 18, yaw: 0 });
const input = createInput({ canvas: world.renderer.domElement, enabled: () => playing, onLook: (dx, dy, tc) => cam.look(dx, dy, tc), onZoom: (d) => cam.zoom(d) });
input.addButton({ label: "✋", action: "act", big: true, hold: false });
input.addButton({ label: "⤒", action: "jump" });
input.setVisible(false);
const room = createRoom({ gameId: GAME_ID, max: 4 });
room.shareUrl = () => { const x = new URL(location.href); x.search = ""; x.searchParams.set("modo", "aprender"); if (room.code) x.searchParams.set("sala", room.code); return x.toString(); };
const spawn = { x: 0, y: 0.05, z: 9 };
const me = createPlayer({ world, phys, input, cam, look: loadLook(), spawn, room });
const remotes = createRemotePlayers(S, room);
room.on("chat", (d, from) => { const r = remotes.get(from); if (r && d && typeof d.m === "number") { r.ch.say(chatText(d.m)); Audio.play("pop"); } });
function sayChat(i) { me.ch.say(chatText(i)); Audio.play("pop"); room.send("chat", { m: i }); }

// ---------------------------------------------------------------- menus
function openMenu(build) {
  menuOpen = true; input.setVisible(false);
  const card = h("div"); let scr = null;
  const close = () => { scr.el.remove(); menuOpen = false; if (playing) input.setVisible(true); updHud(); save(); };
  function draw() {
    const d = build(close);
    card.replaceChildren(h("h2", d.title), ...(d.info || []).filter(Boolean).map((p) => (p instanceof Node ? p : h("p", p))),
      h("div.ez-col", { style: { marginTop: "10px" } },
        ...(d.opts || []).filter(Boolean).map((o) => h("button.ez-btn.wide" + (o.cls || ""), { disabled: o.dis ? true : null, style: o.dis ? { opacity: 0.45 } : null, onclick: () => { if (o.dis) return; Audio.play("click"); const r = o.fn(); if (r === "close") close(); else if (scr.el.isConnected) draw(); } }, o.label)),
        d.noClose ? null : h("button.ez-btn.gray.wide", { onclick: close }, d.closeLabel || u("leave"))));
  }
  draw(); scr = screen([card], { dim: true });
  return { close, draw };
}
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const flag = (f, msg) => { if (P.w[f]) return; P.w[f] = 1; if (msg) toast(msg, 2600); Audio.play("ok"); save(); };

// ---------------------------------------------------------------- aula: cartões → quiz → desafio
function startLesson(l) {
  let i = 0, qi = 0, order = null;
  openMenu((close) => {
    if (i < l.c.length) return { title: `${l.icon} ${L(l.t)} · ${i + 1}/${l.c.length}`, info: [h("p", { style: { fontSize: "18px" } }, L(l.c[i]))], opts: [{ label: u("next"), fn: () => { i++; } }] };
    if (qi < 2) {
      const [q, ok, w1, w2] = L(l.q[qi]);
      if (!order) order = shuffle([ok, w1, w2]);
      return { title: u("quiz", { i: qi + 1 }), info: [h("p", { style: { fontSize: "18px", fontWeight: 700 } }, q)], opts: order.map((o) => ({ label: o, fn: () => {
        const exp = L(l.q[qi])[4];
        if (o === ok) { Audio.play("ok"); toast(u("right"), 1500); qi++; order = null; }
        else { Audio.play("wrong"); toast(u("wrong") + " " + exp, 4000); order = shuffle([ok, w1, w2]); }
      } })) };
    }
    return { title: u("chal"), info: [...l.steps.map((s) => "▪️ " + stepText(s))], opts: [{ label: u("go"), fn: () => {
      P.cur = l.id; P.cnt = {}; save(); track("ez_lesson_start", { game: GAME_ID, lesson: l.id }); return "close";
    } }] };
  });
}
function reviewLesson(l) {
  let i = 0;
  openMenu(() => (i < l.c.length ? { title: `${l.icon} ${L(l.t)} · ${i + 1}/${l.c.length}`, info: [L(l.c[i])], opts: [{ label: u("next"), fn: () => { i++; } }] } : { title: `${l.icon} ${L(l.t)}`, info: ["✅"], opts: [] }));
}
function stepText(s) {
  if (s.k === "pick") return `${s.n}× ${itName(s.it)}`;
  return L(s.txt);
}
function stepDone(s) {
  if (s.k === "pick") { const key = "ok_" + s.it; if (P.cnt[key]) return true; if ((P.cnt[s.it] || 0) >= s.n || has(s.it, s.n)) { P.cnt[key] = 1; return true; } return false; }
  if (s.k === "safe") return (P.cnt.safe || 0) >= s.n;
  return !!P.w[s.f];
}
function stepProg(s) { if (s.k === "pick") return ` (${Math.min(Math.max(P.cnt[s.it] || 0, P.bag[s.it] || 0), s.n)}/${s.n})`; if (s.k === "safe") return ` (${Math.min(P.cnt.safe || 0, s.n)}/${s.n})`; return ""; }
function checkLesson() {
  const l = P.cur && byId[P.cur]; if (!l) return;
  if (!l.steps.every(stepDone)) return;
  P.done.push(l.id); P.cur = null; save();
  Audio.play("win"); track("ez_lesson_done", { game: GAME_ID, lesson: l.id });
  const newly = LESSONS.filter((x) => avail(x) && x.req.includes(l.id));
  const allEra1 = LESSONS.filter((x) => x.era === 1).every((x) => isDone(x.id));
  openMenu(() => ({ title: u("done"), info: [h("p", { style: { fontSize: "20px", textAlign: "center" } }, `${l.icon} ${L(l.t)}`),
    newly.length ? h("p", h("b", u("unlocked")), " " + newly.map((x) => x.icon + " " + L(x.t)).join(" · ")) : null,
    allEra1 ? u("eraDone") : null], opts: [{ label: u("tree"), fn: () => { setTimeout(openTree, 0); return "close"; } }] }));
}
function openTree() {
  openMenu(() => {
    const info = [h("p", u("progress", { d: P.done.length, n: LESSONS.length }))];
    const opts = [];
    for (const era of ERAS) {
      info.push(null);
      opts.push({ label: `${era.icon} ${L(era.name)}${era.soon ? " · " + u("soon") : ""}`, cls: ".gray", dis: true, fn: () => {} });
      if (era.soon) continue;
      for (const l of LESSONS.filter((x) => x.era === era.id)) {
        const done = isDone(l.id), ok = avail(l), cur = P.cur === l.id;
        const lab = `${done ? "✅" : cur ? "▶️" : ok ? "🔓" : "🔒"} ${l.icon} ${L(l.t)}`;
        opts.push({ label: lab, cls: done ? ".blue" : ok ? "" : ".gray", dis: !done && !ok, fn: () => { setTimeout(() => (done ? reviewLesson(l) : startLesson(l)), 0); return "close"; } });
      }
    }
    return { title: u("tree"), info, opts };
  });
}

// ---------------------------------------------------------------- mochila e construção
function openBag() {
  openMenu(() => {
    const ks = Object.keys(P.bag).filter((k) => ITEMS[k]);
    const opts = ks.map((k) => {
      const lab = `${itName(k)} ×${P.bag[k]}`;
      if (ITEMS[k].safe || k === "peixeAssado") return { label: lab + " → " + u("eat"), fn: () => { add(k, -1); toast(u("yum")); Audio.play("coin"); } };
      if (k === "aguaBoa") return { label: lab + " → " + u("drink"), fn: () => { add(k, -1); toast(u("yum")); Audio.play("pop"); } };
      if (k === "aguaSuja") return { label: lab + " → " + u("drink"), cls: ".warn", fn: () => { toast(u("r_drinkBad"), 3500); Audio.play("wrong"); } };
      return { label: lab, cls: ".gray", dis: true, fn: () => {} };
    });
    opts.unshift({ label: u("build"), cls: ".blue", fn: () => { setTimeout(openBuild, 0); return "close"; } });
    return { title: u("bag"), info: [ks.length ? null : u("empty")], opts };
  });
}
const inMata = () => me.x > MATA.x0 && me.x < MATA.x1 && me.z > MATA.z0 && me.z < MATA.z1;
function need(list) { const miss = list.filter(([k, n]) => !has(k, n)).map(([k, n]) => `${n}× ${itName(k)}`); return miss.length ? u("need", { x: miss.join(", ") }) : null; }
function openBuild() {
  const R = {
    fire: [["galho", 3], ["capim", 2], ["pederneira", 1]], shelter: [["galho", 4], ["folhas", 4]], filter: [["aguaSuja", 1], ["areia", 1], ["carvao", 1]],
    rod: [["galho", 1], ["linha", 1]], trap: [["galho", 4], ["cipo", 1]],
  };
  const use = (list, keep = []) => list.forEach(([k, n]) => { if (!keep.includes(k)) add(k, -n); });
  openMenu(() => ({ title: u("build"), info: [], opts: [
    { label: u("b_fire"), fn: () => { const m = need(R.fire); if (m) { if (has("galhoUmido") || has("capimUmido")) return toast(u("wetNo"), 4000); return toast(m, 3000); } if (inMata() || me.z < -26) return toast(u("fireBad"), 3500); use(R.fire, ["pederneira"]); placeFire(me.x + Math.sin(me.rot) * 2, me.z + Math.cos(me.rot) * 2); flag("fire_ok", u("fireLit")); return "close"; } },
    { label: u("b_shelter"), fn: () => { const m = need(R.shelter); if (m) return toast(m, 3000); if (Math.hypot(me.x - HILL.x, me.z - HILL.z) > HILL.r || me.y < 1) return toast(u("shelterBad"), 3500); use(R.shelter); placeShelter(me.x, me.z); flag("shelter_ok", u("shelterOk")); return "close"; } },
    { label: u("b_filter"), fn: () => { const m = need(R.filter); if (m) return toast(m, 3000); use(R.filter); add("aguaFiltrada"); flag("w_filter", itName("aguaFiltrada") + " ✓"); return "close"; } },
    { label: u("b_rod"), fn: () => { const m = need(R.rod); if (m) return toast(m, 3000); add("galho", -1); add("vara"); flag("fish_rod", itName("vara") + " ✓"); return "close"; } },
    { label: u("b_trap"), fn: () => { const m = need(R.trap); if (m) return toast(m, 3000); if (Math.hypot(me.x - TRAIL.x, me.z - TRAIL.z) > TRAIL.r + 2) return toast(u("trapBad"), 3500); use(R.trap); placeTrap(me.x, me.z, Date.now()); flag("trap_set", u("trapOk")); return "close"; } },
  ] }));
}

// ---------------------------------------------------------------- lugares (interações)
const SPOTS = [];
const spot = (x, z, r, name, open, extra) => SPOTS.push(Object.assign({ x, z, r, name, open }, extra || {}));
spot(0, -2.6, 2.6, () => u("i_teacher"), () => openMenu(() => ({ title: "👩‍🏫 " + u("i_teacher"), info: [u("teacherHi"), P.cur ? "▶️ " + L(byId[P.cur].t) : null], opts: [{ label: u("tree"), fn: () => { setTimeout(openTree, 0); return "close"; } }] })), { mark: () => !P.cur && LESSONS.some(avail) });
spot(-3.6, 0.5, 2.2, () => u("i_chest"), () => {
  const KIT = [["faca", 0.3, 1], ["lona", 1.5, 1], ["corda", 0.5, 1], ["cantil", 1, 1], ["panela", 0.8, 1], ["pederneira", 0.1, 1], ["kit", 0.5, 1], ["linha", 0.1, 1], ["lanterna", 0.3, 1],
    ["x_pillow", 1.5, 0, T("🛏️ Travesseiro grande", "🛏️ Big pillow", "🛏️ Almohada grande")], ["x_laptop", 2.5, 0, T("💻 Notebook", "💻 Laptop", "💻 Portátil")], ["x_pan", 4.5, 0, T("🥘 Panela de pressão grande", "🥘 Big pressure cooker", "🥘 Olla a presión grande")], ["x_dryer", 0.8, 0, T("💨 Secador de cabelo", "💨 Hair dryer", "💨 Secador de pelo")], ["x_books", 3, 0, T("📚 Coleção de livros", "📚 Book collection", "📚 Colección de libros")]];
  const sel = new Set(isDone("e1_bag") ? KIT.filter((k) => k[2]).map((k) => k[0]) : []);
  openMenu(() => {
    const w = KIT.filter((k) => sel.has(k[0])).reduce((a, k) => a + k[1], 0);
    return { title: "🧰 " + u("i_chest"), info: [u("bagQ", { w: w.toFixed(1) })], opts: [
      ...KIT.map(([k, kg, , nm]) => ({ label: (sel.has(k) ? "☑️ " : "⬜ ") + (nm ? L(nm) : itName(k)) + ` · ${kg} kg`, fn: () => { sel.has(k) ? sel.delete(k) : sel.add(k); } })),
      { label: u("confirm"), cls: ".blue", fn: () => {
        if (w > 10) { toast(u("bagHeavy"), 3000); Audio.play("wrong"); return; }
        const ess = KIT.filter((k) => k[2]).every((k) => sel.has(k[0]));
        if (!ess) { toast(u("bagMiss"), 3500); Audio.play("wrong"); return; }
        KIT.filter((k) => k[2]).forEach(([k]) => { if (!has(k)) add(k); });
        flag("bag_ok", u("bagOk")); return "close";
      } },
    ] };
  });
});
spot(7, 5, 2.4, () => u("i_leo"), () => {
  if (P.w.aid_ok) return toast(u("aidOk"));
  const STEPS = [T("🧤 Proteger as mãos e lavar o corte com água limpa", "🧤 Protect your hands and rinse the cut with clean water", "🧤 Protegerse las manos y lavar el corte con agua limpia"), T("🤲 Apertar com pano limpo até parar de sangrar", "🤲 Press with a clean cloth until it stops bleeding", "🤲 Presionar con un paño limpio hasta que pare de sangrar"), T("🩹 Cobrir com curativo", "🩹 Cover with a bandage", "🩹 Cubrir con una venda")];
  const BAD = [T("🌿 Passar terra para estancar", "🌿 Rub dirt on it to stop the blood", "🌿 Echar tierra para parar la sangre"), T("💨 Assoprar a ferida", "💨 Blow on the wound", "💨 Soplar la herida")];
  let i = 0, order = shuffle([...STEPS, ...BAD]);
  openMenu(() => ({ title: "🩹 " + u("i_leo"), info: [u("aidQ", { i: i + 1 })], opts: order.map((o) => ({ label: L(o), fn: () => {
    if (o === STEPS[i]) { i++; Audio.play("coin"); order = order.filter((x) => x !== o); if (i === 3) { flag("aid_ok", u("aidOk")); return "close"; } }
    else { Audio.play("wrong"); toast(u("wrong"), 1800); }
  } })) }));
}, { mark: () => P.cur === "e1_aid" && !P.w.aid_ok });
// árvores frutíferas e plantas
FRUITS.forEach(([f, x, z]) => spot(x, z, 3, () => u("i_tree", { f: L(ITEMS[f].n) }), () => {
  add(f); P.cnt[f] = (P.cnt[f] || 0) + 1; P.cnt.safe = (P.cnt.safe || 0) + 1; Audio.play("coin");
  toast(f === "pequi" ? u("pequiTip") : "+1 " + itName(f), f === "pequi" ? 3500 : 1500); save();
}));
BADS.forEach(([k, x, z]) => spot(x, z, 2.6, () => u(k === "bad" ? "i_bad" : "i_brava"), () => openMenu(() => ({ title: u(k === "bad" ? "i_bad" : "i_brava"), info: [], opts: [
  { label: u("harvest"), cls: ".warn", fn: () => { toast(u(k === "bad" ? "badWarn" : "bravaWarn"), 3500); Audio.play("wrong"); return "close"; } },
  { label: u("leave"), fn: () => { toast("👍"); return "close"; } },
] }))));
// rio (zona) e fogueira (dinâmica)
spot(0, RIVER_Z - 4.5, 0, () => u("i_river"), () => {
  const atRem = Math.abs(me.x - 30) < 12;
  openMenu(() => ({ title: "〰️ " + u("i_river"), info: [], opts: [
    { label: u("r_dirty"), fn: () => { if (!has("panela")) return toast(u("noPot"), 3000); add("aguaSuja"); flag("w_dirty", "+1 " + itName("aguaSuja")); } },
    { label: u("r_sand"), fn: () => { add("areia"); P.cnt.areia = (P.cnt.areia || 0) + 1; Audio.play("coin"); } },
    { label: u("r_fish"), fn: () => { if (!has("vara")) return toast(u("r_noRod"), 3000); if (!atRem) return toast(u("r_notHere"), 3500); setTimeout(fishGame, 0); return "close"; } },
    { label: u("r_drink"), cls: ".warn", fn: () => { toast(u("r_drinkBad"), 3500); Audio.play("wrong"); } },
  ] }));
}, { zone: () => Math.abs(me.z - (RIVER_Z - 3)) < 3.5 });
spot(0, 0, 3, () => u("i_fire"), () => openMenu(() => ({ title: "🔥 " + u("i_fire"), info: [], opts: [
  { label: u("f_coal"), fn: () => { add("carvao"); flag("w_coal", "+1 " + itName("carvao")); } },
  { label: u("f_dry"), dis: !has("galhoUmido") && !has("capimUmido"), fn: () => { for (const k of ["galho", "capim"]) { const n = P.bag[k + "Umido"] || 0; if (n) { add(k + "Umido", -n); add(k, n); P.cnt[k] = (P.cnt[k] || 0) + n; } } toast(u("f_dried"), 2500); Audio.play("ok"); } },
  { label: u("f_boil"), dis: !has("aguaFiltrada"), fn: () => { add("aguaFiltrada", -1); add("aguaBoa"); flag("w_boil", u("boiled")); } },
  { label: u("f_cook"), dis: !has("peixe"), fn: () => { add("peixe", -1); add("peixeAssado"); flag("fish_cook", u("cooked")); } },
  { label: u("f_out"), cls: ".gray", fn: () => { S.remove(built.fire.g); built.fire = null; P.built.fire = null; toast(u("f_outOk"), 2500); Audio.play("ok"); return "close"; } },
] })), { dyn: () => built.fire && { x: built.fire.x, z: built.fire.z } });
spot(0, 0, 2.4, () => u("i_trap"), () => {
  const tr = built.trap; if (!tr) return;
  if (Date.now() - tr.t0 < 40000) return toast(u("trapWait"), 2500);
  S.remove(tr.g); built.trap = null; flag("trap_check"); openMenu(() => ({ title: "🪤 " + u("i_trap"), info: [ux("trapGot")] }));
}, { dyn: () => built.trap && { x: built.trap.x, z: built.trap.z } });
// ---- Era 0 (cidade-treino)
spot(-16, -34, 2.8, () => u("i_news"), () => {
  const NEWS = [[T("📢 Defesa Civil: alerta de tempestade solar forte nas próximas 48 h. Veja como se preparar.", "📢 Civil Defense: strong solar storm alert for the next 48 h. See how to prepare.", "📢 Protección Civil: alerta de tormenta solar fuerte en las próximas 48 h. Mira cómo prepararte."), 1],
    [T("🔴 URGENTE!!! O apagão vai durar 1 ano e o governo esconde! COMPARTILHE COM TODOS!!!", "🔴 URGENT!!! The blackout will last a year and the government is hiding it! SHARE WITH EVERYONE!!!", "🔴 ¡¡¡URGENTE!!! ¡El apagón durará un año y el gobierno lo oculta! ¡¡¡COMPARTE CON TODOS!!!"), 0],
    [T("⚡ Operador Nacional do Sistema Elétrico informa instabilidade em linhas de transmissão.", "⚡ National grid operator reports instability on transmission lines.", "⚡ El operador nacional de la red eléctrica informa inestabilidad en las líneas de transmisión."), 1],
    [T("🎧 Áudio vazado: beba água com sal para se proteger da radiação do sol.", "🎧 Leaked audio: drink salt water to protect yourself from solar radiation.", "🎧 Audio filtrado: bebe agua con sal para protegerte de la radiación solar."), 0]];
  let i = 0;
  openMenu(() => i >= NEWS.length ? { title: "📰 " + u("i_news"), info: [u("newsAll")], opts: [] } : { title: "📰 " + u("newsQ") + ` (${i + 1}/4)`, info: [h("p", { style: { fontSize: "18px", fontWeight: 700 } }, L(NEWS[i][0]))], opts: [
    { label: u("reliable"), fn: () => { if (NEWS[i][1]) { i++; Audio.play("coin"); if (i === 4) flag("news_ok", u("newsAll")); } else { toast(u("wrong"), 1500); Audio.play("wrong"); } } },
    { label: u("rumor"), fn: () => { if (!NEWS[i][1]) { i++; Audio.play("coin"); if (i === 4) flag("news_ok", u("newsAll")); } else { toast(u("wrong"), 1500); Audio.play("wrong"); } } },
  ] });
}, { mark: () => P.cur === "e0_signs" && !P.w.news_ok });
spot(-4, -58.6, 2.4, () => u("i_shelf"), () => {
  const KIT = [[T("💧 Água (4 L por pessoa/dia)", "💧 Water (4 L per person/day)", "💧 Agua (4 L por persona/día)"), 1], [T("🥫 Comida enlatada", "🥫 Canned food", "🥫 Comida enlatada"), 1], [T("🔦 Lanterna e pilhas", "🔦 Flashlight and batteries", "🔦 Linterna y pilas"), 1], [T("📻 Rádio a pilha", "📻 Battery radio", "📻 Radio a pilas"), 1], [T("💊 Remédios de uso contínuo", "💊 Daily medicines", "💊 Medicinas de uso diario"), 1], [T("🩹 Kit de primeiros socorros", "🩹 First-aid kit", "🩹 Botiquín"), 1], [T("📄 Documentos (cópias)", "📄 Documents (copies)", "📄 Documentos (copias)"), 1], [T("💵 Dinheiro vivo", "💵 Cash", "💵 Efectivo"), 1],
    [T("💨 Secador de cabelo", "💨 Hair dryer", "💨 Secador de pelo"), 0], [T("🎮 Videogame", "🎮 Video game", "🎮 Videojuego"), 0], [T("🧊 Sorvete do freezer", "🧊 Ice cream from the freezer", "🧊 Helado del congelador"), 0]];
  const sel = new Set();
  openMenu(() => ({ title: "🎒 " + u("kitQ"), info: [], opts: [...KIT.map(([nm], i) => ({ label: (sel.has(i) ? "☑️ " : "⬜ ") + L(nm), fn: () => { sel.has(i) ? sel.delete(i) : sel.add(i); } })),
    { label: u("confirm"), cls: ".blue", fn: () => { const bad = KIT.filter(([, ok], i) => (ok ? 1 : 0) !== (sel.has(i) ? 1 : 0)).length; if (bad) { toast(u("kitBad", { n: bad }), 3000); Audio.play("wrong"); return; } flag("kit_ok", u("kitOk")); return "close"; } }] }));
}, { mark: () => P.cur === "e0_kit" && !P.w.kit_ok });
spot(16, -34, 2.6, () => u("i_atm"), () => openMenu(() => ({ title: "🏧 " + u("atmQ"), info: [], opts: [
  { label: L(T("Sacar R$ 300 em notas de 10 e 20", "Withdraw R$ 300 in 10s and 20s", "Retirar R$ 300 en billetes de 10 y 20")), fn: () => { flag("cash_ok", "💵 ✓"); return "close"; } },
  { label: L(T("Sacar uma nota de R$ 200", "Withdraw one R$ 200 bill", "Retirar un billete de R$ 200")), fn: () => { toast(L(T("Numa crise ninguém tem troco para R$ 200!", "In a crisis nobody has change for R$ 200!", "¡En una crisis nadie tiene cambio de R$ 200!")), 3000); Audio.play("wrong"); } },
  { label: L(T("Não sacar: eu uso Pix", "Don't withdraw: I use instant transfer", "No retirar: uso transferencia")), fn: () => { toast(L(T("Sem energia, o Pix para!", "Without power, transfers stop!", "¡Sin luz, las transferencias paran!")), 3000); Audio.play("wrong"); } },
] })), { mark: () => P.cur === "e0_cash" && !P.w.cash_ok });
spot(32, -40, 3, () => u("i_gas"), () => openMenu(() => ({ title: "⛽ " + u("gasQ"), info: [], opts: [
  { label: L(T("Encher o tanque agora (e um galão certificado, guardado fora de casa)", "Fill the tank now (and a certified can, stored outside)", "Llenar el tanque ahora (y un bidón certificado, guardado fuera)")), fn: () => { flag("fuel_ok", "⛽ ✓"); return "close"; } },
  { label: L(T("Deixar para amanhã", "Leave it for tomorrow", "Dejarlo para mañana")), fn: () => { toast(L(T("Amanhã as bombas podem estar paradas.", "Tomorrow the pumps may be dead.", "Mañana las bombas pueden estar paradas.")), 3000); Audio.play("wrong"); } },
  { label: L(T("Encher garrafas PET de gasolina e guardar no quarto", "Fill plastic bottles with gas and keep them in the bedroom", "Llenar botellas de plástico con gasolina y guardarlas en el cuarto")), fn: () => { toast(L(T("Perigo de incêndio! Só galão certificado e fora de casa.", "Fire hazard! Only certified cans, stored outside.", "¡Peligro de incendio! Solo bidón certificado y fuera de casa.")), 3500); Audio.play("wrong"); } },
] })), { mark: () => P.cur === "e0_fuel" && !P.w.fuel_ok });
spot(-10, -46, 2.4, () => u("i_tap"), () => openMenu(() => ({ title: "🚰 " + u("i_tap"), info: [], opts: [
  { label: u("tapFill"), fn: () => { if (has("balde")) return toast(u("haveBucket")); add("balde"); Audio.play("coin"); return "close"; } },
  { label: u("tapBottle"), fn: () => { add("garrafa"); flag("care_bottle"); return "close"; } },
] })), { mark: () => (P.cur === "e0_water" && !has("balde")) || (P.cur === "e0_care" && !has("garrafa")) });
spot(3, -58, 2.6, () => u("i_store"), () => openMenu(() => ({ title: "🪣 " + u("i_store"), info: [], opts: [
  { label: u("storeIt", { n: P.cnt.buckets || 0 }), dis: !has("balde"), fn: () => { add("balde", -1); P.cnt.buckets = (P.cnt.buckets || 0) + 1; Audio.play("coin"); if (P.cnt.buckets >= 3) flag("water3", "🪣🪣🪣 ✓"); } },
] })), { mark: () => P.cur === "e0_water" && has("balde") });
spot(0, -31, 2.6, () => u("i_board"), () => openMenu(() => ({ title: "📌 " + u("boardQ"), info: [], opts: MEET.map((m, i) => ({ label: u(m.k), fn: () => { P.w.meet = i; flag("meet_pick", u("meetGo", { m: u(m.k) })); return "close"; } })) })), { mark: () => P.cur === "e0_meet" && !P.w.meet_pick });
spot(-26, -46, 2.6, () => u("i_stranger"), () => openMenu(() => ({ title: "🧢 " + u("i_stranger"), info: [u("strangerQ")], opts: shuffle(["s1", "s2", "s3"]).map((k) => ({ label: u(k), fn: () => { if (k === "s1") { flag("safe_ok", u("sOk")); return "close"; } toast(u("sBad"), 3000); Audio.play("wrong"); } })) })), { mark: () => P.cur === "e0_safe" && !P.w.safe_ok });
spot(GEN_IN.x, GEN_IN.z, 2.6, () => u("i_gen"), () => { if (P.w.co_carry || P.w.co_ok) return; openMenu(() => ({ title: "⚠️ " + u("i_gen"), info: [u("genHere")], opts: [{ label: u("genTake"), fn: () => { add("gerador"); gen.visible = false; flag("co_carry"); return "close"; } }] })); }, { mark: () => P.cur === "e0_co" && !P.w.co_carry });
spot(GEN_SAFE.x, GEN_SAFE.z, 2.6, () => u("i_safe"), () => { if (!has("gerador")) return; add("gerador", -1); gen.position.set(GEN_SAFE.x, 0, GEN_SAFE.z); gen.visible = true; flag("co_ok", u("genOk")); }, { mark: () => has("gerador") });
spot(-34, -58.5, 2.6, () => u("i_lurdes"), () => openMenu(() => ({ title: "👵 " + u("i_lurdes"), info: [P.w.care_ok ? u("lurdesThanks") : u("lurdesHi")], opts: P.w.care_ok ? [] : [
  { label: u("lurdesGive"), dis: !has("garrafa"), fn: () => { add("garrafa", -1); flag("care_ok", u("lurdesThanks")); return "close"; } },
] })), { mark: () => P.cur === "e0_care" && !P.w.care_ok });

// marcadores ❗
const markTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const c = cv.getContext("2d"); c.font = "52px sans-serif"; c.textAlign = "center"; c.fillText("❗", 32, 52); return new THREE.CanvasTexture(cv); })();
SPOTS.filter((s) => s.mark).forEach((s) => { s.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, depthTest: false })); s.sprite.scale.set(1.6, 1.6, 1); s.sprite.position.set(s.x, 4.4, s.z); s.sprite.visible = false; S.add(s.sprite); });

// ---------------------------------------------------------------- pesca (minijogo)
function fishGame() {
  menuOpen = true; input.setVisible(false);
  const bar = h("div", { style: { position: "relative", height: "34px", background: "#bae6fd", borderRadius: "17px", overflow: "hidden", margin: "14px 0" } });
  const zone = h("div", { style: { position: "absolute", top: 0, bottom: 0, width: "22%", background: "#22c55e", left: "40%" } });
  const fish = h("div", { style: { position: "absolute", top: "2px", fontSize: "26px", left: "0%" } }, "🐟");
  bar.append(zone, fish);
  let x = 0, v = 0.55, zl = 20 + Math.random() * 55, run = true;
  zone.style.left = zl + "%";
  const scr = screen([h("h2", u("fishTitle")), bar, h("button.ez-btn.wide", { onclick: () => {
    const ok = x >= zl - 3 && x <= zl + 19;
    if (ok) { run = false; add("peixe"); flag("fish_get", u("fishOk")); scr.el.remove(); menuOpen = false; if (playing) input.setVisible(true); }
    else { toast(u("fishMiss")); Audio.play("wrong"); zl = 20 + Math.random() * 55; zone.style.left = zl + "%"; v = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.4); }
  } }, u("pull")), h("button.ez-btn.gray.wide", { onclick: () => { run = false; scr.el.remove(); menuOpen = false; if (playing) input.setVisible(true); } }, u("leave"))], { dim: true });
  let last = performance.now();
  (function loop(now) { if (!run) return; const dt = (now - last) / 1000; last = now; x += v * dt * 100; if (x > 92) { x = 92; v = -Math.abs(v); } if (x < 0) { x = 0; v = Math.abs(v); } fish.style.left = x + "%"; requestAnimationFrame(loop); })(last);
}

// ---------------------------------------------------------------- HUD
const progPill = h("div.ez-pill"), lessonEl = h("div.sv-goals"), prompt = h("div.sv-prompt.ez-hidden");
lessonEl.addEventListener("click", () => lessonEl.classList.toggle("open"));
const btn = (e, fn, title) => h("button.ez-rbtn", { title, onclick: fn }, e);
const topEl = h("div.ez-top", progPill, roomPill(room), h("div.ez-spacer"),
    btn("🌳", () => openTree(), "T"), btn("🎒", () => openBag(), "I"), btn("💬", () => openQuickChat(sayChat)),
    btn("👥", () => { pause(false); openRoomPanel(room, { onClose: resume }); }), btn("⏸", () => pause()), btn("❓", () => openHow()));
const hud = h("div.ez-hud.ez-hidden", topEl, lessonEl, prompt);
document.body.appendChild(hud);
function openHow() { openMenu(() => ({ title: t("howTitle"), info: ["how1", "how2", "howL3", "howL4", "howL5"].map((k) => h("p", t(k))), closeLabel: t("gotIt") })); }
function updHud() {
  progPill.textContent = u("title") + " · " + u("progress", { d: P.done.length, n: LESSONS.length });
  lessonEl.style.top = topEl.getBoundingClientRect().bottom + 6 + "px";
  const l = P.cur && byId[P.cur];
  if (!l) { lessonEl.replaceChildren(h("b", "📚 " + u("noLesson"))); return; }
  lessonEl.replaceChildren(h("b", `${l.icon} ${L(l.t)}`), ...l.steps.map((s) => h("div.next" + (stepDone(s) ? ".ok" : ""), (stepDone(s) ? "✅ " : "⬜ ") + stepText(s) + stepProg(s))));
}
onLangChange(() => updHud());

// ---------------------------------------------------------------- telas
function showTitle() {
  playing = false; hud.classList.add("ez-hidden"); input.setVisible(false);
  const cv = h("canvas", { style: { width: "150px", height: "200px", display: "block", margin: "0 auto" } });
  const pv = createAvatarPreview(cv); pv.set(me.ch.look); pv.start();
  let scr = null; const close = () => { pv.stop(); scr.close(); };
  const ageRow = h("div.ez-row", { style: { justifyContent: "center" } });
  const drawAge = () => ageRow.replaceChildren(h("b", u("age") + ": "), ...["kid", "teen"].map((a) => h("button.ez-chip" + (cfg.age === a ? ".sel" : ""), { onclick: () => { cfg.age = a; store.setJSON("cfg", Object.assign(store.getJSON("cfg", {}), { age: a })); drawAge(); } }, t(a === "kid" ? "age_kid" : "age_teen"))));
  drawAge();
  scr = screen([
    h("h1", "🔦 " + t("title")), h("p", { style: { textAlign: "center", opacity: 0.7 } }, u("title") + " · " + u("sub") + " · v" + VERSION),
    cv, ageRow,
    h("div.ez-col", { style: { marginTop: "10px" } },
      h("button.ez-btn.wide", { onclick: () => { close(); if (!P.done.length && !P.cur) intro(); else start(); } }, "▶ " + (P.done.length || P.cur ? u("contL") : u("startL")) + (P.done.length ? " · " + u("progress", { d: P.done.length, n: LESSONS.length }) : "")),
      h("p.ez-msg", { style: { margin: "-4px 0 4px", textAlign: "center" } }, t("learnDesc")),
      h("button.ez-btn.gray.wide", { onclick: () => { location.href = "./"; } }, u("real")),
      h("p.ez-msg", { style: { margin: "-4px 0 4px", textAlign: "center" } }, t("realDesc")),
      h("div.ez-row", { style: { justifyContent: "center" } },
        h("button.ez-btn.blue.small", { onclick: () => { close(); openAvatarEditor(me.ch.look, (lk) => { me.setLook(lk); showTitle(); }, { onCancel: showTitle }); } }, "👕 " + t("character")),
        h("button.ez-btn.blue.small", { onclick: () => { close(); openRoomPanel(room, { onClose: showTitle }); } }, "👥 " + t("mp")),
        h("button.ez-btn.gray.small", { onclick: () => { close(); openSettings({ world, onClose: showTitle }); } }, "⚙️")),
      installButton(),
      isTouch ? null : h("p.ez-msg", { style: { textAlign: "center" } }, L(T("WASD/setas: andar · E: interagir · I: mochila · T: árvore · Arraste: câmera", "WASD/arrows: move · E: interact · I: backpack · T: tree · Drag: camera", "WASD/flechas: mover · E: interactuar · I: mochila · T: árbol · Arrastra: cámara")))),
  ]);
}
function intro() { const s = screen([h("h2", "⛺ " + u("title")), h("p", u("intro")), h("button.ez-btn.wide", { onclick: () => { s.close(); start(); } }, "▶ " + t("play"))]); }
function start() { playing = true; hud.classList.remove("ez-hidden"); input.setVisible(true); world.setPaused(false); Audio.init(); updHud(); track("ez_play", { game: GAME_ID, multiplayer: room.connected ? 1 : 0 }); if (!store.get("howSeenL")) { store.set("howSeenL", "1"); openHow(); } }
function pause(showMenu = true) {
  playing = false; world.setPaused(true); input.setVisible(false); save();
  if (!showMenu) return;
  const scr = screen([h("h2", "⏸ " + t("paused")), h("div.ez-col",
    h("button.ez-btn.wide", { onclick: () => { scr.close(); resume(); } }, "▶ " + t("resume")),
    h("button.ez-btn.gray.wide", { onclick: () => { scr.close(); openSettings({ world, onClose: () => pause() }); } }, "⚙️ " + t("settings")),
    h("button.ez-btn.gray.wide", { onclick: () => { scr.close(); showTitle(); } }, "🏠 " + t("menu")))], { dim: true });
}
function resume() { start(); }
input.onAction("pause", () => { if (playing && !menuOpen) pause(); });
addEventListener("keydown", (e) => {
  if (!playing || menuOpen) return;
  if (e.code === "KeyI") openBag(); else if (e.code === "KeyT") openTree();
  else { const n = parseInt(e.key, 10); if (n >= 0 && n <= 9) sayChat(n === 0 ? 9 : n - 1); }
});
addEventListener("pagehide", save);

// ---------------------------------------------------------------- loop
let checkT = 0, crowdRun = false, near = null;
function nearest() {
  let best = null, bd = 1e9;
  for (const s of SPOTS) {
    let x = s.x, z = s.z;
    if (s.dyn) { const p = s.dyn(); if (!p) continue; x = p.x; z = p.z; }
    if (s.zone) { if (s.zone()) return s; continue; }
    const d = Math.hypot(x - me.x, z - me.z); if (d < s.r && d < bd) { bd = d; best = s; }
  }
  return best;
}
world.onUpdate((dt) => {
  const active = playing && !menuOpen;
  if (active) {
    me.update(dt);
    // coleta de recursos ao encostar
    for (const n of NODES) {
      if (n.back > 0) { n.back -= dt; if (n.back <= 0) n.m.visible = true; continue; }
      if (Math.hypot(n.x - me.x, n.z - me.z) < 1.6) { n.m.visible = false; n.back = 25; add(n.it); P.cnt[n.it] = (P.cnt[n.it] || 0) + 1; Audio.play("coin"); toast("+1 " + itName(n.it), 900); }
    }
    near = nearest();
    prompt.classList.toggle("ez-hidden", !near);
    if (near) prompt.textContent = (isTouch ? "✋ " : "E · ") + near.name();
    if (near && input.pressed("act")) near.open();
    // ponto de encontro
    if (P.w.meet_pick && !P.w.meet_go) { const m = MEET[P.w.meet]; if (Math.hypot(m.x - me.x, m.z - me.z) < 3) flag("meet_go", u("meetOk")); }
    // multidão: portão A → B pelas bordas
    if (Math.hypot(GATE_A.x - me.x, GATE_A.z - me.z) < 2 && !crowdRun) { crowdRun = true; toast(u("gateA"), 2500); }
    if (Math.hypot(CROWD.x - me.x, CROWD.z - me.z) < CROWD.r + 0.6) { if (crowdRun) { crowdRun = false; toast(u("crowdFail"), 3200); Audio.play("push"); } me.body.push(Math.sign(me.x - CROWD.x) || 1, Math.sign(me.z - CROWD.z) || 1, 3, 6); }
    if (crowdRun && Math.hypot(GATE_B.x - me.x, GATE_B.z - me.z) < 2) { crowdRun = false; flag("crowd_ok", u("crowdOk")); }
    // bandeiras da orientação
    if (P.cur === "e1_orient" && !P.w.north_ok) for (const [k, x, z] of FLAGS.list) if (Math.hypot(x - me.x, z - me.z) < 2.2) { if (k === "N") flag("north_ok", u("north")); else if (!near) { toast(u("notNorth"), 3500); me.body.push(Math.sign(me.x - x) || 1, Math.sign(me.z - z) || 1, 2, 6); } }
    checkT -= dt; if (checkT <= 0) { checkT = 0.4; checkLesson(); updHud(); }
  }
  crowdBots.forEach((b) => b.update(dt));
  const dc = Math.hypot(me.x, me.z); const cpp = world.camera.position; tentRoof.visible = !(Math.abs(me.x) < 6.5 && Math.abs(me.z) < 6.5) && !(cpp.y < 6 && Math.abs(cpp.x) < 7 && Math.abs(cpp.z) < 7); campLabel.visible = dc > 14;
  for (const s of SPOTS) if (s.sprite) { s.sprite.visible = !!s.mark(); s.sprite.position.y = 4.4 + Math.sin(performance.now() / 300) * 0.2; }
  if (built.fire) { const k = 1 + Math.sin(performance.now() / 90) * 0.15; built.fire.fl.scale.y = 0.8 * k; built.fire.fl2.scale.y = 0.5 / k; }
  [teacher, leo, stranger, lurdes].forEach((c) => c.animate(dt, 0, true, c === leo ? "sit" : "walk"));
  remotes.update(dt);
  endFrame(phys);
  input.endFrame();
});
world.start();
me.respawn(spawn);
cam.update(0.016, me.body);
if (room.autoJoin()) toast(t("mpConnecting"));
showTitle();
window.GAME = { world, phys, me, room, cam, input, get P() { return P; }, SPOTS, startLesson, byId, checkLesson, openBuild, reset() { P = structuredClone(P0); save(); } };
