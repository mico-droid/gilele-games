# 🔦 Sobrevivência: plano (rascunho v1)

> **Status (13/11/2026):** **v0.2** — Capítulo 1 do Apagão Real (apartamento em Goiânia, Dia 0 → 72 h) + **Modo Aprendizado com Era 0 e Era 1 (19 aulas)**. O resto segue em planejamento.

### Decisões do autor (13/11)
- **Público:** faixas de idade, como na Tabuada. Infantil = sem cenas pesadas; 13+ = mais realista, ainda sem gore.
- **Mapas:** dois, à escolha do jogador: **Goiânia (Cerrado)** e **Rio de Janeiro (Mata Atlântica)**.
- **Morte no Apagão Real:** depende da dificuldade. Fácil = volta ao último acampamento e perde parte da mochila; Difícil = recomeça do Dia 0.
- **Aprovados:** Era 6 (Energia) e a função **curandeiro** na vila.
- **Recusado:** profissões iniciais com bônus.
- **Ordem:** começar pelo **Apagão Real** (cidade, Dia 0 → 72 h); o Aprendizado vem depois.
- **Ajustes pedidos no teste (13/11):** objetivo escrito com "onde achar" cada item; rádio sempre explica onde está e para que serve; mochila explica cada item ao tocar; barras sem cobrir o "Sozinho"; sem barra de ânimo e com saúde só quando cair; água da torneira depois do apagão = **não tratada** (alerta + ferver ou água sanitária); o jogador mora num **apartamento urbano** e o objetivo principal é o protocolo de **ficar em casa em segurança** (elevador para, bomba do prédio para).
- **Clareza (13/11, 2º teste):** tela inicial com 2 botões explicados (Apagão Real / Aprendizado) e "Novo jogo" só do Apagão; cartão "Como jogar" na 1ª vez e botão ❓; no Aprendizado, material **úmido** (beira do rio e sombra da mata) não acende e pode ser seco perto do fogo; passos "pegar" contam o que já está na mochila.
- **Rotina guiada (13/11, 3º teste) — regra geral: o jogador novo não sabe o que fazer; o jogo guia sempre.**
  - Objetivo do Capítulo 1: **em 72 h, montar a mochila de emergência e deixar tudo pronto para partir para a zona rural.** 3 fases: Preparar (antes do apagão, 9 missões em ordem) → Aguentar em casa → Partir (liberado na hora 48; ir ao carro e "Partir" encerra o capítulo; na hora 72 sai às pressas).
  - Painel mostra UMA missão por vez: o que fazer + por quê; seta amarela e facho de luz apontam o lugar. Todo personagem é apresentado (quem é, onde mora, o que fazer e por quê).
  - Caixas de dica se chamam **"Instruções"** (não "Por quê?").
  - Mochila = **9 quadradinhos** (3×3, 9 tipos de item); o galão vai na mão; em casa dá para guardar na despensa.
  - Barra de cima enxuta: 🎒 · 📱 (celular + rádio juntos) · 🔦 · ✕. O ✕ substitui a pausa (mesmo funcionamento) e o submenu tem Instruções, Como jogar, Amigos, Configurações e **"Sair para o Menu"**.
- **4º teste (13/11):** telas iniciais com seção **"Continuar jogo anterior"** separada de **"Novo jogo"** (Aprendizado primeiro, Apagão Real depois); kit 72 h com roupa de frio, roupas de baixo, papel higiênico, comida fácil não perecível, canivete/faca, cordão comprido e escova de dente; pé-direito mais alto (casas e apartamento) e telhado da casa-treino some quando você está dentro; distâncias na escala **1 passo = 0,5 m**; botão de fechar = "Fechar"; diálogos mostram **quem fala** (🗣️ nome/função) e a vez de **"Você"**.
- **Cartão 🆘 Plano B (situação crítica):** aulas podem ter um último cartão com o improviso de emergência real (ex.: gasolina em garrafa PET por poucas horas), separado do "jeito certo". Faixa infantil usa `crit_k` (versão sem instrução para criança mexer em coisas perigosas). Já tem em: Combustível, Estoque de água, Fogo.
- **13/11 (5º retorno):** textos de instrução com mais de uma frase são mostrados em partes (uma frase por tela: apresentações, Instruções, cartões das aulas, Como jogar); "Árvore de tecnologia" passou a se chamar **"Manual de treinamento"** (📒); o autor considerou o jogo **publicado** → card na seção "Prontos" do portal.
- **13/11 (6º retorno):** selo com a quantidade no ícone da mochila, que pisca 3 s ao pegar item; confete + som ao concluir missão/aula (confete pequeno em cada passo); toda caixa (diálogo, instruções, mochila, pausa, painel de missão) tem ✕ no canto superior direito que fecha sem fazer nada (no painel de missão, o ✕ minimiza para "🚩 Ver missão").
- **13/11:** no jogo os mapas aparecem só pelo bioma, sem nome de cidade: "Cidade no Cerrado" e "Cidade na Mata Atlântica" (Goiânia/Rio ficam só como referência interna).
- **13/11:** a mochila do Aprendizado é igual à do Apagão Real: 9 quadradinhos (3×3), toque abre o item (usar/largar). O equipamento do baú ocupa 1 quadradinho ("Kit da mochila"); balde e gerador vão na mão; mochila cheia não pega item novo.
- **Depois do Apagão Real, o autor escolheu o Modo Aprendizado** (antes do Capítulo 2).
- **Nome:** Apagão: Sobreviva. **Publicação:** direto no main, com card no portal.

Jogo 3D do Gilele Engine (`games/sobrevivencia/`), estilo Roblox (bonecos de blocos), PWA, celular e teclado, PT/EN/ES, multijogador de até 4 por sala (WebRTC, sem login).

---

## 1. O que a pesquisa trouxe

### Cenário "Black Sky"
- O termo vem do **EIS Council** (Electric Infrastructure Security Council). Um *Black Sky Hazard* é um evento catastrófico que interrompe as infraestruturas críticas **em várias regiões e por muito tempo**.
- Não é só um apagão. A falta de energia derruba em cascata os outros sistemas que dependem dela: água, saúde, comunicação, combustível, alimentos.
- Causas citadas pelo EIS Council: clima extremo, tempestade solar, ataque cibernético, pulso eletromagnético (EMP), ataque físico coordenado, terremoto, pandemia severa.
- Exemplo real recente: o apagão da Península Ibérica (Espanha/Portugal), que o EIS Council tratou como um "Black Sky em tempo real".
- O DHS (EUA) usa **mais de 72 horas** como marca de "interrupção de longa duração". Isso casa com a "Primeiras 72 horas" da linha do tempo.
- Risco que quase ninguém lembra e que vira aula: **intoxicação por monóxido de carbono** (gerador, fogareiro ou braseiro dentro de casa) — a UNDRR cita isso como impacto típico de apagões.

### Tecnologias sociais da Embrapa (para as eras avançadas)
| Tecnologia | O que é | Onde entra no jogo |
|---|---|---|
| **Sisteminha Embrapa** | Sistema integrado para uma família de 4: tanque de peixes no centro, e os resíduos nutrem os outros módulos (galinhas, hortaliças, minhocas, biodigestor, carvoaria, tratamento de água — 15 módulos) | Era 4: "vila autossuficiente" (objetivo final da agricultura) |
| **PAIS** (Produção Agroecológica Integrada e Sustentável) | Horta em mandala ao redor do galinheiro, sem agrotóxicos | Era 4: horta em mandala |
| **Clorador Embrapa** | Peça simples de cano PVC que clora a água da caixa d'água | Era 3/4: água segura em escala (antes: ferver/filtrar) |
| **Fossa Séptica Biodigestora** | 3 caixas em sequência que tratam o esgoto do vaso; o efluente vira adubo | Era 4: saneamento → evita surtos de cólera/disenteria |
| **Jardim Filtrante** | Trata a "água cinza" (pia, chuveiro, tanque) | Era 4: complemento da fossa |
| **Barraginhas / cisterna** | Pequenas bacias que seguram a chuva e recarregam o solo | Era 4: irrigação e água na seca do Cerrado |

No jogo essas tecnologias aparecem de forma **simplificada** (o jogador monta peças e vê o efeito), com o nome real e um link "saiba mais" para a Embrapa.

---

## 2. Os dois modos

### 📚 Modo Aprendizado
- Acampamento-escola seguro, com um **professor** (NPC) que dá as mini-aulas.
- Segue a árvore de tecnologia era por era. Sem pressa, sem morte permanente.
- Cada etapa: **mini-aula curta (3 a 5 cartões, até 1 minuto) → quiz de 2 perguntas → desafio prático no mundo → desbloqueio**.
- Pode repetir qualquer aula a qualquer hora (livro de aulas).

### 🌑 Modo Apagão Real
- Começa num bairro de cidade brasileira, no **Dia 0**, minutos antes do apagão.
- Segue a **linha do tempo do colapso** (abaixo), em tempo acelerado.
- Barras de sobrevivência: fome, sede, saúde, cansaço, higiene (higiene baixa → risco de doença) e ânimo.
- O jogador decide quando sair da cidade. Quem fica tempo demais enfrenta falta de água, doença e saques.
- Dificuldade escolhida no início: **Fácil** (ao morrer, volta ao último acampamento e perde parte da mochila) ou **Difícil** (recomeça do Dia 0).

#### Linha do tempo no jogo (eventos que acontecem no mapa)
| Fase | O que o jogador vê | O que ele precisa aprender |
|---|---|---|
| **Dia 0** | Notícias estranhas no rádio e no celular, luz piscando | Era 0: sinais de risco, sacar dinheiro, encher o tanque, estocar água |
| **Primeiras 72 h** | Celular sem sinal quando as torres esgotam, posto sem bomba, caixa eletrônico desligado, ônibus parado | Rádio a pilha/manivela, dinheiro físico, ponto de encontro |
| **Semana 1–2** | Torneira seca, esgoto transbordando, comida estragando, hospital sem diesel | Água (achar, filtrar, ferver), comida que não estraga, primeiros socorros |
| **Mês 1–2** | Saques, aglomerações, polícia ausente, surtos de doença | Fugir de aglomerações, discrição, higiene, sair da cidade |
| **Mês 3–6** | Êxodo para o campo; a terra precisa produzir | Eras 1 a 4 de verdade: abrigo, plantio, ferramentas, vila |

Na versão infantil, as partes pesadas (mortes em hospital, violência) aparecem só como notícia curta e sem imagem.

---

## 2b. Os dois mapas

O jogador escolhe o mapa no início. A árvore de tecnologia é a mesma; mudam o cenário, os recursos e algumas aulas.

| | 🟤 Goiânia (Cerrado) | 🟢 Rio de Janeiro (Mata Atlântica) |
|---|---|---|
| Cidade | Bairro plano em grade, avenidas largas, prédios médios | Bairro de subúrbio + morro com escadarias, prédios mais juntos |
| Saída | Periferia → BR → fazendas e veredas | Litoral/baía → trilha → serra com mata fechada |
| Clima | Seca longa (maio–set) com queimadas; chuva forte no verão | Calor úmido o ano todo, chuva frequente, deslizamento em morro |
| Água | Córregos, veredas com buriti, cisterna e barraginha na seca | Rios de serra, cachoeiras, muita chuva para captar; mar = água salgada (não beber) |
| Frutas seguras | Pequi (cuidado com os espinhos do caroço), baru, cagaita, mangaba, buriti, araticum | Jabuticaba, pitanga, araçá, grumixama, cambuci, juçara (fruto), banana |
| Raízes e folhas | Mandioca mansa × brava (a brava é tóxica crua) | Taioba × "taioba-brava" e plantas parecidas (confusão comum e perigosa) |
| Pesca | Rio, covo de taquara | Rio e mar (linha, rede, siri na pedra) |
| Perigo extra | Queimada, desidratação na seca | Deslizamento, enchente, umidade (doenças de pele, mofo na comida) |
| Material | Pedra, argila do córrego, cupinzeiro (forno) | Pedra, argila, bambu (muito), cipó |

---

## 3. Árvore de tecnologia

Cada nó tem uma mini-aula e destrava os seguintes. Exemplo de corrente: **fogo → forno de barro → fundição → ferro → roda**.

### Era 0 — Identificação de risco
Sinais e notícias (fontes confiáveis × boatos) · Kit 72 h (água, comida, lanterna, rádio, remédios, documentos) · Dinheiro físico · Combustível · Estoque de água · Ponto de encontro e rota de fuga · Fugir de aglomerações · Auto-segurança (não expor estoque, andar em grupo, horários) · Perigo do monóxido de carbono · Cuidar de quem depende de energia (idosos, remédios na geladeira).

### Era 1 — Sobreviver
Mochila (peso × utilidade) · Abrigo (lona, folhas, local seco e alto) · Água (achar, filtrar com pano/areia/carvão, ferver) · Fogo (fricção, pederneira, lupa; manter e apagar) · Orientação (sol, sombra, estrelas, Cruzeiro do Sul) · Primeiros socorros (corte, queimadura, desidratação, picada) · Coleta segura (regra "não conhece, não come"; o conteúdo muda com o mapa — ver seção 2b) · Pesca (linha, anzol improvisado, covo) · Armadilhas simples de caça (para crianças: o bicho aparece capturado, sem cena gráfica).

### Era 2 — Pedra e madeira
Pedra lascada: machado, faca, lança · Cordas de fibra (embira e buriti no Cerrado; bananeira, embira e taboa no Rio) e cestos · Potes de barro · Plantar as primeiras sementes (milho, feijão, mandioca, abóbora) · Guardar comida (secar, salgar, defumar) · Banco de sementes.

### Era 3 — Metais
Achar minério · Carvoaria · Forno · Fundir cobre → bronze → ferro · Ferramentas melhores: enxada, serra, martelo · A roda: carrinho de mão e carroça · Clorador para a água do grupo.

### Era 4 — Agricultura e vila
Arado · Irrigação (barraginha, cisterna, canal) · Rotação de culturas e adubo (composteira, minhocário) · Criação de animais (galinhas, peixes no tanque) · Celeiro · Moinho · Saneamento (fossa biodigestora + jardim filtrante) · **Sisteminha** como meta da vila · No multijogador cada um assume uma função: agricultor, ferreiro, construtor ou **curandeiro** (primeiros socorros, ervas seguras, higiene e saneamento da vila).

### Era 5 — Segurança
Armadilhas de alarme (latas, cordão) · Cercas e cerca-viva espinhosa · Esconderijos (despensa escondida, sementes escondidas) · Torre de vigia e sinais entre o grupo · Armas caseiras **só como itens do jogo** (estilingue, arco, lança, escudo).
> Regra do conteúdo: o jogo ensina **defesa, discrição e prevenção**. As armas não têm instrução de fabricação real, nada de arma de fogo ou explosivo, e no jogo elas só **espantam** (o bot foge).

### Era 6 — Energia (final, aprovada)
Roda d'água, biodigestor (biogás), dínamo de bicicleta, painel solar resgatado. Final do jogo: **"reacender a vila"** — o grupo faz o *black start* da sua própria rede.

---

## 4. Bots

- Aparecem a partir da **Era 2** no Aprendizado e a partir do **Mês 1** no Apagão Real (quando há o que roubar).
- **80% amigáveis:** trocam itens (por valor), ficam amigos com presentes e ajuda, ensinam dicas, ajudam em tarefas e podem se juntar à vila.
- **20% agressivos:** chegam perto, empurram, roubam 1 item e fogem. Depois de 2 ou 3 contra-ataques (empurrão, estilingue, cão de guarda, armadilha de alarme) eles desistem e vão embora.
- Versão infantil: os agressivos são "trombadinhas" de desenho, e o roubo é tipo pega-pega.

---

## 5. Escolha de personagem e multijogador
- Usa o editor do motor (tipos, cabelo, cores, acessórios). Ideia: acessórios temáticos (mochila, chapéu de palha, lanterna de cabeça).
- Sem profissões iniciais: todo mundo começa igual. As funções (agricultor, ferreiro, construtor, curandeiro) só aparecem na Era 4.
- Sala de até 4. O host controla o mundo, os recursos e os bots. Chat só com frases prontas (ECA Digital), sem login.

---

## 6. Arquitetura

```
games/sobrevivencia/
  index.html, manifest.webmanifest, style.css
  main.js        menus, HUD, câmera, modos
  world.js       mapa: bairro + periferia + estrada + Cerrado (rio, mata, morro com minério)
  survival.js    barras (fome, sede, saúde, cansaço, higiene, ânimo), dia/noite, clima
  items.js       itens, receitas, inventário/mochila
  tech.js        árvore de tecnologia (dados) + desbloqueios
  lessons.js     mini-aulas e quizzes (PT/EN/ES)
  build.js       construir (abrigo, fogueira, forno, cerca, celeiro…)
  bots.js        bots amigáveis/agressivos, trocas, amizade
  timeline.js    eventos do Apagão Real
  strings.js     textos da interface
```
- Coisas que servirem para outros jogos (inventário, dia/noite, construção, NPC com diálogo) sobem depois para o `engine/`.
- Salva o progresso no aparelho (localStorage), sem dados pessoais.
- Celular fraco: árvores e pedras com *instancing*, mapa em blocos que carregam por perto.

---

## 7. Entregas (ordem decidida: Apagão Real primeiro)

### ✅ Capítulo 1 — As primeiras 72 horas (v0.1, feito)
- Começa 17:00 do Dia 0. Antes do apagão o tempo corre devagar (≈1 min real = 1 h): dá para sacar dinheiro, abastecer, encher água, comprar pilhas e carregar o celular.
- O apagão cai às 19:00 (Fácil) ou 18:24 (Difícil). Depois: 1 h de jogo ≈ 22 s (Fácil) / 16 s (Difícil). Dormir na cama pula a noite.
- Eventos: caixa eletrônico e bombas param; maquininha sem sinal (só dinheiro, preços sobem); multidão no mercado e na praça (empurrão, furto/"deixou cair"); gerador do vizinho na garagem (avisar = salva); sinal fraco em 4 h e nenhum em 8 h; mercado fecha em 10 h; Seu Zé (idoso) pede água; Dona Cida faz trocas; geladeira estraga em 24 h; água da rua para em 28 h (resta a caixa d'água); boletins de rádio da Defesa Civil.
- Fogão com acendedor elétrico precisa de fósforo; carvão dentro de casa = monóxido de carbono.
- 13 dicas "Por quê?" (mini-aulas) e livro de dicas. Nota final em 10 itens, com a explicação de cada um.
- Multijogador: o dono da sala controla o relógio; cada um tem a sua mochila.

### ✅ Modo Aprendizado — Era 0 e Era 1 (v0.2, feito)
- Acampamento-escola no Cerrado com a professora Iara, cidade-treino ao norte (Era 0) e mata, rio, remanso, vereda de buritis, morrinho, trilha de bicho e clareira das bandeiras ao sul (Era 1).
- Cada aula: 3 cartões → quiz de 2 perguntas (erro mostra a explicação) → desafio prático → desbloqueio. Árvore em 🌳. Arquivo `lessons.js` (conteúdo PT/EN/ES) e `learn.js` (mundo e regras). Entrada: `?modo=aprender` (`boot.js` escolhe o modo).
- Era 0 (10): sinais, kit 72 h, dinheiro vivo, combustível, estoque de água, ponto de encontro, aglomerações, auto-segurança, monóxido de carbono, cuidar de quem depende.
- Era 1 (9): mochila, fogo, água segura (filtrar + ferver), abrigo (lugar alto), orientação pelo sol, primeiros socorros, coleta segura do Cerrado, pesca (minijogo), arapuca (pega vivo; aviso da Lei 9.605/98).

### Próximas
| Fase | O que fica jogável |
|---|---|
| **Cap. 2** | Semana 1–2: crise de água e comida, ferver/filtrar, saneamento, bots aparecem |
| **Cap. 3** | Mês 1–2: saques, doenças, decidir sair da cidade |
| **Era 2** | Modo Aprendizado: pedra lascada, cordas, cestos, primeiras sementes |
| **A2** | Mapa do Rio (reaproveita a base) |

### Plano original (referência)
| Fase | O que fica jogável |
|---|---|
| **A** | Base: mapa de Goiânia, barras, mochila, coleta, construir fogueira/abrigo, dia/noite, sistema de aula+quiz, faixas de idade. Era 0 e Era 1 no Aprendizado |
| **A2** | Mapa do Rio (reaproveita a base; troca cenário, recursos e aulas da seção 2b) |
| **B** | Apagão Real: Dia 0 → Semana 2 (cidade) |
| **C** | Eras 2 e 3, bots 80/20, trocas |
| **D** | Era 4 (vila, Sisteminha), multijogador com funções |
| **E** | Era 5, Mês 1–6 do Apagão Real, Era 6 (Energia) |

---

## 8. Fontes
- EIS Council — Black Sky Hazards: https://eiscouncil.org/black-sky/
- UNDRR — Power outage/blackout (HIPs): https://www.undrr.org/understanding-disaster-risk/terminology/hips/tl0013
- Embrapa — Sisteminha: https://embrapa.br/sisteminha
- Embrapa Instrumentação — Fossa Séptica Biodigestora e Clorador (Documentos 72, 2021): https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/1138679
- Sebrae — Cartilha PAIS
