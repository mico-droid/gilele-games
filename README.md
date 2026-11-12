# 🎮 Gilele Games

Jogos 3D que rodam no navegador (celular e PC), com multijogador sem login e instaláveis como app (PWA).
Todos os jogos usam o **Gilele Engine**, que fica na pasta `engine/`.

**Jogar:** https://mico-droid.github.io/gilele-games/

## Estrutura

```
index.html            Portal com a lista de jogos (PWA)
sw.js                 Service worker compartilhado (offline + cache)
manifest.webmanifest  Manifest do portal
icons/                Ícones do app
engine/               Gilele Engine (módulos JS, sem build)
games/demo/           Playground: jogo-modelo que usa tudo do motor
games/auto-escola/    Auto Escola: simulado de direção (CTB + MBEDV)
tests/                Ferramentas de teste (piloto automático da Auto Escola)
```

## O que o motor já tem

| Módulo | O que faz |
|---|---|
| `core.js` | Renderizador Three.js, cena, luzes, loop, pausa, qualidade automática (celular fraco → modo leve) |
| `physics.js` | Física de caixas (AABB) com grade espacial; personagem com pulo, coyote time, degrau, empurrão; caixas `solid`, `kill`, `trigger`, `bounce`, `ice`, esteira e plataformas móveis |
| `input.js` | Teclado, joystick de toque, botões na tela, mouse/roda, gamepad. Ações por nome (`jump`, `act`, `reset`…) |
| `camera.js` | Câmera 3ª pessoa orbital (com anti-parede) e 1ª pessoa (para cockpit) |
| `avatar.js` | Bonecos de blocos: menino, menina, raposa, ET, cavalo, smiley, zumbi; cabelos, cores, acessórios (cartola, boné, óculos, coroa, fone), rostos; `Character` com nome, balão de fala e animação |
| `player.js` | Jogador pronto (corpo + boneco + câmera + som + rede) e bots que passeiam |
| `net.js` | Salas WebRTC (PeerJS) de até 4 jogadores com código de 4 letras e link `?sala=CODIGO`; presença, eventos e estado do host. Jogadores remotos com movimento suavizado |
| `ui.js` | Telas, toast, editor de personagem com prévia 3D, configurações, painel multijogador, chat rápido |
| `i18n.js` | Português, inglês e espanhol |
| `audio.js` | Efeitos e música sintetizados (sem arquivos) + som contínuo (motor de carro, vento) |
| `props.js` | Chão, árvore, nuvem, trampolim, placa com texto, moedas, checkpoint, plataforma móvel |
| `pwa.js` | Service worker e botão "Instalar app" (Android/PC) + dica para iPhone |
| `analytics.js` | Eventos para o Google Tag Manager / GA4 |
| `vehicle.js` | Carro/moto/ônibus/caminhão: motor com curva de torque, embreagem com ponto de patinação, câmbio manual (5+R) ou automático (P-R-N-D), motor que morre, freio de mão, ladeira, direção tipo bicicleta, colisão (caixas orientadas), luzes e setas |
| `road.js` | Malha viária a partir de um JSON: ruas de mão dupla/única, cruzamentos, rotatória, quarteirões com calçada e meio-fio, faixas (amarela/branca), faixa de pedestre, linha de retenção, PARE, placas de velocidade, lombada, vagas, semáforos com ciclo. Consultas: `groundAt`, `locate` (faixa, contramão, distância até a linha de retenção) |
| `traffic.js` | Trânsito com IA: segue faixas, respeita semáforo, PARE e rotatória, mantém distância, dá preferência a pedestres; pedestres andam na calçada e atravessam na faixa |

O personagem, o idioma e o som ficam salvos e valem para **todos** os jogos.

## Criar um jogo novo

1. Copie `games/demo/` para `games/<nome>/`.
2. No `main.js`, troque `GAME_ID`, os textos em `addStrings` e a função `buildLevel()`.
3. Ajuste `manifest.webmanifest` (nome e cor).
4. Coloque um card do jogo no `index.html` da raiz.

Exemplo mínimo:

```js
import { createWorld, createPhysics, endFrame, createInput, createFollowCamera, createPlayer, addGround, loadLook } from "../../engine/ez.js";

const world = createWorld({ canvas: document.getElementById("c") });
const phys = createPhysics();
const cam = createFollowCamera(world.camera, { phys });
const input = createInput({ canvas: world.renderer.domElement, onLook: cam.look, onZoom: cam.zoom });
addGround(world, phys);
const me = createPlayer({ world, phys, input, cam, look: loadLook() });
world.onUpdate((dt) => { me.update(dt); endFrame(phys); input.endFrame(); });
world.start();
```

No console do navegador, `window.GAME` dá acesso ao mundo, ao jogador e à sala (ajuda a depurar).
Na Auto Escola, `GAME.tick(dt)` avança a simulação manualmente (com `GAME.world.setPaused(true)`), o que permite testes rápidos com `tests/autopilot.js`.

## Auto Escola

Plano e decisões: `games/auto-escola/PLANO.md`. Arquivos:

| Arquivo | O que faz |
|---|---|
| `map.js` | Bairro genérico: grade 3×3, avenida com semáforos, mão única, rotatória, ladeira, rua da escola, vagas e estrada de pista simples |
| `rules.js` | Catálogo de infrações com os pesos das fichas do MBEDV e o "juiz" que detecta cada uma; medidor de domínio do veículo |
| `cockpit.js` | Painel, volante, quadro de instrumentos, colunas A e os 3 retrovisores renderizados |
| `modes.js` | Prova (3 percursos sorteados), 8 lições, 7 cenários de Trânsito Difícil e passeio livre |
| `main.js` | Controles (teclado e toque: volante, 3 pedais, alavanca), câmeras interior/externa, HUD, minimapa, replay e menus |

## Multijogador

- Quem cria a sala é o host e repassa as mensagens para os outros (topologia estrela). O máximo é 4 por sala.
- Não pede login nem guarda dados pessoais. O chat só tem frases prontas, o que é mais seguro para crianças.
- O sinal inicial usa o servidor público do PeerJS. Para usar um servidor próprio: `?server=host:porta`.
- O transporte fica isolado em `net.js`. Dá para trocar por Firebase sem mudar os jogos.

## Rodar localmente

```
python3 -m http.server 8000
# abra http://localhost:8000/
```

## Licença

PolyForm Noncommercial 1.0.0. Veja `LICENSE.md` e `NOTICE`. O uso comercial é reservado ao autor.
