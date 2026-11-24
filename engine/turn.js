// Conta do TURN (Metered) usada pelo multijogador. Só configuração — a lógica fica em ice.js.
//
// O que é: alguns celulares e redes (operadora, Wi-Fi de escola, roteador mais fechado) não deixam
// dois jogadores falarem direto. O servidor TURN repassa os dados e salva a conexão nesses casos.
//
// A chave abaixo é a chave PÚBLICA do painel do Metered: ela só serve para pedir um usuário e uma
// senha temporários do TURN e fica visível no site (é assim que o Metered manda usar no navegador).
// NUNCA pôr aqui a chave secreta (a que começa com "sk_"). Trocar de conta = mudar só este arquivo.
export const TURN = {
  app: "gilele",                              // vira https://gilele.metered.live
  key: "6afe1e6041687f4a954f7ce3",            // chave pública (painel do Metered)
};
