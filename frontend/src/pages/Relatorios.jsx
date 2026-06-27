import { useState, useEffect } from 'react'
import api from '../services/api'
import { getNeighborhoodAlert } from '../constants/neighborhoodAlerts'
import { NEIGHBORHOODS } from '../constants/neighborhoods'
import { exportCivilDefenseReport, exportBairroReport, exportHistoricalReport } from '../utils/pdfGenerator'
import { showToast } from '../components/ui/Toast'

const HISTORICAL_EVENTS = [
  { year: 'Maio/1941', level: '13,50', description: 'Maior enchente registrada em São Jerônimo' },
  { year: 'Maio/2024', level: '12,75', description: 'Segunda maior enchente — cidade ficou ilhada' },
  { year: 'Maio/1941', level: '13,50', description: 'Maior enchente registrada em São Jerônimo' },
  { year: 'Maio/2024', level: '12,75', description: 'Segunda maior enchente — cidade ficou ilhada' },
].slice(0, 2)

export default function Relatorios() {
  const [riverData, setRiverData] = useState(null)
  const [residences, setResidences] = useState([])
  const [stations, setStations] = useState(null)
  const [selectedBairro, setSelectedBairro] = useState('')
  const [exporting, setExporting] = useState(null)

  useEffect(() => {
    Promise.allSettled([
      api.get('/river/current'),
      api.get('/residence/all'),
      api.get('/stations'),
    ]).then(([river, res, st]) => {
      if (river.status === 'fulfilled') setRiverData(river.value.data)
      if (res.status === 'fulfilled') setResidences(res.value.data)
      if (st.status === 'fulfilled') setStations(st.value.data)
    })
  }, [])

  const atRisk = residences.filter(r =>
    riverData && r.floodLevel && riverData.current >= r.floodLevel
  )

  const bairrosAtRisk = [...new Set(atRisk.map(r => r.neighborhood).filter(Boolean))]

  const alertConfig = riverData
    ? getNeighborhoodAlert(riverData.current, riverData.warningLevel, riverData.dangerLevel, 7)
    : null

  const handleExport = async (type, fn) => {
    setExporting(type)
    try {
      await fn()
      showToast('Relatório gerado com sucesso!', 'success')
    } catch (err) {
      showToast('Erro ao gerar relatório', 'error')
      console.error(err)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-3 tracking-tight">
          Relatórios
        </h1>
        <p className="text-slate-400 text-lg">
          Gere relatórios automáticos da Defesa Civil, por bairro ou históricos.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Situação Atual</h2>
        {riverData ? (
          <div className="space-y-1 text-sm text-slate-300 mb-4">
            <p>Nível do Jacuí: <strong className="text-slate-100">{riverData.current.toFixed(2)}m</strong></p>
            <p>Tendência: <strong className="text-slate-100">{riverData.trend || '---'}</strong></p>
            <p>Residências cadastradas: <strong className="text-slate-100">{residences.length}</strong></p>
            <p>Residências em risco: <strong className="text-red-400">{atRisk.length}</strong></p>
            <p>Bairros afetados: <strong className="text-amber-400">{bairrosAtRisk.length}</strong></p>
            {alertConfig && (
              <p className={`mt-2 ${alertConfig.color} font-medium`}>
                {alertConfig.icon} {alertConfig.level}: {alertConfig.message}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Carregando dados...</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Relatório Defesa Civil</h3>
            <p className="text-sm text-slate-400 mb-4">
              Nível do rio, tendência, áreas de risco, bairros afetados, residências em risco e alertas ativos.
            </p>
          </div>
          <button
            onClick={() => handleExport('defesa', () => exportCivilDefenseReport(riverData, residences, stations, 7))}
            disabled={exporting === 'defesa'}
            className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-300 text-sm"
          >
            {exporting === 'defesa' ? 'Gerando...' : '📄 Gerar relatório'}
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Relatório de Bairro</h3>
            <p className="text-sm text-slate-400 mb-4">
              Relatório detalhado com residências em risco em um bairro específico.
            </p>
            <select
              value={selectedBairro}
              onChange={e => setSelectedBairro(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-sm mb-4"
            >
              <option value="">Selecione um bairro</option>
              {NEIGHBORHOODS.filter(Boolean).map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => selectedBairro && handleExport('bairro', () => exportBairroReport(selectedBairro, residences, riverData))}
            disabled={!selectedBairro || exporting === 'bairro'}
            className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-300 text-sm"
          >
            {exporting === 'bairro' ? 'Gerando...' : '🏘️ Gerar relatório'}
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Relatório Histórico</h3>
            <p className="text-sm text-slate-400 mb-4">
              Comparação com enchentes anteriores. Dados históricos da estação fluviométrica de São Jerônimo.
            </p>
          </div>
          <button
            onClick={() => handleExport('historico', () => exportHistoricalReport(
              { events: HISTORICAL_EVENTS },
              riverData
            ))}
            disabled={exporting === 'historico'}
            className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-300 text-sm"
          >
            {exporting === 'historico' ? 'Gerando...' : '📜 Gerar relatório'}
          </button>
        </div>
      </div>
    </div>
  )
}
