// Modo Aprendizado — árvore de tecnologia (Era 0 e Era 1) com mini-aulas, quiz e desafio prático.
// Cada aula: c = 3 cartões; q = 2 perguntas [pergunta, CERTA, errada, errada, explicação]; steps = desafio.
// Passos: { k: "pick", it, n } (pegar n itens durante a aula) ou { k: "act", f, txt } (ação no mundo que liga a flag f).
// Textos: T(pt, en, es). Chaves com "_k" (infantil) ficam em kid.
import { getLang } from "../../engine/ez.js";

const T = (pt, en, es) => ({ pt, en, es });
export const L = (o) => (o == null ? "" : typeof o === "string" ? o : o[getLang()] || o.pt);

export const ERAS = [
  { id: 0, icon: "📡", name: T("Era 0 · Identificar o risco", "Era 0 · Spotting the risk", "Era 0 · Identificar el riesgo") },
  { id: 1, icon: "🏕️", name: T("Era 1 · Sobreviver", "Era 1 · Survive", "Era 1 · Sobrevivir") },
  { id: 2, icon: "🪨", name: T("Era 2 · Pedra e madeira", "Era 2 · Stone and wood", "Era 2 · Piedra y madera"), soon: 1 },
  { id: 3, icon: "⚒️", name: T("Era 3 · Metais", "Era 3 · Metals", "Era 3 · Metales"), soon: 1 },
  { id: 4, icon: "🌾", name: T("Era 4 · Agricultura e vila", "Era 4 · Farming and village", "Era 4 · Agricultura y aldea"), soon: 1 },
  { id: 5, icon: "🛡️", name: T("Era 5 · Segurança", "Era 5 · Security", "Era 5 · Seguridad"), soon: 1 },
  { id: 6, icon: "💡", name: T("Era 6 · Energia", "Era 6 · Energy", "Era 6 · Energía"), soon: 1 },
];

export const ITEMS = {
  galho: { e: "🪵", n: T("Galho", "Stick", "Rama") }, capim: { e: "🌾", n: T("Capim seco", "Dry grass", "Pasto seco") },
  folhas: { e: "🍃", n: T("Folhas de palmeira", "Palm leaves", "Hojas de palmera") }, cipo: { e: "🪢", n: T("Cipó", "Vine", "Bejuco") },
  areia: { e: "⏳", n: T("Areia", "Sand", "Arena") }, carvao: { e: "⚫", n: T("Carvão", "Charcoal", "Carbón") },
  pequi: { e: "🟡", n: T("Pequi", "Pequi", "Pequi"), safe: 1 }, baru: { e: "🌰", n: T("Baru", "Baru nut", "Barú"), safe: 1 },
  cagaita: { e: "🟨", n: T("Cagaita", "Cagaita", "Cagaita"), safe: 1 }, mangaba: { e: "🟢", n: T("Mangaba", "Mangaba", "Mangaba"), safe: 1 },
  buriti: { e: "🟠", n: T("Buriti", "Buriti", "Buriti"), safe: 1 },
  aguaSuja: { e: "🟤", n: T("Água do rio (suja)", "River water (dirty)", "Agua del río (sucia)") },
  aguaFiltrada: { e: "🫗", n: T("Água filtrada", "Filtered water", "Agua filtrada") },
  aguaBoa: { e: "💧", n: T("Água fervida (potável)", "Boiled water (safe)", "Agua hervida (potable)") },
  peixe: { e: "🐟", n: T("Peixe", "Fish", "Pez") }, peixeAssado: { e: "🍢", n: T("Peixe assado", "Grilled fish", "Pez asado") },
  vara: { e: "🎣", n: T("Vara de pesca", "Fishing rod", "Caña de pescar") },
  // mochila da Era 1
  faca: { e: "🔪", n: T("Faca", "Knife", "Cuchillo") }, lona: { e: "⛺", n: T("Lona", "Tarp", "Lona") }, corda: { e: "🪢", n: T("Corda", "Rope", "Cuerda") },
  cantil: { e: "🧴", n: T("Cantil", "Canteen", "Cantimplora") }, panela: { e: "🍳", n: T("Panela de metal", "Metal pot", "Olla de metal") },
  pederneira: { e: "✨", n: T("Pederneira", "Fire steel", "Pedernal") }, kit: { e: "🩹", n: T("Kit de primeiros socorros", "First-aid kit", "Botiquín") },
  linha: { e: "🧵", n: T("Linha e anzol", "Line and hook", "Hilo y anzuelo") }, lanterna: { e: "🔦", n: T("Lanterna", "Flashlight", "Linterna") },
  // cidade-treino
  balde: { e: "🪣", n: T("Balde cheio", "Full bucket", "Cubeta llena") }, gerador: { e: "🔋", n: T("Gerador", "Generator", "Generador") },
  garrafa: { e: "💧", n: T("Garrafa de água", "Water bottle", "Botella de agua") },
};
export const itName = (k) => ITEMS[k].e + " " + L(ITEMS[k].n);

export const LESSONS = [
  // ============================================================ ERA 0
  { id: "e0_signs", era: 0, req: [], icon: "📰", place: "town",
    t: T("Sinais de risco", "Warning signs", "Señales de riesgo"),
    c: [
      T("Crises grandes quase sempre dão sinais antes: alertas oficiais, várias fontes falando a mesma coisa, falhas pequenas (luz piscando, internet caindo).", "Big crises almost always give signs first: official alerts, several sources saying the same thing, small failures (flickering lights, internet dropping).", "Las grandes crisis casi siempre avisan: alertas oficiales, varias fuentes diciendo lo mismo, fallas pequeñas (luz parpadeando, internet cayendo)."),
      T("Confira em fontes oficiais (Defesa Civil, governo, grandes jornais). Boato tem tom de pânico, não tem fonte e pede \"compartilhe!\".", "Check official sources (Civil Defense, government, major newspapers). Rumors sound panicky, have no source and say \"share this!\".", "Verifica en fuentes oficiales (Protección Civil, gobierno, grandes diarios). El bulo suena a pánico, no tiene fuente y pide \"¡comparte!\"."),
      T("Quando os sinais aparecem, prepare-se cedo e com calma. Quem age antes evita filas e confusão.", "When the signs appear, prepare early and calmly. Those who act first avoid lines and chaos.", "Cuando aparecen las señales, prepárate pronto y con calma. Quien actúa antes evita filas y caos."),
    ],
    q: [
      T(["Qual destes é um sinal confiável?", "Alerta da Defesa Civil no celular", "Áudio de \"um amigo de um amigo\"", "Post sem fonte pedindo para compartilhar", "Alertas oficiais têm fonte e são conferidos. Áudio e post sem fonte podem ser boato."],
        ["Which of these is a reliable sign?", "A Civil Defense alert on your phone", "A voice message from \"a friend of a friend\"", "A post with no source asking you to share", "Official alerts have a source and are checked. Unsourced audio and posts may be rumors."],
        ["¿Cuál de estas es una señal confiable?", "Alerta de Protección Civil en el celular", "Audio de \"un amigo de un amigo\"", "Post sin fuente que pide compartir", "Las alertas oficiales tienen fuente. Audios y posts sin fuente pueden ser bulos."]),
      T(["Os sinais apareceram. O melhor momento para se preparar é:", "Agora, com calma", "Quando todo mundo correr ao mercado", "Depois que a luz cair", "Depois que todos percebem, vêm as filas, a falta de produtos e o pânico."],
        ["The signs appeared. The best time to prepare is:", "Now, calmly", "When everyone rushes to the store", "After the power goes out", "Once everyone notices, lines, shortages and panic follow."],
        ["Aparecieron las señales. El mejor momento para prepararse es:", "Ahora, con calma", "Cuando todos corran al mercado", "Después de que se vaya la luz", "Cuando todos se dan cuenta, llegan las filas, la escasez y el pánico."]),
    ],
    steps: [{ k: "act", f: "news_ok", txt: T("Na banca de notícias, separe o que é confiável do que é boato", "At the newsstand, sort reliable news from rumors", "En el quiosco, separa lo confiable de los bulos") }] },

  { id: "e0_kit", era: 0, req: ["e0_signs"], icon: "🎒", place: "town",
    t: T("Kit 72 horas", "72-hour kit", "Kit 72 horas"),
    c: [
      T("O kit 72 horas tem o que você precisa para 3 dias sem ajuda: água (uns 4 L por pessoa por dia), comida que não estraga, lanterna e pilhas, rádio a pilha.", "A 72-hour kit has what you need for 3 days without help: water (about 4 L per person per day), food that won't spoil, flashlight and batteries, a battery radio.", "El kit 72 horas tiene lo necesario para 3 días sin ayuda: agua (unos 4 L por persona al día), comida que no se echa a perder, linterna y pilas, radio a pilas."),
      T("Também: remédios de uso contínuo, kit de primeiros socorros, documentos (cópias num saco plástico), dinheiro vivo e um apito.", "Also: daily medicines, a first-aid kit, documents (copies in a plastic bag), cash and a whistle.", "También: medicinas de uso diario, botiquín, documentos (copias en bolsa plástica), efectivo y un silbato."),
      T("Deixe tudo numa mochila fácil de pegar. Coisas que precisam de tomada (secador, videogame) não ajudam sem energia.", "Keep it all in an easy-to-grab backpack. Things that need an outlet (hair dryer, video game) won't help without power.", "Tenlo todo en una mochila fácil de agarrar. Lo que necesita enchufe (secador, videojuego) no sirve sin luz."),
    ],
    q: [
      T(["Quanta água guardar por pessoa, por dia?", "Uns 4 litros", "Meio copo", "Só refrigerante", "Cerca de 4 L por pessoa por dia: para beber, cozinhar e um pouco de higiene."],
        ["How much water to store per person, per day?", "About 4 liters", "Half a glass", "Only soda", "About 4 L per person per day: drinking, cooking and a little hygiene."],
        ["¿Cuánta agua guardar por persona al día?", "Unos 4 litros", "Medio vaso", "Solo refresco", "Unos 4 L por persona al día: beber, cocinar y algo de higiene."]),
      T(["Qual destes NÃO entra no kit?", "Secador de cabelo", "Lanterna com pilhas", "Remédios de uso contínuo", "Sem energia, o secador não serve para nada e só pesa."],
        ["Which of these does NOT go in the kit?", "Hair dryer", "Flashlight with batteries", "Daily medicines", "Without power, a hair dryer is useless dead weight."],
        ["¿Cuál de estos NO va en el kit?", "Secador de pelo", "Linterna con pilas", "Medicinas de uso diario", "Sin luz, el secador no sirve y solo pesa."]),
    ],
    steps: [{ k: "act", f: "kit_ok", txt: T("Na casa-treino, monte o kit na estante", "In the training house, build the kit at the shelf", "En la casa de práctica, arma el kit en el estante") }] },

  { id: "e0_cash", era: 0, req: ["e0_signs"], icon: "💵", place: "town",
    t: T("Dinheiro vivo", "Cash", "Efectivo"),
    c: [
      T("Sem energia, caixa eletrônico, Pix e maquininha de cartão param de funcionar.", "Without power, ATMs, instant payments and card machines stop working.", "Sin luz, cajeros, pagos digitales y terminales de tarjeta dejan de funcionar."),
      T("Tenha um pouco de dinheiro vivo em casa, em notas pequenas: numa crise, ninguém tem troco.", "Keep some cash at home in small bills: in a crisis, nobody has change.", "Ten algo de efectivo en casa, en billetes pequeños: en una crisis nadie tiene cambio."),
      T("Guarde em lugar seguro, divida em partes e não mostre a ninguém quanto você tem.", "Keep it somewhere safe, split it up and never show anyone how much you have.", "Guárdalo en un lugar seguro, divídelo y no muestres a nadie cuánto tienes."),
    ],
    q: [
      T(["Sem energia, qual pagamento ainda funciona?", "Dinheiro vivo", "Pix", "Cartão por aproximação", "Pix e cartão dependem de energia e internet."],
        ["Without power, which payment still works?", "Cash", "Instant transfer", "Contactless card", "Transfers and cards depend on power and internet."],
        ["Sin luz, ¿qué pago sigue funcionando?", "Efectivo", "Transferencia instantánea", "Tarjeta sin contacto", "Las transferencias y tarjetas dependen de luz e internet."]),
      T(["Por que guardar notas pequenas?", "Porque ninguém vai ter troco", "Porque valem mais", "Porque são mais bonitas", "Com a crise, o troco some. Notas de 10 e 20 facilitam pagar o preço certo."],
        ["Why keep small bills?", "Because nobody will have change", "Because they're worth more", "Because they look nicer", "In a crisis, change disappears. Small bills let you pay the right amount."],
        ["¿Por qué guardar billetes pequeños?", "Porque nadie tendrá cambio", "Porque valen más", "Porque son más bonitos", "En la crisis el cambio desaparece. Los billetes pequeños ayudan a pagar justo."]),
    ],
    steps: [{ k: "act", f: "cash_ok", txt: T("No caixa eletrônico, saque do jeito certo", "At the ATM, withdraw the right way", "En el cajero, retira de la forma correcta") }] },

  { id: "e0_fuel", era: 0, req: ["e0_signs"], icon: "⛽", place: "town",
    t: T("Combustível", "Fuel", "Combustible"),
    c: [
      T("As bombas dos postos são elétricas. No apagão, não sai uma gota.", "Gas station pumps are electric. In a blackout, not a drop comes out.", "Las bombas de las gasolineras son eléctricas. En un apagón no sale ni una gota."),
      T("Mantenha o tanque sempre acima da metade. Carro com combustível serve para sair da cidade e para carregar o celular.", "Keep the tank above half. A fueled car lets you leave town and charge your phone.", "Mantén el tanque por encima de la mitad. Un coche con combustible sirve para salir y cargar el celular."),
      T("Galão só se for certificado, guardado fora de casa, em lugar ventilado, longe do sol e de chamas.", "Use only certified cans, stored outside the house, ventilated, away from sun and flames.", "Bidón solo certificado, guardado fuera de casa, ventilado, lejos del sol y de llamas."),
    ],
    q: [
      T(["Por que o posto para no apagão?", "As bombas são elétricas", "Acaba o combustível no mundo", "O frentista vai embora", "Os tanques do posto estão cheios, mas sem energia as bombas não puxam o combustível."],
        ["Why does the gas station stop in a blackout?", "The pumps are electric", "The world runs out of fuel", "The attendant leaves", "The tanks are full, but without power the pumps can't draw fuel."],
        ["¿Por qué para la gasolinera en un apagón?", "Las bombas son eléctricas", "Se acaba el combustible del mundo", "El empleado se va", "Los tanques están llenos, pero sin luz las bombas no funcionan."]),
      T(["Onde guardar o galão de gasolina?", "Fora de casa, ventilado, longe de chama", "Dentro do quarto", "No porta-malas, no sol", "Gasolina solta vapor que pega fogo fácil. Nunca dentro de casa."],
        ["Where should you store a gas can?", "Outside, ventilated, away from flames", "In the bedroom", "In the car trunk, in the sun", "Gasoline gives off vapor that ignites easily. Never indoors."],
        ["¿Dónde guardar el bidón de gasolina?", "Fuera de casa, ventilado, lejos de llamas", "En el cuarto", "En el maletero, al sol", "La gasolina suelta vapores que se encienden fácil. Nunca dentro de casa."]),
    ],
    steps: [{ k: "act", f: "fuel_ok", txt: T("No posto, abasteça antes do apagão", "At the gas station, fill up before the blackout", "En la gasolinera, carga antes del apagón") }] },

  { id: "e0_water", era: 0, req: ["e0_kit"], icon: "🪣", place: "town",
    t: T("Estoque de água", "Storing water", "Reserva de agua"),
    c: [
      T("A água chega na sua torneira empurrada por bombas elétricas. Sem energia, ela para em pouco tempo.", "Water reaches your tap pushed by electric pumps. Without power, it stops soon.", "El agua llega a tu grifo gracias a bombas eléctricas. Sin luz, pronto se corta."),
      T("Ao primeiro aviso, encha baldes, panelas e garrafas. Tampe tudo: água parada destampada vira criadouro do mosquito da dengue.", "At the first warning, fill buckets, pots and bottles. Cover everything: uncovered still water breeds dengue mosquitoes.", "Al primer aviso, llena cubetas, ollas y botellas. Tapa todo: el agua quieta destapada cría mosquitos del dengue."),
      T("Use a água guardada primeiro para beber e cozinhar. Banho e limpeza ficam para depois.", "Use stored water first for drinking and cooking. Bathing and cleaning come later.", "Usa el agua guardada primero para beber y cocinar. El baño y la limpieza, después."),
    ],
    q: [
      T(["Por que tampar a água guardada?", "Evita sujeira e o mosquito da dengue", "Para ela ficar gelada", "Não precisa tampar", "Água parada e aberta é berçário de mosquito e junta sujeira."],
        ["Why cover stored water?", "Keeps out dirt and dengue mosquitoes", "To keep it cold", "No need to cover it", "Open still water breeds mosquitoes and collects dirt."],
        ["¿Por qué tapar el agua guardada?", "Evita suciedad y el mosquito del dengue", "Para que esté fría", "No hace falta taparla", "El agua quieta y abierta cría mosquitos y junta suciedad."]),
      T(["Para que usar primeiro a água guardada?", "Beber e cozinhar", "Lavar o carro", "Regar as plantas", "Sem água para beber, o corpo aguenta só poucos dias."],
        ["What is stored water for, first?", "Drinking and cooking", "Washing the car", "Watering plants", "Without drinking water, the body only lasts a few days."],
        ["¿Para qué usar primero el agua guardada?", "Beber y cocinar", "Lavar el coche", "Regar las plantas", "Sin agua para beber, el cuerpo aguanta pocos días."]),
    ],
    steps: [{ k: "act", f: "water3", txt: T("Encha 3 baldes na torneira e leve para a casa-treino", "Fill 3 buckets at the tap and carry them to the training house", "Llena 3 cubetas en el grifo y llévalas a la casa de práctica") }] },

  { id: "e0_meet", era: 0, req: ["e0_signs"], icon: "📍", place: "town",
    t: T("Ponto de encontro", "Meeting point", "Punto de encuentro"),
    c: [
      T("O celular pode parar em poucas horas: as torres têm baterias que acabam.", "Phones may stop within hours: cell towers have batteries that run out.", "El celular puede dejar de funcionar en pocas horas: las torres tienen baterías que se agotan."),
      T("Combine com a família DOIS pontos de encontro: um perto de casa e outro fora do bairro, para o caso de não dar para voltar.", "Agree on TWO meeting points with your family: one near home and one outside the neighborhood, in case you can't get back.", "Acuerda DOS puntos de encuentro con tu familia: uno cerca de casa y otro fuera del barrio, por si no se puede volver."),
      T("Anote os telefones importantes no papel e guarde na mochila.", "Write important phone numbers on paper and keep them in your bag.", "Anota los teléfonos importantes en papel y guárdalos en la mochila."),
    ],
    q: [
      T(["Por que anotar os telefones no papel?", "O celular pode descarregar ou ficar sem sinal", "Papel é mais bonito", "Não precisa anotar", "Sem bateria, você perde todos os contatos. Papel não descarrega."],
        ["Why write phone numbers on paper?", "Your phone may die or lose signal", "Paper looks nicer", "No need to write them", "With no battery you lose all contacts. Paper doesn't run out."],
        ["¿Por qué anotar los teléfonos en papel?", "El celular puede descargarse o quedar sin señal", "El papel es más bonito", "No hace falta", "Sin batería pierdes todos los contactos. El papel no se descarga."]),
      T(["Qual é um bom ponto de encontro?", "Um lugar que todos conhecem e é fácil de chegar", "Um shopping lotado", "\"A gente se acha\"", "Bom ponto: conhecido por todos, perto e seguro de chegar a pé."],
        ["What is a good meeting point?", "A place everyone knows and can easily reach", "A crowded mall", "\"We'll find each other\"", "A good point is known by all, nearby and safe to reach on foot."],
        ["¿Cuál es un buen punto de encuentro?", "Un lugar que todos conocen y es fácil de llegar", "Un centro comercial lleno", "\"Ya nos encontraremos\"", "Un buen punto es conocido, cercano y seguro de alcanzar a pie."]),
    ],
    steps: [
      { k: "act", f: "meet_pick", txt: T("No quadro de avisos, escolha o ponto de encontro", "At the notice board, choose the meeting point", "En el tablón, elige el punto de encuentro") },
      { k: "act", f: "meet_go", txt: T("Vá até a bandeira do ponto escolhido", "Go to the flag of the chosen point", "Ve a la bandera del punto elegido") },
    ] },

  { id: "e0_crowd", era: 0, req: ["e0_meet"], icon: "👥", place: "town",
    t: T("Fugir de aglomerações", "Avoiding crowds", "Evitar aglomeraciones"),
    c: [
      T("Em aglomeração tem empurrão, furto, briga e doença passando de um para outro.", "Crowds mean shoving, theft, fights and disease spreading.", "En las aglomeraciones hay empujones, robos, peleas y enfermedades."),
      T("Vá cedo ou num horário vazio. Se puder, não vá.", "Go early or at a quiet time. If you can, don't go.", "Ve temprano o en un horario tranquilo. Si puedes, no vayas."),
      T("Se ficar preso numa multidão: não lute contra ela; vá na diagonal, pelas bordas, protegendo o peito com os braços.", "If you're caught in a crowd: don't fight it; move diagonally toward the edges, protecting your chest with your arms.", "Si quedas atrapado: no luches contra la multitud; ve en diagonal hacia los bordes, protegiendo el pecho con los brazos."),
    ],
    q: [
      T(["Preso numa multidão, você deve:", "Ir na diagonal, pelas bordas", "Correr contra o fluxo", "Parar no meio", "Indo pelas bordas você sai da pressão sem brigar com a multidão."],
        ["Caught in a crowd, you should:", "Move diagonally to the edges", "Run against the flow", "Stop in the middle", "Moving to the edges gets you out of the pressure without fighting it."],
        ["Atrapado en una multitud, debes:", "Ir en diagonal hacia los bordes", "Correr contra el flujo", "Pararte en el medio", "Por los bordes sales de la presión sin pelear con la multitud."]),
      T(["Melhor horário para ir ao mercado numa crise:", "Bem cedo, quando está vazio", "No horário mais cheio", "Junto com todo mundo", "Menos gente = menos risco e mais produtos."],
        ["Best time to go to the store in a crisis:", "Very early, when it's empty", "At the busiest time", "Along with everyone", "Fewer people = less risk and more products."],
        ["Mejor hora para ir al mercado en una crisis:", "Muy temprano, cuando está vacío", "A la hora más llena", "Junto con todos", "Menos gente = menos riesgo y más productos."]),
    ],
    steps: [{ k: "act", f: "crowd_ok", txt: T("Atravesse a rua da feira (portão A → B) sem entrar na multidão", "Cross the market street (gate A → B) without entering the crowd", "Cruza la calle del mercado (portón A → B) sin entrar en la multitud") }] },

  { id: "e0_safe", era: 0, req: ["e0_crowd"], icon: "🤫", place: "town",
    t: T("Auto-segurança", "Staying safe", "Autoprotección"),
    c: [
      T("Não conte a ninguém quanto você tem de comida, água ou dinheiro.", "Don't tell anyone how much food, water or money you have.", "No cuentes a nadie cuánta comida, agua o dinero tienes."),
      T("À noite, luz acesa chama atenção: cubra as janelas. Ande em dupla, de dia, e combine a hora de voltar.", "At night, light draws attention: cover windows. Go in pairs, by day, and agree on a return time.", "De noche la luz llama la atención: cubre las ventanas. Anda en pareja, de día, y acuerda la hora de volver."),
      T("Conheça seus vizinhos: um grupo unido de gente de confiança é a melhor proteção.", "Know your neighbors: a united group of trusted people is the best protection.", "Conoce a tus vecinos: un grupo unido de gente de confianza es la mejor protección."),
    ],
    q: [
      T(["Um estranho pergunta quanto de comida você tem. Você diz:", "\"Estamos nos virando, como todo mundo.\"", "\"Tenho um monte, a despensa está cheia!\"", "Mostra a despensa", "Ser discreto evita virar alvo."],
        ["A stranger asks how much food you have. You say:", "\"We're getting by, like everyone.\"", "\"Loads, the pantry is full!\"", "Show him the pantry", "Being discreet keeps you from becoming a target."],
        ["Un extraño pregunta cuánta comida tienes. Dices:", "\"Nos las arreglamos, como todos.\"", "\"¡Muchísima, la despensa está llena!\"", "Le muestras la despensa", "Ser discreto evita que seas un blanco."]),
      T(["Precisa sair para buscar água. O mais seguro é:", "Ir em dupla, de dia, e avisar a hora de voltar", "Ir sozinho de madrugada", "Ir sem avisar ninguém", "Em grupo e de dia, alguém sempre sabe onde você está."],
        ["You need to go out for water. Safest is:", "Go in pairs, by day, and say when you'll be back", "Go alone at dawn", "Go without telling anyone", "In a group and by day, someone always knows where you are."],
        ["Necesitas salir por agua. Lo más seguro es:", "Ir en pareja, de día, y avisar la hora de volver", "Ir solo de madrugada", "Ir sin avisar a nadie", "En grupo y de día, alguien siempre sabe dónde estás."]),
    ],
    steps: [{ k: "act", f: "safe_ok", txt: T("Converse com o estranho na esquina sem se expor", "Talk to the stranger on the corner without giving yourself away", "Habla con el extraño de la esquina sin exponerte") }] },

  { id: "e0_co", era: 0, req: ["e0_kit"], icon: "☠️", place: "town",
    t: T("Fumaça que mata (CO)", "Deadly fumes (CO)", "Humo que mata (CO)"),
    c: [
      T("Gerador, carvão, fogareiro e lampião soltam monóxido de carbono (CO): um gás sem cor e sem cheiro.", "Generators, charcoal, camp stoves and lanterns release carbon monoxide (CO): a colorless, odorless gas.", "Generadores, carbón, hornillos y faroles liberan monóxido de carbono (CO): un gas sin color ni olor."),
      T("Use só ao ar livre, longe de portas e janelas (uns 6 metros). Nunca na garagem, mesmo com o portão aberto.", "Use them only outdoors, away from doors and windows (about 6 meters). Never in the garage, even with the door open.", "Úsalos solo al aire libre, lejos de puertas y ventanas (unos 6 metros). Nunca en el garaje, aunque esté abierto."),
      T("Sinais: dor de cabeça, tontura, enjoo e sono. Saia para o ar livre na hora e peça ajuda.", "Signs: headache, dizziness, nausea, sleepiness. Get to fresh air right away and get help.", "Señales: dolor de cabeza, mareo, náuseas y sueño. Sal al aire libre enseguida y pide ayuda."),
    ],
    q: [
      T(["Onde deve ficar o gerador?", "Lá fora, longe das janelas", "Na garagem com o portão aberto", "Na cozinha", "Garagem, mesmo aberta, acumula o gás e ele entra na casa."],
        ["Where should the generator go?", "Outside, away from windows", "In the garage with the door open", "In the kitchen", "A garage, even open, traps the gas and it gets into the house."],
        ["¿Dónde debe estar el generador?", "Afuera, lejos de las ventanas", "En el garaje con el portón abierto", "En la cocina", "El garaje, aunque esté abierto, acumula el gas y entra en la casa."]),
      T(["Qual é um sinal de intoxicação por CO?", "Dor de cabeça e tontura", "Fome", "Coceira no pé", "Se várias pessoas sentem dor de cabeça e tontura juntas, saiam todos para o ar livre."],
        ["Which is a sign of CO poisoning?", "Headache and dizziness", "Hunger", "Itchy feet", "If several people feel headache and dizziness at once, everyone get to fresh air."],
        ["¿Cuál es una señal de intoxicación por CO?", "Dolor de cabeza y mareo", "Hambre", "Picor en los pies", "Si varias personas sienten dolor de cabeza y mareo a la vez, salgan todos al aire libre."]),
    ],
    steps: [
      { k: "act", f: "co_carry", txt: T("Pegue o gerador ligado dentro da garagem da casa-treino", "Grab the running generator inside the training house garage", "Toma el generador encendido dentro del garaje de la casa de práctica") },
      { k: "act", f: "co_ok", txt: T("Deixe o gerador no lugar seguro, lá fora (marcador verde)", "Leave the generator in the safe spot outside (green marker)", "Deja el generador en el lugar seguro, afuera (marcador verde)") },
    ] },

  { id: "e0_care", era: 0, req: ["e0_water"], icon: "🤝", place: "town",
    t: T("Cuidar de quem depende", "Caring for those in need", "Cuidar de quien depende"),
    c: [
      T("Idosos, bebês, pessoas doentes e quem usa aparelho elétrico (como oxigênio) ou remédio na geladeira sofrem primeiro.", "The elderly, babies, sick people and those who use electric devices (like oxygen) or refrigerated medicine suffer first.", "Mayores, bebés, enfermos y quien usa aparatos eléctricos (como oxígeno) o medicinas refrigeradas sufren primero."),
      T("Visite, leve água, explique onde há ajuda (posto de saúde, ponto de distribuição).", "Visit them, bring water, tell them where help is (clinic, distribution point).", "Visítalos, lleva agua, explica dónde hay ayuda (centro de salud, punto de reparto)."),
      T("Ajudar também protege você: vizinhos unidos dividem tarefas, vigiam a rua e trocam o que falta.", "Helping protects you too: united neighbors share tasks, watch the street and trade what's missing.", "Ayudar también te protege: los vecinos unidos reparten tareas, vigilan la calle e intercambian lo que falta."),
    ],
    q: [
      T(["Quem precisa de atenção primeiro?", "A vizinha idosa que mora sozinha", "O vizinho que foi viajar", "O cachorro do vizinho", "Quem mora sozinho e tem pouca mobilidade é o mais vulnerável."],
        ["Who needs attention first?", "The elderly neighbor who lives alone", "The neighbor who's away on a trip", "The neighbor's dog", "People who live alone with little mobility are the most vulnerable."],
        ["¿Quién necesita atención primero?", "La vecina mayor que vive sola", "El vecino que está de viaje", "El perro del vecino", "Quien vive solo y tiene poca movilidad es el más vulnerable."]),
      T(["Ajudar os vizinhos numa crise...", "Forma um grupo mais forte e seguro", "Só faz você perder coisas", "É proibido", "Grupos unidos se recuperam melhor de desastres."],
        ["Helping neighbors in a crisis...", "Builds a stronger, safer group", "Only makes you lose things", "Is forbidden", "United groups recover better from disasters."],
        ["Ayudar a los vecinos en una crisis...", "Forma un grupo más fuerte y seguro", "Solo te hace perder cosas", "Está prohibido", "Los grupos unidos se recuperan mejor de los desastres."]),
    ],
    steps: [
      { k: "act", f: "care_bottle", txt: T("Pegue uma garrafa de água na torneira", "Get a water bottle at the tap", "Toma una botella de agua en el grifo") },
      { k: "act", f: "care_ok", txt: T("Leve a água para a Dona Lurdes", "Take the water to Ms. Lurdes", "Lleva el agua a Doña Lurdes") },
    ] },

  // ============================================================ ERA 1
  { id: "e1_bag", era: 1, req: ["e0_kit", "e0_water"], icon: "🎒", place: "camp",
    t: T("Mochila", "Backpack", "Mochila"),
    c: [
      T("Fora da cidade, tudo que você tem vai nas costas. Mochila pesada demais cansa, dá dor e atrasa.", "Outside town, everything you own is on your back. Too heavy a pack tires you, hurts and slows you down.", "Fuera de la ciudad, todo va en tu espalda. Una mochila muy pesada cansa, duele y retrasa."),
      T("Prefira itens que servem para muitas coisas: faca, lona, corda, cantil, panela de metal, pederneira.", "Choose multi-use items: knife, tarp, rope, canteen, metal pot, fire steel.", "Elige objetos multiuso: cuchillo, lona, cuerda, cantimplora, olla de metal, pedernal."),
      T("Complete com kit de primeiros socorros, linha e anzol e lanterna. Deixe para trás o que só pesa.", "Add a first-aid kit, line and hook, and a flashlight. Leave behind anything that's just weight.", "Completa con botiquín, hilo y anzuelo, y linterna. Deja lo que solo pesa."),
    ],
    q: [
      T(["Qual item é mais útil na mochila?", "Lona (abrigo, chuva, coletar água)", "Travesseiro grande", "Notebook", "A lona vira teto, cama, capa de chuva e coletor de água."],
        ["Which item is most useful in the pack?", "Tarp (shelter, rain, collecting water)", "Big pillow", "Laptop", "A tarp becomes a roof, a bed, a raincoat and a water collector."],
        ["¿Qué objeto es más útil en la mochila?", "Lona (refugio, lluvia, recoger agua)", "Almohada grande", "Portátil", "La lona sirve de techo, cama, impermeable y colector de agua."]),
      T(["Mochila pesada demais...", "Cansa e atrasa você", "Deixa você mais rápido", "Não faz diferença", "Leve até cerca de 1/5 do seu peso."],
        ["A pack that's too heavy...", "Tires you and slows you down", "Makes you faster", "Makes no difference", "Carry up to about 1/5 of your body weight."],
        ["Una mochila demasiado pesada...", "Te cansa y te retrasa", "Te hace más rápido", "No importa", "Lleva hasta cerca de 1/5 de tu peso."]),
    ],
    steps: [{ k: "act", f: "bag_ok", txt: T("No baú do acampamento, monte uma mochila de até 10 kg", "At the camp chest, pack a bag of up to 10 kg", "En el baúl del campamento, arma una mochila de hasta 10 kg") }] },

  { id: "e1_fire", era: 1, req: ["e1_bag"], icon: "🔥", place: "camp",
    t: T("Fogo", "Fire", "Fuego"),
    c: [
      T("O fogo precisa de 3 coisas: calor, combustível e ar. Tire uma delas e ele apaga.", "Fire needs 3 things: heat, fuel and air. Remove one and it goes out.", "El fuego necesita 3 cosas: calor, combustible y aire. Quita una y se apaga."),
      T("Junte na ordem: isca (capim seco), gravetos finos, depois lenha mais grossa. A faísca da pederneira acende a isca.", "Gather in order: tinder (dry grass), thin twigs, then thicker wood. The fire steel's spark lights the tinder.", "Junta en orden: yesca (pasto seco), ramitas finas y luego leña más gruesa. La chispa del pedernal enciende la yesca."),
      T("Limpe 1 metro em volta e fique longe do mato seco: no Cerrado, a seca é época de queimadas. Nunca deixe o fogo sozinho; apague com água e terra até esfriar.", "Clear 1 meter around it and stay away from dry brush: in the Cerrado, the dry season brings wildfires. Never leave a fire alone; put it out with water and dirt until cold.", "Limpia 1 metro alrededor y aléjate del pasto seco: en el Cerrado, la sequía trae incendios. Nunca dejes el fuego solo; apágalo con agua y tierra hasta que enfríe."),
    ],
    q: [
      T(["Qual é a ordem certa para acender?", "Isca → gravetos → lenha", "Lenha → isca → gravetos", "Só lenha grossa", "A chama pequena da isca acende o graveto, e o graveto acende a lenha."],
        ["What is the right order to light it?", "Tinder → twigs → logs", "Logs → tinder → twigs", "Only thick logs", "The tinder's small flame lights the twigs, and the twigs light the logs."],
        ["¿Cuál es el orden correcto?", "Yesca → ramitas → leña", "Leña → yesca → ramitas", "Solo leña gruesa", "La llama de la yesca prende las ramitas, y las ramitas la leña."]),
      T(["Como apagar a fogueira?", "Água e terra até esfriar", "Deixar queimar sozinha", "Cobrir com folhas", "Brasa escondida reacende com vento e pode virar incêndio."],
        ["How do you put out a campfire?", "Water and dirt until cold", "Let it burn out alone", "Cover it with leaves", "Hidden embers reignite with wind and can start a wildfire."],
        ["¿Cómo apagar la fogata?", "Agua y tierra hasta que enfríe", "Dejar que se queme sola", "Cubrirla con hojas", "Las brasas escondidas se reavivan con el viento y pueden causar un incendio."]),
    ],
    steps: [
      { k: "pick", it: "capim", n: 2 }, { k: "pick", it: "galho", n: 3 },
      { k: "act", f: "fire_ok", txt: T("Faça a fogueira (🎒 → Construir) num lugar limpo, longe da mata", "Build the fire (🎒 → Build) in a clear spot, away from the brush", "Haz la fogata (🎒 → Construir) en un lugar limpio, lejos del monte") },
    ] },

  { id: "e1_water", era: 1, req: ["e1_fire"], icon: "💧", place: "camp",
    t: T("Água segura", "Safe water", "Agua segura"),
    c: [
      T("Água de rio pode ter micróbios mesmo parecendo limpa. Beber sem tratar causa diarreia, que desidrata rápido.", "River water may carry germs even if it looks clean. Drinking it untreated causes diarrhea, which dehydrates fast.", "El agua del río puede tener microbios aunque parezca limpia. Beberla sin tratar causa diarrea, que deshidrata rápido."),
      T("Filtrar com pano, areia e carvão tira a sujeira e o gosto ruim — mas NÃO mata os micróbios.", "Filtering with cloth, sand and charcoal removes dirt and bad taste — but does NOT kill germs.", "Filtrar con tela, arena y carbón quita la suciedad y el mal sabor — pero NO mata los microbios."),
      T("Depois de filtrar, ferva por 1 minuto em fervura forte. Sem fogo: 2 gotas de água sanitária (hipoclorito 2,5%) por litro e espere 30 minutos.", "After filtering, boil for 1 minute at a rolling boil. No fire: 2 drops of bleach (2.5% hypochlorite) per liter and wait 30 minutes.", "Después de filtrar, hierve 1 minuto a borbotones. Sin fuego: 2 gotas de lejía (hipoclorito 2,5%) por litro y espera 30 minutos."),
    ],
    q: [
      T(["Filtrar com pano e areia deixa a água segura?", "Não, ainda precisa ferver", "Sim, pode beber", "Só se for de manhã", "O filtro tira a sujeira; a fervura mata os micróbios."],
        ["Does filtering with cloth and sand make water safe?", "No, you still need to boil it", "Yes, drink it", "Only in the morning", "The filter removes dirt; boiling kills germs."],
        ["¿Filtrar con tela y arena hace segura el agua?", "No, aún hay que hervirla", "Sí, ya se puede beber", "Solo por la mañana", "El filtro quita la suciedad; hervir mata los microbios."]),
      T(["Por quanto tempo ferver?", "1 minuto em fervura forte", "5 segundos", "Até ficar morna", "Ao nível do mar, 1 minuto de fervura forte basta."],
        ["How long should you boil it?", "1 minute at a rolling boil", "5 seconds", "Until lukewarm", "At sea level, 1 minute at a rolling boil is enough."],
        ["¿Cuánto tiempo hervir?", "1 minuto a borbotones", "5 segundos", "Hasta que esté tibia", "A nivel del mar, 1 minuto a borbotones es suficiente."]),
    ],
    steps: [
      { k: "act", f: "w_dirty", txt: T("Pegue água do rio com a panela", "Get river water with the pot", "Toma agua del río con la olla") },
      { k: "pick", it: "areia", n: 1 },
      { k: "act", f: "w_coal", txt: T("Pegue carvão da sua fogueira", "Take charcoal from your fire", "Toma carbón de tu fogata") },
      { k: "act", f: "w_filter", txt: T("Filtre a água (🎒 → Construir → Filtro)", "Filter the water (🎒 → Build → Filter)", "Filtra el agua (🎒 → Construir → Filtro)") },
      { k: "act", f: "w_boil", txt: T("Ferva a água filtrada na fogueira", "Boil the filtered water on the fire", "Hierve el agua filtrada en la fogata") },
    ] },

  { id: "e1_shelter", era: 1, req: ["e1_bag"], icon: "⛺", place: "camp",
    t: T("Abrigo", "Shelter", "Refugio"),
    c: [
      T("Sem abrigo, sol, chuva, vento e frio roubam a sua energia. Ele vem antes até da comida.", "Without shelter, sun, rain, wind and cold drain your energy. It comes even before food.", "Sin refugio, el sol, la lluvia, el viento y el frío te roban energía. Va incluso antes que la comida."),
      T("Escolha lugar alto e seco: longe da beira do rio (enchente) e de árvores com galhos secos que podem cair.", "Pick a high, dry spot: away from the riverbank (floods) and from trees with dead branches that may fall.", "Elige un lugar alto y seco: lejos de la orilla del río (crecidas) y de árboles con ramas secas que pueden caer."),
      T("Monte uma estrutura de galhos e cubra com folhas de palmeira (buriti) ou lona, bem inclinada para a chuva escorrer.", "Build a frame of sticks and cover it with palm leaves (buriti) or a tarp, steeply sloped so rain runs off.", "Arma una estructura de ramas y cúbrela con hojas de palmera (buriti) o lona, bien inclinada para que escurra la lluvia."),
    ],
    q: [
      T(["Onde montar o abrigo?", "Num lugar alto e seco", "Na beira do rio", "Embaixo de galho seco", "Beira de rio alaga; galho seco cai."],
        ["Where should you build the shelter?", "On high, dry ground", "On the riverbank", "Under a dead branch", "Riverbanks flood; dead branches fall."],
        ["¿Dónde armar el refugio?", "En un lugar alto y seco", "En la orilla del río", "Bajo una rama seca", "La orilla se inunda; las ramas secas caen."]),
      T(["Por que inclinar bem a cobertura?", "Para a chuva escorrer", "Para ficar bonito", "Para entrar mais vento", "Telhado reto junta água e pinga em você."],
        ["Why slope the cover steeply?", "So rain runs off", "To look nice", "To let in more wind", "A flat roof collects water and drips on you."],
        ["¿Por qué inclinar bien la cubierta?", "Para que escurra la lluvia", "Para que se vea bonito", "Para que entre más viento", "Un techo plano junta agua y gotea encima."]),
    ],
    steps: [
      { k: "pick", it: "galho", n: 4 }, { k: "pick", it: "folhas", n: 4 },
      { k: "act", f: "shelter_ok", txt: T("Construa o abrigo no morrinho (lugar alto) — 🎒 → Construir", "Build the shelter on the little hill (high ground) — 🎒 → Build", "Construye el refugio en la lomita (lugar alto) — 🎒 → Construir") },
    ] },

  { id: "e1_orient", era: 1, req: ["e1_shelter"], icon: "🧭", place: "camp",
    t: T("Orientação pelo sol", "Finding your way by the sun", "Orientarse con el sol"),
    c: [
      T("O sol nasce do lado LESTE e se põe do lado OESTE.", "The sun rises in the EAST and sets in the WEST.", "El sol sale por el ESTE y se pone por el OESTE."),
      T("De manhã, aponte o braço direito para o sol: na sua frente fica o NORTE, e atrás, o SUL. As sombras da manhã apontam para o oeste.", "In the morning, point your right arm at the sun: in front of you is NORTH, behind you is SOUTH. Morning shadows point west.", "Por la mañana, apunta el brazo derecho al sol: delante tienes el NORTE y detrás el SUR. Las sombras de la mañana apuntan al oeste."),
      T("À noite, no Brasil, o Cruzeiro do Sul ajuda a achar o sul. Marque no caminho pedras ou galhos para conseguir voltar.", "At night in Brazil, the Southern Cross helps you find south. Mark your path with stones or sticks so you can return.", "De noche, en Brasil, la Cruz del Sur ayuda a hallar el sur. Marca el camino con piedras o ramas para poder volver."),
    ],
    q: [
      T(["De manhã, com o braço direito apontando para o sol, você está de frente para o:", "Norte", "Sul", "Oeste", "Direita no leste (sol da manhã) → frente para o norte."],
        ["In the morning, with your right arm pointing at the sun, you are facing:", "North", "South", "West", "Right arm east (morning sun) → facing north."],
        ["Por la mañana, con el brazo derecho apuntando al sol, miras hacia el:", "Norte", "Sur", "Oeste", "Brazo derecho al este (sol de mañana) → mirando al norte."]),
      T(["Onde o sol se põe?", "Oeste", "Leste", "Norte", "Nasce no leste, se põe no oeste."],
        ["Where does the sun set?", "West", "East", "North", "It rises in the east and sets in the west."],
        ["¿Dónde se pone el sol?", "Oeste", "Este", "Norte", "Sale por el este y se pone por el oeste."]),
    ],
    steps: [{ k: "act", f: "north_ok", txt: T("Na clareira das bandeiras, vá até a bandeira do NORTE (é de manhã: use o sol e as sombras)", "In the flag clearing, go to the NORTH flag (it's morning: use the sun and shadows)", "En el claro de las banderas, ve a la bandera del NORTE (es de mañana: usa el sol y las sombras)") }] },

  { id: "e1_aid", era: 1, req: ["e1_bag"], icon: "🩹", place: "camp",
    t: T("Primeiros socorros", "First aid", "Primeros auxilios"),
    c: [
      T("Primeiro, segurança: veja se o lugar é seguro para você e chame ajuda. Use luvas ou um saco plástico se tiver sangue.", "First, safety: check the place is safe for you and call for help. Use gloves or a plastic bag if there's blood.", "Primero, seguridad: mira que el lugar sea seguro y pide ayuda. Usa guantes o una bolsa plástica si hay sangre."),
      T("Corte: lave com água limpa, aperte com pano limpo até parar de sangrar e cubra. Queimadura: água corrente fria por 10 a 20 minutos — nada de pasta de dente ou manteiga.", "Cut: rinse with clean water, press with a clean cloth until it stops bleeding, and cover. Burn: cool running water for 10–20 minutes — no toothpaste or butter.", "Corte: lava con agua limpia, presiona con un paño limpio hasta que pare de sangrar y cubre. Quemadura: agua fría corriente 10 a 20 minutos — nada de pasta de dientes ni mantequilla."),
      T("Desidratação (boca seca, pouco xixi, tontura): soro caseiro = 1 litro de água tratada + 1 colher de chá de sal + 2 colheres de sopa de açúcar.", "Dehydration (dry mouth, little urine, dizziness): homemade ORS = 1 liter of treated water + 1 teaspoon of salt + 2 tablespoons of sugar.", "Deshidratación (boca seca, poca orina, mareo): suero casero = 1 litro de agua tratada + 1 cucharadita de sal + 2 cucharadas de azúcar."),
    ],
    q: [
      T(["Queimadura: o que fazer?", "Água corrente fria por 10 a 20 minutos", "Passar pasta de dente", "Passar manteiga", "Pasta e manteiga seguram o calor e podem infeccionar."],
        ["Burn: what do you do?", "Cool running water for 10–20 minutes", "Apply toothpaste", "Apply butter", "Toothpaste and butter trap heat and can cause infection."],
        ["Quemadura: ¿qué hacer?", "Agua fría corriente 10 a 20 minutos", "Poner pasta de dientes", "Poner mantequilla", "La pasta y la mantequilla retienen el calor y pueden infectar."]),
      T(["Corte sangrando: o que fazer?", "Apertar com pano limpo", "Assoprar", "Deixar sangrar para limpar", "Pressão direta é o jeito mais rápido de parar o sangramento."],
        ["Bleeding cut: what do you do?", "Press with a clean cloth", "Blow on it", "Let it bleed to clean it", "Direct pressure is the fastest way to stop bleeding."],
        ["Corte sangrando: ¿qué hacer?", "Presionar con un paño limpio", "Soplar", "Dejar que sangre para limpiar", "La presión directa es lo más rápido para detener el sangrado."]),
    ],
    steps: [{ k: "act", f: "aid_ok", txt: T("Cuide do Léo, que cortou a mão no acampamento", "Help Léo, who cut his hand at camp", "Atiende a Léo, que se cortó la mano en el campamento") }] },

  { id: "e1_forage", era: 1, req: ["e1_water"], icon: "🍈", place: "camp",
    t: T("Coleta segura (Cerrado)", "Safe foraging (Cerrado)", "Recolección segura (Cerrado)"),
    c: [
      T("Regra de ouro: NÃO CONHECE, NÃO COME. Muitas plantas parecidas são venenosas.", "Golden rule: IF YOU DON'T KNOW IT, DON'T EAT IT. Many look-alike plants are poisonous.", "Regla de oro: SI NO LA CONOCES, NO LA COMAS. Muchas plantas parecidas son venenosas."),
      T("Frutos conhecidos do Cerrado: pequi (cuidado: espinhos dentro do caroço — nunca morda!), baru (castanha, melhor torrada), cagaita (não coma muitas nem caídas e fermentadas), mangaba e buriti.", "Well-known Cerrado fruits: pequi (careful: spines inside the pit — never bite it!), baru (a nut, best roasted), cagaita (don't eat many or fallen, fermented ones), mangaba and buriti.", "Frutos conocidos del Cerrado: pequi (¡cuidado: espinas dentro del hueso, nunca lo muerdas!), barú (nuez, mejor tostada), cagaita (no comas muchas ni caídas y fermentadas), mangaba y buriti."),
      T("A mandioca brava tem veneno quando crua. Só coma mandioca que você tem certeza de que é mansa, e sempre bem cozida.", "Bitter cassava is poisonous raw. Only eat cassava you're sure is the sweet kind, and always well cooked.", "La yuca amarga es venenosa cruda. Solo come yuca que sepas que es dulce, y siempre bien cocida."),
    ],
    q: [
      T(["Achou uma frutinha que nunca viu. Você:", "Não come", "Prova só um pouquinho", "Come se o passarinho comeu", "Passarinho come frutos que são venenosos para gente."],
        ["You found a berry you've never seen. You:", "Don't eat it", "Taste just a little", "Eat it if birds ate it", "Birds eat fruits that are poisonous to people."],
        ["Encontraste una frutita que nunca viste. Tú:", "No la comes", "Pruebas solo un poquito", "La comes si un pájaro la comió", "Los pájaros comen frutos venenosos para las personas."]),
      T(["Qual é o cuidado com o pequi?", "Não morder o caroço: tem espinhos", "Comer a casca", "Comer cru e verde", "Rói-se a polpa com cuidado; os espinhos ficam escondidos dentro do caroço."],
        ["What's the care with pequi?", "Don't bite the pit: it has spines", "Eat the peel", "Eat it raw and green", "Gnaw the pulp carefully; the spines hide inside the pit."],
        ["¿Qué cuidado tener con el pequi?", "No morder el hueso: tiene espinas", "Comer la cáscara", "Comerlo crudo y verde", "Se roe la pulpa con cuidado; las espinas están dentro del hueso."]),
    ],
    steps: [{ k: "safe", n: 3, txt: T("Colete 3 frutos seguros do Cerrado (e deixe no pé o que você não conhece)", "Gather 3 safe Cerrado fruits (and leave what you don't know)", "Recolecta 3 frutos seguros del Cerrado (y deja lo que no conoces)") }] },

  { id: "e1_fish", era: 1, req: ["e1_forage"], icon: "🎣", place: "camp",
    t: T("Pesca", "Fishing", "Pesca"),
    c: [
      T("Vara simples: galho comprido + linha + anzol + isca (minhoca ou massa de farinha).", "Simple rod: a long stick + line + hook + bait (worm or flour dough).", "Caña simple: rama larga + hilo + anzuelo + cebo (lombriz o masa de harina)."),
      T("Pesque com paciência no começo da manhã ou no fim da tarde, em remansos (onde a água fica mais parada).", "Fish patiently early in the morning or late afternoon, in backwaters (where water is calmer).", "Pesca con paciencia temprano o al final de la tarde, en remansos (donde el agua está más quieta)."),
      T("Peixe estraga rápido: limpe e asse logo, bem passado. Fora de emergência, respeite a piracema (época em que a pesca é proibida para os peixes se reproduzirem).", "Fish spoils fast: clean and cook it soon, well done. Outside emergencies, respect the spawning season closure.", "El pescado se echa a perder rápido: límpialo y ásalo pronto, bien cocido. Fuera de emergencias, respeta la veda de reproducción."),
    ],
    q: [
      T(["Melhor lugar para pescar no rio:", "Remanso, onde a água é mais parada", "Na correnteza mais forte", "Numa cachoeira", "No remanso os peixes descansam e comem."],
        ["Best spot to fish in a river:", "A backwater, where water is calmer", "In the strongest current", "At a waterfall", "Fish rest and feed in backwaters."],
        ["Mejor lugar para pescar en el río:", "Un remanso, donde el agua está más quieta", "En la corriente más fuerte", "En una cascada", "En el remanso los peces descansan y comen."]),
      T(["Pescou um peixe. E agora?", "Limpar e assar logo, bem passado", "Guardar 3 dias na mochila", "Comer cru", "Peixe cru ou guardado no calor pode causar doença."],
        ["You caught a fish. Now what?", "Clean and cook it soon, well done", "Keep it 3 days in your bag", "Eat it raw", "Raw fish or fish kept in the heat can make you sick."],
        ["Pescaste un pez. ¿Y ahora?", "Limpiarlo y asarlo pronto, bien cocido", "Guardarlo 3 días en la mochila", "Comerlo crudo", "El pescado crudo o guardado al calor puede enfermarte."]),
    ],
    steps: [
      { k: "act", f: "fish_rod", txt: T("Faça uma vara (🎒 → Construir → Vara)", "Make a rod (🎒 → Build → Rod)", "Haz una caña (🎒 → Construir → Caña)") },
      { k: "act", f: "fish_get", txt: T("Pesque um peixe no remanso do rio", "Catch a fish in the river backwater", "Pesca un pez en el remanso del río") },
      { k: "act", f: "fish_cook", txt: T("Asse o peixe na fogueira", "Grill the fish on the fire", "Asa el pez en la fogata") },
    ] },

  { id: "e1_trap", era: 1, req: ["e1_forage"], icon: "🪤", place: "camp",
    t: T("Armadilha (arapuca)", "Trap (cage trap)", "Trampa (jaula)"),
    c: [
      T("Armadilhas trabalham por você enquanto faz outras coisas. Procure trilhas com pegadas perto da água.", "Traps work for you while you do other things. Look for trails with tracks near water.", "Las trampas trabajan por ti mientras haces otras cosas. Busca senderos con huellas cerca del agua."),
      T("A arapuca é uma gaiola de gravetos amarrados com cipó: ela pega o bicho vivo, sem machucar.", "The arapuca is a cage of sticks tied with vine: it catches the animal alive, unharmed.", "La arapuca es una jaula de ramitas atadas con bejuco: atrapa al animal vivo, sin lastimarlo."),
      T("IMPORTANTE: caçar animal silvestre é crime no Brasil (Lei 9.605/98). Só numa emergência real, para não passar fome. Aqui é treino.", "IMPORTANT: hunting wild animals is a crime in Brazil (Law 9,605/98). Only in a real emergency, to avoid starving. This is training.", "IMPORTANTE: cazar animales silvestres es delito en Brasil (Ley 9.605/98). Solo en una emergencia real, para no pasar hambre. Esto es práctica."),
    ],
    q: [
      T(["Onde montar a arapuca?", "Numa trilha com pegadas, perto da água", "No meio do acampamento", "Em cima de uma árvore alta", "Os bichos repetem os mesmos caminhos até a água."],
        ["Where should you set the trap?", "On a trail with tracks, near water", "In the middle of camp", "Up a tall tree", "Animals repeat the same paths to water."],
        ["¿Dónde poner la arapuca?", "En un sendero con huellas, cerca del agua", "En medio del campamento", "Arriba de un árbol alto", "Los animales repiten los mismos caminos hacia el agua."]),
      T(["Pode caçar bicho silvestre no dia a dia?", "Não: é crime, só em emergência real", "Pode sempre", "Só no fim de semana", "A lei protege a fauna; a exceção é o estado de necessidade (fome)."],
        ["Can you hunt wild animals in daily life?", "No: it's a crime, only in a real emergency", "Always", "Only on weekends", "The law protects wildlife; the exception is necessity (hunger)."],
        ["¿Se puede cazar animales silvestres en la vida diaria?", "No: es delito, solo en emergencia real", "Siempre", "Solo los fines de semana", "La ley protege la fauna; la excepción es el estado de necesidad (hambre)."]),
    ],
    steps: [
      { k: "pick", it: "galho", n: 4 }, { k: "pick", it: "cipo", n: 1 },
      { k: "act", f: "trap_set", txt: T("Monte a arapuca na trilha com pegadas (🎒 → Construir)", "Set the trap on the trail with tracks (🎒 → Build)", "Arma la arapuca en el sendero con huellas (🎒 → Construir)") },
      { k: "act", f: "trap_check", txt: T("Volte depois e confira a arapuca", "Come back later and check the trap", "Vuelve después y revisa la arapuca") },
    ] },
];
export const byId = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
