import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { RISK_LEVELS } from '../constants/neighborhoodAlerts'

function formatDate() {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

async function addHeader(doc) {
  doc.setFontSize(20)
  doc.setTextColor(0, 100, 200)
  doc.text('GeoJeronimo', 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text('Monitoramento de Cheias - São Jerônimo/RS', 14, 27)
  doc.setDrawColor(0, 100, 200)
  doc.line(14, 30, 196, 30)
}

function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    const dateStr = `Gerado em ${formatDate()}`
    doc.text(dateStr, 14, 288)
    doc.text(`Página ${i} de ${pageCount}`, 170, 288)
    doc.setDrawColor(200)
    doc.line(14, 282, 196, 282)
  }
}

export async function exportCivilDefenseReport(riverData, residences, stations, floodLevel) {
  const doc = new jsPDF()
  await addHeader(doc)

  doc.setFontSize(16)
  doc.setTextColor(0)
  doc.text('Relatório da Defesa Civil', 14, 40)

  doc.setFontSize(11)
  doc.text(`Data e hora: ${formatDate()}`, 14, 50)

  doc.setFontSize(13)
  doc.setTextColor(50)
  doc.text('Nível do Rio Jacuí', 14, 62)
  doc.setFontSize(11)
  doc.setTextColor(0)
  if (riverData) {
    doc.text(`Nível atual: ${riverData.current?.toFixed(2) || '---'}m`, 14, 72)
    doc.text(`Tendência: ${riverData.trend || '---'}`, 14, 80)
    doc.text(`Nível de alerta: ${riverData.warningLevel || '---'}m`, 14, 88)
    doc.text(`Nível de perigo: ${riverData.dangerLevel || '---'}m`, 14, 96)
  } else {
    doc.text('Dados do rio indisponíveis', 14, 72)
  }

  doc.setFontSize(13)
  doc.setTextColor(50)
  doc.text('Áreas de Risco', 14, 110)
  doc.setFontSize(11)
  doc.setTextColor(0)

  const atRisk = residences?.filter(r =>
    riverData && r.floodLevel && riverData.current >= r.floodLevel
  ) || []
  doc.text(`Residências em área de risco: ${atRisk.length}`, 14, 120)
  doc.text(`Total de residências cadastradas: ${residences?.length || 0}`, 14, 128)

  const bairrosAfetados = [...new Set(atRisk.map(r => r.neighborhood).filter(Boolean))]
  doc.text(`Bairros afetados: ${bairrosAfetados.length}`, 14, 136)

  if (riverData) {
    const alertConfig = riverData.current >= riverData.dangerLevel
      ? RISK_LEVELS.danger
      : riverData.current >= riverData.warningLevel
      ? RISK_LEVELS.alert
      : riverData.current >= (floodLevel || riverData.warningLevel) * 0.7
      ? RISK_LEVELS.attention
      : RISK_LEVELS.low

    doc.setFontSize(12)
    doc.setTextColor(50)
    doc.text('Situação Geral', 14, 150)
    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text(`Nível de risco: ${alertConfig.level}`, 14, 160)
    doc.text(alertConfig.message, 14, 168)
    doc.text(alertConfig.recommendation, 14, 176)
  }

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text('Fonte: GeoJeronimo - Estação Fluviométrica de São Jerônimo (SGB/ANA)', 14, 200)

  addFooter(doc)
  doc.save('relatorio-defesa-civil.pdf')
}

export async function exportBairroReport(neighborhood, residences, riverData) {
  const doc = new jsPDF()
  await addHeader(doc)

  doc.setFontSize(16)
  doc.setTextColor(0)
  doc.text(`Relatório do Bairro: ${neighborhood}`, 14, 40)

  doc.setFontSize(11)
  doc.text(`Data e hora: ${formatDate()}`, 14, 50)

  const bairroResidences = residences?.filter(r => r.neighborhood === neighborhood) || []
  const atRisk = bairroResidences.filter(r =>
    riverData && r.floodLevel && riverData.current >= r.floodLevel
  )

  doc.setFontSize(13)
  doc.setTextColor(50)
  doc.text('Residências', 14, 64)
  doc.setFontSize(11)
  doc.setTextColor(0)
  doc.text(`Total no bairro: ${bairroResidences.length}`, 14, 74)
  doc.text(`Em risco: ${atRisk.length}`, 14, 82)

  if (atRisk.length > 0) {
    doc.setFontSize(13)
    doc.setTextColor(50)
    doc.text('Residências em Risco', 14, 96)
    doc.setFontSize(9)
    doc.setTextColor(0)
    let y = 104
    for (const r of atRisk.slice(0, 25)) {
      if (y > 270) { doc.addPage(); y = 30 }
      doc.text(`${r.address || '---'} - Inunda em: ${r.floodLevel}m`, 14, y)
      y += 7
    }
    if (atRisk.length > 25) {
      doc.text(`... e mais ${atRisk.length - 25} residências`, 14, y + 4)
    }
  }

  addFooter(doc)
  doc.save(`relatorio-bairro-${neighborhood.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}

export async function exportHistoricalReport(historicalData, riverData) {
  const doc = new jsPDF()
  await addHeader(doc)

  doc.setFontSize(16)
  doc.setTextColor(0)
  doc.text('Relatório Histórico de Enchentes', 14, 40)

  doc.setFontSize(11)
  doc.text(`Data e hora: ${formatDate()}`, 14, 50)

  if (historicalData?.events) {
    doc.setFontSize(13)
    doc.setTextColor(50)
    doc.text('Eventos Históricos', 14, 62)
    doc.setFontSize(11)
    doc.setTextColor(0)
    let y = 72
    for (const event of historicalData.events) {
      if (y > 260) { doc.addPage(); y = 30 }
      doc.setFontSize(11)
      doc.text(`${event.year} - ${event.level}m - ${event.description}`, 14, y)
      y += 7
    }
  }

  doc.setFontSize(13)
  doc.setTextColor(50)
  doc.text('Comparação com Nível Atual', 14, y + 10)
  doc.setFontSize(11)
  doc.setTextColor(0)
  const currentLevel = riverData?.current?.toFixed(2) || '---'
  doc.text(`Nível atual do Rio Jacuí: ${currentLevel}m`, 14, y + 20)

  if (historicalData?.events?.length > 0) {
    const maxHist = Math.max(...historicalData.events.map(e => parseFloat(e.level)))
    if (riverData?.current) {
      const diff = maxHist - riverData.current
      doc.text(`Distância do maior nível histórico (${maxHist}m): ${diff > 0 ? `${diff.toFixed(2)}m abaixo` : `${Math.abs(diff).toFixed(2)}m acima`}`, 14, y + 28)
    }
  }

  addFooter(doc)
  doc.save('relatorio-historico-enchentes.pdf')
}

export async function exportReportFromElement(elementId, filename) {
  const element = document.getElementById(elementId)
  if (!element) return
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  })
  const imgData = canvas.toDataURL('image/png')
  const doc = new jsPDF('p', 'mm', 'a4')
  const imgWidth = 190
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
  doc.save(`${filename}.pdf`)
}
