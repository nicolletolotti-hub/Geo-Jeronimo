const fs = require('fs');
const path = require('path');
const os = require('os');
const shapefile = require('shapefile');
const simplify = require('@turf/simplify').default;

// 1. Detecta automaticamente o caminho da sua Área de Trabalho (Desktop)
const DESKTOP_PATH = path.join(os.homedir(), 'Desktop');

// Nomes base dos arquivos que você baixou
const SHP_FILE = path.join(DESKTOP_PATH, 'RS_SAOJERO_SR_SGB.shp');
const DBF_FILE = path.join(DESKTOP_PATH, 'RS_SAOJERO_SR_SGB.dbf');

// Caminho de destino direto na pasta pública do seu Frontend React
const OUTPUT_PATH = path.join(__dirname, 'frontend', 'public', 'dados', 'risco_sgb_2024.geojson');

async function processarMapeamentoSGB() {
  console.log('🔍 Buscando arquivos na Área de Trabalho...');
  
  if (!fs.existsSync(SHP_FILE) || !fs.existsSync(DBF_FILE)) {
    console.error(`❌ Erro: Arquivos RS_SAOJERO_SR_SGB .shp ou .dbf não foram encontrados em: ${DESKTOP_PATH}`);
    process.exit(1);
  }

  try {
    console.log('📦 Lendo Shapefile e mesclando dados do DBF...');
    // Lê o shapefile e o banco de dados dbf simultaneamente convertendo para GeoJSON estruturado
    const geojson = await shapefile.read(SHP_FILE, DBF_FILE, { encoding: 'utf-8' });

    console.log(`⚡ Aplicando melhorias de performance (Simplificação de Geometria)...`);
    // Simplifica as bordas complexas do polígono em 0.0001 graus de tolerância.
    // Isso reduz o peso do arquivo drasticamente mantendo a precisão visual para o Leaflet.
    const opcoesSimplificacao = { tolerance: 0.0001, highQuality: true, mutate: true };
    const geojsonOtimizado = simplify(geojson, opcoesSimplificacao);

    // Garante que a pasta de destino exista no seu projeto frontend
    const dirDestino = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dirDestino)) {
      fs.mkdirSync(dirDestino, { recursive: true });
    }

    // Salva o GeoJSON final tunado
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojsonOtimizado, null, 2));
    
    // Cálculos de métricas para o log
    const tamanhoOriginal = (fs.statSync(SHP_FILE).size + fs.statSync(DBF_FILE).size) / (1024 * 1024);
    const tamanhoFinal = fs.statSync(OUTPUT_PATH).size / (1024 * 1024);

    console.log('\n--- 🎉 PROCESSO CONCLUÍDO COM SUCESSO ---');
    console.log(`💾 Salvo em: ${OUTPUT_PATH}`);
    console.log(`📉 Tamanho Original: ${tamanhoOriginal.toFixed(2)} MB`);
    console.log(`🚀 Tamanho Otimizado: ${tamanhoFinal.toFixed(2)} MB`);
    console.log('-----------------------------------------\n');

  } catch (error) {
    console.error('❌ Ocorreu um erro ao processar os arquivos:', error);
  }
}

processarMapeamentoSGB();