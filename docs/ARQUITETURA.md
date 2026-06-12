# Arquitetura do Sistema GeoJeronimo

## Visão Geral

O sistema GeoJeronimo segue uma arquitetura de cliente-servidor com separação clara entre frontend e backend, otimizada para performance, acessibilidade e funcionamento offline.

## Frontend (React + Vite)

### Estrutura de Componentes

```
src/
├── components/
│   ├── Layout.jsx              # Layout principal com navegação
│   └── Dashboard/
│       ├── RiverLevelCard.jsx  # Card do nível do rio
│       ├── WeatherCard.jsx    # Card do clima
│       ├── RiverHistoryChart.jsx  # Gráfico SVG leve
│       └── AlertsFeed.jsx     # Feed de alertas
├── pages/
│   ├── Dashboard.jsx           # Dashboard principal
│   ├── FloodMap.jsx            # Mapa interativo
│   ├── CitizenPortal.jsx       # Portal do cidadão
│   ├── PsychologicalSupport.jsx # Apoio psicológico
│   └── AdminPanel.jsx          # Painel administrativo
├── contexts/
│   └── AuthContext.jsx         # Contexto de autenticação
├── services/
│   └── api.js                  # Cliente HTTP configurado
└── styles/
    └── index.css               # Estilos globais + Tailwind
```

### Padrões de Componentes

- **Componentes Funcionais**: Todos os componentes são funcionais com hooks
- **Acessibilidade**: ARIA labels, roles, focus management
- **Performance**: Lazy loading de rotas, código split automático pelo Vite
- **Responsividade**: Mobile-first com TailwindCSS

### Estado Global

- **Context API**: Para autenticação e temas
- **Local State**: useState para componentes individuais
- **LocalStorage**: Para persistência de tokens e preferências

## Backend (Node.js + Express)

### Estrutura da API

```
src/
├── server.js                   # Entry point do servidor
├── routes/
│   ├── auth.js                 # Autenticação (login, registro)
│   ├── river.js                # Nível do rio (histórico, atual)
│   ├── weather.js              # Dados climáticos
│   ├── residence.js            # Cadastro de residências
│   └── alerts.js               # Sistema de alertas
├── database/
│   ├── db.js                   # Conexão SQLite
│   └── init.js                 # Script de inicialização
└── middleware/                 # Middleware de autenticação, etc.
```

### Endpoints da API

#### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login

#### Rio
- `GET /api/river/current` - Nível atual do rio
- `GET /api/river/history?hours=24` - Histórico
- `POST /api/river/add` - Adicionar leitura (admin)

#### Clima
- `GET /api/weather/current` - Clima atual e previsão

#### Residências
- `GET /api/residence` - Residência do usuário autenticado
- `POST /api/residence` - Criar/atualizar residência
- `GET /api/residence/all` - Todas as residências (admin)

#### Alertas
- `GET /api/alerts/active` - Alertas ativos
- `POST /api/alerts` - Criar alerta (admin)
- `PATCH /api/alerts/:id/deactivate` - Desativar alerta

## Banco de Dados (SQLite)

### Schema

```sql
-- Usuários
users (id, email, password, name, created_at, updated_at)

-- Residências
residences (id, user_id, address, neighborhood, residents, 
            comorbidities, pets, evacuation_logistics, shelter_plan,
            preventive_aid, flood_level, latitude, longitude, 
            created_at, updated_at)

-- Níveis do rio
river_levels (id, level, timestamp, source)

-- Alertas
alerts (id, type, title, message, source, created_at, is_active)
```

### Índices

- `idx_residences_user_id` - Busca por usuário
- `idx_residences_flood_level` - Filtro por nível de risco
- `idx_river_levels_timestamp` - Consultas históricas
- `idx_alerts_active` - Alertas ativos

## Dados Geoespaciais

### Formato
- **GeoJSON**: Formato padrão para dados geoespaciais
- **Leaflet**: Biblioteca de mapas leve e acessível

### Estrutura
```
data/
├── bairros/
│   └── bairros.json           # Polígonos dos bairros
├── limites/
│   └── municipio_mask.geojson # Limites do município
├── inundacao/
│   ├── flood_1m_clean.geojson
│   ├── flood_2m_clean.geojson
│   └── ... (até 15m)
└── ruas/
    └── ruas.geojson           # Rede viária
```

## PWA (Progressive Web App)

### Estratégia de Cache

1. **Runtime Caching**:
   - API de clima: NetworkFirst (24h)
   - Outros recursos: NetworkFirst (7 dias)

2. **Pre-caching**:
   - Arquivos estáticos (JS, CSS, HTML)
   - Dados geoespaciais (GeoJSON)
   - Imagens e ícones

3. **Offline Fallback**:
   - Página offline customizada
   - Dados críticos em cache

## Segurança

### Frontend
- Sanitização de inputs
- Validação de formulários
- HTTPS obrigatório em produção
- CSP headers configurados

### Backend
- Helmet.js para headers de segurança
- Rate limiting (100 req/15min)
- JWT para autenticação
- bcryptjs para hash de senhas
- CORS configurado
- SQL injection prevenido (prepared statements)

## Performance

### Frontend
- **Code Splitting**: Automático pelo Vite
- **Tree Shaking**: Remove código não utilizado
- **Lazy Loading**: Componentes sob demanda
- **Imagens**: Formatos otimizados (WebP)
- **CSS**: TailwindCSS (purge automático)

### Backend
- **SQLite**: Banco leve e rápido
- **WAL Mode**: Melhora performance de concorrência
- **Índices**: Consultas otimizadas
- **Compression**: Gzip habilitado

## Acessibilidade

### WCAG 2.1 AA
- Contraste mínimo 4.5:1
- Navegação por teclado completa
- ARIA labels e roles
- Skip links
- Focus visible
- Texto alternativo

### eMAG
- Conformidade com padrões brasileiros
- Suporte a leitores de tela (NVDA, JAWS)
- Alto contraste disponível
- Redução de movimento

## Monitoramento e Logs

### Frontend
- Error boundary para capturar erros
- Console logging em desenvolvimento
- Analytics (opcional)

### Backend
- Logging de erros e requisições
- Health check endpoint
- Métricas de performance (opcional)

## Deploy

### Frontend
- Build estático com Vite
- Hospedagem em Vercel, Netlify ou similar
- CDN para assets

### Backend
- Node.js server
- Hospedagem em Railway, Render ou similar
- Banco PostgreSQL em produção (opcional)
- Backup automático do banco

## Escalabilidade

### Horizontal Scaling
- Backend stateless (pode ter múltiplas instâncias)
- Load balancer
- CDN para conteúdo estático

### Vertical Scaling
- Aumentar recursos do servidor
- Otimizar queries
- Cache de resultados

## Backup e Recuperação

### Banco de Dados
- Backup diário automático
- Retenção de 30 dias
- Backup off-site

### Código
- Versionamento com Git
- Branches de feature
- CI/CD configurado
