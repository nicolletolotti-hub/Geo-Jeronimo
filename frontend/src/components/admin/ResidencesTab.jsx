import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import LocationPicker from '../LocationPicker'
import { EVAC_STATUS } from '../../constants/statusColors'
import { NEIGHBORHOODS } from '../../constants/neighborhoods'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import { showToast } from '../ui/Toast'

const COMORBIDADES = [
  { key: 'comorbidadeRespiratoria', label: 'Respiratória' },
  { key: 'comorbidadeCardiaca', label: 'Cardíaca' },
  { key: 'comorbidadeDiabetes', label: 'Diabetes' },
  { key: 'comorbidadeRenal', label: 'Renal' },
  { key: 'comorbidadeNeurologica', label: 'Neurológica' },
  { key: 'comorbidadeMobilidade', label: 'Mobilidade reduzida' },
  { key: 'comorbidadeSaudeMental', label: 'Saúde Mental' },
  { key: 'comorbidadeAlergias', label: 'Alergias' },
  { key: 'comorbidadeOxigenio', label: 'Depende O₂' },
  { key: 'comorbidadeQuimioterapia', label: 'Quimioterapia' },
]

function Collapsible({ title, open, onToggle, children }) {
  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors">
        <span className="text-sm font-semibold text-slate-200">{title}</span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${checked ? 'bg-primary-500/10 border-primary-500/40 text-primary-300' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${checked ? 'bg-primary-500 border-primary-500' : 'border-slate-500'}`}>
        {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className="text-sm">{label}</span>
    </label>
  )
}

export default function ResidencesTab() {
  useAuth()
  const [busca, setBusca] = useState('')
  const [residences, setResidences] = useState([])
  const [loading, setLoading] = useState(false)

  const [sections, setSections] = useState({ basic: true, health: false, emergency: false, pets: false, agent: false })
  const [markerPosition, setMarkerPosition] = useState(null)
  const [formData, setFormData] = useState({
    userEmail: '', userName: '',
    address: '', neighborhood: '', residents: 1,
    houseNumber: '', pontosReferencia: '',
    hasElderly: false, hasChildren: false, hasPregnant: false, hasDisabled: false,
    comorbidadeRespiratoria: false, comorbidadeCardiaca: false, comorbidadeDiabetes: false,
    comorbidadeRenal: false, comorbidadeNeurologica: false, comorbidadeMobilidade: false,
    comorbidadeSaudeMental: false, comorbidadeAlergias: false, comorbidadeOxigenio: false, comorbidadeQuimioterapia: false,
    comorbidities: '', medicamentosContinuos: '',
    telefoneContato: '', telefoneEmergencia: '', possuiVeiculo: false,
    acessoSuperior: false, necessitaEnergia: false, abrigoPreferencial: '',
    pets: '', petsInfo: '[]',
    evacuationLogistics: '', shelterPlan: '',
    preventiveAid: '', floodLevel: 10, evacuationLevel: null,
    latitude: null, longitude: null,
    emergencyContactName: '', emergencyContactPhone: '',
    needsEvacuationHelp: false, evacuationReason: '', needsTruck: false,
    shelterDestination: '',
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
        houseNumber: '', pontosReferencia: '',
        hasElderly: false, hasChildren: false, hasPregnant: false, hasDisabled: false,
        comorbidadeRespiratoria: false, comorbidadeCardiaca: false, comorbidadeDiabetes: false,
        comorbidadeRenal: false, comorbidadeNeurologica: false, comorbidadeMobilidade: false,
        comorbidadeSaudeMental: false, comorbidadeAlergias: false, comorbidadeOxigenio: false, comorbidadeQuimioterapia: false,
        comorbidities: '', medicamentosContinuos: '',
        telefoneContato: '', telefoneEmergencia: '', possuiVeiculo: false,
        acessoSuperior: false, necessitaEnergia: false, abrigoPreferencial: '',
        pets: '', petsInfo: '[]',
        evacuationLogistics: '', shelterPlan: '',
        preventiveAid: '', floodLevel: 10, evacuationLevel: null,
        latitude: null, longitude: null,
        emergencyContactName: '', emergencyContactPhone: '',
        needsEvacuationHelp: false, evacuationReason: '', needsTruck: false,
        shelterDestination: '',
        evacuationStatus: 'unknown', agentNotes: '', shelterName: '',
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

  if (loading && residences.length === 0) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400" /></div>
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

        <form onSubmit={handleSubmit} className="space-y-3">

          <Collapsible title="📋 Dados básicos" open={sections.basic} onToggle={() => setSections(p => ({ ...p, basic: !p.basic }))}>
            <div className="grid md:grid-cols-2 gap-3">
              <input placeholder="Nome do cidadão *" value={formData.userName} onChange={e => setFormData(p => ({ ...p, userName: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
              <input placeholder="Email do cidadão" value={formData.userEmail} onChange={e => setFormData(p => ({ ...p, userEmail: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
            </div>
            <LocationPicker position={markerPosition} onPositionChange={pos => { setMarkerPosition(pos); setFormData(p => ({ ...p, latitude: pos.lat, longitude: pos.lng })) }} />
            <div className="grid md:grid-cols-4 gap-3">
              <input placeholder="Endereço" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500 md:col-span-2" />
              <input placeholder="Número" value={formData.houseNumber} onChange={e => setFormData(p => ({ ...p, houseNumber: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
              <select value={formData.neighborhood} onChange={e => setFormData(p => ({ ...p, neighborhood: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
                <option value="">Bairro</option>
                {NEIGHBORHOODS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <input placeholder="Pontos de referência" value={formData.pontosReferencia} onChange={e => setFormData(p => ({ ...p, pontosReferencia: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Moradores</label>
                <input type="number" min="1" value={formData.residents} onChange={e => setFormData(p => ({ ...p, residents: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200" />
              </div>
              <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer ${formData.possuiVeiculo ? 'bg-primary-500/10 border-primary-500/40 text-primary-300' : 'bg-slate-800 border-slate-500 text-slate-400'}`}>
                <input type="checkbox" checked={formData.possuiVeiculo} onChange={e => setFormData(p => ({ ...p, possuiVeiculo: e.target.checked }))} className="sr-only" />
                <span className="text-sm">Possui veículo</span>
              </label>
            </div>
          </Collapsible>

          <Collapsible title="🏥 Saúde" open={sections.health} onToggle={() => setSections(p => ({ ...p, health: !p.health }))}>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Grupos vulneráveis</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['Idoso','Criança','Gestante','PCD'].map((label, i) => {
                  const key = ['hasElderly','hasChildren','hasPregnant','hasDisabled'][i]
                  return <Checkbox key={key} label={label} checked={formData[key]} onChange={() => setFormData(p => ({ ...p, [key]: !p[key] }))} />
                })}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Comorbidades</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {COMORBIDADES.map(c => (
                  <Checkbox key={c.key} label={c.label} checked={formData[c.key]} onChange={() => setFormData(p => ({ ...p, [c.key]: !p[c.key] }))} />
                ))}
              </div>
            </div>
            <textarea placeholder="Observações de saúde / comorbidades" value={formData.comorbidities} onChange={e => setFormData(p => ({ ...p, comorbidities: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" rows="2" />
            <textarea placeholder="Medicações de uso contínuo" value={formData.medicamentosContinuos} onChange={e => setFormData(p => ({ ...p, medicamentosContinuos: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" rows="2" />
          </Collapsible>

          <Collapsible title="🆘 Emergência" open={sections.emergency} onToggle={() => setSections(p => ({ ...p, emergency: !p.emergency }))}>
            <div className="grid md:grid-cols-2 gap-3">
              <input placeholder="Nome contato emergência" value={formData.emergencyContactName} onChange={e => setFormData(p => ({ ...p, emergencyContactName: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
              <input placeholder="Telefone emergência" value={formData.emergencyContactPhone} onChange={e => setFormData(p => ({ ...p, emergencyContactPhone: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
              <input placeholder="Telefone contato" value={formData.telefoneContato} onChange={e => setFormData(p => ({ ...p, telefoneContato: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
              <input placeholder="Telefone emergência alternativo" value={formData.telefoneEmergencia} onChange={e => setFormData(p => ({ ...p, telefoneEmergencia: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer ${formData.needsEvacuationHelp ? 'bg-orange-500/10 border-orange-500/40 text-orange-300' : 'bg-slate-800 border-slate-500 text-slate-400'}`}>
                <input type="checkbox" checked={formData.needsEvacuationHelp} onChange={e => setFormData(p => ({ ...p, needsEvacuationHelp: e.target.checked }))} className="sr-only" />
                <span className="text-sm">Precisa evacuação</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer ${formData.needsTruck ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-500 text-slate-400'}`}>
                <input type="checkbox" checked={formData.needsTruck} onChange={e => setFormData(p => ({ ...p, needsTruck: e.target.checked }))} className="sr-only" />
                <span className="text-sm">Precisa caminhão</span>
              </label>
              <select value={formData.evacuationLogistics} onChange={e => setFormData(p => ({ ...p, evacuationLogistics: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
                <option value="">Logística</option>
                <option value="vehicle">Veículo próprio</option>
                <option value="truck">Caminhão</option>
                <option value="boat">Barco</option>
              </select>
            </div>
            <textarea placeholder="Motivo da evacuação" value={formData.evacuationReason} onChange={e => setFormData(p => ({ ...p, evacuationReason: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" rows="2" />
          </Collapsible>

          <Collapsible title="🐾 Pets" open={sections.pets} onToggle={() => setSections(p => ({ ...p, pets: !p.pets }))}>
            <input placeholder="Pets (texto livre)" value={formData.pets} onChange={e => setFormData(p => ({ ...p, pets: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
          </Collapsible>

          <Collapsible title="🏡 Abrigo e agente" open={sections.agent} onToggle={() => setSections(p => ({ ...p, agent: !p.agent }))}>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nível de Inundação (m)</label>
                <input type="number" step="0.1" value={formData.floodLevel} onChange={e => setFormData(p => ({ ...p, floodLevel: parseFloat(e.target.value) || 10 }))}
                  className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nível Alerta Evacuação (m)</label>
                <div className="flex gap-2">
                  <input type="number" step="0.1" placeholder="Auto" value={formData.evacuationLevel ?? ''} onChange={e => setFormData(p => ({ ...p, evacuationLevel: parseFloat(e.target.value) || null }))}
                    className="flex-1 px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200" />
                  {formData.latitude && formData.longitude && (
                    <button type="button" onClick={async () => {
                      try {
                        const { assessResidenceRisk } = await import('../../utils/riskAssessment')
                        const risk = await assessResidenceRisk(formData.latitude, formData.longitude, null)
                        if (risk.affectedAt) {
                          setFormData(p => ({ ...p, evacuationLevel: Math.max(0, parseFloat((risk.affectedAt - 1).toFixed(2))), floodLevel: risk.affectedAt }))
                        }
                      } catch {}
                    }} className="px-3 py-2 bg-primary-600 text-white text-xs rounded-xl hover:bg-primary-500">
                      Calcular
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <select value={formData.shelterPlan} onChange={e => setFormData(p => ({ ...p, shelterPlan: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
                <option value="">Plano de Abrigo</option>
                <option value="relatives">Casa de parentes</option>
                <option value="public_shelter">Abrigo público</option>
                <option value="hotel">Hotel</option>
                <option value="other">Outro</option>
              </select>
              <input placeholder="Abrigo / destino específico" value={formData.shelterDestination} onChange={e => setFormData(p => ({ ...p, shelterDestination: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <select value={formData.evacuationStatus} onChange={e => setFormData(p => ({ ...p, evacuationStatus: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
                <option value="unknown">Status de evacuação</option>
                <option value="not_rescued">🔴 Aguardando Resgate</option>
                <option value="evacuated">🟢 Evacuado</option>
                <option value="in_shelter">🏠 Em Abrigo</option>
                <option value="with_family">👪 Com Familiares</option>
              </select>
              <textarea placeholder="Observações do agente" value={formData.agentNotes} onChange={e => setFormData(p => ({ ...p, agentNotes: e.target.value }))}
                className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" rows="2" />
            </div>
          </Collapsible>

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
