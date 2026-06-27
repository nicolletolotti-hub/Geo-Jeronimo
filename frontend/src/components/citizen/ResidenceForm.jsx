import { useState } from 'react'
import api from '../../services/api'
import { ResidenceFormSchema, validateForm } from '../../utils/validation'
import { assessResidenceRisk } from '../../utils/riskAssessment'
import { NEIGHBORHOODS } from '../../constants/neighborhoods'
import LocationPicker from '../LocationPicker'
import { showToast } from '../ui/Toast'

function snakeToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    acc[camelKey] = obj[key]
    return acc
  }, {})
}

export default function ResidenceForm({ initialData, onSuccess }) {
  const [formData, setFormData] = useState(snakeToCamel(initialData) || {
    houseNumber: '',
    address: '',
    neighborhood: '',
    residents: 1,
    comorbidities: '',
    hasElderly: false, hasChildren: false, hasPregnant: false, hasDisabled: false,
    comorbidadeRespiratoria: false, comorbidadeCardiaca: false, comorbidadeDiabetes: false,
    comorbidadeRenal: false, comorbidadeNeurologica: false, comorbidadeMobilidade: false,
    comorbidadeSaudeMental: false, comorbidadeAlergias: false, comorbidadeOxigenio: false, comorbidadeQuimioterapia: false,
    telefoneContato: '', telefoneEmergencia: '',
    possuiVeiculo: false, possuiAnimaisGrandePorte: false, acessoSuperior: false,
    medicamentosContinuos: '', necessitaEnergia: false,
    abrigoPreferencial: '', pontosReferencia: '',
    pets: '',
    evacuationLogistics: '',
    shelterPlan: '',
    preventiveAid: '',
    latitude: null,
    longitude: null,
    floodLevel: null,
    evacuationLevel: null,
  })
  const [markerPosition, setMarkerPosition] = useState(
    initialData?.latitude && initialData?.longitude
      ? { lat: initialData.latitude, lng: initialData.longitude }
      : null
  )
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [calculatingRisk, setCalculatingRisk] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'residents' ? parseInt(value) || 0 : value
    }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handlePositionChange = async (pos) => {
    setMarkerPosition(pos)
    setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng, address: pos.address || prev.address }))
    setCalculatingRisk(true)
    try {
      const risk = await assessResidenceRisk(pos.lat, pos.lng, null)
      if (risk.affectedAt) {
        const floodLevel = risk.affectedAt
        const evacuationLevel = Math.max(0, parseFloat((floodLevel - 1).toFixed(2)))
        setFormData(prev => ({ ...prev, floodLevel, evacuationLevel }))
      }
    } catch { /* assessResidenceRisk may fail if no flood data for this location */ }
    setCalculatingRisk(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    const validation = validateForm(ResidenceFormSchema, formData)
    if (!validation.valid) { setErrors(validation.errors); return }

    const submitData = {
      ...validation.data,
      evacuationLogistics: validation.data.evacuationLogistics || 'vehicle',
      shelterPlan: validation.data.shelterPlan || 'relatives',
      floodLevel: formData.floodLevel || 10,
      evacuationLevel: formData.evacuationLevel ?? undefined,
      latitude: formData.latitude ?? undefined,
      longitude: formData.longitude ?? undefined,
    }

    setLoading(true)
    try {
      await api.post('/residence', submitData)
      showToast('Residência registrada com sucesso!', 'success')
      onSuccess()
    } catch (error) {
      const details = error.response?.data?.details
      if (details) {
        setErrors(details.reduce((acc, detail) => {
          const key = detail.split(':')[0]
          acc[key] = detail
          return acc
        }, {}))
      } else {
        setApiError(error.response?.data?.error || 'Erro ao salvar')
        showToast('Erro ao registrar residência', 'error')
      }
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 border-t border-slate-700 pt-6 mt-6">
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">{apiError}</div>
      )}

      <LocationPicker position={markerPosition} onPositionChange={handlePositionChange} />
      {calculatingRisk && <p className="text-xs text-primary-400 animate-pulse">Calculando nível de risco...</p>}
      {formData.floodLevel && !calculatingRisk && (
        <p className="text-xs text-slate-400">
          Nível de inundação estimado: <span className="text-primary-400 font-semibold">{formData.floodLevel}m</span>
        </p>
      )}
      {formData.evacuationLevel && !calculatingRisk && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-lg">
          Nível de alerta para evacuação: <span className="font-bold">{formData.evacuationLevel}m</span>
          — Quando o rio atingir este nível, prepare-se para sair de casa.
        </p>
      )}

      <div>
        <label htmlFor="address" className="block text-sm font-semibold text-slate-300 mb-2">Rua / Logradouro <span className="text-red-400">*</span></label>
        <input id="address" name="address" type="text" value={formData.address} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
            errors.address ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        />
        {errors.address && <p className="text-red-400 text-sm mt-1 font-medium">{errors.address}</p>}
      </div>
      <div>
        <label htmlFor="houseNumber" className="block text-sm font-semibold text-slate-300 mb-2">Número</label>
        <input id="houseNumber" name="houseNumber" type="text" value={formData.houseNumber} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
            errors.houseNumber ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        />
        {errors.houseNumber && <p className="text-red-400 text-sm mt-1 font-medium">{errors.houseNumber}</p>}
      </div>

      <div>
        <label htmlFor="neighborhood" className="block text-sm font-semibold text-slate-300 mb-2">Bairro <span className="text-red-400">*</span></label>
        <select id="neighborhood" name="neighborhood" value={formData.neighborhood} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 ${
            errors.neighborhood ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <option value="">Selecione um bairro</option>
          {NEIGHBORHOODS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {errors.neighborhood && <p className="text-red-400 text-sm mt-1 font-medium">{errors.neighborhood}</p>}
      </div>

      <div>
        <label htmlFor="residents" className="block text-sm font-semibold text-slate-300 mb-2">Quantidade de Moradores <span className="text-red-400">*</span></label>
        <select id="residents" name="residents" value={formData.residents} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 ${
            errors.residents ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <option value="">Selecione</option>
          <option value={0}>Nenhum (residência vazia)</option>
          {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n} {n === 1 ? 'morador' : 'moradores'}</option>
          ))}
        </select>
        {errors.residents && <p className="text-red-400 text-sm mt-1 font-medium">{errors.residents}</p>}
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <p className="text-sm font-semibold text-slate-300 mb-3">Grupos Vulneráveis na Residência</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'hasElderly', label: 'Idoso(s)' },
            { key: 'hasChildren', label: 'Criança(s)' },
            { key: 'hasPregnant', label: 'Gestante(s)' },
            { key: 'hasDisabled', label: 'PCD / Mobilidade Reduzida' },
          ].map(({ key, label }) => (
            <label key={key}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                formData[key] ? 'bg-primary-500/10 border-primary-500/40 text-primary-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <input type="checkbox" name={key} checked={formData[key] || false} onChange={(e) => {
                const { name, checked } = e.target
                setFormData(prev => ({ ...prev, [name]: checked }))
              }} className="sr-only" />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                formData[key] ? 'bg-primary-500 border-primary-500' : 'border-slate-500'
              }`}>
                {formData[key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <p className="text-sm font-semibold text-slate-300 mb-3">Comorbidades</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { key: 'comorbidadeRespiratoria', label: 'Respiratório' },
            { key: 'comorbidadeCardiaca', label: 'Cardíaco' },
            { key: 'comorbidadeDiabetes', label: 'Diabetes' },
            { key: 'comorbidadeRenal', label: 'Renal (diálise)' },
            { key: 'comorbidadeNeurologica', label: 'Neurológico' },
            { key: 'comorbidadeMobilidade', label: 'Mobilidade reduzida' },
            { key: 'comorbidadeSaudeMental', label: 'Saúde mental' },
            { key: 'comorbidadeAlergias', label: 'Alergias' },
            { key: 'comorbidadeOxigenio', label: 'Dependência de O₂' },
            { key: 'comorbidadeQuimioterapia', label: 'Quimioterapia' },
          ].map(({ key, label }) => (
            <label key={key}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                formData[key] ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <input type="checkbox" name={key} checked={formData[key] || false} onChange={(e) => {
                const { name, checked } = e.target
                setFormData(prev => ({ ...prev, [name]: checked }))
              }} className="sr-only" />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                formData[key] ? 'bg-amber-500 border-amber-500' : 'border-slate-500'
              }`}>
                {formData[key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comorbidities" className="block text-sm font-semibold text-slate-300 mb-2">Outras Comorbidades / Observações Médicas</label>
        <textarea id="comorbidities" name="comorbidities" value={formData.comorbidities} onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500" rows="2"
        />
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <p className="text-sm font-semibold text-slate-300 mb-3">Contato e Informações Adicionais</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Telefone / WhatsApp</label>
            <input name="telefoneContato" type="tel" placeholder="(51) 99999-9999" value={formData.telefoneContato} onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Telefone de Emergência</label>
            <input name="telefoneEmergencia" type="tel" placeholder="(51) 99999-9999" value={formData.telefoneEmergencia} onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Medicamentos de Uso Contínuo</label>
            <input name="medicamentosContinuos" type="text" value={formData.medicamentosContinuos} onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Abrigo Preferencial</label>
            <input name="abrigoPreferencial" type="text" value={formData.abrigoPreferencial} onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-400 mb-1">Pontos de Referência</label>
            <input name="pontosReferencia" type="text" value={formData.pontosReferencia} onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { key: 'possuiVeiculo', label: 'Possui veículo' },
            { key: 'possuiAnimaisGrandePorte', label: 'Animais grande porte' },
            { key: 'acessoSuperior', label: 'Acesso a laje/andar superior' },
            { key: 'necessitaEnergia', label: 'Depende de energia elétrica' },
          ].map(({ key, label }) => (
            <label key={key}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                formData[key] ? 'bg-sky-500/10 border-sky-500/40 text-sky-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <input type="checkbox" name={key} checked={formData[key] || false} onChange={(e) => {
                const { name, checked } = e.target
                setFormData(prev => ({ ...prev, [name]: checked }))
              }} className="sr-only" />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                formData[key] ? 'bg-sky-500 border-sky-500' : 'border-slate-500'
              }`}>
                {formData[key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="pets" className="block text-sm font-semibold text-slate-300 mb-2">Pets (quantidade e porte)</label>
        <input id="pets" name="pets" type="text" value={formData.pets} onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500"
        />
      </div>

      <div>
        <label htmlFor="evacuationLogistics" className="block text-sm font-semibold text-slate-300 mb-2">Logística de Evacuação</label>
        <select id="evacuationLogistics" name="evacuationLogistics" value={formData.evacuationLogistics} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 ${
            errors.evacuationLogistics ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <option value="">Selecione</option>
          <option value="vehicle">Veículo próprio</option>
          <option value="truck">Precisa de caminhão</option>
          <option value="boat">Precisa de barco</option>
        </select>
        {errors.evacuationLogistics && <p className="text-red-400 text-sm mt-1 font-medium">{errors.evacuationLogistics}</p>}
      </div>

      <div>
        <label htmlFor="shelterPlan" className="block text-sm font-semibold text-slate-300 mb-2">Plano de Abrigo</label>
        <select id="shelterPlan" name="shelterPlan" value={formData.shelterPlan} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 ${
            errors.shelterPlan ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <option value="">Selecione</option>
          <option value="relatives">Casa de parentes</option>
          <option value="public_shelter">Abrigo público</option>
          <option value="hotel">Hotel</option>
          <option value="other">Outro</option>
        </select>
        {errors.shelterPlan && <p className="text-red-400 text-sm mt-1 font-medium">{errors.shelterPlan}</p>}
      </div>

      <div>
        <label htmlFor="preventiveAid" className="block text-sm font-semibold text-slate-300 mb-2">Pedido de Auxílio Preventivo</label>
        <textarea id="preventiveAid" name="preventiveAid" value={formData.preventiveAid} onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500" rows="2"
        />
      </div>

      <button type="submit" disabled={loading}
        className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-300 shadow-lg shadow-primary-600/20"
      >
        {loading ? 'Salvando...' : 'Salvar Cadastro'}
      </button>
    </form>
  )
}
