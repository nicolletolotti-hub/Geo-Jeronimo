# GeoJeronimo - Sistema de Monitoramento de Cheias

Sistema web completo focado em resiliência climática e mitigação de desastres para a população de São Jerônimo - RS, com monitoramento em tempo real do Rio Jacuí.

## 🌊 Características

- **Dashboard de Monitoramento em Tempo Real**: Nível do rio, clima, histórico e alertas
- **Mapa Interativo de Inundação**: Visualização dinâmica de áreas de risco com slider de cota
- **Portal do Cidadão**: Cadastro de residência para alertas personalizados
- **Apoio Psicológico**: Recursos de acolhimento e memória histórica
- **Painel Administrativo**: Visão estratégica para Defesa Civil e órgãos públicos
- **Modo Offline (PWA)**: Funciona mesmo sem internet durante emergências
- **Acessível**: WCAG/eMAG compliant, funciona em celulares antigos e 3G/4G

## 🏗️ Tecnologias

### Frontend
- **React 18** + **Vite** (build tool rápido e leve)
- **TailwindCSS** (estilização utility-first, performática)
- **Leaflet** + **React-Leaflet** (mapas leves e acessíveis)
- **React Router** (navegação)
- **Vite PWA** ( Progressive Web App para modo offline)
- **Recharts** (gráficos leves)

### Backend
- **Node.js** + **Express** (API REST leve e eficiente)
- **SQLite** (banco de dados leve, sem servidor separado)
- **JWT** (autenticação)
- **bcryptjs** (hash de senhas)
- **Axios** (requisições HTTP)

## 📁 Estrutura do Projeto

```
geojeronimov10/
├── frontend/              # Aplicação React
│   ├── src/
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── pages/        # Páginas principais
│   │   ├── contexts/     # Contextos (Auth, etc)
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # Serviços de API
│   │   ├── utils/        # Utilitários
│   │   └── styles/       # Estilos globais
│   ├── public/           # Arquivos estáticos
│   └── package.json
├── backend/              # API Node.js
│   ├── src/
│   │   ├── controllers/  # Controladores
│   │   ├── routes/       # Rotas da API
│   │   ├── middleware/   # Middleware
│   │   ├── services/     # Serviços de negócio
│   │   └── database/     # Configuração do banco
│   └── package.json
├── data/                 # Dados geoespaciais
│   ├── bairros/          # GeoJSON dos bairros
│   ├── limites/          # Limites do município
│   ├── inundacao/        # Mapas de inundação (1m-15m)
│   └── ruas/             # GeoJSON das ruas
└── docs/                 # Documentação
```

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Backend

1. Navegue para o diretório do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Inicialize o banco de dados:
```bash
npm run init-db
```

5. Inicie o servidor:
```bash
npm run dev
```

O backend estará rodando em `http://localhost:5000`

### Frontend

1. Navegue para o diretório do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

## 📱 Build para Produção

### Frontend
```bash
cd frontend
npm run build
```

### Backend
```bash
cd backend
npm start
```

## 🔐 Autenticação

O sistema usa JWT para autenticação. Para registrar um novo usuário:
- POST `/api/auth/register` com `{ email, password, name }`
- POST `/api/auth/login` com `{ email, password }`

## 🗺️ Dados Geoespaciais

Os mapas de inundação estão no formato GeoJSON na pasta `data/inundacao/`, com arquivos para cada nível de água de 1m a 15m. Para usar dados reais da CPRM, substitua esses arquivos pelos dados oficiais.

## 📊 APIs Externas

O sistema está preparado para integrar com:
- **OpenWeather API**: Dados climáticos (configure `OPENWEATHER_API_KEY` no .env)
- **ANA/CPRM**: Dados oficiais do nível do rio (configure `ANA_API_KEY` no .env)

## ♿ Acessibilidade

O projeto segue as diretrizes WCAG 2.1 e eMAG:
- Navegação por teclado completa
- Contraste adequado
- Texto alternativo para imagens
- Skip links para navegação
- Suporte a leitores de tela
- Modo de alto contraste
- Suporte a movimento reduzido

## 📱 PWA - Modo Offline

O sistema funciona como Progressive Web App:
- Cache automático de recursos críticos
- Funciona sem internet
- Instalável em dispositivos móveis
- Notificações push (configurável)

## 🔧 Configuração de Produção

1. Configure variáveis de ambiente apropriadas
2. Use HTTPS obrigatoriamente
3. Configure rate limiting apropriado
4. Use um banco de dados PostgreSQL para produção (opcional)
5. Configure backup automático do banco de dados
6. Use CDN para assets estáticos

## 📞 Contatos de Emergência

- Defesa Civil: 199
- Bombeiros: 193
- Polícia Militar: 190
- SAMU: 192

## 🤝 Contribuindo

Este é um projeto de código aberto focado em salvar vidas. Contribuições são bem-vindas!

## 📄 Licença

ISC

## 🙏 Agradecimentos

Desenvolvido para auxiliar a população de São Jerônimo - RS em situações de emergência climática.
