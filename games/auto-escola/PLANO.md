# 🚗 Auto Escola: plano revisado (v1)

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

**Catálogo inicial de detectores.** Os pesos vêm da natureza da infração no CTB. Cada um será **conferido na ficha do MBEDV antes de codificar**.

| Situação no jogo | CTB | Natureza |
|---|---|---|
| Avançar sinal vermelho ou PARE | art. 208 | gravíssima |
| Não dar preferência ao pedestre na faixa | art. 214 | gravíssima |
| Excesso de velocidade (até 20% / 20–50% / >50%) | art. 218 | média / grave / gravíssima |
| Sem cinto | art. 167 | grave |
| Não sinalizar mudança de direção ou faixa (seta) | art. 196 | grave |
| Contramão | art. 186 | grave / gravíssima |
| Transitar na calçada / parar sobre faixa de pedestre | arts. 193 / 182 | gravíssima / conforme o inciso |
| Ultrapassagem proibida (faixa contínua) | art. 203 | gravíssima |
| Dirigir sem atenção | art. 169 | leve |
| Estacionar irregular ou fora da vaga no percurso | art. 181 | conforme o inciso |
| Não dar passagem a ambulância | art. 189 | gravíssima |
| Usar o celular (cenário "mensagem chegando") | art. 252 | média / gravíssima, conforme o inciso |
| Buzina sem necessidade | art. 227 | leve |
| Farol apagado em túnel ou à noite | art. 250 | média |

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
