import { useState, useEffect } from 'react'
import api from '../services/api'

const HISTORICAL_EVENTS = [
  { year: 'Maio/1941', level: 13.50, description: 'Maior enchente registrada em São Jerônimo. Rio Jacuí atingiu 13,50m em 06/05/1941.' },
  { year: 'Maio/2024', level: 12.75, description: 'Segunda maior enchente. Pico de 12,75m em 03/05/2024. Cidade ficou isolada.' },
]

const LEVEL_DATA_2024 = [
  { date: '28/04', level: 3.5 },
  { date: '29/04', level: 5.2 },
  { date: '30/04', level: 7.8 },
  { date: '01/05', level: 9.1 },
  { date: '02/05', level: 11.4 },
  { date: '03/05', level: 12.75 },
  { date: '04/05', level: 12.3 },
  { date: '05/05', level: 11.8 },
  { date: '06/05', level: 10.9 },
  { date: '07/05', level: 9.7 },
  { date: '08/05', level: 8.5 },
  { date: '09/05', level: 7.4 },
  { date: '10/05', level: 6.3 },
  { date: '12/05', level: 5.1 },
  { date: '15/05', level: 4.0 },
]

export default function HistoricoEnchente2024() {
  const [riverData, setRiverData] = useState(null)

  useEffect(() => {
    api.get('/river/current').then(r => setRiverData(r.data)).catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-3 tracking-tight">
          Enchente de Maio de 2024 — São Jerônimo
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Contexto histórico do maior desastre hidrológico já registrado no Rio Grande do Sul e seus impactos no município de São Jerônimo.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Resumo do Evento</h2>
        <div className="space-y-3 text-slate-300 leading-relaxed">
          <p>
            Entre o final de abril e o início de maio de 2024, o Rio Grande do Sul foi atingido por chuvas extremas
            com acumulados superiores a <strong>900 mm em 14 dias</strong> em várias regiões do estado. A bacia do
            Rio Jacuí, com área de drenagem de aproximadamente <strong>72.000 km²</strong>, recebeu um volume de água
            sem precedentes, resultando na maior cheia já registrada em diversos municípios.
          </p>
          <p>
            Em São Jerônimo, o Rio Jacuí atingiu <strong>12,75 metros</strong> no dia <strong>3 de maio de 2024</strong>,
            conforme levantamento do Serviço Geológico do Brasil (SGB). Esse foi o segundo maior nível já registrado na
            estação fluviométrica centenária do município, perdendo apenas para os <strong>13,50 metros</strong> da
            enchente histórica de <strong>maio de 1941</strong>.
          </p>
          <p>
            A cidade ficou completamente <strong>ilhada</strong> por vários dias, com o Exército Brasileiro realizando
            operações de lançamento de donativos por paraquedas a partir do dia 9 de maio. Dezenas de casas foram
            destruídas e centenas de famílias ficaram desabrigadas. O evento afetou diretamente milhares de moradores
            nos bairros mais próximos ao leito do rio.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Contexto Climático</h2>
        <div className="space-y-3 text-slate-300 leading-relaxed">
          <p>
            O evento foi causado por uma combinação de fatores meteorológicos extremos: uma corrente de jato
            persistente sobre o Sul do Brasil, combinada com um cavado de baixa pressão atmosférica e intenso
            transporte de umidade da Amazônia, resultou em precipitações contínuas e volumosas.
          </p>
          <p>
            Segundo estudo apresentado no XXVI Simpósio Brasileiro de Recursos Hídricos (2025), a modelagem
            hidrológica mostrou respostas rápidas nas regiões serranas (elevações de até 20m, duração até 5 dias)
            e inundações prolongadas nas planícies do Jacuí, com durações superiores a <strong>30 dias</strong>
            e variações de nível de até 3 metros.
          </p>
          <p>
            A estação fluviométrica de São Jerônimo, que completou <strong>100 anos de operação</strong> em 2026,
            forneceu dados essenciais para o monitoramento e documentação deste evento histórico.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Evolução do Nível do Rio Jacuí</h2>
        <p className="text-sm text-slate-400 mb-4">Níveis estimados em São Jerônimo durante o evento de maio de 2024 (fonte: SGB)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left py-2 pr-4">Data</th>
                <th className="text-left py-2 pr-4">Nível (m)</th>
                <th className="text-left py-2">Visualização</th>
              </tr>
            </thead>
            <tbody>
              {LEVEL_DATA_2024.map((entry, idx) => {
                const maxLevel = 13.5
                const pct = (entry.level / maxLevel) * 100
                return (
                  <tr key={idx} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2 pr-4 font-medium">{entry.date}</td>
                    <td className="py-2 pr-4 font-mono">{entry.level.toFixed(2)}m</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 rounded bg-slate-800 overflow-hidden flex-1 max-w-[200px]">
                          <div
                            className={`h-full rounded transition-all duration-500 ${
                              entry.level >= 10 ? 'bg-red-500' : entry.level >= 7 ? 'bg-amber-500' : entry.level >= 4 ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs ${
                          entry.level >= 10 ? 'text-red-400' : entry.level >= 7 ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          {entry.level >= 12 ? 'PICO' : entry.level >= 7 ? 'ALERTA' : ''}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Comparação: Maio de 2024 x Nível Atual</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {HISTORICAL_EVENTS.map((evt, idx) => (
            <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">{idx === 0 ? '📅' : '🌊'}</div>
              <p className="text-sm text-slate-400">{evt.year}</p>
              <p className="text-3xl font-bold text-red-400 my-1">{evt.level.toFixed(2)}m</p>
              <p className="text-xs text-slate-500">{evt.description.split('.')[0]}.</p>
            </div>
          ))}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm text-slate-400">Nível Atual</p>
            <p className={`text-3xl font-bold my-1 ${riverData?.current && riverData.current >= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {riverData?.current ? `${riverData.current.toFixed(2)}m` : '---'}
            </p>
            <p className="text-xs text-slate-500">Rio Jacuí agora</p>
          </div>
        </div>
        {riverData?.current && (
          <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-400">
            <p>
              O pico de maio de 2024 (12,75m) foi <strong className="text-red-400">
                {Math.abs(12.75 - riverData.current).toFixed(2)}m
              </strong> acima do nível atual do rio.
              {riverData.current >= 7
                ? ' Atenção: nível atual elevado.'
                : ' Nível atual dentro da normalidade.'}
            </p>
          </div>
        )}
      </div>

      <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-6">
        <h2 className="text-lg font-bold text-blue-300 mb-3">Sobre os Dados</h2>
        <p className="text-sm text-blue-200/80 leading-relaxed">
          Os dados apresentados nesta página são baseados em informações públicas do Serviço Geológico do Brasil (SGB),
          Agência Nacional de Águas (ANA), Defesa Civil de São Jerônimo, e reportagens veiculadas à época do evento.
          O nível de 12,75m em 03/05/2024 foi confirmado pelo SGB em nota técnica publicada em 2026 (16ª versão).
          A estrutura desta página permite a inserção de dados mais detalhados à medida que novos levantamentos
          oficiais forem publicados.
        </p>
      </div>
    </div>
  )
}
