# 🚗 Auto Escola: plano revisado (v1)

> **Status (12/11/2026): v1 jogável.** Feito: `engine/vehicle.js`, `engine/road.js`, `engine/traffic.js`, bairro, cockpit com retrovisores reais, câmeras interior/externa, controles de toque e teclado, juiz com as fichas do MBEDV, Prova (3 percursos), 8 lições, 7 cenários, passeio livre, replay das infrações, PWA e PT/EN/ES.
> Fica para depois: replay de 5 s com câmera lenta, cenário noturno, estacionamento a 45°, detector do art. 220, ranking, multijogador "examinador amigo", carteirinha fictícia, quiz de placas.

Jogo 3D do Gilele Engine (`games/auto-escola/`), em PWA, para celular e teclado, em PT/EN/ES.

---

## 1. O que a pesquisa mudou no plano

As regras do exame mudaram muito, e o jogo precisa seguir o modelo **novo**:

- **Regra em vigor:** Resolução CONTRAN nº 1.020/2025 mais o **Manual Brasileiro de Exames de Direção Veicular (MBEDV)**, publicado pela Senatran em 1º/02/2026.
- **Pontuação:** o candidato começa com 0 pontos e soma pontos a cada infração do CTB: **leve 1, média 2, grave 4, gravíssima 6**. É **aprovado com até 10 pontos**.
- **Fim da falta eliminatória:** nenhuma infração reprova sozinha. A comissão pode interromper a prova quando falta domínio do veículo.
- **Baliza:** deixou de ser uma etapa separada e obrigatória. Agora o estacionamento faz parte do percurso.
- **Carro automático:** já é permitido no exame.
- **Motor morrer:** não reprova mais automaticamente.
- **Exame em trânsito real:** percurso urbano mais longo, sem "pegadinhas". Cada infração tem uma *ficha de procedimento* no MBEDV, que diz o que pontua e o que não pontua.
- **Atenção:** alguns Detrans ainda têm portarias próprias (ex.: MS). O jogo usa a **regra nacional (MBEDV)** como padrão.

Dados usados para priorizar o modo Trânsito Difícil:

| Dado | Fonte |
|---|---|
| 37.150 mortes no trânsito em 2024, e **41,6% eram motociclistas** | SIM/Ministério da Saúde, análise do ONSV |
| Em Goiânia (2024), 59,8% das lesões fatais foram de motociclistas e 22,9% de pedestres | Boletim PVT Goiânia |
| Rodovias federais em 2025: 72.483 acidentes, 6.044 mortes, **84% ligados ao comportamento do condutor** | Anuário PRF 2025 |
| Acidente mais frequente: **colisão traseira**. Mais letal: **ultrapassagem indevida** (colisão frontal) | Anuário PRF 2025 |
| Causas mais registradas: **ausência de reação** e **reação tardia** (desatenção) | Anuário PRF 2025 |

---

## 2. Escopo

### v1 (primeira entrega jogável)
- Carro de autoescola: **o aluno escolhe o câmbio** (manual 5 marchas + ré, ou automático P-R-N-D) ao iniciar, e pode trocar no menu.
- **2 câmeras:** interior (padrão) e externa, com troca por botão ou pela tecla **C**.
- **Bairro-modelo** com ruas de mão dupla e mão única, semáforos, PARE, faixas de pedestre, rotatória, ladeira com semáforo, vagas de estacionamento (paralela e 45°), lombada e escola.
- **3 modos:** Aprendizado (8 lições), Prova (percurso sorteado e ficha no final) e Trânsito Difícil (6 cenários).
- Trânsito de IA: carros, motos, ônibus e pedestres.

### Depois (v2+)
- Mais cenários: noite, chuva forte, estrada de terra, rodovia de pista simples longa.
- Moto (cat. A), ranking, multijogador (amigo como "examinador" ou carona).
- Modo infantil "Pedestre seguro".

---

## 3. Comandos

| Comando | Teclado | Celular |
|---|---|---|
| Acelerador / Freio / Embreagem | W / S / Shift (ou ↑ ↓ e Q) | 3 pedais na tela, à direita (com pressão analógica pela posição do dedo) |
| Volante | A / D (ou ← →) | Volante arrastável à esquerda |
| Marchas | 1–5, R = ré, N = neutro | Alavanca em "H" desenhada (arrastar) |
| Freio de mão | Espaço | Botão |
| Seta esquerda / direita | Z / X | Botões ◀ ▶ |
| Pisca-alerta, farol, buzina, limpador | H, L, B, V | Painel de botões recolhível |
| Cinto, partida, retrovisores | K, I (segurar = partida), M (ajustar) | Toque no ícone do painel |
| Câmera | C | Botão 🎥 |

No celular o padrão é **paisagem**, com aviso para girar a tela. No automático, a embreagem e a alavanca somem e ficam só P-R-N-D.

---

## 4. Câmeras

- **Interior (padrão no Aprendizado e na checagem inicial da Prova):** visão do motorista, com volante que gira, conta-giros, velocímetro, luzes do painel (cinto, freio de mão, setas, farol, temperatura) e os 3 retrovisores renderizados de verdade (câmeras extras em baixa resolução). Dá para olhar em volta arrastando a tela, o que ajuda na checagem de ponto cego.
- **Externa (opcional na Prova e no Trânsito Difícil):** câmera atrás do carro. HUD mínimo com marcha, velocidade, setas, cinto e 2 mini-retrovisores.
- O jogo lembra a última escolha **em cada modo de jogo**.

---

## 5. Arquitetura sobre o Gilele Engine

Módulos novos no motor (reaproveitáveis em outros jogos: kart, corrida etc.):

- `engine/vehicle.js` cuida da simulação do carro:
  - **Motor:** curva de torque simples, rotação de marcha lenta (~850) e corte (~6.000).
  - **Embreagem:** acoplamento de 0 a 1 com "ponto de embreagem" (patinação).
  - **Câmbio:** relações reais de carro 1.0, mais ré.
  - **Morre:** quando a rotação cai abaixo de ~500 com embreagem acoplada, ou quando arranca em marcha alta.
  - **Freios:** freio de serviço, freio de mão e freio-motor.
  - **Ladeira:** a gravidade age no carro (dá para descer de ré e treinar arrancada com freio de mão).
  - **Direção:** modelo de bicicleta (Ackermann simplificado).
  - **Colisão:** contra as caixas do `physics.js` e entre veículos, com OBB 2D.
  - **Saídas:** velocidade, rotação, marcha e eventos (morreu, colidiu, subiu no meio-fio).
- `engine/road.js` monta a malha viária a partir de um JSON (pistas, faixas, sentido, velocidade máxima, sinalização) e gera ruas, calçadas, meio-fio, faixas pintadas, placas e semáforos.
- `engine/traffic.js` cuida da IA dos carros e motos (seguir faixa, respeitar semáforo, manter distância, motos "costurando" quando o cenário pedir) e dos pedestres (atravessar na faixa ou fora dela, conforme o cenário).

O jogo em si fica em `games/auto-escola/`:
- `rules.js`: **catálogo de infrações** no formato das fichas do MBEDV (artigo do CTB, natureza, peso, detector, o que pontua e o que não pontua).
- `lessons.js`: as lições do modo Aprendizado.
- `exam.js`: o modo Prova.
- `scenarios.js`: os cenários do Trânsito Difícil.
- `cockpit.js`: o painel 3D.

**Catálogo de detectores (pesos conferidos nas fichas do MBEDV).** Fonte: anexo "Fichas de Avaliação" do MBEDV (gov.br, 01/02/2026). Implementado em `rules.js`.

| Situação no jogo | Ficha | Natureza (peso) | Observação |
|---|---|---|---|
| Avançar sinal vermelho / não parar totalmente no PARE | art. 208 | gravíssima (6) | Pontua só ao cruzar a linha de retenção no vermelho; amarelo não pontua |
| Não dar preferência ao pedestre na faixa | art. 214, I | gravíssima (6) | Pedestre atravessando ou parado na guia esperando |
| Velocidade até 20% / 20–50% / >50% acima | art. 218, I / II / III | média (2) / grave (4) / gravíssima (6) | Só a faixa mais alta conta em cada episódio |
| Não sinalizar (seta) ao sair da vaga, mudar de faixa, converter, sair da rotatória | art. 196 | grave (4) | |
| Não ir para a faixa certa antes de converter | art. 197 | média (2) | Só em vias com 2+ faixas no sentido |
| Contramão em via de mão dupla / de mão única | art. 186, I / II | grave (4) / gravíssima (6) | Em linha tracejada, tolera ultrapassagem rápida |
| Ultrapassar sobre linha amarela contínua | art. 203, V | gravíssima (6) | |
| Subir na calçada / ilha | art. 193 | gravíssima (6) | Encostar no meio-fio só baixa o domínio |
| Não guardar distância do veículo da frente | art. 192 | grave (4) | Menos de ~0,7 s de distância por mais de 2,5 s |
| Dirigir sem atenção (freio de mão puxado andando, marcha errada) | art. 169 | leve (1) | A ficha cita "freio de mão ou marchas incorretas" |
| Parar sobre a faixa de pedestres na mudança de sinal | art. 183 | média (2) | **Mudou:** o plano citava o art. 182, que não tem ficha |
| Descer a ladeira em ponto morto | art. 231, IX | média (2) | Ficha com texto divergente (fala em gravíssima); usado o campo "Gravidade" |
| Pisca-alerta ligado em movimento | art. 251, I | média (2) | |
| Buzina sem necessidade | art. 227 | leve (1) | Toque prolongado ou 3 toques em 6 s |
| Ré sem necessidade (mais de 22 m) | art. 194 | grave (4) | Liberada na lição de baliza |
| Não dar preferência a quem está na rotatória | art. 215, I, a | grave (4) | |
| Não dar passagem à ambulância | art. 189 | gravíssima (6) | Cenário 5 |
| Usar o celular | art. 252, VI | **média (2)** | **Mudou:** o plano dizia média/gravíssima; a ficha do MBEDV diz média |
| Farol baixo apagado na chuva | art. 250, I | média (2) | Cenário 6 |
| Limpador desligado na chuva | art. 230, XIX | grave (4) | Ficha com texto divergente (fala em média); usado o campo "Gravidade" |
| Estacionar: <5 m da esquina / 50 cm–1 m da guia / >1 m / sobre a faixa | art. 181, I / II / III / VIII | média (2) / leve (1) / grave (4) / grave (4) | Avaliado no fim da Prova |

**Cinto (art. 167):** o anexo de fichas **não tem ficha** para o art. 167. No jogo, sair sem cinto não soma pontos: o examinador manda parar e colocar o cinto, e o domínio cai 10.
**Art. 220 (velocidade incompatível perto de escola):** a rua da escola tem limite de 30 km/h, então o excesso já cai no art. 218. Detector próprio do 220 fica para a v2.

**Controle do veículo**, separado da pontuação: o carro morrer, trancos e "perder o controle" entram num **medidor de domínio**. Se ele zerar, a "comissão" interrompe a prova, como prevê o MBEDV. O carro morrer só gera aviso e feedback, porque não reprova mais sozinho.

---

## 6. Modos

### Aprendizado (8 lições, cada uma com objetivo, dicas e estrelas)
1. Cockpit: banco, cinto, retrovisores e partida
2. Arrancar: ponto de embreagem, sem deixar morrer
3. Trocar marchas (1ª→3ª) e reduzir
4. Curvas e conversões com seta
5. Arrancada em ladeira (com freio de mão)
6. Cruzamentos, PARE e semáforo
7. Rotatória
8. Estacionar (paralela/baliza e 45°). É opcional no exame, mas o jogo ensina, como os Detrans recomendam.

### Prova
Simulação no modelo MBEDV, explicada em detalhe na seção 7.

### Treino em Trânsito Difícil (v1: 7 cenários)
Priorizados pelos dados de acidentes:
1. **Hora do rush:** centro congestionado, colisão traseira iminente e motos costurando entre as faixas
2. **Ponto cego dos retrovisores:** moto vindo por trás na mesma pista some no ponto cego do retrovisor **direito e esquerdo**. Ao mudar de faixa ou converter, o aluno precisa olhar por cima do ombro (botão/arrastar "olhar ponto cego") além do espelho e dar a seta
2b. **Ponto cego da coluna A:** em cruzamento, moto se aproximando fica escondida atrás da **coluna entre a porta e o para-brisa**. A coluna é sólida no cockpit (câmera interior) e a moto é posicionada para coincidir com ela; o certo é mexer a cabeça (olhar livre) / parar e conferir antes de avançar
3. **Pedestres:** saída de escola, pedestre fora da faixa e ônibus parado escondendo quem atravessa
4. **Ultrapassagem em pista simples:** caminhão lento, faixa contínua, carro vindo na contramão
5. **Imprevistos:** ambulância pedindo passagem, carro quebrado, semáforo apagado (vira cruzamento não sinalizado) e celular tocando no banco (o certo é ignorar)
6. **Chuva:** aquaplanagem, distância de frenagem maior, limpador e farol

A nota de direção defensiva (0–100) avalia distância de seguimento, antecipação (frear antes do perigo), uso de seta e retrovisor e velocidade adequada. Ao final de cada cenário, um replay mostra o momento de risco e explica o que aconteceria.

---

## 7. Simulação da sequência da Prova

**Antes de sair (câmera interior):**
1. A tela mostra "Examinador: pode iniciar quando estiver pronto".
2. O jogador ajusta banco e retrovisores, põe o cinto e confere o freio de mão. Nada disso pontua sozinho no MBEDV, mas sair sem cinto já gera **+4 (grave, art. 167)** no primeiro metro.
3. Dá a partida (em neutro e com a embreagem pisada). Se der partida engrenado, o carro dá um tranco e o medidor de domínio cai.

**Percurso (de 8 a 12 minutos, sorteado entre 3 rotas do bairro):**
4. Sair da vaga **com seta** e olhando o retrovisor. Sem seta: **+4 (art. 196)**.
5. Rua de 40 km/h. Chegar a 46 km/h, ou seja, até 20% acima do limite: **+2 (média, art. 218)**.
6. Semáforo amarelo, depois vermelho, com parada antes da faixa. Avançar o vermelho: **+6 (gravíssima, art. 208)**.
7. Conversão à direita com pedestre atravessando. Não esperar o pedestre: **+6 (art. 214)**.
8. Ladeira com PARE no topo. Se o carro descer de ré e encostar no de trás, há colisão (domínio cai muito e o examinador pode interromper). Se o motor morrer, só há aviso.
9. Rotatória com preferência de quem já está nela. Sair sem dar seta: **+4**.
10. Estacionar numa vaga paralela no percurso. Subir no meio-fio ou parar sobre a faixa de pedestre pontua conforme a ficha.
11. Voltar ao ponto inicial e desligar o carro.

**Exemplo de resultado:** sem seta (4) + 46 km/h (2) + não ajustar a vaga e parar sobre a faixa (peso a confirmar na ficha; ex.: 2) = **8 pontos → APROVADO**. Somando o vermelho avançado (+6), o total vai a 14 → **REPROVADO**.

**Relatório final:** lista de cada infração com o artigo do CTB, um replay curto de 5 segundos, a dica de como evitar e o botão "Treinar isso", que leva à lição correspondente.

---

## 8. Roteiro de exemplo: Trânsito Difícil, cenário 3 ("Saída de escola")

1. Começa numa avenida de 40 km/h às 12h, com placa "Escola" e lombada.
2. Um ônibus para no ponto à direita. Um pedestre sai **na frente do ônibus**, fora do campo de visão.
3. Se o jogador passar a mais de 30 km/h ao lado do ônibus, o pedestre surge e só uma frenagem forte evita a batida. Nesse caso a nota de defensiva perde pontos.
4. A resposta certa é reduzir antes do ônibus, cobrir o freio e passar devagar. Isso dá bônus de antecipação.
5. Mais à frente, uma bola rola para a rua e uma criança corre atrás.
6. Fim: replay em câmera lenta mostrando o ponto cego do ônibus e a frase "Ônibus parado = pedestre escondido".

**Cuidado com o público infantil:** não há cenas de atropelamento nem ferimentos. Quando há batida, a tela congela, mostra um ⚠️ e passa para o replay educativo. Os personagens são os bonecos de blocos.

---

## 9. Revisão crítica do plano (2ª passada)

| Risco ou lacuna | Decisão |
|---|---|
| Embreagem e 3 pedais no celular são difíceis | Pedais analógicos (posição do dedo = pressão), **assistente de embreagem** opcional no Aprendizado e câmbio automático como opção |
| Retrovisores reais pesam no celular fraco | Renderizar em 1/4 da resolução, a cada 2 quadros. No modo leve, os retrovisores ficam "simplificados" |
| Física de carro realista é complexa | Modelo arcade calibrado: sensação correta dos comandos, sem simular pneu de verdade |
| Regras mudam por estado | Pesos em uma tabela única (`rules.js`). No futuro, dá para ter "perfil de Detran" |
| A IA de trânsito pode travar | Grade de faixas com prioridade fixa e *despawn* longe da câmera |
| Tamanho do escopo | v1 = 1 bairro, 8 lições, prova e 6 cenários; o resto vai para a v2 |
| Pesos do MBEDV (fichas) | Conferir cada ficha no PDF oficial antes de codificar o detector |
| Câmera interior: falta de visão lateral | Olhar livre (arrastar), botão "olhar o ponto cego" e retrovisores — e os pontos cegos (coluna A, espelhos) são **reais de propósito**, para treinar |
| Ponto cego na câmera externa não existe | Nos cenários de ponto cego, a câmera externa fica bloqueada (ou desconta pontos de "treino") |

---

## 10. Conformidade (só riscos altos)

- ⚠️ **Não usar nome, logo ou fardamento do Detran/Senatran nem prometer validade oficial.** O jogo diz "simulado educativo baseado no CTB e no MBEDV". O examinador é um personagem genérico.
- ⚠️ **Cenas de acidente com crianças jogando (ECA Digital):** nada gráfico, como descrito na seção 8.
- Sem chat livre, sem login e sem dados pessoais (padrão do motor). Os outros riscos são baixos.

---

## 11. Ideias extras

- **"Examinador amigo" multijogador:** um amigo entra na sala e marca as faltas do motorista em tempo real. Ótimo para quem ensina alguém a dirigir.
- **Desafio do dia:** um cenário diferente por dia, com ranking local.
- **Carteirinha do jogo:** uma "CNH" fictícia do Gilele com o personagem do jogador, que dá para compartilhar ao passar na prova. Marcada como fictícia.
- **Modo quiz da placa:** placas aparecem no percurso e o jogador tem 3 segundos para dizer o que significam (conversa com a prova teórica).
- **Velocímetro de economia:** troca de marcha na hora certa vira "eco pontos" (direção econômica).
- **Sons reais sintetizados:** ronco do motor por rotação, seta "tic-tac", ruído de pneu na chuva.

---

## Decisões pendentes (há um padrão se não houver resposta)

1. Câmbio: **o aluno escolhe** (manual ou automático) ✅ decidido pelo usuário
2. Cidade: **bairro genérico brasileiro**, sem cidade real ✅ (padrão)
3. Regras: **nacional (MBEDV)**, com baliza como lição e não como etapa obrigatória ✅ (padrão)
