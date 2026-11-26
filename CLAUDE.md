# Gilelê Games — notas para desenvolvimento

- Monorepo publicado no GitHub Pages (mico-droid/gilele-games). Sem etapa de build: ES modules puros.
- Motor em `engine/` (entrada `engine/ez.js`). Jogos em `games/<id>/` importam `../../engine/ez.js`.
- Three.js fixado em `engine/three.js` (CDN jsDelivr). Atualizar só ali.
- Toda mudança no motor precisa manter o `games/demo` funcionando (é o jogo-modelo e o teste).
- Todo jogo deve: ter PWA (manifest próprio + `registerPWA("../../sw.js")`), PT/EN/ES via `addStrings`, controles de toque e teclado, e na tela inicial `gameLinks(t("title"))` (🏠 Gilelê Games · 📲 Instalar · 📤 Compartilhar).
- Público pode incluir crianças (ECA Digital): sem chat livre (só frases prontas), sem login, sem coletar dados pessoais, analytics sem nomes/códigos de sala.
- Ao mudar arquivos cacheados de forma incompatível, subir a versão `CACHE` em `sw.js`.
- Licença PolyForm Noncommercial (uso comercial reservado ao autor).
- Próximos jogos planejados: Corrida política, Visita a locais, RPG multiplayer, Treinamentos para empresas.
- Apagão: Sobreviva (`games/sobrevivencia/`): seguir `PLANO.md` (decisões do autor no topo). `boot.js` escolhe o modo: `?modo=aprender` → `learn.js` (Aprendizado, conteúdo em `lessons.js`), senão `main.js` (Apagão Real, Cap. 1 = 72 h num apartamento em Goiânia). Testes no console: `GAME.advance(h)` (Apagão) e `GAME.startLesson(GAME.byId.id)` / `GAME.reset()` (Aprendizado). `social.js` (comum aos dois modos): itens no chão (gd/gp/gq/gl), troca entre jogadores (to/tc/ta/tx, sem texto livre) e mochila nas costas (presença `bg`). Faixa infantil sem cenas pesadas (chaves `_k`). Era 5 (armas) só como itens de jogo que espantam: sem instrução real, sem arma de fogo nem explosivo. Mapa real do OpenStreetMap (EM TESTES): opção "📍 Minha cidade" no Apagão Real (`main.js` + `city.js {homeOnly}` + `geo.js` `fitHome` + `osmcity.js`) e modo livre `?modo=cidade` → `cidade.js` `runExplorer` ("Explorar minha cidade"); ver o fim do `PLANO.md`. Textos novos com prefixo (`geo…`/`osm…`/`map_…`): `addStrings` sobrescreve chaves iguais do motor/jogo.
- Auto Escola (`games/auto-escola/`) v1 jogável: seguir `PLANO.md`. Pesos das infrações = fichas do MBEDV (anexo oficial de 01/02/2026), em `rules.js`.
- Motor v0.2.0: `vehicle.js`, `road.js`, `traffic.js` + ganchos `world.onBeforeRender/onAfterRender` (retrovisores e overlays).
- Testes da Auto Escola: `GAME.tick(dt)` + `tests/autopilot.js` (um motorista correto deve fazer a prova sem infrações). Em física, o passo interno é ≤ 2,5 ms (o modelo da embreagem fica instável com passos maiores).
- Portal (`index.html`): jogos "Prontos" ficam primeiro; os outros vão na seção "Em desenvolvimento/testes" (classe `dev`). SEMPRE perguntar ao dono se um jogo novo/alterado está Pronto ou não. Hoje: prontos = EZ Obby, Parkour Tabuada (dono liberou em 14/11/2026), Tabuada Simples (ex-Batalha da Tabuada, renomeada em 14/11/2026), Apagão: Sobreviva (dono liberou em 13/11/2026), Playground Testes; em testes = Auto Escola.
- Motor v0.3.0: `throw.js` (`createThrowables`): pegar/carregar/arremessar objetos, alvos, sync multijogador por eventos (tg/tt/tr/td/th/ts). Exemplo em `games/demo`.
- Motor v0.3.1: `screen(content, { x })` põe um ✕ no canto superior direito (true = fecha; função = ação de cancelar). Toda tela/caixa nova deve ter ✕ (pedido do dono). Editor, configurações, amigos, instalar e frases prontas já têm.
- Analytics: `initGTM()` (container GTM-54JJ46D9, Consent Mode v2 com anúncios sempre negados) em todo jogo e no portal; `track(evento, params)` já manda `game_id` e `app_mode`. Eventos padrão: game_start, game_end, level_complete, lesson_start, lesson_complete, target_hit, select_game, install_click, app_installed, share, lang_change. Nunca dados pessoais nos params.
- Privacidade: `privacidade.html` (raiz, PT/EN/ES) explica armazenamento local, estatísticas, multijogador e anúncios (Shopee "publi"), e tem o botão que desliga as estatísticas (`localStorage "ez:noanalytics"="1"`, respeitado por `initGTM`/`track` e pelos jogos HTML avulsos). Todo jogo (inclusive os futuros) mostra o link 🔒 Privacidade na tela inicial: vem automático em `gameLinks()`; em jogo HTML avulso (Tabuada, EZ Obby) pôr o link à mão.
- EZ Obby (`games/ez-obby/`): HTML único (three r128), trazido para o monorepo em 24/11/2026 (antes ficava em mico-droid/ez-obby, servido em mico-droid.github.io/ez-obby). Usa o `sw.js` da raiz, manifest próprio com os ícones `icons/ez-obby-*`, e links relativos para o portal, a privacidade e o Parkour Tabuada. O repositório antigo continua no ar: quem instalou o app por lá segue na versão antiga até reinstalar pelo portal.
- Parkour Tabuada (`games/parkour-tabuada/`): HTML único derivado do EZ Obby, só com o modo tabuada. Operações: soma, subtração, multiplicação, divisão e "Todas" (`OPS`/`tabQ`); subtração e divisão são as inversas da soma/multiplicação da tabuada do t. Progresso por operação em `localStorage "pktab_prog"`; salas PeerJS com prefixo `pktab-v1-` (separadas do EZ Obby). Visual do boneco é compartilhado com o EZ Obby (mesma origem, chave `ezobby_look2`). O EZ Obby não tem mais o modo tabuada: o botão leva para este jogo.
- Motor v0.3.2 (pedido do dono, 14/11/2026): o círculo do joystick fica SEMPRE visível durante o jogo (canto inferior esquerdo; no toque vai para o dedo e volta ao soltar; dá para arrastar o próprio círculo). No PC mostra "w a s d" minúsculas, o pino segue as teclas e a letra apertada acende. Vale também para os HTML avulsos (Parkour Tabuada, EZ Obby).
- Marca escrita (24/11/2026): **Gilelê Games** em tudo que o jogador lê (portal, PWA, rodapé dos jogos, estampa da camiseta). O domínio (gilelegames.com), os repositórios e as URLs continuam sem acento. O motor virou "Gilelê Engine".
- Motor v0.5.0 — visual mais rico (pedido do dono, 24/11/2026). `engine/scenery.js` (`createScenery(world, phys)`): terreno com relevo e manchas (`ground`), morros no horizonte (`hills`), monte pisável (`mound`), água (`water`) e lago com margem (`pond`), caminho curvo (`path`), ponte (`bridge`), escada (`stairs`), casinha (`hut`), cerca (`fence`), árvore/moita/pedra (`tree`/`bush`/`rock`), grama e flores em massa por InstancedMesh (`meadow`), espalhar natureza evitando o que já existe (`scatter`), e coisas vivas: `windmill`, `balloons`, `birds`, `butterflies` (fogem de quem chega perto), `fireflies`, `campfire`, `mushroom` (trampolim), `chest` (abre perto), `beacon`, `swing`, `reactive`. Chamar `sc.update(dt, x, y, z)` no loop (ou `sc.autoUpdate()`, que segue a câmera). `grass` em `scatter` é densidade por 100 m², não número absoluto.
- Céu v0.5.0: `engine/sky.js` agora tem duas camadas de nuvem fofa (com topo iluminado), neblina no horizonte e silhueta de morros; e o domo passou a valer em TODOS os níveis de qualidade (antes o "Leve" ficava sem céu). `createWorld({ dome: false })` desliga; `{ sky2: { clouds, hills } }` força.
- Trilhas v0.5.0 (`engine/audio.js`): `adventure` (padrão; animada, baixo em colcheias + sub-grave), `castle` (trecho difícil: grave pulsante, menor com trítono) e `chase`. `Audio.danger(true)` entra na trilha de perigo e `Audio.danger(false)` volta para a anterior. Composições originais — não copiar trilha de jogo existente.
- Uniforme da marca: a camiseta do boneco é SEMPRE branca com "Gilelê Games" estampado na frente e nas costas (`BRAND` em `engine/avatar.js`; igual nos HTML avulsos). O slot `c[1]` do look deixou de ser "camisa" e virou cor de detalhe (gola, punho, barra, saia); o slot "Mangas" saiu do editor.
- HTML avulsos (Parkour Tabuada, EZ Obby): têm cópia própria disso — bloco `SCN` (cenário r128) e `BRAND`/`brandDecal` logo antes de "playground props", trilhas `adventure`/`castle` em `SONGS`, e `SCN.update(...)`/`SCN.clear()` no loop e no reset. Mudou no motor → replicar nos dois.
- Site (24/11/2026): **duas portas de entrada**. `index.html` = página comercial para escolas e empresas (visual sóbrio azul-petróleo #0F2A3D + âmbar #E8A33D, fonte Manrope, seletor Escolas/Empresas, portfólio com print de cada jogo, formulário que monta a mensagem e abre o WhatsApp — não há servidor). `jogos.html` = portal só com os jogos, sem texto de venda, **na mesma identidade da home** (24/11/2026: azul-petróleo + âmbar, Manrope, logo `icons/portal.svg` e ícone de cada jogo nos cartões; antes era colorido verde/azul). Tem barra com Instalar (só aparece se ainda não estiver instalado), Compartilhar e PT/EN/ES; é para onde vão as crianças e para onde aponta o botão 🏠 de todos os jogos (`PORTAL_URL` e o padrão de `gameLinks`), além do `start_url` do PWA. Links entre as duas: "Sou criança" no menu da home e "Para escolas e empresas" no rodapé do portal infantil.
- Ícones (24/11/2026): família sóbria em `icons/*.svg` (fundo #0F2A3D, traço branco 26px, um detalhe âmbar) — `portal.svg` (monograma gl) e um por jogo. O app instalado do portal (`manifest.webmanifest` da raiz) usa `icons/portal-192/512.png` e `portal-maskable-512.png`, gerados do `portal.svg` (24/11/2026). Cada jogo também tem o próprio ícone de app: `icons/<slug>-192/512.png` e `-maskable-512.png`, gerados dos SVG (24/11/2026) — auto-escola, playground (games/demo), apagao (games/sobrevivencia), parkour-tabuada e tabuada-simples (games/tabuada). Os PNG antigos (`icon-192/512`, as duas meninas) não são mais usados. Gerar novo: `rsvg-convert -w 512 -h 512 icons/<slug>.svg -o icons/<slug>-512.png` (maskable = render a 410 px centralizado em 512 com fundo #0F2A3D).
- Links internos são SEMPRE relativos (24/11/2026): ainda não há domínio fixo, então nada de `https://mico-droid.github.io/gilele-games/...` no repo — `PORTAL_URL` virou `../../jogos.html` e `related_applications` dos manifests aponta para o próprio arquivo. Não há mais nenhuma URL absoluta para o próprio site.
- Pendente do chat "Site gilelegames para escolas": o repaint do gameplay (HUD, materiais e paleta sóbria dentro dos jogos) e a casca padrão da tela inicial. O desenho dessa casca e a folha de ícones ficaram no artifact "gilele games — portal" (`jogo.html` e `icones.html`), não no repositório.
- Contato do site: tudo vai para o WhatsApp **+55 62 98411-8113** (botão flutuante + formulário de orçamento, que monta a mensagem e abre o `wa.me` já preenchido). Não há servidor nem envio por e-mail — o dono não quis.
- Portal infantil: os cartões usam print de cada jogo em `shots/<id>.jpg` (640×360, JPEG ~40 KB), não emoji. Para refazer um print: abrir o jogo, esconder HUD/menus e recortar em 16:9.
- Motor v0.5.1 — correções pedidas pelo dono em 24/11/2026 (sessão de bugs):
  - `el.replaceChildren(a, b, null)` escreve a palavra **"null"** na tela (o DOM converte para texto; só o `h()` filtra). Em `replaceChildren` sempre usar `...[ … ].filter(Boolean)`. Era a origem do "null" embaixo da escolha de mapa no "Apagão Real · Novo jogo".
  - Atalhos de teclado nas telas: botão com `data-k="next"` responde a ⏎/→/Espaço e `data-k="back"` a ←/Backspace; Esc fecha (usa o ✕). Só a tela de cima responde e inputs são ignorados. No PC o `h()` põe a dica (`.ez-kbd`) dentro do botão. Marcados: `pagedScreen`, as opções dos diálogos (`opts[].k`) e o botão final.
  - `.ez-btn.ok` = verde fixo: confirmação final ("Entendi", "▶ Jogar"). O "Voltar/Sair" continua cinza. (No Apagão o `--ez-accent` é âmbar, por isso a classe própria.)
  - `onAppHide(fn)` (core): trocar de aba, minimizar ou apagar a tela → pausa o jogo e `Audio.suspend()` (não mexe na preferência de música). `world.setPaused()` também suspende/volta o áudio. Todo jogo novo deve chamar `onAppHide(() => { if (playing) pause(); })`. Nos HTML avulsos é a função `onAppHide()` própria + `Snd.suspend/resume`.
  - Celular deitado (`@media (max-height:560px)`): as frases prontas do chat saem do rodapé e abrem a partir do topo com rolagem (motor e os dois HTML avulsos).
- Controles no PC (pedido do dono, 24/11/2026): **ação = J ou botão direito do mouse**; **pular = Espaço ou clique esquerdo** (clique curto, até 400 ms e 6 px — se arrastar, continua sendo câmera). A tecla E saiu. Em `engine/input.js` (`DEFAULT_KEYS.act` e os ponteiros do canvas); textos de ajuda atualizados.
- Multijogador v0.5.1 (refeito em 24/11/2026; as correções de 19/11 nunca chegaram ao repositório e os `.patch` se perderam):
  - `engine/turn.js` = conta do TURN (Metered, app "gilele", **chave pública** — nunca a `sk_`). `engine/ice.js` = `iceServers()`, que busca as credenciais temporárias, guarda por 1 h em `localStorage "gilele:ice"` e, se falhar, devolve só o STUN (o multijogador continua como antes).
  - `engine/net.js`: entra na sala com 20 s + uma nova tentativa (era 12 s e desistia); `peer.reconnect()` quando cai o servidor de sinalização; e reconexão automática do convidado (3 tentativas, 1,2/2,4/3,6 s) antes de avisar "anfitrião saiu".
  - HTML avulsos: mesma coisa à mão no bloco `RTC`. **O canal de dados era `{reliable:false}`** — era o que derrubava presença e o sincronismo de modo (jogadores conectados não se viam); agora é `{reliable:true}`.
  - Vale para os três HTML avulsos: `games/parkour-tabuada`, `games/ez-obby` (cópia do monorepo) e o repositório antigo `mico-droid/ez-obby`. Mudou a rede num → replicar nos três.
  - `installNotes()` (ui.js): avisos do Android (abrir no Chrome, "Instalar assim mesmo" do Play Protect, aprovação do Family Link). Entra sozinho na tela "Como instalar" de todo jogo via `gameLinks()`; nos HTML avulsos (Tabuada, Parkour, EZ Obby) o texto está no `pwaHow`/`installAndroid`.
- Instruções com várias etapas (cartões, "Como jogar", intros): além de "Próximo ▶" sempre ter "◀ Voltar" para reler a anterior (`pagedScreen` em `sobrevivencia/menu.js` já faz; string `backP`).

- Motor v0.3.2: `openRoomPanel(room, { actions })` aceita botões extras quando já há sala; `room.create("ABCD")` recria a sala com um código pedido. No Apagão, `roomActions`/`bootRoom` (`menu.js`) põem "Jogar Aprendizado / Jogar Apagão Real" na tela de amigos e levam a sala (mesmo código) e os convidados quando o dono troca de modo (`?sala=…&host=1` / `&segue=1`, mensagem `goto`).
- Motor v0.3.3: correr em todo jogo 3D. `createPlayer({ run })` (padrão 1,6×; `false` desliga): Shift segurado no teclado, botão 🏃 (liga/desliga) no toque, `me.running`. No Parkour Tabuada (HTML avulso) é `RUN=1.3` com Shift e `#runBtn`. Jogo 3D novo deve ter correr (pedido do dono).
- Motor v0.4.0 — gráficos realistas (pedido do dono, 15/11/2026): nível em `localStorage "gilele:quality"` (auto | low "Leve" | medium "Equilibrado" | high "Realista"), compartilhado por TODOS os jogos (mesma origem, inclusive EZ Obby). Decidido ao abrir o jogo em `engine/three.js` (`THREE.GFX`): nos níveis 1–2 todo `MeshLambertMaterial` vira `MeshStandardMaterial` (PBR) automaticamente. `engine/sky.js`: céu (domo com degradê, sol, nuvens no nível 2, estrelas à noite) que segue `scene.background` e o `sun`, + mapa de ambiente (reflexos) com `scene.environmentIntensity` caindo à noite. ACES + exposição 0,78; `hemi.intensity` é escalado ×0,5 por dentro (os jogos continuam setando o valor antigo). Pintura/vidro dos carros (`vehicle.js`) e moedas (`props.js`) brilhantes. Auto: PC=2, celular=1, celular fraco ou lento (`gilele:autoSlow`)=0. Trocar Leve↔outros vale ao reabrir.
- HTML avulsos (Parkour Tabuada, EZ Obby, three r128): mesmo recurso no bloco `window.GFX` logo após o three.min.js; `GFX.setup(renderer,scene,camera,sun,hemi)` → `gfxUpdate(dt)` antes de cada render; botão "🎨 Gráficos" no menu (troca e recarrega). Em r128 o ambiente é feito via CubeCamera + `pmrem.fromCubemap` (fromScene sai vermelho/RGBE).
- Motor v0.5.2 — rodada de testes gerais do dono (25/11/2026):
  - **Casca padrão da tela inicial**: `homeScreen({icon,title,subtitle,look,onLook,body,room,roomActions,reopen,note,world})`
    em `engine/ui.js` monta o mesmo topo em todos os jogos 3D: idiomas · 📤 Compartilhar · 📲 Instalar · ⚙️ (o
    `openSettings`, com música/sons/gráficos/idioma) · título · subtítulo · boneco com o NOME e o ✏️ Editar ao lado ·
    botões do jogo (`body`) · 👥 Multijogador · 🏠 Gilelê Games · 🔒 Privacidade. Usam: `games/demo`,
    `games/sobrevivencia` (Apagão e Aprendizado) e `games/auto-escola`. Os HTML avulsos têm a mesma casca à mão
    (bloco `.hometop`/`.hochar` no `#menu`). `gameLinks()` continua para telas antigas; `gameLinkParts()` devolve
    cada botão separado. **Corrigido de quebra**: o link 🔒 Privacidade do motor apontava para
    `../../jogos.htmlprivacidade.html`.
  - **Editor do boneco fechado por padrão** nos HTML avulsos: virou o overlay `#charOv`, aberto pelo ✏️ ou pelo
    próprio boneco; o `#pvWrap` (canvas do preview) é MOVIDO entre a tela inicial e o editor (é o mesmo renderer).
  - **Personagem inicial aleatório**: `loadLook()` (motor) e o bloco equivalente nos avulsos sorteiam e já salvam
    quando ainda não há boneco guardado.
  - **Itens desbloqueáveis** (`engine/unlocks.js`, cópia nos avulsos): livres = `none, glasses, hat`; a cada grande
    vitória libera o próximo de `ACC_CHAIN` = headphones, cape, afro, pet, catears, cap, emo, helmet, halo, horns,
    crown. Progresso em `localStorage "gilele:unlocks"` (compartilhado por todos os jogos); `"gilele:unlockHalf"`
    guarda a meia vitória. Grandes vitórias: terminar o EZ Obby / o Parkour (e a tabuada do 9), terminar o
    Aprendizado, terminar o capítulo do Apagão, e **2 missões no modo difícil do Apagão = 1 item** (`grantWin({half:true})`).
    No editor os trancados aparecem translúcidos com 🔒 (`accChips`). `ACC_HAIR` (afro, emo, helmet) ocupa o lugar
    do cabelo; `cape` e `pet` são peças fora da cabeça e têm animação no `animate()`.
  - **Comemorações** (`engine/party.js`, cópia nos avulsos): `celebrate({big})` — final ~22 s (10x) com confete,
    fogos, emoji e a trilha **`victory`**; parcial (bandeira, missão, aula, tabuada) ~6,6 s (3x). O CSS é injetado
    pelo próprio módulo. `grantWin()` solta o item novo e avisa por toast.
  - **Trilha mais alta**: ganho da música 0,13 → **0,28** (`MUSIC_VOL`), com os médios das trilhas `adventure` e
    `castle` reforçados e o sub-grave reduzido — alto-falante de celular não toca abaixo de ~200 Hz, o grave só
    gastava volume. Nova trilha `victory`; novos sons `fanfare`, `cheer`, `firework`.
  - **Configurações no botão de fechar** (Parkour e EZ Obby): ♫ e 🔊 saíram da barra de cima (ficaram ocultos no
    DOM), o ⏸ virou **✕** e a pausa ganhou "⚙️ Opções" (overlay `#cfgOv` com bots, música, sons e gráficos),
    como já era no Apagão.
  - Pendente do mesmo pedido: lista pública de salas no multijogador (pool de anfitriões) — depende de servidor
    ou de um esquema de IDs fixos no PeerJS; o dono topou deixar para depois.
- **Salas públicas sem servidor (25/11/2026)** — `PUBLIC_SLOTS` em `engine/net.js` (e cópia no bloco `RTC` dos
  HTML avulsos): 12 vagas fixas (`PUBA`…`PUBM`). Quem abre sala pública ocupa um desses apelidos no PeerJS
  (`room.createPublic()`); quem procura testa as vagas uma a uma (`room.listPublic(onStep)`) — criar um apelido já
  usado dá `unavailable-id`, e é isso que revela a sala aberta. Por isso a lista mostra QUAIS salas estão abertas,
  mas **não quantos jogadores** tem em cada uma (quem entra numa cheia recebe o aviso "sala cheia" de sempre).
  A busca roda em lotes de 4 (≈3–5 s no total) e cria peers descartáveis — não encosta no protocolo da sala, então
  o multijogador de código continua exatamente como estava. Trocar por lista de verdade quando existir o Worker.
  Aviso de segurança (ECA): a sala pública é anunciada como "pode entrar gente que você não conhece" e o chat
  continua sendo só frases prontas.
- **Tela inicial refeita (25/11/2026, 2ª rodada)** — o dono achou a casca anterior "pouco profissional" e
  pediu o estilo Fall Guys / Rocket League: **o cenário 3D do jogo É a tela inicial**, sem painel e sem rolagem.
  - Motor: `homeScreen()` agora usa `screen(..., { bare: true })` (sem `.ez-card`), com véus de gradiente em
    cima e embaixo para o texto ser legível sobre qualquer cenário. Layout: idiomas + 📲 + ⚙️ nos cantos de
    cima · título e subtítulo flutuando · boneco no meio (`createAvatarPreview(cv, { hero: true })`: fundo
    transparente, sem o disquinho de grama, respira e dá pulinhos, girando devagar) · pílula com o nome e ✏️ ·
    botões do jogo na base (`buttons`, o principal com a classe `.main`) · rodapé 📤 🏠 🔒.
  - **Câmera de vitrine**: com a tela inicial aberta, `homeScreen` assume a câmera do jogo e dá a volta
    devagar num ponto do cenário (`scenicAt`, padrão = posição do jogador; `scenicDist` 30, `scenicUp` 21 —
    vista de maquete, de cima, que nunca entra dentro de parede; ângulos baixos entravam em casas e placas).
    Devolve a câmera ao fechar. Nenhum jogo mexe na câmera com o menu aberto, por isso dá para assumir.
  - Apagão/Aprendizado: `modeHome()` (em `menu.js`) dá os botões compactos — ▶ Continuar (principal) e
    🆕 Novo jogo, que abre a `modeMenu` de sempre numa caixa. `extra:` serve para a linha de faixa etária.
  - HTML avulsos: o `#menu` virou tela cheia transparente com o mesmo desenho, e o boneco do meio é o
    **personagem do jogo mesmo** (já existia uma câmera de menu; agora ela gira mais devagar, de cpt 0.42 e
    cd 13, e o boneco dá pulinhos). O editor ficou dono do `#pvWrap` — não há mais troca de lugar do canvas.
- Trilha **adventure** virou **rock/metal** (152 bpm, Lá menor, guitarra abafada em semicolcheia + riff
  pentatônico). O acessório **capacete saiu** da lista (o dono quis evitar a linha sobrando no editor).
- `jogos.html`: o logo do topo apontava para `./` (a página comercial) — era o "voltar" que levava o dono
  para o lugar errado. Agora fica na própria página; e a barra ganhou **🏫 Para escolas e empresas**.
- Rodada de 25/11/2026 (tarde):
  - **Volume por faixa**: cada trilha agora tem `gain` próprio (`applyGain()` no motor e nos avulsos, chamado
    quando a música troca). As trilhas antigas foram compostas com notas bem mais baixas que as novas e sumiam
    dentro do jogo: `chill` 2.3, `chase` 1.9/1.8, `happy` 2.0, `funk` 1.7, `apagao` 2.4 (em `menu.js`).
  - **Guitarra de verdade no motor**: `engine/audio.js` ganhou o `gtrBus` (WaveShaper tanh + lowpass 2400 →
    musicG), exposto como `k.gtr`; o riff da `adventure` passa por ele. Os avulsos já tinham o `rockBus`
    (agora 0,5 em vez de 0,35).
  - **`rock` virou power metal** nos avulsos (168 bpm, Mi menor, galope colcheia+2 semicolcheias, bumbo duplo,
    solo em notas longas). É a trilha da maioria dos temas, então é ela que toca dentro do jogo. O Apagão
    mantém a trilha própria (`apagao`), que reage ao perigo em 3 níveis — só subiu de volume.
  - **Sair do jogo pergunta antes**: o 🏠 virou botão (não é mais `<a href>`) e abre "Quer mesmo sair?" com
    Sim/Não — no motor via `gameLinkParts.leave()`, nos avulsos via `askLeave()`.
  - `jogos.html`: ordem dos jogos prontos passou a ser Apagão → Parkour Tabuada → EZ Obby → Playground →
    Tabuada Simples (o dono quis o Apagão em primeiro e a Tabuada Simples por último).
- **Volume igual em todas as trilhas (25/11/2026)** — o dono cobrou "o volume tem que ser sempre o mesmo em
  todos os jogos". Em vez de chutar, as trilhas foram **medidas**: um renderizador offline em Node sintetiza
  cada música (os mesmos osciladores, envelopes, ruído, distorção tanh e filtro do jogo), aplica um passa-altas
  de 320 Hz (o que o alto-falante de celular realmente toca) e mede o RMS. O alvo é **0,023** e todas as
  trilhas foram ajustadas pelo campo `gain` até baterem nesse número (motor e avulsos).
  - Motor: `adventure` 1 (referência) · `castle` 4,3 · `chill` 5 · `chase` 4,9 · `victory` 2,05 ·
    `apagao` 3,3 (em `menu.js`).
  - Avulsos: `rock` 0,9 · `adventure` 3,15 (lá não passa pelo rockBus) · `castle` 4,3 · `happy` 2,4 ·
    `funk` 2,6 · `victory` 2,05.
  - A trilha do Apagão também foi **remisturada**: estava com a música em 0,03–0,11 e o bumbo em 0,55, ou
    seja, só se ouvia a batida. Agora a parte melódica carrega o volume.
  - **Limitador** (`DynamicsCompressorNode`, threshold −8, ratio 8) entre o master e a saída, nos dois lados:
    com ganhos altos os picos passavam de 1. Picos medidos hoje: 0,3 a 0,76.
  - **Música x efeitos** (conferência pedida logo depois): medidos os sons de ação com o mesmo renderizador,
    a música tinha ficado ~1,5x acima do pulo. Acertado com `MUSIC_VOL` 0,28 → **0,24** e `SFX_VOL` 0,55 →
    **0,62** (constante nova, nos dois lados). Resultado medido: música 0,0197 · pulo 0,0171 · moeda 0,0168 ·
    checkpoint 0,0287 · média dos sons de ação dos avulsos 0,0239. Pouso e clique ficam de propósito bem
    mais baixos (0,003–0,004). Ao mexer em qualquer volume, refazer as duas medições juntas.
  - Para refazer a medição: o renderizador fica em `/tmp/meas` durante a sessão; são ~80 linhas que importam
    `engine/audio.js` com `SONGS`/`SFX` exportados (e, para os avulsos, extraem `SONGS`/`fx` do HTML por texto).
    Vale recriar se mexer nas trilhas.
- **Botão Voltar do celular** (`guardBack()` em `engine/ui.js`, cópia nos avulsos): o jogo mantém sempre uma
  entrada falsa no histórico (`history.pushState`); ao voltar, o navegador consome essa entrada, o jogo
  pergunta "Quer mesmo sair?" e repõe a entrada. Apertar voltar de novo fecha a pergunta. Assim não dá para
  sair sem confirmar, por mais vezes que aperte.
- **Rodada de correções de 25/11/2026 (noite) — 10 itens apontados pelo dono:**
  - **Apagão Real não iniciava** (item 6): a caixa "🆕 Novo jogo" (`modeHome` em `menu.js`) não era
    fechada ao escolher o modo — ficava por cima do jogo já rodando, então parecia que o jogo não
    abria e o boneco não aparecia. Agora `modeHome` embrulha as ações (`pick`) e fecha a caixa antes
    de chamar `on.*`. **Toda caixa que chama uma ação do jogo tem de se fechar primeiro.**
  - **Service worker**: js/css/json do próprio site passaram a ser **rede primeiro** (`sw.js`), com o
    cache só como reserva offline. O "devolve o cache e atualiza depois" entregava metade dos módulos
    velhos e metade novos numa publicação nova e o jogo abria quebrado. `CACHE` = `gilele-v47`.
  - **Editor do boneco, aba Cabelo** (item 5): bicho/ET/zumbi/carinha não têm cabelo e a aba ficava
    vazia (`"—"`). Agora mostra a cor do cabelo e os tipos menino/menina para trocar ali mesmo
    (`noHair`). Era isto que o dono via quando o sorteio inicial caía num bicho.
  - **Sair do jogo em loop** (item 10): `leaveToPortal()` em `engine/ui.js` (e cópia nos avulsos).
    O "Sim, sair" não fechava a pergunta e usava `location.href`, deixando a página do jogo + as
    entradas falsas no histórico; no portal, o voltar caía no jogo com a pergunta na tela. Agora
    fecha a pergunta, conta as entradas falsas (`fakeEntries`) e faz `history.go(-n)` quando veio do
    portal (senão `location.replace`). Navegação interna do Apagão virou `location.replace`.
  - **EZ Obby** (itens 2 e 4): botões da base em **largura cheia** (`#menu .modes` em coluna); **saiu**
    a escolha inicial dos 3 trajetos (todos jogam o normal; os 3 níveis ficam só no editor de trajeto)
    e **saiu** o botão "Mapa 2D"; e nasceu a **área livre** (`buildArena`, constante `ARENA`): descampado
    46×79 de chão normal com esconderijos, quadrados de poder e uma **corrida de 1 minuto** (linha verde
    → linha vermelha, `arenaRace`), seguida de uma **subida sem limbo** montada em cima do chão — quem
    cai aterriza no chão (`preSafe` é o ponto seguro do alto) — e só depois começa o trajeto normal.
  - **Parkour Tabuada** (itens 1 e 3): fonte menor nos nomes das operações; e **nada de ícones de ação
    em cima da cabeça** — o jogo lia a mochila de poderes do EZ Obby (`ezobby_inv`, mesma origem) num
    jogo que não tem poderes. `inv` fica sempre vazio e `setIcons("")`.
  - **Editor padronizado nos avulsos** (item 9): `buildEditor()` com as mesmas abas do motor
    (Tipo · Cabelo · Cores · Acessório · Rosto) e 🎲 Aleatório · Cancelar · ✔ Salvar; "Cores" agora é só
    detalhe + calça (a camiseta é o uniforme da marca), como no motor. O editor do motor
    (`openAvatarEditor`) continua sendo o original — os avulsos não importam ES modules, então mantêm a
    cópia espelhada. Mudou num → replicar nos dois.
  - **Apagão, ruas limpas** (item 8): `onStreet()`/`STREETS` em `city.js`; postes e árvores que caíam na
    pista saíram, `building()` empurra qualquer construção para dentro do quarteirão e a casa de
    enchimento que invadia a rua x=−24 mudou de lugar. A **bateria do celular** virou um selo dentro do
    próprio ícone 📱 do HUD (`.sv-batt`), fora do topo.
  - **Apagão, bairro vivo** (item 7): comércios ganharam **porta de verdade** (`shopDoor`) e ficam
    abertos por mais tempo; **21 casas** (`HOUSE_SPOTS`) com a regra do dono — 50% abertas (paredes com
    vão de porta, piso e telhado que some quando você entra), 50% destas com **itens no chão**
    (`houseLoot()`) e 50% destas com um **morador** que não deixa levar nada (`guard` novo no
    `setupSocial`/`social.js`). E **moradores de rua**: um por rua (8), 10% agressivos (empurram) e 10%
    ladrões (levam dinheiro ou um item) — só agem depois do apagão (`updateDwellers`).
- **Ajustes de 26/11/2026 (madrugada) — o que faltou da rodada da noite:**
  - **Itens das casas não apareciam**: `houseLoot()` só roda no `newState()`, então quem **continuou**
    o jogo salvo ficava com `st.ground` vazio — e era exatamente o caso do dono. `load()` agora
    completa uma vez (`st.f.hloot`) quando o save é antigo. Jogo novo já nasce com a marca.
  - **"Não está 50%"**: as 21 casas da lista ficavam todas longe (o quarteirão de casa só tinha os
    vizinhos, que são caixas fechadas). Agora `HOUSE_SPOTS` é **ordenada pela distância de `HOME`**
    antes de aplicar a regra, e a casa anônima do próprio quarteirão (10,−15) entrou na lista — ou
    seja, a casa mais perto de casa é aberta, com item e com morador. São 22 casas: 11 abertas,
    6 com item, 3 com morador. Conferir no console: `GAME.casas()`, `GAME.bots()`, `GAME.itens()`.
  - **Bots: o dobro de dia.** 8 à noite, **16 de dia** (`nDay = nNight * 2`); os `dayOnly` somem
    quando `isDark()`. Papéis: 2 agressivos, 2 ladrões, e **metade do total conversa** (`b.talk`) —
    dessa metade, metade topa trocar (`b.trades`) e metade diz que não quer trocar nada.
  - **Conversa com frases prontas + troca** (`talkTo`, `nearestTalker`): usa o `openMenu` padrão do
    jogo; 3 perguntas prontas com resposta diferente antes e depois do apagão, e a troca de 1 item
    por 1 item (`setupTrade` sorteia o que ele dá e os 3 que aceita). **Nunca texto livre** (ECA).
  - **Morador da casa**: metade troca, metade não. Quem **fecha uma troca com o morador** vira amigo
    (`b.friend`) e passa a poder pegar os itens daquela casa — antes o morador só bloqueava.
