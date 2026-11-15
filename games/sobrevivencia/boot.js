// Escolhe o modo: ?modo=aprender → Aprendizado (learn.js); ?modo=cidade → Jogar na minha cidade (cidade.js, em testes);
// senão → Apagão Real (main.js).
const modo = new URLSearchParams(location.search).get("modo");
import(modo === "aprender" ? "./learn.js" : modo === "cidade" ? "./cidade.js" : "./main.js");
