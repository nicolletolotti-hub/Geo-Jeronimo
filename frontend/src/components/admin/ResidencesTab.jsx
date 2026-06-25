import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import LocationPicker from '../LocationPicker'
import { EVAC_STATUS } from '../../constants/statusColors'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import { showToast } from '../ui/Toast'

export default function ResidencesTab() {
  useAuth()
  const [busca, setBusca] = useState('')
  const [residences, setResidences] = useState([])
  const [, setLoading] = useState(false)

  const [markerPosition, setMarkerPosition] = useState(null)
  const [formData, setFormData] = useState({
    userEmail: '', userName: '',
    address: '', neighborhood: '', residents: 1,
    hasElderly: false, hasChildren: false, hasPregnant: false, hasDisabled: false,
    comorbidities: '', medicamentosContinuos: '', pets: '', evacuationLogistics: '', shelterPlan: '',
    preventiveAid: '', floodLevel: 10, evacuationLevel: null,
    latitude: null, longitude: null,
    evacuationStatus: 'unknown', agentNotes: '', shelterName: '',
  })
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusUpdate, setStatusUpdate] = useState({ id: null, status: 'unknown', shelterName: '', agentNotes: '' })

  const loadResidences = async () => {
    setLoading(true)
    try {
      const res = await api.get('/residence/all?limit=500')
      setResidences(res.data.residences)
    } catch { /* network error */ }
    setLoading(false)
  }

  useEffect(() => { loadResidences() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.post('/residence/agent-register', formData)
      setSuccess('Residência cadastrada com sucesso!')
      showToast('Residência salva com sucesso!', 'success')
      setMarkerPosition(null)
      setFormData({
        userEmail: '', userName: '', address: '', neighborhood: '', residents: 1,
        hasElderly: false, hasChildren: false, hasPregnant: false, hasDisabled: false,
        comorbidities: '', medicamentosContinuos: '', pets: '', evacuationLogistics: '', shelterPlan: '',
        preventiveAid: '', floodLevel: 10, evacuationLevel: null,
        latitude: null, longitude: null, evacuationStatus: 'unknown', agentNotes: '', shelterName: '',
      })
      loadResidences()
    } catch (err) {
      setApiError(err.response?.data?.error || 'Erro ao cadastrar')
      showToast('Erro ao salvar residência', 'error')
    }
    setSaving(false)
  }

  const updateStatus = async (residenceId) => {
    try {
      await api.put(`/residence/${residenceId}/status`, statusUpdate)
      setStatusUpdate({ id: null, status: 'unknown', shelterName: '', agentNotes: '' })
      loadResidences()
      showToast('Status atualizado com sucesso!', 'success')
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atualizar', 'error')
    }
  }

  const filtered = residences.filter(r =>
    r.address?.toLowerCase().includes(busca.toLowerCase()) ||
    r.name?.toLowerCase().includes(busca.toLowerCase()) ||
    r.neighborhood?.toLowerCase().includes(busca.toLowerCase()) ||
    r.email?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">👤 Cadastrar Residência (por Agente)</h2>
        {apiError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4">{apiError}</div>}
        {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input placeholder="Nome do cidadão (obrigatório)" value={formData.userName} onChange={e => setFormData(p => ({ ...p, userName: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            <input placeholder="Email do cidadão" value={formData.userEmail} onChange={e => setFormData(p => ({ ...p, userEmail: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <LocationPicker position={markerPosition} onPositionChange={pos => { setMarkerPosition(pos); setFormData(p => ({ ...p, latitude: pos.lat, longitude: pos.lng })) }} />
          <div className="grid md:grid-cols-3 gap-4">
            <input placeholder="Endereço completo" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500 md:col-span-2" />
            <select value={formData.neighborhood} onChange={e => setFormData(p => ({ ...p, neighborhood: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
              <option value="">Bairro</option>
              {['Centro','Bela Vista','Cidade Alta','Cidade Baixa','Fátima','Bandeira Branca','Santo Antônio','Santa Rita','São Francisco','São Thomás','Lago Parque Clube',"Passo D'Areia",'Princesa Isabel','Quininho','Vila Nova','Medianeira','Olaria','Estaleiro','Beira Rio','Lindos Ares','Padre Reus','Piratini','Sol Nascente'].map(b =>
                <option key={b} value={b}>{b}</option>
              )}
            </select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Idoso','Criança','Gestante','PCD'].map((label, i) => {
              const key = ['hasElderly','hasChildren','hasPregnant','hasDisabled'][i]
              return (
                <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${formData[key] ? 'bg-primary-500/10 border-primary-500/40 text-primary-300' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                  <input type="checkbox" checked={formData[key]} onChange={e => setFormData(p => ({ ...p, [key]: e.target.checked }))} className="sr-only" />
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${formData[key] ? 'bg-primary-500 border-primary-500' : 'border-slate-500'}`}>
                    {formData[key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-sm">{label}</span>
                </label>
              )
            })}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nº de Moradores</label>
              <input type="number" placeholder="Ex: 4" value={formData.residents} onChange={e => setFormData(p => ({ ...p, residents: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200" min="1" />
            </div>
            <select value={formData.evacuationLogistics} onChange={e => setFormData(p => ({ ...p, evacuationLogistics: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
              <option value="">Logística de Evacuação</option>
              <option value="vehicle">Veículo próprio</option>
              <option value="truck">Precisa de caminhão</option>
              <option value="boat">Precisa de barco</option>
            </select>
            <select value={formData.shelterPlan} onChange={e => setFormData(p => ({ ...p, shelterPlan: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
              <option value="">Plano de Abrigo</option>
              <option value="relatives">Casa de parentes</option>
              <option value="public_shelter">Abrigo público</option>
              <option value="hotel">Hotel</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nível de Inundação (m)</label>
              <input type="number" step="0.1" placeholder="Ex: 7.5" value={formData.floodLevel} onChange={e => setFormData(p => ({ ...p, floodLevel: parseFloat(e.target.value) || 10 }))}
                className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nível de Alerta (evacuação em m)</label>
              <div className="flex gap-2">
                <input type="number" step="0.1" placeholder="Auto" value={formData.evacuationLevel ?? ''} onChange={e => setFormData(p => ({ ...p, evacuationLevel: parseFloat(e.target.value) || null }))}
                  className="flex-1 px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200" />
                {formData.latitude && formData.longitude && (
                  <button type="button" onClick={async () => {
                    try {
                      const { assessResidenceRisk } = await import('../../utils/riskAssessment')
                      const risk = await assessResidenceRisk(formData.latitude, formData.longitude, null)
                      if (risk.affectedAt) {
                        const evac = Math.max(0, parseFloat((risk.affectedAt - 1).toFixed(2)))
                        setFormData(p => ({ ...p, evacuationLevel: evac, floodLevel: risk.affectedAt }))
                      }
                    } catch { /* risk assessment may fail if no flood data */ }
                  }} className="px-3 py-2 bg-primary-600 text-white text-xs rounded-xl hover:bg-primary-500" title="Calcular automaticamente pela topografia">
                    Calcular
                  </button>
                )}
              </div>
            </div>
            <input placeholder="Abrigo / Local atual" value={formData.shelterName} onChange={e => setFormData(p => ({ ...p, shelterName: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <textarea placeholder="Medicações de uso contínuo do cidadão" value={formData.medicamentosContinuos} onChange={e => setFormData(p => ({ ...p, medicamentosContinuos: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" rows="1" />
            <input placeholder="Comorbidades (separadas por vírgula)" value={formData.comorbidities} onChange={e => setFormData(p => ({ ...p, comorbidities: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <select value={formData.evacuationStatus} onChange={e => setFormData(p => ({ ...p, evacuationStatus: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
              <option value="unknown">Status de evacuação</option>
              <option value="not_rescued">🔴 Aguardando Resgate</option>
              <option value="evacuated">🟢 Evacuado</option>
              <option value="in_shelter">🏠 Em Abrigo</option>
              <option value="with_family">👪 Com Familiares</option>
            </select>
            <textarea placeholder="Observações do agente" value={formData.agentNotes} onChange={e => setFormData(p => ({ ...p, agentNotes: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" rows="1" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-500 disabled:opacity-50 font-semibold transition-all shadow-lg shadow-primary-600/20"
          >{saving ? 'Salvando...' : 'Cadastrar Residência'}</button>
        </form>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">📋 Residências Cadastradas</h2>
          <input placeholder="Buscar por endereço, nome ou bairro..." value={busca} onChange={e => setBusca(e.target.value)}
            className="px-4 py-2 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500 w-72" />
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Cidadão</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Endereço</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Ações</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.address}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.neighborhood}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.evacuation_status === 'not_rescued' ? 'danger' : r.evacuation_status === 'evacuated' ? 'success' : r.evacuation_status === 'in_shelter' ? 'info' : r.evacuation_status === 'with_family' ? 'info' : 'neutral'}>
                      {EVAC_STATUS[r.evacuation_status]?.label || '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {statusUpdate.id === r.id ? (
                      <div className="flex gap-2 items-center">
                        <select value={statusUpdate.status} onChange={e => setStatusUpdate(p => ({ ...p, status: e.target.value }))}
                          className="px-2 py-1 text-xs border border-slate-700 rounded-xl bg-slate-800 text-slate-200">
                          {Object.entries(EVAC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <input placeholder="Abrigo" value={statusUpdate.shelterName} onChange={e => setStatusUpdate(p => ({ ...p, shelterName: e.target.value }))}
                          className="px-2 py-1 text-xs border border-slate-700 rounded-xl bg-slate-800 text-slate-200 w-24" />
                        <button onClick={() => updateStatus(r.id)} className="px-2 py-1 bg-primary-600 text-white text-xs rounded-xl">Salvar</button>
                        <button onClick={() => setStatusUpdate({ id: null, status: 'unknown', shelterName: '', agentNotes: '' })} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-xl">X</button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button onClick={() => setStatusUpdate({ id: r.id, status: r.evacuation_status || 'unknown', shelterName: r.shelter_name || '', agentNotes: '' })}
                          className="px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded-xl hover:bg-slate-600 transition-all">
                          Atualizar Status
                        </button>
                        <button onClick={async () => {
                          try {
                            await api.delete(`/residence/${r.id}`)
                            loadResidences()
                            showToast('Residência removida com sucesso!', 'success')
                          } catch (err) { showToast(err.response?.data?.error || 'Erro ao remover residência', 'error') }
                        }} className="p-1.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/40 transition-all"
                          title="Excluir residência">
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6">
                    <EmptyState
                      icon="🏠"
                      title="Nenhuma residência encontrada"
                      description="Nenhuma residência foi encontrada na busca."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
