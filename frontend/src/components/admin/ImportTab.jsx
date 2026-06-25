import { useState, useEffect } from 'react'
import api from '../../services/api'
import EmptyState from '../ui/EmptyState'
import { showToast } from '../ui/Toast'

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
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])

  const loadLogs = async () => {
    try {
      const res = await api.get('/import/logs')
      setLogs(res.data)
    } catch { /* network error */ }
  }

  useEffect(() => { loadLogs() }, [])

  const handleUpload = async () => {
    if (!file) { setError('Selecione um arquivo'); return }
    setError('')
    setResult(null)
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/import/excel', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
      loadLogs()
      showToast('Dados importados com sucesso!', 'success')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao importar')
      showToast('Erro ao importar dados', 'error')
    }
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-1">Importar Residências por Planilha</h2>
        <p className="text-sm text-slate-400 mb-6">
          Faça upload de um arquivo <strong>.xlsx</strong> com os dados dos munícipes. A primeira linha deve conter os cabeçalhos (em português ou inglês).
        </p>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4">{error}</div>}
        {result && (
          <div className={`${result.errors?.length ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'} border px-4 py-3 rounded-xl mb-4`}>
            <p>{result.imported} residências importadas{result.skipped ? `, ${result.skipped} ignoradas` : ''}.</p>
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

        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-primary-500/50 transition-all mb-6">
          <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files[0])} className="hidden" id="excel-upload" />
          <label htmlFor="excel-upload" className="cursor-pointer">
            <div className="text-4xl mb-3 text-slate-500">📁</div>
            <p className="text-slate-300 font-medium mb-1">{file ? file.name : 'Clique para selecionar o arquivo'}</p>
            <p className="text-xs text-slate-500">Formatos aceitos: .xlsx</p>
          </label>
        </div>

        <button onClick={handleUpload} disabled={!file || uploading}
          className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-500 disabled:opacity-50 font-semibold transition-all shadow-lg shadow-primary-600/20"
        >{uploading ? 'Importando...' : 'Importar Planilha'}</button>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Modelo de Planilha</h2>
        <p className="text-sm text-slate-400 mb-4">A planilha deve conter as seguintes colunas (a ordem não importa):</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {COLUNAS_MODELO.map(col => (
            <div key={col} className="px-4 py-2 bg-slate-800/50 rounded-lg text-sm text-slate-300 font-mono border border-slate-700">
              {col}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Colunas opcionais: endereco, bairro, endereço, bairro (versões em português também são reconhecidas).
          Valores booleanos: &quot;sim&quot;, &quot;s&quot;, &quot;true&quot;, &quot;1&quot; para verdadeiro; &quot;não&quot;, &quot;nao&quot;, &quot;n&quot;, &quot;false&quot;, &quot;0&quot; para falso.
        </p>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Histórico de Importações</h2>
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

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
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
            } catch { alert('Erro ao exportar CSV'); showToast('Erro ao exportar CSV', 'error') }
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
