// Escolhe o modo: ?modo=aprender → Aprendizado (learn.js); ?modo=cidade → Explorar minha cidade (cidade.js, testes);
// senão → Apagão Real (main.js; o mapa pode ser o padrão de Goiânia ou o "📍 Minha cidade").
const modo = new URLSearchParams(location.search).get("modo");
if (modo === "cidade") import("./cidade.js").then((m) => m.runExplorer());
else import(modo === "aprender" ? "./learn.js" : "./main.js");
