# GeoJeronimo — Sistema de Monitoramento e Alerta de Cheias

> **Versão 1.0.5** — São Jerônimo, RS

---

## O que é

O GeoJeronimo é uma plataforma web de monitoramento em tempo real do nível do Rio Jacuí e gestão de risco de inundações para o município de São Jerônimo — RS. Desenvolvido para auxiliar a Defesa Civil e a população na tomada de decisões durante eventos de cheia, o sistema integra dados oficiais da Defesa Civil do RS, modelos de previsão e ferramentas de geoprocessamento em uma interface acessível via navegador ou aplicativo instalável.

---

## Funcionalidades

### Mapa Interativo
- Visualização em tempo real das áreas de inundação com slider de nível (1m a 20m)
- Três estilos de mapa base: **satélite**, **ruas (OSM)** e **topográfico**
- **Modo 3D** com terreno e giro automático para vista panorâmica
- **Zoom suave** com ease-in-out-cubic ao selecionar bairros (2,5s)
- Camada de **ruas alagadas** em vermelho e ruas com risco em laranja (+50cm)
- **RBush spatial index** + Web Worker para processamento de 491 ruas em thread separada
- Busca textual de ruas com geolocalização

### Painel do Cidadão
- Cadastro de residência com endereço, número de moradores, comorbidades e contato
- **Cálculo automático** do nível de inundação e nível de alerta por coordenada geográfica
- Mapa individual mostrando a residência em relação às áreas de inundação
- **Notificações no navegador** (Notification API) para alertas de evacuação
- Classificação de risco por residência com código de cores

### Painel do Servidor (Defesa Civil)
- Cadastro, edição e busca de residências
- Gestão de **abrigos** e **rotas de evacuação**
- Criação manual de alertas (perigo, aviso, informativo)
- **Importação em lote** via planilha Excel com:
  - Reconhecimento inteligente de cabeçalhos (português/inglês)
  - Validação de dados por linha com relatório de erros
  - Sanitização automática de valores (booleanos, numéricos, texto)
- **Exportação CSV** de todas as residências
- Histórico completo de importações
- Verificação manual de alertas automáticos

### Monitoramento Automático
- Consulta periódica (15 em 15 min) à **estação DCRS-00093** da Defesa Civil
- Scraping do nível do Rio Jacuí com fallback de regex múltiplos
- **LRU cache** com TTL configurável (60s estações, 120s níveis, 300s clima)
- **Stale cache fallback** quando a API oficial falha
- Geração automática de alertas para residências em risco
- Previsão de nível com modelos de tendência

### Infraestrutura
- **Frontend:** React + Vite + MapLibre GL + Tailwind CSS + Lucide
- **Backend:** Node.js + Express + PostgreSQL
- **PWA:** Instalável como aplicativo no celular/desktop
- **Service Worker:** Cache offline de assets e dados
- **CI/CD:** GitHub Actions → Railway + Vercel
- **Refresh token:** Autenticação JWT com renovação automática (24h token + 7d refresh)

---

## Vantagens

1. **Gratuito e open source** — sem custos de licenciamento
2. **Acessível de qualquer lugar** — funciona no navegador, sem instalação (ou instalável como PWA)
3. **Resiliente** — fallback de scraping quando APIs oficiais falham, cache stale, arquivos locais de inundação
4. **Rápido** — RBush spatial index + Web Worker para processamento geográfico sem travar a interface
5. **Preciso** — dados oficiais da Defesa Civil + topografia real da cidade
6. **Focado no cidadão** — notificações personalizadas por residência, cadastro simples
7. **Ferramenta de gestão** — painel completo para a Defesa Civil com importação em massa
8. **Disponível 24/7** — hospedado em cloud com deploy contínuo

---

## Como acessar

| Plataforma | URL |
|---|---|
| **Frontend (Vercel)** | geojeronimo.vercel.app |
| **API (Railway)** | geo-jeronimo-production.up.railway.app |
| **Repositório** | github.com/nicolletolotti-hub/Geo-Jeronimo |

---

**GeoJeronimo — protegendo vidas com tecnologia.**
