# Gilele Games — notas para desenvolvimento

- Monorepo publicado no GitHub Pages (mico-droid/gilele-games). Sem etapa de build: ES modules puros.
- Motor em `engine/` (entrada `engine/ez.js`). Jogos em `games/<id>/` importam `../../engine/ez.js`.
- Three.js fixado em `engine/three.js` (CDN jsDelivr). Atualizar só ali.
- Toda mudança no motor precisa manter o `games/demo` funcionando (é o jogo-modelo e o teste).
- Todo jogo deve: ter PWA (manifest próprio + `registerPWA("../../sw.js")`), PT/EN/ES via `addStrings`, controles de toque e teclado.
- Público pode incluir crianças (ECA Digital): sem chat livre (só frases prontas), sem login, sem coletar dados pessoais, analytics sem nomes/códigos de sala.
- Ao mudar arquivos cacheados de forma incompatível, subir a versão `CACHE` em `sw.js`.
- Licença PolyForm Noncommercial (uso comercial reservado ao autor).
- Próximos jogos planejados: Corrida política, Visita a locais, RPG multiplayer, Treinamentos para empresas.
- Auto Escola (`games/auto-escola/`) v1 jogável: seguir `PLANO.md`. Pesos das infrações = fichas do MBEDV (anexo oficial de 01/02/2026), em `rules.js`.
- Motor v0.2.0: `vehicle.js`, `road.js`, `traffic.js` + ganchos `world.onBeforeRender/onAfterRender` (retrovisores e overlays).
- Testes da Auto Escola: `GAME.tick(dt)` + `tests/autopilot.js` (um motorista correto deve fazer a prova sem infrações). Em física, o passo interno é ≤ 2,5 ms (o modelo da embreagem fica instável com passos maiores).
- Portal (`index.html`): jogos "Prontos" ficam primeiro; os outros vão na seção "Em desenvolvimento/testes" (classe `dev`). SEMPRE perguntar ao dono se um jogo novo/alterado está Pronto ou não. Hoje: prontos = EZ Obby, Batalha da Tabuada, Playground Testes; em testes = Auto Escola.
- Motor v0.3.0: `throw.js` (`createThrowables`): pegar/carregar/arremessar objetos, alvos, sync multijogador por eventos (tg/tt/tr/td/th/ts). Exemplo em `games/demo`.
