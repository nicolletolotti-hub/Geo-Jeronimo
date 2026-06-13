# GeoJeronimo - Anchored Summary

## Goal
Sistema de georreferenciamento e gestão de risco de inundações para São Jerônimo-RS. Cidadãos cadastram residências, agentes públicos fazem cadastro em campo, administradores aprovam agentes e coordenam evacuação. Backend: Node.js + PostgreSQL (Supabase) + Zod v4. Frontend: React + Vite + Leaflet.

## Progress

### 2026-06-12 (final) — Correções gerais

- **GeoJSON**: FloodMap agora tenta nível imediatamente inferior quando o arquivo exato não existe (fallback progressivo de 0.2 em 0.2m até 1m)
- **Dashboard**: Monitoramento Hidrológico mostra apenas São Jerônimo (removeu Rio Pardo, Dona Francisca, Cachoeira do Sul, Porto Alegre)
- **Histórico do rio corrigido**: `/river/current` salva nível no banco `river_levels` a cada leitura; `/river/history` tenta API da Defesa Civil, depois banco local (acumula dados ao longo do tempo)
- **APIs sem fallback falso**: river/current e weather/current retornam **503** quando dados estão indisponíveis (não mais dados fictícios)
- **CORS**: requisições sem `Origin` header são negadas (antes aceitava qualquer origem)
- **DB pools unificados**: `connection.js` deletado, `init.js` agora importa de `db.js`
- **Secrets removidas do código**: JWT não tem mais fallback 'your-secret-key'; DB password não tem mais fallback 'Xuxu1969.'
- **`backend/.env` não trackeado** pelo git (`.gitignore` o cobre, `git rm --cached` já executado)
- **Página 404** no frontend com link de volta ao Dashboard
- **Copyright dinâmico** no Layout (`new Date().getFullYear()`)
- **Arquivos de log** removidos do diretório

### 2026-06-12 Session

#### CitizenPortal - Novos campos de comorbidades e informações adicionais
- Formulário `ResidenceForm` atualizado com:
  - **Seção de Comorbidades**: 10 checkboxes visuais (respiratório, cardíaco, diabetes, renal/hemodiálise, neurológico, mobilidade reduzida, saúde mental, alergias, dependência de O₂, quimioterapia) com estilo toggle (âmbar quando ativo)
  - **Campo "Outras Comorbidades"**: textarea para observações adicionais mantido
  - **Seção "Contato e Informações Adicionais"**: grid com campos telefoneContato, telefoneEmergencia, medicamentosContinuos, abrigoPreferencial, pontosReferencia
  - **Checkboxes adicionais**: possuiVeiculo, possuiAnimaisGrandePorte, acessoSuperior, necessitaEnergia (estilo toggle azul)
  - **Estado inicial** (`formData`): todos os novos campos com valores padrão (false para booleans, '' para strings)
  - **Campos de grupos vulneráveis** (hasElderly, hasChildren, hasPregnant, hasDisabled) já existiam e foram mantidos
  - Checkboxes usam handler inline com `e.target.checked` (não o `handleChange` genérico, pois type='checkbox' retorna value='on')

#### ResidenceInfo - Exibição dos novos campos
- Seção de grupos vulneráveis: badges (sem emoji) com estilo azul/verde/rosa/roxo
- **Seção de comorbidades**: badges âmbar, visível apenas se alguma comorbidade estiver marcada
- Card "Outras Comorbidades": texto livre
- Cards "Telefone", "Telefone Emergência", "Medicamentos Contínuos", "Abrigo Preferencial", "Pontos de Referência"
- Card "Possui Veículo": badge azul
- Card "Depende de Energia Elétrica": destaque vermelho com alerta "prioridade no resgate"
- Cards de evacuação mantidos sem emojis

#### Frontend Validation Schema
- `ResidenceFormSchema` expandido no frontend com todos os novos campos:
  - Booleanos: hasElderly, hasChildren, hasPregnant, hasDisabled, comorbidade*, possuiVeiculo, possuiAnimaisGrandePorte, acessoSuperior, necessitaEnergia (todos `.optional().default(false)` via z.boolean().optional())
  - Strings: telefoneContato (max 30), telefoneEmergencia (max 30), medicamentosContinuos (max 255), abrigoPreferencial (max 255), pontosReferencia (max 255)

### 2026-06-12 (later) — AdminPanel: agent approval + Excel import + shelters

- **3 abrigos criados via API**: Exposição (Fátima), PDT (São Thomás), ULBRA Estacionamento (Fátima) com coordenadas geográficas
- **Aba "Agentes Pendentes"** no AdminPanel (visível apenas para admin):
  - Lista agentes com `agent_status = 'pending'` via `GET /auth/pending-agents`
  - Tabela com nome, email, telefone, área de atuação, data de cadastro
  - Botões Aprovar/Rejeitar que chamam `POST /auth/approve-agent`
  - Mensagens de feedback após ação
  - Aba oculta para usuários com role `agent` (só admin vê)
- **Aba "Importar Excel"** no AdminPanel (visível apenas para admin):
  - Upload de arquivo .xlsx com `POST /import/excel` (multipart/form-data)
  - Área de drop/click para selecionar arquivo
  - Feedback com número de residências importadas e usuários criados
  - **Tabela modelo** com 13 colunas esperadas pela planilha (address, neighborhood, residents, name, email, phone, hasElderly, hasChildren, hasPregnant, hasDisabled, evacuationLogistics, shelterPlan, floodLevel)
  - Instruções sobre booleanos (sim/s/true/1, não/nao/n/false/0)
  - **Histórico de importações** via `GET /import/logs` com data, quantidades, arquivo e responsável
- Build frontend verificado (npm run build) sem erros

### Before 2026-06-12

#### Server Stability
- Removido `process.exit(-1)` do `pool.on('error')` — servidor não morre ao perder conexão DB
- Adicionados `process.on('unhandledRejection')` e `process.on('uncaughtException')` com logging
- `logError()` convertido para rest params, mapeia objetos para .stack/.message, try-catch no appendFile
- Servidor iniciado via PowerShell `Start-Process -WindowStyle Hidden`

#### Zod v4 Compatibility
- `result.error.issues` ao invés de `result.error.errors` no `safeParse` (ambos os lados)
- Fallback: `result.error.issues || result.error.errors || []`

#### Welcome Banner
- `WelcomeBanner.jsx` — banner personalizado "Nicolle Tolotti Borges", links para cadastro e mapa, dismissível com localStorage
- Importado e renderizado no `Dashboard.jsx`

#### Database Migration (init.js)
- Expansion of `residences` table: telefone_contato, telefone_emergencia, possui_veiculo, possui_animais_grande_porte, acesso_superior, medicamentos_continuos, necessita_energia, abrigo_preferencial, pontos_referencia + 10 comorbidade_* boolean columns
- `users` table: agent_area, agent_status (pending/approved/rejected), agent_approved_by, agent_approved_at, phone
- `import_log` table added

#### Backend Routes
- `auth.js`: phone + agentArea in register; agent_status blocking login if pending; GET /pending-agents, GET /agents, POST /approve-agent, GET /me
- `residence.js`: Full CRUD with all new columns; GET /neighborhood-summary (grouped by bairro); GET /priority (urgency score ordering); DELETE /:id
- `import.js`: POST /excel (multer + xlsx, Portuguese header mapping, boolean/number parsing, auto user creation); GET /logs
- `validators.js`: ResidenceSchema expanded with ComorbidadesSchema + ContatoSchema; AgentApprovalSchema; ImportRowSchema

#### Technical Details
- Backend `.env` — DB_HOST=db.bhsabjzrecbqhjqjdtcp.supabase.co, DB_PASSWORD=Nair1234.nicolle
- Admin user: admin@geojeronimo.com / SuaSenha123 (role admin)
- Ports: backend 5000, frontend 3000 (Vite proxy)
- Zod v4 (4.4.3) on both ends
- All endpoints tested: health, login, residence CRUD, summary, priority, neighborhood-summary, import

## Key Files
| File | Purpose |
|------|---------|
| `backend/.env` | Credenciais, CORS, JWT_SECRET, OpenWeather |
| `backend/src/database/init.js` | Schema + migration completo |
| `backend/src/utils/validators.js` | Zod schemas (camelCase, backend) |
| `backend/src/routes/import.js` | Importação de Excel |
| `frontend/src/pages/CitizenPortal.jsx` | Formulário + exibição do cidadão |
| `frontend/src/utils/validation.js` | Zod schemas frontend |
| `frontend/src/components/WelcomeBanner.jsx` | Banner de boas-vindas |
| `ANCHORED.SUMMARY.md` | Este arquivo |
