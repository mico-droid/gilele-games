# Gilele Games — notas para desenvolvimento

- Monorepo publicado no GitHub Pages (mico-droid/gilele-games). Sem etapa de build: ES modules puros.
- Motor em `engine/` (entrada `engine/ez.js`). Jogos em `games/<id>/` importam `../../engine/ez.js`.
- Three.js fixado em `engine/three.js` (CDN jsDelivr). Atualizar só ali.
- Toda mudança no motor precisa manter o `games/demo` funcionando (é o jogo-modelo e o teste).
- Todo jogo deve: ter PWA (manifest próprio + `registerPWA("../../sw.js")`), PT/EN/ES via `addStrings`, controles de toque e teclado.
- Público pode incluir crianças (ECA Digital): sem chat livre (só frases prontas), sem login, sem coletar dados pessoais, analytics sem nomes/códigos de sala.
- Ao mudar arquivos cacheados de forma incompatível, subir a versão `CACHE` em `sw.js`.
- Licença PolyForm Noncommercial (uso comercial reservado ao autor).
- Próximos jogos planejados: Auto Escola (precisa de módulo de veículo + câmera 1ª pessoa), Corrida política, Visita a locais, RPG multiplayer, Treinamentos para empresas.
