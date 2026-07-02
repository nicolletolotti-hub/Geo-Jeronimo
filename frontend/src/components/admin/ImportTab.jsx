import { useState, useEffect } from 'react'
import api from '../../services/api'
import EmptyState from '../ui/EmptyState'
import { showToast } from '../ui/Toast'
import { NEIGHBORHOODS } from '../../constants/neighborhoods'

const COLUNAS_MODELO = [
  'address (Endereço)',
  'neighborhood (Bairro)',
  'residents (Moradores)',
  'name (Nome do cidadão)',
  'email (Email do cidadão)',
  'phone (Telefone)',
  'hasElderly (Possui idoso)',
  'hasChildren (Possui criança)',
  'hasPregnant (Possui gestante)',
  'hasDisabled (Possui PCD)',
  'evacuationLogistics (Logística: boat, vehicle, truck)',
  'shelterPlan (Plano abrigo: public_shelter, relatives, hotel, other)',
  'floodLevel (Nível de inundação em metros)',
]

export default function ImportTab() {
  const [file, setFile] = useState(null)
  const [neighborhood, setNeighborhood] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])
  const [cleaningUp, setCleaningUp] = useState(false)

  const loadLogs = async () => {
    try {
      const res = await api.get('/import/logs')
      setLogs(res.data)
    } catch { /* network error */ }
  }

  useEffect(() => { loadLogs() }, [])

  const resetFile = () => {
    setFile(null)
    setPreview(null)
  }

  const handleAnalyze = async () => {
    if (!file) { setError('Selecione um arquivo'); return }
    setError('')
    setResult(null)
    setPreview(null)
    setAnalyzing(true)
    const form = new FormData()
    form.append('file', file)
    form.append('dryRun', 'true')
    if (neighborhood) form.append('defaultNeighborhood', neighborhood)
    try {
      const res = await api.post('/import/excel', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPreview(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao analisar planilha')
      showToast('Erro ao analisar planilha', 'error')
    }
    setAnalyzing(false)
  }

  const handleConfirm = async () => {
    if (!file) { setError('Selecione um arquivo'); return }
    setError('')
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    if (neighborhood) form.append('defaultNeighborhood', neighborhood)
    try {
      const res = await api.post('/import/excel', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
      setPreview(null)
      setFile(null)
      loadLogs()
      showToast('Dados importados com sucesso!', 'success')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao importar')
      showToast('Erro ao importar dados', 'error')
    }
    setUploading(false)
  }

  const handleCleanupOrphans = async () => {
    setCleaningUp(true)
    try {
      const res = await api.delete('/import/cleanup-orphans')
      showToast(res.data.message, res.data.deleted > 0 ? 'success' : 'info')
    } catch {
      showToast('Erro ao limpar contas órfãs', 'error')
    }
    setCleaningUp(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-1">Importar Residências por Planilha</h2>
        <p className="text-sm text-slate-400 mb-2">
          Aceita dois formatos: planilhas genéricas (1 linha = 1 residência, com colunas endereço/bairro)
          e planilhas de saúde dos ACS (1 aba por rua, 1 linha por morador, colunas Nº da casa/Moradores/HAS/DM/...).
          Os dois formatos podem estar no mesmo arquivo, em abas diferentes.
        </p>
        <p className="text-sm text-slate-400 mb-6">
          As planilhas de saúde não trazem coluna de bairro — o bairro de cada rua é detectado automaticamente
          pela localização estimada (uma micro área geralmente cruza vários bairros). O campo abaixo só é usado
          como bairro de reserva para ruas que não puderem ser localizadas automaticamente; se ficar em branco,
          essas ruas ficam sem bairro e não são importadas.
          A localização de cada casa é estimada automaticamente pelo nome da rua; quando isso não for possível, ajuste o pino manualmente depois, na aba Residências.
        </p>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4">{error}</div>}
        {result && (
          <div className={`${result.errors?.length ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'} border px-4 py-3 rounded-xl mb-4`}>
            <p>{result.imported} residências importadas{result.updated ? `, ${result.updated} atualizadas` : ''}{result.skipped ? `, ${result.skipped} ignoradas` : ''}.</p>
            {result.perSheet?.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer hover:underline">Detalhe por aba/rua ({result.perSheet.length})</summary>
                <div className="mt-1 max-h-40 overflow-y-auto space-y-0.5 text-xs">
                  {result.perSheet.map((s, i) => (
                    <p key={i}>{s.sheet} ({s.format}{s.neighborhood ? ` — ${s.neighborhood}` : ''}): {s.imported} importadas{s.updated ? `, ${s.updated} atualizadas` : ''}, {s.skipped} ignoradas</p>
                  ))}
                </div>
              </details>
            )}
            {result.warnings?.length > 0 && (
              <div className="mt-2 text-xs text-slate-400">
                {result.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
              </div>
            )}
            {result.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-amber-400 cursor-pointer hover:text-amber-300">Erros ({result.errors.length})</summary>
                <div className="mt-1 max-h-40 overflow-y-auto space-y-0.5">
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-red-400">✕ {e}</p>)}
                </div>
              </details>
            )}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Bairro de reserva (opcional — só usado se a rua não puder ser localizada automaticamente)
          </label>
          <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100">
            <option value="">Nenhum (ruas não localizadas ficam de fora)</option>
            {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-primary-500/50 transition-all mb-6">
          <input type="file" accept=".xlsx,.xls" onChange={e => { setFile(e.target.files[0]); setPreview(null); setResult(null) }} className="hidden" id="excel-upload" />
          <label htmlFor="excel-upload" className="cursor-pointer">
            <div className="text-4xl mb-3 text-slate-500">📁</div>
            <p className="text-slate-300 font-medium mb-1">{file ? file.name : 'Clique para selecionar o arquivo'}</p>
            <p className="text-xs text-slate-500">Formatos aceitos: .xlsx</p>
          </label>
        </div>

        {!preview && (
          <button onClick={handleAnalyze} disabled={!file || analyzing}
            className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-500 disabled:opacity-50 font-semibold transition-all shadow-lg shadow-primary-600/20"
          >{analyzing ? 'Analisando...' : 'Analisar Planilha'}</button>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Pré-visualização (nada foi salvo ainda)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{preview.imported}</div>
                  <div className="text-xs text-slate-400">seriam importadas (novas)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-sky-400">{preview.updated || 0}</div>
                  <div className="text-xs text-slate-400">seriam atualizadas (já existiam)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-400">{preview.skipped}</div>
                  <div className="text-xs text-slate-400">seriam ignoradas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-300">{preview.noGeocode}</div>
                  <div className="text-xs text-slate-400">sem lat/long (geocodificação manual depois)</div>
                </div>
              </div>
              {preview.perSheet?.length > 0 && (
                <details className="mb-2">
                  <summary className="text-xs cursor-pointer hover:underline text-slate-300">Detalhe por aba/rua ({preview.perSheet.length})</summary>
                  <div className="mt-1 max-h-40 overflow-y-auto space-y-0.5 text-xs text-slate-300">
                    {preview.perSheet.map((s, i) => (
                      <p key={i}>{s.sheet} ({s.format}{s.neighborhood ? ` — ${s.neighborhood}` : ''}): {s.imported} seriam importadas{s.updated ? `, ${s.updated} seriam atualizadas` : ''}, {s.skipped} seriam ignoradas</p>
                    ))}
                  </div>
                </details>
              )}
              {preview.warnings?.length > 0 && (
                <div className="mt-2 text-xs text-slate-400">
                  {preview.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
                </div>
              )}
              {preview.errors?.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-amber-400 cursor-pointer hover:text-amber-300">Erros ({preview.errors.length})</summary>
                  <div className="mt-1 max-h-40 overflow-y-auto space-y-0.5">
                    {preview.errors.map((e, i) => <p key={i} className="text-xs text-red-400">✕ {e}</p>)}
                  </div>
                </details>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={resetFile}
                className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-700 font-semibold transition-all"
              >Cancelar</button>
              <button onClick={handleConfirm} disabled={uploading || (preview.imported === 0 && !preview.updated)}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-500 disabled:opacity-50 font-semibold transition-all shadow-lg shadow-emerald-600/20"
              >{uploading ? 'Importando...' : `Confirmar Importação (${preview.imported}${preview.updated ? ` + ${preview.updated} atualizações` : ''})`}</button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Modelo de Planilha Genérica</h2>
        <p className="text-sm text-slate-400 mb-4">A planilha genérica deve conter as seguintes colunas (a ordem não importa):</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {COLUNAS_MODELO.map(col => (
            <div key={col} className="px-4 py-2 bg-slate-800/50 rounded-xl text-sm text-slate-300 font-mono border border-slate-700">
              {col}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Colunas opcionais: endereco, bairro, endereço, bairro (versões em português também são reconhecidas).
          Valores booleanos: &quot;sim&quot;, &quot;s&quot;, &quot;true&quot;, &quot;1&quot; para verdadeiro; &quot;não&quot;, &quot;nao&quot;, &quot;n&quot;, &quot;false&quot;, &quot;0&quot; para falso.
        </p>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">Histórico de Importações</h2>
          <button onClick={handleCleanupOrphans} disabled={cleaningUp}
            className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50"
            title="Remove contas de usuário criadas por uma importação que falhou antes de gravar a residência (sem residência associada)"
          >{cleaningUp ? 'Limpando...' : 'Limpar contas órfãs'}</button>
        </div>
        {logs.length === 0 ? (
          <EmptyState
            icon="📥"
            title="Nenhuma importação realizada"
            description="Nenhuma importação foi realizada ainda. Faça upload de uma planilha para começar."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Importadas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Ignoradas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Arquivo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Importado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm text-slate-300">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-100">{l.imported_rows}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{l.skipped_rows}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 font-mono text-xs">{l.filename}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{l.imported_by_name || l.imported_by_email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-1">Exportar CSV</h2>
        <p className="text-sm text-slate-400 mb-6">
          Baixe todas as residências cadastradas em formato CSV para análise em planilhas.
        </p>
        <button
          onClick={async () => {
            try {
              const resp = await api.get('/residence/export/csv', { responseType: 'blob' })
              const url = URL.createObjectURL(resp.data)
              const a = document.createElement('a')
              a.href = url; a.download = 'residencias.csv'
              document.body.appendChild(a); a.click()
              document.body.removeChild(a); URL.revokeObjectURL(url)
              showToast('CSV exportado com sucesso!', 'success')
            } catch { showToast('Erro ao exportar CSV', 'error') }
          }}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-500 font-semibold transition-all shadow-lg shadow-emerald-600/20"
        >
          <span className="text-lg">⬇</span>
          Exportar CSV
        </button>
      </div>
    </div>
  )
}
