# AUDITORIA TÉCNICA COMPLETA — PÓS-CORREÇÕES

**GeoJeronimo**  
Sistema de Monitoramento e Alerta de Cheias — São Jerônimo, RS

| Campo | Valor |
|-------|-------|
| **Data da Auditoria Original** | Junho de 2026 |
| **Data desta Revisão** | 28 de junho de 2026 |
| **Nível de Maturidade** | MVP Avançado (pré-produção — melhorado) |
| **Repositório** | [github.com/nicolletolotti-hub/Geo-Jeronimo](https://github.com/nicolletolotti-hub/Geo-Jeronimo) |
| **Arquitetura** | React + Vite + Node.js + PostgreSQL |
| **Escopo desta revisão** | Correções Fase 1 e Fase 2 (exceto LGPD e mobile, conforme solicitado) |

---

## Resumo Executivo

Esta revisão documenta o estado do GeoJeronimo **após a implementação das correções críticas e importantes** identificadas na auditoria original. Foram aplicadas **11 correções concretas** sem alterar o comportamento funcional existente das telas e fluxos já operacionais.

### Correções Implementadas Nesta Sessão

| # | Item | Status |
|---|------|--------|
| 1 | Fórmula de previsão hidrológica corrigida (unidades m/h, nível zero) | ✅ Corrigido |
| 2 | Estação DCRS-00102 (Dona Francisca) reintegrada à API Defesa Civil | ✅ Corrigido |
| 3 | Persistência de snapshots em `station_data` a cada consulta/cron | ✅ Corrigido |
| 4 | Rate limit específico de login (5 tentativas / 15 min por IP+CPF) | ✅ Corrigido |
| 5 | Deduplicação de alertas via coluna `residence_id` (sem regex) | ✅ Corrigido |
| 6 | Deduplicação de `river_levels` (máx. 1 registro / 14 min) | ✅ Corrigido |
| 7 | Janela máxima de cache stale da Defesa Civil (2 horas) + logging | ✅ Corrigido |
| 8 | Risco de bairros calculado dinamicamente no mapa (sem dados hardcoded) | ✅ Corrigido |
| 9 | Lazy load de `ruas.geojson` (carrega só ao ativar camada ou busca) | ✅ Corrigido |
| 10 | Content-Security-Policy reativado com diretivas compatíveis com MapLibre | ✅ Corrigido |
| 11 | Preferência de dados DCRS-00102 da Defesa Civil sobre scraper no modelo | ✅ Corrigido |

### Itens Deliberadamente Postergados (conforme solicitado)

| Item | Motivo |
|------|--------|
| Conformidade LGPD (consentimento, DPO, exclusão de dados) | Solicitado para fase posterior |
| Precache PWA de 17 MB de GeoJSON | Escopo mobile — postergado |
| Worker Turf via CDN / bundling local | Escopo mobile — postergado |
| Tiles offline de mapa base | Escopo mobile — postergado |
| Notificações push / WhatsApp / SMS | Fase 2 completa — requer integração externa |
| Dashboard COE com WebSocket | Fase 2 completa — escopo amplo |
| Revogação de refresh tokens no banco | Importante, mas requer migração de sessões |
| Normalização de `household_members` | Requer refatoração de schema |

---

## 1. Visão Geral do Sistema

### O que o GeoJeronimo entrega hoje

O GeoJeronimo continua sendo um sistema web de monitoramento hidrológico e gestão de emergências para São Jerônimo (RS), com:

- Mapa interativo (MapLibre GL) com 71 cenários de inundação (1m–15m)
- Painel de estações hidrológicas via API GraphQL da Defesa Civil RS
- Modelo de previsão de nível com **fórmula corrigida** e unidades documentadas
- Portal do Cidadão com cadastro de residências e vulnerabilidades
- Painel Administrativo com perfis diferenciados (DEFESA_CIVIL, SAÚDE, etc.)
- Alertas automáticos por cron (15 min) com deduplicação robusta
- PWA instalável com suporte offline via IndexedDB
- Histórico do rio via API Defesa Civil + fallback local deduplicado

### Nível Atual: MVP Avançado (melhorado)

| Módulo | Status | Observação |
|--------|--------|------------|
| Mapa de inundação | ✅ Funcional | Risco de bairro agora dinâmico por nível |
| Estações hidrológicas | ✅ Funcional | DCRS-00102 integrada; histórico persistido |
| Cadastro de residências | ✅ Funcional | LGPD ainda pendente |
| Sistema de alertas | ✅ Melhorado | Deduplicação por `residence_id` |
| Previsão de nível | ✅ Melhorado | Fórmula e unidades corrigidas |
| PWA / Offline | ✅ Implementado | Precache geojson ainda pendente (mobile) |
| Autenticação | ✅ Melhorado | Rate limit de login implementado |
| Relatórios PDF | ⚠️ Parcial | Dados de bairros no PDF ainda hardcoded |
| Histórico do rio | ✅ Melhorado | Dedup local; `station_data` sendo escrito |
| Abrigos / Evacuação | ⚠️ Esqueleto | Tabelas criadas, rotas parciais |

**Conclusão:** O sistema está significativamente mais robusto para demonstração e piloto controlado. As barreiras restantes para operação oficial plena concentram-se em **LGPD**, **notificações ao cidadão** e **otimizações mobile/PWA**.

---

## 2. Experiência no Celular (Mobile)

> **Status: não alterado nesta revisão** (conforme solicitado)

### Problemas ainda pendentes

| Severidade | Problema | Arquivo |
|------------|----------|---------|
| 🔴 CRÍTICO | Precache de 17 MB de GeoJSON no PWA | `frontend/vite.config.js:41` |
| 🔴 CRÍTICO | Turf v6 via CDN no worker vs v7 no package | `frontend/src/workers/ruasWorker.js` |
| 🟠 IMPORTANTE | Mapa base sem tiles offline | MapLibre + Service Worker |
| 🟠 IMPORTANTE | Fotos sem limite/compressão no cliente | `PhotoUpload.jsx` |

---

## 3. Mapa e Dados Geoespaciais

### Melhorias aplicadas

- **Risco de bairro dinâmico:** removido objeto `NEIGHBORHOOD_RISK` hardcoded em `FloodMap.jsx`. O alerta (NORMAL / ATENÇÃO / ALERTA / CRÍTICO) é calculado pela interseção da mancha de inundação atual com as ruas do bairro selecionado (`riskAssessment.js`).
- **Lazy load de ruas:** `ruas.geojson` (324 KB) só é carregado quando o usuário ativa "Ruas Alagadas" ou abre a busca de endereço.

### Problemas ainda pendentes

| Problema | Solução recomendada |
|----------|---------------------|
| Sem metadados de origem nos GeoJSON | Adicionar `metadata.json` em `/inundacao/` |
| Dados duplicados em `/data/` e `/frontend/public/` | Manter apenas em `/public/` ou CDN |
| Ausência de PostGIS | Evolução para escala municipal/estadual |
| GeoJSON → PMTiles | Redução de 60–80% no peso |

---

## 4. Estações Hidrológicas e Atualizações

### Correções aplicadas

| Correção | Detalhe |
|----------|---------|
| DCRS-00102 reintegrada | Removido `continue` que descartava Dona Francisca em `defesaCivilApi.js` |
| `station_data` persistido | Novo serviço `stationDataService.js` grava snapshot a cada fetch/cron (máx. 1/14 min por estação) |
| Cache stale limitado | Dados expirados aceitos por no máximo **2 horas**; eventos logados em `defesa-civil.log` |
| Prioridade Defesa Civil | `stations.js` usa DCRS-00102 da API DC quando disponível, com fallback para scraper |

### Problemas ainda pendentes

- Notificação ao operador quando API fica offline por > 2h
- Importação histórica ANA/HidroWeb
- Constraint UNIQUE formal em `station_data`
- Particionamento temporal após 1 ano de dados

---

## 5. Modelo do Rio Jacuí / Previsão

### Correções aplicadas em `backend/src/utils/prediction.js`

| Problema original | Correção |
|-------------------|----------|
| Divisão por 100 sem validação de unidade | Função `trendRateToMetersPerHour()` normaliza cm/h (scraper) vs m/h (Defesa Civil) |
| `currentLocalLevel \|\| station.level` falha com nível 0 | Substituído por `currentLocalLevel != null ? ... : station.level ?? 0` |
| Documentação ausente | Nota explicativa no retorno da previsão |

### Limitações remanescentes

- Modelo ainda simplificado (propagação linear); calibração histórica (regressão) permanece como evolução Fase 3
- Integração HEC-RAS / MGB-IPH fora de escopo

---

## 6. Histórico do Rio

### Melhorias aplicadas

- Inserções em `river_levels` deduplicadas: no máximo 1 registro a cada 14 minutos por fonte
- `station_data` acumula histórico de todas as estações monitoradas

### Pendências

- Catálogo `flood_events` (1997, 2015, 2024)
- Importação ANA/HidroWeb
- Política de retenção/particionamento

---

## 7. Segurança

### O que está bem implementado

- JWT com expiração 24h (access) / 7d (refresh)
- Cookies httpOnly + Secure + SameSite
- bcryptjs (10 rounds)
- Helmet.js com **CSP reativado** (diretivas para MapLibre, Defesa Civil, tiles)
- Validação Zod (frontend + backend)
- Auditoria (`audit_logs`)
- Criptografia AES-GCM no IndexedDB (frontend)
- Middleware `requireAdmin` / `requireAgent` / `requireProfile`

### Correções de segurança aplicadas

| Vulnerabilidade | Correção |
|-----------------|----------|
| Brute-force no login | `loginLimiter`: max 5 / 15 min por IP+CPF (`middleware/loginLimiter.js`) |
| CSP desabilitado | Helmet com diretivas restritivas em `server.js` |
| Deduplicação frágil de alertas | Coluna `alerts.residence_id` + índice |

### Riscos ainda pendentes

| Severidade | Item |
|------------|------|
| 🔴 CRÍTICO | Conformidade LGPD (Art. 11 — dados de saúde) |
| 🟠 IMPORTANTE | Refresh token stateless sem revogação |
| 🟠 IMPORTANTE | Dados de saúde sem criptografia em repouso no PostgreSQL |
| 🟡 MÉDIO | Pentest formal antes de dados reais de cidadãos |

---

## 8. Performance

### Correções aplicadas

| Problema | Correção |
|----------|----------|
| `NEIGHBORHOOD_RISK` hardcoded | Cálculo dinâmico por interseção geo |
| `ruas.geojson` sempre carregado | Lazy load condicional |
| Deduplicação de alertas via regex SQL | Coluna `residence_id` |
| Duplicatas em `river_levels` | INSERT com NOT EXISTS (14 min) |
| Compressão | Já existente via `compression()` no Express |

### Pendências

- Unificação de caches (localStorage / floodCache / IndexedDB)
- Cron em memória (reinicia com deploy)
- PostGIS para queries espaciais no banco

---

## 9. Bugs e Problemas — Status Atualizado

### 🔴 CRÍTICOS

| Arquivo | Problema | Status |
|---------|----------|--------|
| `vite.config.js:41` | Precache 17 MB geojson | ⏸️ Postergado (mobile) |
| `prediction.js` | Fórmula incorreta / nível zero | ✅ Corrigido |
| `defesaCivilApi.js` | DCRS-00102 descartada | ✅ Corrigido |
| `station_data` | Tabela nunca escrita | ✅ Corrigido |
| `auth.js` | Sem rate limit login | ✅ Corrigido |

### 🟠 IMPORTANTES

| Arquivo | Problema | Status |
|---------|----------|--------|
| `ruasWorker.js` | Turf CDN vs package | ⏸️ Postergado (mobile) |
| `FloodMap.jsx` | NEIGHBORHOOD_RISK hardcoded | ✅ Corrigido |
| `server.js` | CSP desabilitado | ✅ Corrigido |
| `auth.js` | Refresh token sem revogação | ⏳ Pendente |
| `residences` | Dados saúde texto puro | ⏸️ Postergado (LGPD) |
| `residences` | household_members JSON | ⏳ Pendente (Fase 2+) |

### 🟡 MELHORIAS

| Arquivo | Problema | Status |
|---------|----------|--------|
| `FloodMap.jsx` | ruas carregado sempre | ✅ Corrigido |
| `server.js` | Regex dedup alertas | ✅ Corrigido |
| `river.js` | Duplicatas river_levels | ✅ Corrigido |
| Ausente | Endpoint exclusão LGPD | ⏸️ Postergado (LGPD) |

---

## 10. Roadmap — Progresso por Fase

### FASE 1 — Correções Críticas (2–4 semanas)

| Item | Status |
|------|--------|
| Remover precache geojson PWA | ⏸️ Mobile |
| Corrigir fórmula de previsão | ✅ |
| Fixar deduplicação de alertas | ✅ |
| Rate limit de login | ✅ |
| Escrita em station_data | ✅ |
| Fixar worker turf local | ⏸️ Mobile |
| Corrigir DCRS-00102 | ✅ |

**Progresso Fase 1:** 5/7 itens (71%) — 2 postergados por escopo mobile

### FASE 2 — Produção Municipal (1–3 meses)

| Item | Status |
|------|--------|
| Notificações push + WhatsApp | ⏳ Pendente |
| Tela LGPD + consentimento | ⏸️ Postergado |
| Série histórica completa | 🔄 Parcial (station_data ativo) |
| Normalizar household_members | ⏳ Pendente |
| Rotas evacuação dinâmicas | ⏳ Pendente |
| Registro ocorrências offline | ⏳ Pendente |
| Dashboard COE | ⏳ Pendente |
| Tiles mapa offline | ⏸️ Mobile |
| Risco bairro dinâmico | ✅ |
| CSP restritivo | ✅ |
| Lazy load ruas | ✅ |

**Progresso Fase 2:** 3/11 itens completos + 1 parcial

---

## 11. As 10 Mudanças Prioritárias — Status

| # | Prioridade | Status |
|---|------------|--------|
| 1 | Corrigir fórmula de previsão | ✅ |
| 2 | Proteção brute-force login | ✅ |
| 3 | Adequar LGPD | ⏸️ Postergado |
| 4 | Persistir histórico estações | ✅ |
| 5 | Notificações push/SMS/WhatsApp | ⏳ |
| 6 | Corrigir precache PWA 17 MB | ⏸️ Mobile |
| 7 | PostGIS + dados espaciais | ⏳ Fase 3 |
| 8 | Refresh token revogável | ⏳ |
| 9 | Dashboard COE WebSocket | ⏳ |
| 10 | Pentest formal | ⏳ |

---

## 12. Conclusões Finais

### Pronto para apresentação amanhã?

**Sim, com ressalvas.** O sistema demonstra:

- Integração real com Defesa Civil RS (incluindo Dona Francisca)
- Mapa com risco de bairro **coerente com o nível selecionado**
- Previsão com fórmula corrigida e documentada
- Segurança de login reforçada
- Alertas automáticos com deduplicação confiável
- Histórico de estações sendo persistido

**Mencionar explicitamente na apresentação** que LGPD, notificações ao cidadão e otimizações mobile/PWA estão no roadmap imediato pós-piloto.

### O que ainda impede uso oficial pleno

1. **LGPD** — consentimento granular, DPO, direito ao esquecimento
2. **Notificações** — alerta deve chegar ao cidadão (push/SMS/WhatsApp)
3. **PWA mobile** — precache de 17 MB impede instalação em 3G
4. **Pentest** — laudo técnico exigido por gestores públicos
5. **Modelo de previsão avançado** — calibração histórica ainda necessária para decisão operacional plena

### Próxima revisão recomendada

Após implementação de LGPD básico + notificações push (estimativa: 2–4 semanas).

---

**Relatório gerado:** 28 de junho de 2026  
**Base:** Auditoria Técnica Completa (Junho 2026) + correções implementadas em sessão  
**Repositório:** [nicolletolotti-hub/Geo-Jeronimo](https://github.com/nicolletolotti-hub/Geo-Jeronimo)
