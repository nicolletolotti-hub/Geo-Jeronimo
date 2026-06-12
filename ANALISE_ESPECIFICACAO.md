# Análise Comparativa - GeoJeronimo
## Especificação vs Implementação Atual

**Data da Análise:** Junho 2026  
**Analista:** Cascade AI  
**Status:** Projeto parcialmente implementado - ~40% da especificação

---

## Resumo Executivo

O projeto GeoJeronimo atual possui uma base técnica sólida com arquitetura moderna (React 18, Node.js, PostgreSQL), mas **apenas ~40% das funcionalidades descritas na especificação foram implementadas**. O sistema funciona como um MVP de monitoramento de cheias, mas falta implementar os recursos centrais de cadastro populacional detalhado, simulação territorial preditiva e integração multi-institucional.

**Principais Lacunas:**
- Cadastro de cidadão incompleto (falta campos demográficos críticos)
- Sem posicionamento geográfico da residência no mapa
- Sem cruzamento automático de dados geográficos
- Sistema de alertas não é preventivo/personalizado
- Sem módulos específicos para Saúde e Assistência Social
- Sistema não é configurável para outros municípios

---

## Comparação Detalhada

### 1. Etapa 1 - Cadastro do Cidadão

#### Especificado:
- Localização exata da residência
- Quantidade de moradores
- Existência de idosos
- Existência de crianças
- Existência de pessoas com mobilidade reduzida ou comorbidades
- Presença de animais domésticos
- Necessidade de apoio logístico
- Existência ou não de local seguro para deslocamento

#### Implementado:
✅ **Parcialmente Implementado** em `frontend/src/pages/CitizenPortal.jsx`

**O que existe:**
- Nome, email, senha (autenticação)
- Endereço completo
- Bairro
- Quantidade de moradores (1-20)
- Comorbidades (campo texto livre)
- Pets (campo texto livre)
- Logística de evacuação (boat/vehicle/truck)
- Plano de abrigo (relatives/public_shelter/hotel/other)
- Pedido de auxílio preventivo (campo texto livre)

**O que falta:**
❌ Campo específico para **idosos** (idade > 60)
❌ Campo específico para **crianças** (idade < 12)
❌ Campo específico para **gestantes**
❌ Campo específico para **pessoas com mobilidade reduzida** (cadeira de rodas, etc)
❌ Campo específico para **pessoas com deficiência**
❌ Detalhamento de comorbidades (diabetes, hipertensão, etc - atualmente é texto livre)
❌ Detalhamento de pets (quantidade, porte, espécie - atualmente é texto livre)
❌ **Latitude e longitude** não são capturadas no formulário
❌ **Posicionamento no mapa** - usuário não seleciona localização visualmente

**Arquivo:** `frontend/src/pages/CitizenPortal.jsx` (linhas 373-585)

---

### 2. Etapa 2 - Posicionamento da Residência no Mapa

#### Especificado:
- Posicionamento visual da residência no mapa
- Integração com dados territoriais

#### Implementado:
❌ **NÃO IMPLEMENTADO**

**O que existe:**
- Mapa de inundação interativo em `FloodMap.jsx`
- Componente `LeafletMap.jsx` com capacidade de mostrar marcadores
- Dados geoespaciais de bairros, ruas e limites municipais

**O que falta:**
❌ No formulário de cadastro de residência, não há mapa para selecionar localização
❌ Latitude/longitude são campos opcionais mas não há interface visual para capturá-los
❌ Não há geocodificação automática do endereço
❌ Não há validação se a residência está dentro dos limites do município

**Arquivos:**
- `frontend/src/pages/CitizenPortal.jsx` - formulário sem mapa
- `frontend/src/pages/FloodMap.jsx` - mapa existe mas não integrado ao cadastro
- `frontend/src/components/LeafletMap.jsx` - componente de mapa disponível

---

### 3. Etapa 3 - Registro das Características Familiares

#### Especificado:
- Registro detalhado de composição familiar
- Identificação de vulnerabilidades específicas

#### Implementado:
✅ **PARCIALMENTE IMPLEMENTADO**

**O que existe:**
- Quantidade de moradores (número total)
- Comorbidades (texto livre)
- Pets (texto livre)
- Logística de evacuação
- Plano de abrigo

**O que falta:**
❌ **Composição familiar detalhada** - apenas número total, não há breakdown por idade/gênero
❌ **Classificação de vulnerabilidade** - não há sistema que classifique famílias como "alta prioridade" baseado em idosos/crianças/deficiência
❌ **Validação de rede de apoio** - não há verificação se família tem local seguro
❌ **Histórico de desastres anteriores** - não há registro se família foi afetada antes

**Arquivo:** `frontend/src/pages/CitizenPortal.jsx` (linhas 373-585)

---

### 4. Etapa 4 - Cruzamento Automático com Dados Geográficos e Previsões

#### Especificado:
- Cruzamento automático entre dados cadastrais e mapas de inundação
- Identificação de quais residências serão afetadas conforme nível do rio
- Sistema preditivo baseado em monitoramento hidrológico

#### Implementado:
❌ **NÃO IMPLEMENTADO**

**O que existe:**
- Mapas de inundação para diferentes níveis (1m-15m) em formato GeoJSON
- Nível atual do rio via API Open-Meteo
- Slider de simulação manual em `FloodMap.jsx`

**O que falta:**
❌ **Cruzamento automático** - não há lógica que verifique automaticamente se uma residência cadastrada será afetada
❌ **Cálculo de risco individual** - cada residência tem campo `flood_level` mas não é calculado automaticamente baseado em latitude/longitude
❌ **Alerta personalizado** - o portal do cidadão mostra nível do rio mas não diz "SUA residência será afetada em X metros"
❌ **Integração em tempo real** - quando o rio sobe, não há notificação automática para residências em risco
❌ **Modelo preditivo** - não há previsão de quando o rio atingirá determinado nível

**Arquivos:**
- `frontend/src/pages/CitizenPortal.jsx` - mostra nível do rio mas não cruzamento
- `frontend/src/pages/FloodMap.jsx` - simulação manual apenas
- `backend/src/routes/residence.js` - não há lógica de cálculo de risco

---

### 5. Etapa 5 - Emissão de Alertas Preventivos

#### Especificado:
- Emissão de alertas preventivos com antecedência
- Auxílio ao munícipe caso necessite tomar atitude
- Personalização baseada em perfil de risco

#### Implementado:
❌ **PARCIALMENTE IMPLEMENTADO**

**O que existe:**
- Sistema de alertas em `backend/src/routes/alerts.js`
- Feed de alertas no Dashboard
- Alertas podem ser criados por admin
- Alertas têm tipo, título, mensagem, fonte

**O que falta:**
❌ **Alertas automáticos** - não há geração automática de alertas quando o rio atinge determinado nível
❌ **Alertas personalizados** - não há envio de alertas específicos para cada residência baseado em seu risco
❌ **Notificações push** - não implementado (botão existe no AdminPanel mas não funcional)
❌ **SMS/WhatsApp** - não há integração para envio de mensagens
❌ **Email** - não há envio de emails automáticos
❌ **Graduação de alerta** - não há diferenciação entre alerta informativo, aviso, emergência
❌ **Antecedência** - não há sistema de previsão para emitir alertas antes do evento

**Arquivos:**
- `backend/src/routes/alerts.js` - sistema básico de alertas
- `frontend/src/pages/AdminPanel.jsx` - botão de notificação não funcional (linha 258)
- `frontend/src/components/Dashboard/AlertsFeed.jsx` - exibe alertas

---

### 6. Etapa 6 - Apoio à Tomada de Decisão pelos Órgãos Responsáveis

#### Especificado:
- Painel estratégico para Defesa Civil
- Identificação antecipada de famílias em risco
- Planejamento de evacuações
- Gestão de recursos e equipes
- Mapeamento de demandas específicas
- Priorização de atendimentos

#### Implementado:
✅ **PARCIALMENTE IMPLEMENTADO**

**O que existe:**
- Painel administrativo em `AdminPanel.jsx`
- Estatísticas básicas (total residências, precisam de barco, comorbidades, alto risco)
- Filtros (todos, precisam de barco, com comorbidades, alto risco)
- Tabela de residências com dados básicos
- Botões de exportação (CSV, PDF, notificação) - **não funcionais**

**O que falta:**
❌ **Dados reais** - AdminPanel usa dados mockados (useState com array fixo, linhas 30-67)
❌ **Integração com API** - não há fetch para `/residence/all` no AdminPanel
❌ **Mapa estratégico** - não há visualização geográfica das residências em risco
❌ **Planejamento de evacuações** - não há ferramenta para planejar rotas ou pontos de encontro
❌ **Gestão de recursos** - não há controle de equipes, barcos, caminhões, abrigos
❌ **Priorização dinâmica** - não há sistema que ordene residências por urgência baseado em nível do rio atual
❌ **Exportação funcional** - botões de CSV/PDF não implementados
❌ **Notificação em massa** - botão de notificação push não funcional

**Arquivo:** `frontend/src/pages/AdminPanel.jsx` (linhas 28-264)

---

## Benefícios Especificados vs Implementados

### Para a População

#### Especificado:
- Acompanhamento da situação da própria residência
- Visualização de cenários de risco
- Recebimento de alertas preventivos
- Planejamento antecipado da evacuação
- Maior segurança para famílias e animais domésticos

#### Implementado:
✅ **PARCIALMENTE** (30%)

**O que existe:**
- Nível atual do rio no Portal do Cidadão
- Simulação de cenários no FloodMap (manual)
- Feed de alertas no Dashboard

**O que falta:**
❌ Acompanhamento da situação da PRÓPRIA residência (não há cruzamento)
❌ Alertas preventivos personalizados
❌ Planejamento de evacuação (não há ferramenta)
❌ Informações específicas sobre animais domésticos

---

### Para a Defesa Civil

#### Especificado:
- Identificação antecipada de famílias em risco
- Planejamento de evacuações
- Gestão de recursos e equipes
- Mapeamento de demandas específicas
- Priorização de atendimentos

#### Implementado:
✅ **PARCIALMENTE** (40%)

**O que existe:**
- Lista de residências (mas com dados mockados)
- Filtros básicos
- Estatísticas simples

**O que falta:**
❌ Identificação antecipada (não há sistema preditivo)
❌ Planejamento de evacuações (não há ferramenta)
❌ Gestão de recursos/equipes
❌ Mapeamento geográfico de demandas
❌ Sistema de priorização dinâmico

---

### Para a Saúde

#### Especificado:
- Identificação de populações vulneráveis
- Planejamento de ações preventivas
- Continuidade do cuidado em situações de emergência
- Apoio à organização da rede assistencial

#### Implementado:
❌ **NÃO IMPLEMENTADO** (0%)

**O que existe:**
- Campo "comorbidities" no cadastro (texto livre)

**O que falta:**
❌ Módulo específico para Saúde
❌ Identificação de populações vulneráveis (idosos, gestantes, crônicos)
❌ Planejamento de ações preventivas
❌ Integração com unidades de saúde
❌ Sistema de continuidade do cuidado
❌ Organização da rede assistencial

---

### Para a Assistência Social

#### Especificado:
- Identificação de famílias sem rede de apoio
- Planejamento de acolhimento
- Organização de benefícios eventuais
- Gestão de demandas emergenciais

#### Implementado:
❌ **NÃO IMPLEMENTADO** (0%)

**O que existe:**
- Campo "shelter_plan" no cadastro

**O que falta:**
❌ Módulo específico para Assistência Social
❌ Identificação de famílias sem rede de apoio
❌ Planejamento de acolhimento
❌ Sistema de benefícios eventuais
❌ Gestão de demandas emergenciais
❌ Integração com CRAS/CREAS

---

## Funcionalidades Técnicas Especificadas vs Implementadas

### Sistema de Simulação Territorial

#### Especificado:
- Desenvolvido a partir de análise de mapas topográficos
- Modelos digitais de elevação
- Informações de relevo
- Geração de manchas de inundação simuladas
- Identificação de áreas atingidas conforme elevação do nível dos rios

#### Implementado:
✅ **PARCIALMENTE** (60%)

**O que existe:**
- Mapas de inundação GeoJSON para níveis 1m-15m
- Simulação manual via slider em FloodMap.jsx
- Dados de bairros, ruas e limites municipais

**O que falta:**
❌ **Modelo digital de elevação real** - os GeoJSON são pré-processados, não gerados dinamicamente
❌ **Cálculo automático** - não há algoritmo que gere manchas de inundação baseado em DEM
❌ **Integração com dados oficiais** - não há integração com CPRM/ANA para dados topográficos
❌ **Atualização dinâmica** - mapas são estáticos, não recalculados com novos dados

**Arquivos:**
- `frontend/src/pages/FloodMap.jsx` - simulação manual
- Dados em `/inundacao/flood_*m_clean.geojson` - mapas estáticos

---

### Integração com Monitoramento Hidrológico em Tempo Real

#### Especificado:
- Integração aos dados de monitoramento hidrológico em tempo real
- Acompanhamento da evolução dos cenários de risco
- Antecipação de possíveis impactos à população

#### Implementado:
✅ **PARCIALMENTE** (50%)

**O que existe:**
- Integração com Open-Meteo Flood API em `river.js`
- Nível atual do rio
- Histórico de níveis
- Tendência (rising/falling/stable)
- Fallback para banco de dados se API falhar

**O que falta:**
❌ **Dados oficiais ANA/CPRM** - usa Open-Meteo que não é dado oficial brasileiro
❌ **Previsão de níveis futuros** - não há previsão de quando o rio atingirá determinada cota
❌ **Integração com múltiplas estações** - apenas uma coordenada fixa
❌ **Alertas automáticos** - quando nível sobe, não há geração automática de alertas
❌ **Evolução de cenários** - não há projeção de cenários futuros

**Arquivo:** `backend/src/routes/river.js` (linhas 64-185)

---

### Expansão para Outros Municípios

#### Especificado:
- Concebido para permitir expansão
- Qualquer município possa aderir à plataforma
- Realizar configuração local
- Disponibilizar a ferramenta para seus cidadãos
- Rede integrada de apoio à gestão de riscos

#### Implementado:
❌ **NÃO IMPLEMENTADO** (0%)

**O que existe:**
- Nada

**O que falta:**
❌ **Sistema multi-tenant** - não há suporte a múltiplos municípios
❌ **Configuração por município** - coordenadas, limites, bairros estão hard-coded
❌ **Administração municipal** - não há painel para configurar novo município
❌ **Dados geoespaciais configuráveis** - GeoJSONs são específicos de São Jerônimo
❌ **Isolamento de dados** - não há separação de dados por município
❌ **Rede integrada** - não há comunicação entre instâncias de diferentes municípios

---

## Estrutura de Banco de Dados

### Especificado (implícito):
- Tabela de usuários com dados demográficos detalhados
- Tabela de residências com localização geográfica precisa
- Tabela de características familiares
- Tabela de alertas personalizados
- Tabela de recursos (equipes, abrigos, veículos)
- Tabela de eventos de desastre

### Implementado:
✅ **PARCIALMENTE** (40%)

**O que existe:**
```sql
-- users
- id, email, password, name, role, created_at, updated_at

-- residences
- id, user_id, address, neighborhood, residents, comorbidities, pets,
  evacuation_logistics, shelter_plan, preventive_aid, flood_level,
  latitude, longitude, created_at, updated_at

-- river_levels
- id, level, timestamp, source

-- alerts
- id, type, title, message, source, created_at, is_active
```

**O que falta:**
❌ **Campos demográficos detalhados** em users (idade, gênero, deficiência)
❌ **Tabela de composição familiar** (membros individuais com idade/vulnerabilidade)
❌ **Tabela de recursos** (equipes, barcos, caminhões, abrigos, suprimentos)
❌ **Tabela de eventos de desastre** (histórico de enchentes, impactos)
❌ **Tabela de configuração municipal** (para multi-tenancy)
❌ **Tabela de notificações** (rastreamento de alertas enviados)
❌ **Tabela de integrações** (Saúde, Assistência Social, Defesa Civil)
❌ **Índices geoespaciais** para queries espaciais eficientes

**Arquivo:** `backend/src/database/init.js`

---

## Problemas Críticos Identificados

### 1. AdminPanel com Dados Mockados
**Arquivo:** `frontend/src/pages/AdminPanel.jsx` (linhas 30-67)  
**Problema:** Dados são hard-coded em useState, não busca da API  
**Impacto:** Painel administrativo não funciona em produção  
**Severidade:** 🔴 CRÍTICO

### 2. Cadastro de Residência sem Mapa
**Arquivo:** `frontend/src/pages/CitizenPortal.jsx` (linhas 373-585)  
**Problema:** Não há mapa para selecionar localização da residência  
**Impacto:** Latitude/longitude não são capturados corretamente  
**Severidade:** 🔴 CRÍTICO

### 3. Sem Cruzamento Automático de Risco
**Problema:** Não há lógica que calcule automaticamente se uma residência será afetada  
**Impacto:** Funcionalidade central do sistema não implementada  
**Severidade:** 🔴 CRÍTICO

### 4. Sem Alertas Automáticos
**Problema:** Alertas são criados manualmente por admin, não gerados automaticamente  
**Impacto:** Sistema não é preventivo como especificado  
**Severidade:** 🔴 CRÍTICO

### 5. Sem Módulos de Saúde e Assistência Social
**Problema:** Não há funcionalidades específicas para esses órgãos  
**Impacto:** Benefícios especificados não implementados  
**Severidade:** 🟠 ALTO

### 6. Sistema Não Multi-tenant
**Problema:** Hard-coded para São Jerônimo, não configurável para outros municípios  
**Impacto:** Visão de expansão não implementada  
**Severidade:** 🟠 ALTO

### 7. Campos Demográficos Incompletos
**Problema:** Faltam campos específicos para idosos, crianças, gestantes, deficiência  
**Impacto:** Não é possível identificar populações vulneráveis adequadamente  
**Severidade:** 🟠 ALTO

---

## Plano de Implementação Prioritário

### Fase 1 - Crítico (1-2 semanas)
1. **Integrar AdminPanel com API real**
   - Remover dados mockados
   - Implementar fetch de `/residence/all`
   - Adicionar paginação funcional

2. **Adicionar mapa ao cadastro de residência**
   - Integrar LeafletMap no formulário
   - Capturar latitude/longitude via clique no mapa
   - Geocodificar endereço automaticamente

3. **Implementar cruzamento automático de risco**
   - Criar função que verifique se ponto está dentro de polígono de inundação
   - Calcular flood_level automaticamente baseado em lat/long
   - Atualizar campo quando nível do rio muda

4. **Implementar alertas automáticos**
   - Criar job que verifique nível do rio periodicamente
   - Gerar alertas automaticamente quando atingir níveis críticos
   - Enviar notificações para residências em risco

### Fase 2 - Alto (3-4 semanas)
5. **Expandir campos demográficos**
   - Adicionar campos: idosos, crianças, gestantes, deficiência
   - Criar tabela de composição familiar
   - Implementar classificação de vulnerabilidade

6. **Criar módulo de Saúde**
   - Painel específico para profissionais de saúde
   - Identificação de populações vulneráveis
   - Integração com unidades de saúde

7. **Criar módulo de Assistência Social**
   - Painel específico para assistentes sociais
   - Identificação de famílias sem rede de apoio
   - Sistema de benefícios eventuais

8. **Implementar exportação funcional**
   - Exportar CSV de residências
   - Exportar PDF de relatórios
   - Implementar notificação push

### Fase 3 - Médio (5-8 semanas)
9. **Sistema multi-tenant**
   - Criar tabela de configuração municipal
   - Implementar seleção de município
   - Isolar dados por município
   - Painel de configuração para novos municípios

10. **Planejamento de evacuações**
    - Ferramenta para planejar rotas de evacuação
    - Definir pontos de encontro
    - Alocar recursos (barcos, caminhões)
    - Simular cenários de evacuação

11. **Integração com dados oficiais**
    - Integrar com ANA/CPRM para dados hidrológicos
    - Integrar com INMET para dados meteorológicos
    - Implementar previsão de níveis futuros

---

## Conclusão

O projeto GeoJeronimo atual é um **MVP funcional de monitoramento de cheias** com boa base técnica, mas está longe de ser a plataforma completa descrita na especificação. As funcionalidades centrais de **cadastro populacional detalhado, simulação territorial preditiva e integração multi-institucional** não foram implementadas.

Para atingir a visão apresentada no documento, é necessário:
- **Expandir significativamente o cadastro de cidadãos** (campos demográficos, mapa)
- **Implementar cruzamento automático de dados geográficos**
- **Criar sistema de alertas preventivos personalizados**
- **Desenvolver módulos específicos para Saúde e Assistência Social**
- **Tornar o sistema configurável para múltiplos municípios**

**Estimativa de esforço:** 3-4 meses de desenvolvimento com equipe de 2-3 desenvolvedores para implementar todas as funcionalidades especificadas.

---

**Documentos Referência:**
- Especificação original (fornecida pelo usuário)
- `AUDITORIA_TECNICA.md` - problemas técnicos identificados
- `IMPLEMENTACAO.md` - correções já implementadas
- `ARQUITETURA.md` - arquitetura do sistema
