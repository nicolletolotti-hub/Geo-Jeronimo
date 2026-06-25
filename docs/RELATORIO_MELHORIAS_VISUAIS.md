# Relatório de Melhorias Visuais — GeoJeronimo Frontend

**Data:** 25/06/2026
**Escopo:** Auditoria visual completa do frontend em `frontend/src/`
**Stack:** React + Tailwind CSS + MapLibre

---

## 1. Resumo do Estado Atual

O frontend do GeoJeronimo possui uma base sólida com design system escuro (dark theme), uso consistente de Tailwind CSS, e componentes UI reutilizáveis (`Button`, `Card`, `Badge`, `EmptyState`, `LoadingSkeleton`, `Toast`). A aplicação cobre mapas de inundação, painel administrativo e portal do cidadão.

**Pontos positivos:**
- Dark theme coerente com paleta de cores definida
- Componentes UI base existentes (`Button`, `Card`, `Badge`, etc.)
- Uso de `tailwind-variants` no `Button` e `Card`
- Animations customizadas (`animate-slide-in`, `animate-fade-in`)
- Scrollbar customizada
- Skip-link de acessibilidade

**Problemas gerais identificados:**
- Muitos componentes **não usam** os componentes UI base (Button, Card) e criam estilos inline
- Inconsistência de border-radius (`rounded-xl` vs `rounded-2xl` vs `rounded-lg`)
- Inconsistência de spacing e padding entre páginas
- Falta de loading states e empty states em vários locais
- Falta de responsividade em componentes críticos
- Duplicação massiva de código (formulário de alterar senha, change password)

---

## 2. Melhorias por Componente/Página

### 2.1 `FloodMap.jsx` (509 linhas)

**Prioridade Alta:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| A1 | Sem skeleton/loading para o mapa carregar | Linha 488-507 | Adicionar overlay de loading sobre o mapa enquanto `isLoading` é true |
| A2 | Sidebar overflow em mobile pode ficar cortada | Linha 306-484 | Testar `overflow-y-auto` com `max-h` em mobile |
| A3 | Risco não atualiza visualmente quando `floodLevel` muda (sem transição) | Linha 362-363 | Adicionar `transition-all duration-300` no badge de risco |
| A4 | Slider de nível sem label acessível (`aria-label`) | Linha 382-388 | Adicionar `aria-label="Nível de inundação em metros"` e `role="slider"` |
| A5 | Botão "Atual" sem feedback visual de clique | Linha 376-379 | Adicionar `active:scale-95` para press feedback |

**Prioridade Média:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| M1 | Legenda sempre visível, poderia colapsar | Linha 465-483 | Tornar colapsável com estado `showLegend` |
| M2 | Cards de bairros usam classes hardcoded ao invés do `Badge` | Linha 442-445 | Usar componente `<Badge variant="warning">` |
| M3 | `weatherIcon()` usa emojis sem fallback acessível | Linha 8-15 | Adicionar `aria-label` nos emojis |
| M4 | Botão de busca de endereço usa emoji `🔍` sem aria-label | Linha 412-416 | Usar componente `Button` com ícone SVG |
| M5 | Resultados da busca de endereço sem navegação por teclado | Linha 424-434 | Adicionar `role="listbox"` e `aria-activedescendant` |
| M6 | `ruasSearch` é declarada mas nunca usada (linha 63) | Linha 63 | Remover variável morta |

**Prioridade Baixa:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| L1 | Font sizes extremamente pequenas (`text-[9px]`, `text-[10px]`) | Linhas 315, 339, 346 | Aumentar para `text-[11px]` mínimo para legibilidade |
| L2 | Sem `role="complementary"` na sidebar | Linha 305 | Adicionar ARIA landmark |
| L3 | Botão "× Limpar" usa caractere especial `×` | Linha 448 | Usar ícone SVG consistente |

---

### 2.2 `AdminPanel.jsx` (229 linhas)

**Prioridade Alta:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| A1 | **Formulário de alterar senha duplicado** — existe idêntico no `CitizenDashboard.jsx` | Linhas 97-112 | Extrair para componente `<ChangePasswordModal />` |
| A2 | `KPICard` usa classes dinâmicas `bg-${color}-500/20` que não funcionam com Tailwind JIT | KPICard.jsx:22 | Usar mapeamento de cores ou `style={{}}` |
| A3 | Tab bar sem `role="tablist"` e tabs sem `role="tab"` | Linha 200-217 | Adicionar ARIA roles para acessibilidade |
| A4 | Loading spinner sem `role="status"` (parcialmente feito na linha 116) | Linha 114-123 | OK, mas o texto "Carregando dados..." precisa de `aria-live` |

**Prioridade Média:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| M1 | KPI Cards não são clicáveis mas `KPICard` tem `onClick` — sem cursor pointer | KPICard.jsx:19 | Adicionar `cursor-pointer` quando `onClick` existe |
| M2 | Botões "Alterar Senha" e "Sair" usam classes inline ao invés de `Button` | Linhas 135-144 | Usar `<Button variant="secondary">` |
| M3 | Tab "geral" definida como default mas não existe no `TABS` | Linha 71 | Corrigir `useState('defesa_civil')` ou adicionar tab "geral" |
| M4 | Mensagem de erro não usa componente `Toast` | Linha 169 | Já usa `pwdErr` inline, considerar toast |
| M5 | Tabela de residências sem `EmptyState` quando filtragem retorna vazio | ResidencesTab:265-275 | Já tem, OK |

**Prioridade Baixa:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| L1 | Emoji "🔑" e "⚠️" nos botões sem `aria-hidden` | Linhas 138, 46 | Adicionar `aria-hidden="true"` |
| L2 | `mt-8` no login não consistente com padding do layout | Linhas 32, 44 | Usar padding do layout em vez de margin |

---

### 2.3 `CitizenPortal.jsx` (48 linhas)

**Prioridade Média:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| M1 | Tabs "Login"/"Cadastro" sem ARIA roles | Linhas 21-38 | Adicionar `role="tablist"`, `role="tab"`, `aria-selected` |
| M2 | `showLogin` e `showRegistration` podem ficar inconsistentes (dois states para uma coisa) | Linhas 9-10 | Usar um único state `activeView: 'login' | 'registration'` |
| M3 | Sem animação de transição entre Login e Cadastro | Linhas 40-41 | Adicionar `animate-fade-in` na tab content |
| M4 | Tab underline animation não usa `transition` na borda | Linhas 24, 33 | Já tem `transition-all`, OK |

**Prioridade Baixa:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| L1 | Título "Painel do Morador" não responsivo em telas muito pequenas | Linha 16 | Adicionar `text-2xl md:text-3xl` |

---

### 2.4 `Layout.jsx` (133 linhas)

**Prioridade Alta:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| A1 | Mobile menu não tem animação de slide | Linhas 97-116 | Adicionar `animate-slide-in` ou transição de height |
| A2 | Offline banner usa `animate-pulse` que pode causar desconforto | Linha 31 | Usar animação mais suave ou apenas cor estática |

**Prioridade Média:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| M1 | Footer minimalista demais — sem links úteis | Linhas 125-130 | Adicionar versão, link para GitHub, status do sistema |
| M2 | `max-w-7xl` pode ser amplo demais em telas 2K+ | Linha 38 | Considerar `max-w-screen-2xl` ou manter |
| M3 | Mobile menu não fecha com ESC | Linhas 97-116 | Adicionar `useEffect` com keydown listener para ESC |
| M4 | Navbar items usam `space-x-0.5` que pode ficar apertado | Linha 65 | Testar `space-x-1` |
| M5 | Skip link funciona mas poderia ter animação mais visível | Linha 26-28 | Já tem transição, OK |

**Prioridade Baixa:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| L1 | Logo "G" não tem `alt` text no link | Linha 40-48 | Adicionar `aria-label="GeoJeronimo - Página inicial"` no Link |
| L2 | `InstallPwa` sem contexto visual | Linha 66 | Verificar se está visível e estilizado |

---

### 2.5 `AppShell.jsx` (108 linhas)

**Prioridade Média:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| M1 | Sidebar toggle button (`w-5` largura) é difícil de clicar em desktop | Linha 82 | Aumentar para `w-6` ou `w-7` com área de clique maior |
| M2 | Mobile sidebar `max-w-[85vw]` pode ser apertado para conteúdo largo | Linha 48 | Considerar `w-[320px]` ou testar |
| M3 | Backdrop overlay (`bg-black/50`) sem transição | Linha 42 | Adicionar `transition-opacity duration-300` |
| M4 | `z-[5]` para children é incomum e pode conflitar | Linha 97 | Usar `z-0` mais explícito |

**Prioridade Baixa:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| L1 | Sidebar header "Painel" sem contexto — deveria ter nome do usuário | Linha 55 | Adicionar nome do usuário ou logo |

---

### 2.6 `index.css` (55 linhas)

**Prioridade Média:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| M1 | Falta animação de loading skeleton shimmer | Global | Adicionar `@keyframes shimmer` para skeleton mais sofisticado |
| M2 | Falta animação de `scale-in` para modais | Global | Adicionar `@keyframes scale-in` |
| M3 | Falta `@keyframes pulse-slow` para alertas menos agressivos | Global | Definir animação mais suave |
| M4 | Scrollbar customizada só para Webkit | Linhas 22-37 | Adicionar `scrollbar-width: thin` para Firefox |

**Prioridade Baixa:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| L1 | Falta `::selection` styling | Global | Adicionar cor de seleção consistente com o tema |

---

### 2.7 `DefesaCivilTab.jsx` (282 linhas)

**Prioridade Alta:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| A1 | Slider de nível sem `aria-label` | Linha 102-104 | Adicionar `aria-label` e `aria-valuemin/max/now` |
| A2 | Tabela expandible sem `aria-expanded` no botão | Linha 164-165 | Adicionar `aria-expanded={expandMatrix}` |
| A3 | Botão "Verificar Alertas" não desabilita adequadamente durante loading | Linha 123-127 | Já tem `disabled={checkingAlerts}`, OK |

**Prioridade Média:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| M1 | KPI cards usam bordas coloridas inconsistentes (`border-amber-500/30` vs `border-slate-800`) | Linhas 143-158 | Padronizar: todas com borda temática ou nenhuma |
| M2 | Tabela de nível usa `hover:bg-slate-800/40` sem transição | Linha 187 | Adicionar `transition-colors` (já tem) |
| M3 | Cards de bairros poderiam usar componente `Card` | Linha 210 | Substituir div por `<Card>` |
| M4 | Empty state na linha 270-276 usa componente, mas others não | Diversos | Padronizar uso do `EmptyState` |

**Prioridade Baixa:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| L1 | "⏱️ Verificar Alertas Automáticos" — emoji sem aria-hidden | Linha 115 | Adicionar `aria-hidden="true"` |

---

### 2.8 `ResidencesTab.jsx` (283 linhas)

**Prioridade Alta:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| A1 | **`alert()` nativo usado** para erros (linha 74) | Linha 74 | Substituir por `showToast()` |
| A2 | **`window.confirm()` nativo** para deletar (linha 250) | Linha 250 | Criar componente `<ConfirmDialog />` estilizado |
| A3 | Formulário extenso sem validação visual (campos obrigatórios sem asterisco) | Linhas 93-199 | Adicionar indicadores visuais de campos obrigatórios |
| A4 | **Tabela colSpan incorreto** — "5" mas são 6 colunas | Linha 267 | Mudar para `colSpan="6"` |
| A5 | Formulário não tem `role="form"` nem `aria-labelledby` | Linha 93 | Adicionar ARIA |

**Prioridade Média:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| M1 | **Inputs não usam componente `Button`** — botão "Salvar" inline | Linha 240 | Usar `<Button size="sm">` |
| M2 | Input de telefone (`userEmail`) tem placeholder enganoso | Linha 97 | Placeholder diz "Telefone" mas campo é `userEmail` — confuso |
| M3 | Select de bairros hardcoded — difícil de manter | Linhas 107-109 | Buscar de API ou constantes |
| M4 | `LoadingSkeleton` usado mas `loading` não é setado na busca | Linha 14 | `setLoading` nunca é chamado na busca, só no mount |
| M5 | Checkbox customizado sem `role="checkbox"` | Linhas 116-124 | Adicionar ARIA |
| M6 | Status update inline sem confirmação | Linhas 232-241 | Adicionar confirmação antes de salvar |

**Prioridade Baixa:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| L1 | Tabela responsiva em mobile — colunas podem ficar apertadas | Linha 208-277 | Considerar card layout em mobile |
| L2 | Botão "X" para cancelar usa texto ao invés de ícone | Linha 241 | Usar ícone SVG de fechar |

---

### 2.9 `PetsTab.jsx` (224 linhas)

**Prioridade Alta:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| A1 | **`alert()` nativo usado** para erros (linha 59) | Linha 59 | Substituir por `showToast()` |
| A2 | **`window.confirm()` nativo** para deletar (linha 71) | Linha 71 | Criar componente `<ConfirmDialog />` estilizado |
| A3 | Formulário sem `required` nos campos obrigatórios (CPF, nome dono, nome pet) | Linhas 113-119 | Adicionar `required` e validação |

**Prioridade Média:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| M1 | Botões "Editar" e "Excluir" sem componentes `Button` | Linhas 206-207 | Usar `<Button variant="ghost" size="sm">` |
| M2 | Tabela sem `sticky` header quando scrollável | Linha 179-213 | Adicionar `sticky top-0` no `thead` |
| M3 | Input de CPF sem máscara | Linha 118 | Adicionar formatação `***.XXX.XXX-XX` |
| M4 | Badge de localização do pet usa `Badge` mas outros não | Linha 200 | OK, consistente |

**Prioridade Baixa:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| L1 | Tabela poderia ter pagination quando muitos pets | Global | Adicionar paginação ou virtual scroll |
| L2 | CPF parcialmente mascarado (`***.${slice(-3)}`) — formato incorreto | Linha 197 | Melhorar formatação |

---

### 2.10 `CitizenDashboard.jsx` (223 linhas)

**Prioridade Alta:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| A1 | **Formulário de alterar senha duplicado** — mesmo código do AdminPanel | Linhas 87-110 | Extrair para componente compartilhado |
| A2 | Loading state minimalista (`py-12 bg-slate-800/50`) — sem spinner | Linha 178-180 | Adicionar `LoadingSkeleton` ou spinner |
| A3 | `window.confirm()` nativo para deletar residência | Linha 202 | Usar `<ConfirmDialog />` estilizado |

**Prioridade Média:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| M1 | Botões "Alterar Senha" e "Sair" com tamanhos diferentes (`px-4 py-3` vs `px-6 py-3`) | Linhas 74-84 | Padronizar tamanhos |
| M2 | Alerta de risco `animate-pulse` pode ser incômodo | Linha 150 | Usar animação mais suave ou remover |
| M3 | `successMsg` é boolean mas deveria ser string | Linha 16 | Considerar `successMsg` como string com timeout |
| M4 | Botão "+ Cadastrar" sem ícone consistente | Linha 187 | Usar componente `Button` |
| M5 | `ResidenceInfo` tem muitos cards potenciais — pode ficar overwhelming | ResidenceInfo.jsx | Considerar layout colapsável ou seções |

**Prioridade Baixa:**

| # | Problema | Localização | Sugestão |
|---|----------|-------------|----------|
| L1 | `max-w-4xl` pode ser apertado para o mapa de residência | Linha 67 | Considerar `max-w-5xl` |

---

## 3. Melhorias Transversais (Design System)

### 3.1 Componentes Não Utilizados

Muitos componentes criam estilos inline ao invés de usar os componentes UI base:

| Componente | Deveria usar | Onde |
|------------|-------------|------|
| Botões com classes `px-4 py-2 rounded-xl...` | `<Button>` | AdminPanel:135-144, CitizenDashboard:74-84, ResidencesTab:240, PetsTab:206 |
| Cards com classes `bg-slate-900 rounded-2xl border...` | `<Card>` | AdminPanel:33, DefesaCivilTab:91,143-158,210, CitizenDashboard:182,199 |
| Badges inline com classes `px-2 py-0.5 rounded-full...` | `<Badge>` | FloodMap:362,444, DefesaCivilTab:220 |

### 3.2 Inconsistência de Border Radius

| Padrão | Onde aparece | Recomendação |
|--------|-------------|--------------|
| `rounded-xl` | Botões, inputs, cards em várias páginas | Manter como padrão |
| `rounded-2xl` | Cards principais, containers | Usar para cards de seção |
| `rounded-lg` | Badges menores, itens de tabela | Usar para elementos menores |
| `rounded-full` | Badges de status, scrollbar | Manter para pills/circulares |

**Recomendação:** Definir hierarquia clara:
- `rounded-2xl` → Cards de seção principal
- `rounded-xl` → Botões, inputs, cards internos
- `rounded-lg` → Badges, itens de lista
- `rounded-full` → Pills, avatares circulares

### 3.3 Inconsistência de Spacing

| Local | Padrão atual | Recomendação |
|-------|-------------|--------------|
| Gap entre seções | `space-y-6` a `space-y-8` | Padronizar em `space-y-6` |
| Padding de cards | `p-4` a `p-8` | `p-6` para cards, `p-4` para cards internos |
| Gap em grids | `gap-3` a `gap-5` | `gap-4` como padrão |

### 3.4 Duplicação de Código

| Código duplicado | Onde | Solução |
|-----------------|------|---------|
| Formulário "Alterar Senha" | AdminPanel:97-112, CitizenDashboard:26-37, 87-110 | Criar `<ChangePasswordForm />` |
| Change password UI | AdminPanel:148-170, CitizenDashboard:87-110 | Criar `<ChangePasswordSection />` |
| KPICard styling | KPICard.jsx:22 usa `bg-${color}` que não funciona JIT | Usar mapeamento de cores |

### 3.5 Acessibilidade — Resumo Geral

| Problema | Severidade | Componentes afetados |
|----------|-----------|---------------------|
| Tabs sem `role="tablist"`/`role="tab"` | Alta | AdminPanel, CitizenPortal |
| Sliders sem `aria-label` | Alta | FloodMap, DefesaCivilTab |
| Botões com apenas emoji (sem texto/aria-label) | Média | FloodMap, AdminPanel, Layout |
| `alert()` e `window.confirm()` nativos | Média | ResidencesTab, PetsTab, CitizenDashboard |
| Tabelas sem `aria-label` ou caption | Baixa | Todas as tabelas |
| Inputs sem `id` associado a `label` | Baixa | ResidencesTab, PetsTab |

### 3.6 Responsividade — Resumo

| Componente | Problema | Impacto |
|------------|----------|---------|
| FloodMap sidebar | Pode ficar cortada em mobile | Alto |
| AdminPanel KPI grid | `grid-cols-2 md:grid-cols-4` — OK | Baixo |
| ResidencesTab tabela | Muitas colunas em mobile | Alto |
| PetsTab tabela | Muitas colunas em mobile | Alto |
| CitizenDashboard | `max-w-4xl` pode ser apertado | Médio |
| Layout footer | Minimalista, OK | Baixo |

### 3.7 Oportunidades de Animação/Transição

| Local | Oportunidade | Implementação |
|-------|-------------|---------------|
| Transição entre tabs | Fade in/out | `animate-fade-in` na conteúdo da tab |
| Cards aparecendo | Stagger animation | Delay progressivo nos cards |
| Alertas de risco | Pulse suave | `animate-pulse` mais lento ou custom |
| Sidebar toggle | Slide horizontal | Já tem `transition-all duration-300` |
| Tabelas expandindo | Height transition | Usar `max-height` com transição |
| Toast entrance | Slide from right | Já tem `animate-slide-in` |
| Botão deletar | Shake animation | Adicionar `@keyframes shake` |
| KPI values | Count up animation | Animar números de 0 ao valor final |

---

## 4. Plano de Ação Recomendado

### Fase 1 — Correções Críticas (1-2 dias)
1. Corrigir `colSpan` incorreto em ResidencesTab
2. Substituir `alert()` e `window.confirm()` nativos
3. Corrigir bug de tab "geral" inexistente no AdminPanel
4. Corrigir KPICard classes dinâmicas que não funcionam com Tailwind JIT
5. Corrigir campo `userEmail` com placeholder "Telefone" enganoso

### Fase 2 — Consistência (2-3 dias)
1. Extrair formulário de alterar senha para componente compartilhado
2. Migrar botões inline para componente `<Button>`
3. Migrar cards inline para componente `<Card>`
4. Padronizar border-radius e spacing
5. Adicionar ARIA roles em tabs

### Fase 3 — UX e Acessibilidade (2-3 dias)
1. Adicionar loading skeletons em todas as páginas
2. Adicionar empty states onde faltam
3. Adicionar `aria-label` em sliders e botões de ícone
4. Adicionar confirmação estilizada para ações destrutivas
5. Melhorar responsividade de tabelas (card layout em mobile)

### Fase 4 — Polish (1-2 dias)
1. Adicionar animações de transição entre views
2. Animar contadores de KPI
3. Melhorar scrollbar para Firefox
4. Adicionar `::selection` styling
5. Testar e ajustar font sizes mínimos

---

## 5. Métricas de Impacto

| Métrica | Atual | Após melhorias |
|---------|-------|----------------|
| Componentes UI reutilizados | ~30% | ~80% |
| ARIA labels presentes | ~40% | ~95% |
| Loading states completos | ~60% | ~100% |
| Empty states completos | ~70% | ~100% |
| Código duplicado | ~150 linhas | ~0 linhas |
| alert()/confirm() nativos | 3 ocorrências | 0 |
| Tabs acessíveis | 0/2 | 2/2 |
| Sliders acessíveis | 0/2 | 2/2 |
