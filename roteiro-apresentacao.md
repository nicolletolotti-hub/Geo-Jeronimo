# Roteiro de Apresentação — GeoJeronimo

> **Formato:** Gravação de tela com narração (áudio)
> **Duração estimada:** 8-12 minutos
> **Ferramenta sugerida:** Loom ou OBS Studio (tela inteira, sem câmera)
> **Pré-requisitos:** Site aberto no navegador, logado como admin

---

## Cena 1 — Tela Inicial e Nível do Rio (30s)

**Tela:** `https://geojeronimo.vercel.app/` (ou domínio do projeto)

**Narração:**
"Este é o GeoJeronimo, um sistema completo de monitoramento e alerta de cheias para a cidade de São Jerônimo, no Rio Grande do Sul. Nosso objetivo é proteger vidas e propriedades com informações em tempo real."

**Ações:**
- Mostrar a página inicial carregando
- Passar o mouse lentamente sobre a faixa superior:
  - Nível do Rio Jacuí (ex: 4.23m)
  - Tendência (↑ subindo / ↓ descendo / → estável)
  - Badge colorido: NORMAL (verde) / ALERTA (âmbar) / PERIGO (vermelho)
  - Temperatura, chuva da semana
- Rolar a página para baixo e mostrar o footer:
  - Contatos de emergência: Defesa Civil 199, Bombeiros 193, PM 190, SAMU 192
- Voltar ao topo

---

## Cena 2 — Menu de Navegação (15s)

**Tela:** `/mapa`

**Narração:**
"Temos três áreas principais: o Mapa de Inundação, que estamos vendo, o Painel do Morador, para cadastro de residências, e o Painel do Servidor, para a Defesa Civil gerenciar tudo."

**Ações:**
- Passar o mouse sobre os itens do menu: "Mapa de Inundação 🗺️", "Painel do Morador 👤", "Painel do Servidor ⚙️"
- Clicar em "Mapa de Inundação" para garantir que está no mapa

---

## Cena 3 — Slider de Nível da Inundação (1min)

**Tela:** `/mapa`, slider no canto direito

**Narração:**
"No canto direito temos um controle deslizante que simula o nível da inundação. Começa em 3 metros — que é o nível de alerta — e vai até 20 metros. Conforme a gente arrasta, as áreas alagadas aparecem em azul no mapa."

**Ações:**
- Arrastar o slider lentamente de 3m para 10m
- Mostrar a mancha azul crescendo
- Arrastar de volta para 6m
- Arrastar de novo para 15m mostrando a inundação máxima

"Você pode ver que o Porto do Conde, Bandeira Branca, Fátima, Cidade Baixa — os bairros mais baixos — são os primeiros a alagar. O sistema usa dados reais de topografia da cidade."

---

## Cena 4 — Botões Satélite / Rua / Topográfico (20s)

**Tela:** `/mapa`, botões no canto esquerdo

**Narração:**
"Dá pra alternar entre três estilos de mapa. Cada um é útil para uma análise diferente."

**Ações:**
- Clicar em "Satélite" (já está ativo)
- "Aqui temos a vista de satélite, ideal para ver a geografia real da região."
- Clicar em "Rua"
- "O mapa de ruas do OpenStreetMap, bom para referência urbana."
- Clicar em "Topográfico"
- "E o topográfico, que mostra curvas de nível — essencial para entender o relevo e por onde a água vai escoar."
- Voltar para "Satélite"

---

## Cena 5 — Navegação por Bairros com Zoom Suave (1min)

**Tela:** `/mapa`

**Narração:**
"A navegação é feita por bairros. Clico em um bairro e o mapa dá um zoom suave de 2 segundos e meio com uma animação muito agradável."

**Ações:**
- Clicar no bairro **Fátima** (região mais central, fácil de achar)
- Esperar a animação de zoom terminar
- Mostrar o bairro destacado em azul claro
- Passar o mouse sobre o bairro para ver o popup com o nome
- Clicar em **Limpar** (botão no painel direito)
- Clicar no bairro **Porto do Conde** (região ribeirinha)
- Mostrar o zoom de novo
- Clicar no bairro **Cidade Baixa**
- Clicar em "Limpar" para voltar à visão geral

"Perceba que o destaque azul mostra exatamente o perímetro do bairro selecionado. Isso ajuda o agente da Defesa Civil a focar nas áreas críticas."

---

## Cena 6 — Painel de Risco dos Bairros (30s)

**Tela:** `/mapa`, painel direito

**Narração:**
"O painel à direita mostra uma prévia do risco de cada bairro."

**Ações:**
- Mostrar o painel com os bairros listados
- Apontar os badges: CRÍTICO (vermelho), ALERTA (laranja), ATENÇÃO (âmbar), NORMAL (verde)
- Mostrar quantas ruas alagadas em cada um
- Clicar no bairro **Bandeira Branca** (CRÍTICO, 20 ruas)
- Mostrar o zoom

"Isso permite uma tomada de decisão rápida: quais bairros evacuar primeiro."

---

## Cena 7 — Camada de Ruas (1min30s)

**Tela:** `/mapa`, com um bairro selecionado

**Narração:**
"Agora vou ativar a camada de ruas. Isso mostra quais logradouros estão alagados e quais vão alagar se o rio subir mais meio metro."

**Ações:**
- Com **Bandeira Branca** selecionado ainda, ativar a chave **"Mostrar Ruas"**
- Mostrar as ruas vermelhas (alagadas) e laranja (alagariam com +50cm)
- Passar o mouse sobre uma rua vermelha para ver o popup com o nome
- "Ruas em vermelho estão alagadas agora. Em laranja vão alagar se o nível subir mais 50 centímetros."
- Passar o mouse sobre uma rua laranja

"Também podemos buscar ruas específicas."

**Ações:**
- Digitar "Pinheiro" no campo de busca de ruas
- Mostrar o resultado filtrado
- Limpar a busca
- Clicar em uma rua alagada para mostrar o popup fixo com status
- Clicar no "X" do popup para fechar
- Desativar "Mostrar Ruas"

---

## Cena 8 — Modo 3D e Giro Automático (1min)

**Tela:** `/mapa`

**Narração:**
"O mapa também suporta modo 3D com terreno. Isso dá uma perspectiva muito mais realista da cidade."

**Ações:**
- Clicar no botão **"3D OFF"** no canto superior direito
- Mostrar o mapa inclinando (pitch 50°)
- "O terreno fica tridimensional. Dá para ver os morros, as áreas baixas."
- Clicar em **"Girar ►"**
- Mostrar o mapa girando suavemente em volta da cidade
- "Esse giro automático é ótimo para apresentações e reuniões da Defesa Civil."
- Clicar em **"⏹ Parar"**
- Clicar em **"📍 Marcar"** e clicar em um ponto no mapa
- "Dá para marcar pontos de interesse também."
- Clicar em **"3D ON"** para desativar
- Mostrar o mapa voltando ao normal (pitch 0)

---

## Cena 9 — Painel do Cidadão: Cadastro de Residência (2min)

**Tela:** `/portal`

**Narração:**
"Agora vamos ao Portal do Cidadão. Aqui o morador cadastra sua residência para receber alertas personalizados."

**Ações:**
- Se não estiver logado: mostrar email/senha e fazer login rápido (já deixar logado)
- Mostrar a tela com o nível do rio
- Clicar em **"+ Cadastrar"**
- Preencher o formulário rapidamente:
  - **Rua:** "Rua Pinheiro Machado"
  - **Número:** "150"
  - **Bairro:** "Centro"
  - **Número de moradores:** "4"
  - Marcar **"Possui idoso"** e **"Possui criança"**
  - **Logística de evacuação:** "Veículo próprio"
  - **Plano de abrigo:** "Casa de parentes"
- Clicar no mapa para marcar a localização exata

"Ao clicar no mapa, o sistema calcula automaticamente o nível de inundação estimado para aquela localização."

- Mostrar o campo "Nível de inundação estimado" preenchendo automaticamente (ex: 7.2m)
- Mostrar o nível de alerta de evacuação calculado (ex: 6.2m)

"Pronto. Vou salvar."

- Clicar em **"Salvar"**
- Mostrar o banner verde:

**"Residência cadastrada com sucesso! Você receberá notificações no seu navegador sempre que o nível do rio representar risco para sua residência."**

"Isso significa que o GeoJeronimo vai monitorar o rio 24 horas por dia. Quando o nível chegar perigo, o morador recebe uma notificação no celular."

---

## Cena 10 — Mapa da Residência (20s)

**Tela:** `/portal`, seção abaixo do cadastro

**Narração:**
"Abaixo dos dados da residência, temos um mapa individual que mostra a localização do morador em relação às áreas de inundação."

**Ações:**
- Mostrar o ResidenceFloodMap com a residência marcada em vermelho
- O círculo de alerta ao redor
- Mostrar as informações de nível de inundação e evacuação

---

## Cena 11 — Notificações e Alertas Ativos (1min)

**Tela:** `/admin` (Painel do Servidor)

**Narração:**
"O sistema verifica o nível do rio automaticamente a cada 15 minutos. Vou mostrar como funciona."

**Ações:**
- Navegar para `/admin`
- Se pedir login: email `admin@geojeronimo.com` / senha (a que foi configurada)
- Mostrar o dashboard com visão geral
- Rolar para a seção **"Verificar Alertas Automáticos"**
- Clicar no botão **"🚨 Verificar e Gerar Alertas Automáticos"**
- Mostrar o resultado do alerta
- Navegar para a aba **"Alertas"** (se houver)
- Ou mostrar a seção de alertas ativos

"A cada 15 minutos, o sistema consulta a estação DCRS-00093 da Defesa Civil, que mede o nível do Rio Jacuí em São Jerônimo. Se alguma residência cadastrada tiver o nível de evacuação atingido, um alerta é gerado automaticamente."

---

## Cena 12 — Gerenciamento de Residências (1min)

**Tela:** `/admin`, aba Residências

**Narração:**
"No painel do servidor, o agente da Defesa Civil tem controle total sobre as residências cadastradas."

**Ações:**
- Clicar na aba **"Residências"** (se houver tabs) ou mostrar a lista
- Digitar "Pinheiro" na busca
- Mostrar os resultados filtrados
- Limpar a busca
- Rolar a lista de residências
- Mostrar os dados de cada uma: endereço, bairro, moradores, nível de inundação, status

"O agente pode editar cada residência, atualizar o status de evacuação, adicionar notas — tudo em tempo real."

---

## Cena 13 — Importar Planilha Excel (1min)

**Tela:** `/admin`, aba Importar

**Narração:**
"Para cadastro em massa, o sistema aceita planilhas Excel."

**Ações:**
- Navegar para a aba **"Importar Excel"**
- Mostrar o modelo de colunas aceitas (endereço, bairro, moradores, etc.)
- Mostrar o histórico de importações anteriores
- "O sistema valida automaticamente os cabeçalhos e cada linha da planilha, informando erros claros se alguma coluna obrigatória estiver faltando."

---

## Cena 14 — Exportar CSV (15s)

**Tela:** `/admin`, seção Exportar

**Narração:**
"Também podemos exportar todas as residências em CSV para análise em Excel ou compartilhamento com outros órgãos."

**Ações:**
- Clicar em **"Exportar CSV"**
- Mostrar o arquivo baixado

---

## Cena 15 — Abrigos e Rotas de Evacuação (30s)

**Tela:** `/admin`, abas Abrigos e Rotas

**Narração:**
"O sistema também gerencia abrigos e rotas de evacuação, permitindo planejar a logística de retirada da população."

**Ações:**
- Se houver aba específica, mostrar a lista de abrigos cadastrados
- Mostrar rotas de evacuação com nome e descrição

---

## Cena 16 — Instalar como Aplicativo (30s)

**Tela:** Qualquer página, com foco no menu

**Narração:**
"O GeoJeronimo pode ser instalado como aplicativo no celular ou computador. Basta clicar em 'Instalar App' no menu."

**Ações:**
- Passar o mouse sobre o botão **"Instalar App"** (verde, no menu)
- Mostrar que ao clicar, o navegador pergunta se quer instalar
- (opcional) Mostrar o app instalado na barra de tarefas / home screen

"Com o app instalado, as notificações funcionam mesmo com o navegador fechado — igual um aplicativo nativo."

---

## Cena 17 — Encerramento (20s)

**Tela:** `/mapa` visão geral

**Narração:**
"Este é o GeoJeronimo. Um sistema completo, gratuito e open source para proteção da população de São Jerônimo contra enchentes. Qualquer dúvida, entre em contato com a Defesa Civil pelos números 199 ou 193."

**Ação:**
- Mostrar o mapa com a visão geral da cidade
- Pausar por 2 segundos
- Finalizar

---

## Dicas de Gravação

1. **Antes de gravar:** Limpe o cache do navegador, feche abas desnecessárias
2. **Resolução:** Grave em 1080p (1920x1080) se possível
3. **Áudio:** Use um microfone razoável, fale pausadamente
4. **Errou?** Não pause — respire fundo e repita a frase. Depois edita cortando
5. **Editor grátis:** Clipchamp (Windows) ou CapCut (web/celular) para cortar partes
6. **Legendas:** O YouTube gera automaticamente se precisar
