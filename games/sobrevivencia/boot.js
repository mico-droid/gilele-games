// Escolhe o modo: ?modo=aprender → Modo Aprendizado (learn.js); senão → Apagão Real (main.js).
const learn = new URLSearchParams(location.search).get("modo") === "aprender";
import(learn ? "./learn.js" : "./main.js");
