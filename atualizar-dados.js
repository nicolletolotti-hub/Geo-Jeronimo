const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Destino dos dados em tempo real no seu Frontend React
const OUTPUT_DADOS_REAIS = path.join(__dirname, 'frontend', 'public', 'dados', 'monitoramento_jacui.json');

async function buscarDadosTempoReal() {
  console.log('🌊 Buscando telemetria em tempo real do Rio Jacuí (SGB/CPRM)...');
  
  try {
    // API pública do Sistema de Alerta de Eventos Críticos (SACE / Guaíba / Sub-bacia Jacuí)
    // Estação São Jerônimo ou régua mais próxima cadastrada no sistema nacional
    const urlSGB = 'https://sace.sgb.gov.br/guaiba/dados/dados_estacoes.json'; 
    
    const response = await axios.get(urlSGB);
    const dadosEstacoes = response.data;

    // Filtra ou busca os dados específicos da região de São Jerônimo / Triunfo
    // Nota: O SGB organiza por códigos de estações (ex: 85450000). Caso a estrutura mude, guardamos o payload.
    const dadosSaoJeronimo = dadosEstacoes.estacoes ? 
      dadosEstacoes.estacoes.find(e => e.nome.toLowerCase().includes('jerônimo') || e.nome.toLowerCase().includes('triunfo')) 
      : dadosEstacoes;

    // Montando o modelo estruturado para o seu card do React
    const telemetriaAtualizada = {
      ultimaAtualizacao: new Date().toISOString(),
      fonte: "SGB / CPRM - Sistema de Alerta de Eventos Críticos",
      estacao: dadosSaoJeronimo?.nome || "São Jerônimo - Rio Jacuí",
      nivelAtual: dadosSaoJeronimo?.nivel || "Aguardando leitura",
      cotaAlerta: dadosSaoJeronimo?.cotaAlerta || 6.50, // Cota de alerta média para a região
      cotaInundacao: dadosSaoJeronimo?.cotaInundacao || 7.50,
      status: dadosSaoJeronimo?.status || "Normal"
    };

    // Garante que o diretório exista
    fs.mkdirSync(path.dirname(OUTPUT_DADOS_REAIS), { recursive: true });
    
    // Grava o JSON limpo para o Frontend consumir instantaneamente
    fs.writeFileSync(OUTPUT_DADOS_REAIS, JSON.stringify(telemetriaAtualizada, null, 2));
    
    console.log('✅ Dados de monitoramento e telemetria atualizados com sucesso!');
    console.log(`📊 Nível Atual registrado: ${telemetriaAtualizada.nivelAtual}m`);

  } catch (error) {
    console.error('❌ Falha ao sincronizar com os servidores do SGB/CPRM:', error.message);
    console.log('⚠️ Usando dados em cache locais para evitar quebra no mapa.');
  }
}

buscarDadosTempoReal();
