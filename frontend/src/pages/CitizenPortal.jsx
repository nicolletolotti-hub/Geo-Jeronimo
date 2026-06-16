import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { LoginFormSchema, RegisterFormSchema, ResidenceFormSchema, validateForm } from '../utils/validation'
import { assessResidenceRisk, getRiskConfig } from '../utils/riskAssessment'
import { calcTrendRate, calcPrediction } from '../utils/prediction'
import LocationPicker from '../components/LocationPicker'
import ResidenceFloodMap from '../components/ResidenceFloodMap'

export default function CitizenPortal() {
  const { user, login, logout, isAuthenticated } = useAuth()
  const [showLogin, setShowLogin] = useState(true)
  const [showRegistration, setShowRegistration] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-3 tracking-tight">Painel do Morador de São Jerônimo</h1>
          <p className="text-slate-400 text-lg">Cadastre sua residência e receba alertas personalizados</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl">
          <div className="flex border-b border-slate-700 mb-8">
            <button
              onClick={() => { setShowLogin(true); setShowRegistration(false) }}
              className={`px-6 py-3 font-medium transition-all duration-300 ${
                showLogin ? 'border-b-2 border-primary-500 text-primary-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setShowLogin(false); setShowRegistration(true) }}
              className={`px-6 py-3 font-medium transition-all duration-300 ${
                showRegistration ? 'border-b-2 border-primary-500 text-primary-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Cadastro
            </button>
          </div>

          {showLogin && <LoginForm onSuccess={() => setShowLogin(false)} />}
          {showRegistration && <RegistrationForm onSuccess={() => setShowLogin(true)} />}
        </div>
      </div>
    )
  }

  return <CitizenDashboard onLogout={logout} />
}

function LoginForm({ onSuccess }) {
  const { login } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    const validation = validateForm(LoginFormSchema, formData)
    if (!validation.valid) { setErrors(validation.errors); return }
    setLoading(true)
    try {
      const response = await api.post('/auth/login', validation.data)
      login(response.data.user, response.data.token, response.data.refreshToken)
      onSuccess()
    } catch (error) {
      setApiError(error.response?.data?.error || 'Erro ao fazer login')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl" role="alert">
          {apiError}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
        <input id="email" name="email" type="email" value={formData.email} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
            errors.email ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        />
        {errors.email && <p className="text-red-400 text-sm mt-1 font-medium">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">Senha</label>
        <input id="password" name="password" type="password" value={formData.password} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
            errors.password ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        />
        {errors.password && <p className="text-red-400 text-sm mt-1 font-medium">{errors.password}</p>}
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-300 shadow-lg shadow-primary-600/20"
      >
        {loading ? 'Carregando...' : 'Entrar'}
      </button>
    </form>
  )
}

function RegistrationForm({ onSuccess }) {
  const { login } = useAuth()
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', agentArea: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [agentPending, setAgentPending] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    const validation = validateForm(RegisterFormSchema, formData)
    if (!validation.valid) { setErrors(validation.errors); return }
    setLoading(true)
    try {
      const { confirmPassword, ...registerData } = validation.data
      const response = await api.post('/auth/register', registerData)
      const { user, token } = response.data
      if (user.agentArea) {
        setAgentPending(true)
      } else {
        login(user, token, response.data.refreshToken)
        onSuccess()
      }
    } catch (error) {
      setApiError(error.response?.data?.error || 'Erro ao cadastrar')
    } finally { setLoading(false) }
  }

  if (agentPending) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-8 text-center">
        <span className="text-5xl block mb-4">✅</span>
        <h2 className="text-2xl font-bold text-amber-400 mb-3">Cadastro Realizado!</h2>
        <p className="text-slate-300 text-lg mb-2">Seu cadastro como agente foi enviado com sucesso.</p>
        <p className="text-slate-400 mb-6">Aguarde seu cadastro ser validado pelo administrador para acessar o sistema.</p>
        <button onClick={onSuccess}
          className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-500 font-semibold transition-all"
        >Voltar ao Login</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl" role="alert">{apiError}</div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-slate-300 mb-2">Nome Completo</label>
        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
            errors.name ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        />
        {errors.name && <p className="text-red-400 text-sm mt-1 font-medium">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
        <input id="email" name="email" type="email" value={formData.email} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
            errors.email ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        />
        {errors.email && <p className="text-red-400 text-sm mt-1 font-medium">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">Senha</label>
        <input id="password" name="password" type="password" value={formData.password} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
            errors.password ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        />
        {errors.password && <p className="text-red-400 text-sm mt-1 font-medium">{errors.password}</p>}
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-300 mb-2">Confirmar Senha</label>
        <input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
            errors.confirmPassword ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        />
        {errors.confirmPassword && <p className="text-red-400 text-sm mt-1 font-medium">{errors.confirmPassword}</p>}
      </div>
      <div>
        <label htmlFor="agentArea" className="block text-sm font-semibold text-slate-300 mb-2">Área (apenas servidores municipais)</label>
        <select id="agentArea" name="agentArea" value={formData.agentArea} onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
        >
          <option value="">Morador (cadastro comum)</option>
          <option value="defesa_civil">Servidor - Defesa Civil</option>
          <option value="saude">Servidor - Saúde</option>
          <option value="assistencia_social">Servidor - Assistência Social</option>
        </select>
        {errors.agentArea && <p className="text-red-400 text-sm mt-1 font-medium">{errors.agentArea}</p>}
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-300 shadow-lg shadow-primary-600/20"
      >
        {loading ? 'Carregando...' : 'Cadastrar'}
      </button>
    </form>
  )
}

function CitizenDashboard({ onLogout }) {
  const { user } = useAuth()
  const [residence, setResidence] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [riverLevel, setRiverLevel] = useState(null)
  const [stations, setStations] = useState(null)
  const [riskAssessment, setRiskAssessment] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resResult, riverResult, stationsResult] = await Promise.allSettled([
          api.get('/residence'),
          api.get('/river/current'),
          api.get('/stations'),
        ])
        if (resResult.status === 'fulfilled') setResidence(resResult.value.data)
        if (riverResult.status === 'fulfilled') setRiverLevel(riverResult.value.data)
        if (stationsResult.status === 'fulfilled') setStations(stationsResult.value.data)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally { setLoading(false) }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (residence?.latitude && residence?.longitude && riverLevel) {
      assessResidenceRisk(residence.latitude, residence.longitude, riverLevel.current)
        .then(setRiskAssessment)
    }
  }, [residence, riverLevel])

  const riskConfig = riskAssessment ? getRiskConfig(riskAssessment.riskLevel) : null

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2 tracking-tight">Portal do Cidadão</h1>
          <p className="text-slate-400 text-lg">Bem-vindo, {user?.name}</p>
        </div>
        <button onClick={onLogout}
          className="px-6 py-3 border border-slate-700 rounded-xl hover:bg-slate-800 text-slate-300 font-semibold transition-all duration-300"
        >
          Sair
        </button>
      </div>

      {riverLevel && (
        <div className={`border-l-4 rounded-2xl p-6 shadow-lg ${
          riverLevel.current >= riverLevel.dangerLevel
            ? 'bg-red-500/10 border-red-500'
            : riverLevel.current >= riverLevel.warningLevel
            ? 'bg-amber-500/10 border-amber-500'
            : 'bg-emerald-500/10 border-emerald-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">
                Nível do Rio Jacuí: {riverLevel.current.toFixed(2)}m
              </h2>
              <p className="text-base text-slate-300">
                {residence
                  ? `Inundação em ${residence.flood_level}m | Alerta evacuação em ${residence.evacuation_level || (residence.flood_level - 1)}m`
                  : 'Cadastre sua residência para receber alertas personalizados'}
              </p>
            </div>
            {residence && riskConfig && (
              <div className={`hidden md:flex flex-col items-center gap-1 px-5 py-3 rounded-xl ${riskConfig.bg} ${riskConfig.border} border`}>
                <span className="text-2xl">{riskConfig.icon}</span>
                <span className={`text-sm font-bold ${riskConfig.color}`}>{riskConfig.label}</span>
              </div>
            )}
          </div>
          {residence && riskConfig && riskAssessment?.isCurrentlyAffected && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl font-bold text-center animate-pulse">
              🚨 ATENÇÃO! O nível atual do rio já afeta sua residência!
            </div>
          )}
          {residence?.evacuation_level && riverLevel && riverLevel.current >= residence.evacuation_level && riverLevel.current < residence.flood_level && (
            <div className="mt-3 bg-amber-500/20 border border-amber-500/50 text-amber-400 px-4 py-3 rounded-xl font-bold text-center">
              ⚠️ ALERTA! O rio atingiu {riverLevel.current.toFixed(2)}m — Prepare-se para evacuar! Nível de alerta: {residence.evacuation_level}m
            </div>
          )}
        </div>
      )}

      {residence && riskConfig && (
        <div className="md:hidden flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-800 border border-slate-700">
          <span className="text-2xl">{riskConfig.icon}</span>
          <div>
            <p className="text-sm text-slate-400">Risco da sua residência</p>
            <p className={`text-lg font-bold ${riskConfig.color}`}>{riskConfig.label}</p>
            <p className="text-xs text-slate-500">{riskConfig.description}</p>
          </div>
        </div>
      )}

      {riverLevel && residence?.flood_level && (
        <PredictionCard river={riverLevel} stations={stations} floodLevel={residence.flood_level} />
      )}

      {loading ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl">
          <p className="text-lg font-medium text-slate-400">Carregando...</p>
        </div>
      ) : !residence ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-100">Cadastro de Residência</h2>
            <button onClick={() => setShowForm(!showForm)}
              className="text-primary-400 hover:text-primary-300 font-semibold text-sm"
            >
              {showForm ? 'Cancelar' : '+ Cadastrar'}
            </button>
          </div>
          {showForm && <ResidenceForm onSuccess={() => {
            setShowForm(false)
            api.get('/residence').then(res => setResidence(res.data)).catch(console.error)
          }} />}
        </div>
      ) : (
        <>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Dados da Residência</h2>
            <ResidenceInfo data={residence} onEdit={() => setShowForm(true)} />
            {showForm && <ResidenceForm initialData={residence} onSuccess={() => {
              setShowForm(false)
              api.get('/residence').then(res => setResidence(res.data)).catch(console.error)
            }} />}
          </div>
          <ResidenceFloodMap residence={residence} riverLevel={riverLevel} />
        </>
      )}
    </div>
  )
}

function ResidenceForm({ initialData, onSuccess }) {
  const [formData, setFormData] = useState(initialData || {
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
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'residents' ? parseInt(value) || 0 : value
    }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handlePositionChange = async (pos) => {
    setMarkerPosition(pos)
    setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }))
    setCalculatingRisk(true)
    try {
      const risk = await assessResidenceRisk(pos.lat, pos.lng, null)
      if (risk.affectedAt) {
        const floodLevel = risk.affectedAt
        const evacuationLevel = Math.max(0, parseFloat((floodLevel - 1).toFixed(2)))
        setFormData(prev => ({ ...prev, floodLevel, evacuationLevel }))
      }
    } catch { }
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
          <option value="Centro">Centro</option>
          <option value="Bela Vista">Bela Vista</option>
          <option value="Cidade Alta">Cidade Alta</option>
          <option value="Cidade Baixa">Cidade Baixa</option>
          <option value="Fátima">Fátima</option>
          <option value="Bandeira Branca">Bandeira Branca</option>
          <option value="Santo Antônio">Santo Antônio</option>
          <option value="Santa Rita">Santa Rita</option>
          <option value="São Francisco">São Francisco</option>
          <option value="São Thomás">São Thomás</option>
          <option value="Lago Parque Clube">Lago Parque Clube</option>
          <option value="Passo D'Areia">Passo D'Areia</option>
          <option value="Princesa Isabel">Princesa Isabel</option>
          <option value="Quininho">Quininho</option>
          <option value="Vila Nova">Vila Nova</option>
          <option value="Medianeira">Medianeira</option>
          <option value="Olaria">Olaria</option>
          <option value="Estaleiro">Estaleiro</option>
          <option value="Beira Rio">Beira Rio</option>
          <option value="Lindos Ares">Lindos Ares</option>
          <option value="Padre Reus">Padre Reus</option>
          <option value="Piratini">Piratini</option>
          <option value="Sol Nascente">Sol Nascente</option>
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

function ResidenceInfo({ data, onEdit }) {
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">Endereço</p>
          <p className="font-semibold text-slate-100">{data.address}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">Bairro</p>
          <p className="font-semibold text-slate-100">{data.neighborhood}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">Moradores</p>
          <p className="font-semibold text-slate-100">{data.residents}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">Evacuação</p>
          <p className="font-semibold text-slate-100">
            {data.evacuation_logistics === 'boat' ? '🚤 Barco' : data.evacuation_logistics === 'truck' ? '🚚 Caminhão' : '🚗 Veículo'}
          </p>
        </div>
        {(data.has_elderly || data.has_children || data.has_pregnant || data.has_disabled) && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-2">Grupos Vulneráveis</p>
            <div className="flex flex-wrap gap-2">
              {data.has_elderly && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">Idoso(s)</span>}
              {data.has_children && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Criança(s)</span>}
              {data.has_pregnant && <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded-full">Gestante(s)</span>}
              {data.has_disabled && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">PCD</span>}
            </div>
          </div>
        )}
        {[
          { key: 'comorbidade_respiratoria', label: 'Respiratório' },
          { key: 'comorbidade_cardiaca', label: 'Cardíaco' },
          { key: 'comorbidade_diabetes', label: 'Diabetes' },
          { key: 'comorbidade_renal', label: 'Renal' },
          { key: 'comorbidade_neurologica', label: 'Neurológico' },
          { key: 'comorbidade_mobilidade', label: 'Mobilidade reduzida' },
          { key: 'comorbidade_saude_mental', label: 'Saúde mental' },
          { key: 'comorbidade_alergias', label: 'Alergias' },
          { key: 'comorbidade_oxigenio', label: 'Depende de O₂' },
          { key: 'comorbidade_quimioterapia', label: 'Quimioterapia' },
        ].some(({ key }) => data[key]) && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-2">Comorbidades</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'comorbidade_respiratoria', label: 'Respiratório' },
                { key: 'comorbidade_cardiaca', label: 'Cardíaco' },
                { key: 'comorbidade_diabetes', label: 'Diabetes' },
                { key: 'comorbidade_renal', label: 'Renal' },
                { key: 'comorbidade_neurologica', label: 'Neurológico' },
                { key: 'comorbidade_mobilidade', label: 'Mobilidade reduzida' },
                { key: 'comorbidade_saude_mental', label: 'Saúde mental' },
                { key: 'comorbidade_alergias', label: 'Alergias' },
                { key: 'comorbidade_oxigenio', label: 'Depende de O₂' },
                { key: 'comorbidade_quimioterapia', label: 'Quimioterapia' },
              ].filter(({ key }) => data[key]).map(({ key, label }) => (
                <span key={key} className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">{label}</span>
              ))}
            </div>
          </div>
        )}
        {data.comorbidities && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Outras Comorbidades</p>
            <p className="font-semibold text-slate-100">{data.comorbidities}</p>
          </div>
        )}
        {data.telefone_contato && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Telefone</p>
            <p className="font-semibold text-slate-100">{data.telefone_contato}</p>
          </div>
        )}
        {data.telefone_emergencia && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Telefone Emergência</p>
            <p className="font-semibold text-slate-100">{data.telefone_emergencia}</p>
          </div>
        )}
        {data.medicamentos_continuos && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Medicamentos Contínuos</p>
            <p className="font-semibold text-slate-100">{data.medicamentos_continuos}</p>
          </div>
        )}
        {data.abrigo_preferencial && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Abrigo Preferencial</p>
            <p className="font-semibold text-slate-100">{data.abrigo_preferencial}</p>
          </div>
        )}
        {data.pontos_referencia && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Pontos de Referência</p>
            <p className="font-semibold text-slate-100">{data.pontos_referencia}</p>
          </div>
        )}
        {data.possui_veiculo && (
          <div className="bg-slate-800 p-4 rounded-xl border border-sky-500/30">
            <p className="text-sm text-slate-400 font-medium mb-1">Possui Veículo</p>
            <p className="font-semibold text-sky-400">Sim</p>
          </div>
        )}
        {data.necessita_energia && (
          <div className="bg-slate-800 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
            <p className="text-sm text-red-400 font-medium mb-1">Depende de Energia Elétrica</p>
            <p className="font-semibold text-red-400">Sim — prioridade no resgate</p>
          </div>
        )}
        {data.evacuation_status && data.evacuation_status !== 'unknown' && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Status de Evacuação</p>
            <p className="font-semibold text-slate-100">
              {data.evacuation_status === 'not_rescued' ? 'Aguardando Resgate' :
               data.evacuation_status === 'evacuated' ? 'Evacuado' :
               data.evacuation_status === 'in_shelter' ? 'Em Abrigo' :
               data.evacuation_status === 'with_family' ? 'Com Familiares' : '—'}
            </p>
          </div>
        )}
        {data.pets && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Pets</p>
            <p className="font-semibold text-slate-100">{data.pets}</p>
          </div>
        )}
        {data.flood_level && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Nível de Inundação</p>
            <p className="font-semibold text-slate-100">{data.flood_level}m</p>
          </div>
        )}
        {data.evacuation_level && (
          <div className="bg-slate-800 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <p className="text-sm text-amber-400 font-medium mb-1">Nível de Alerta (Evacuação)</p>
            <p className="font-bold text-amber-300">{data.evacuation_level}m</p>
            <p className="text-xs text-amber-500/80 mt-1">Quando o rio atingir este nível, prepare-se para sair de casa.</p>
          </div>
        )}
        {data.latitude && data.longitude && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Coordenadas</p>
            <p className="font-semibold text-slate-100 text-sm">{data.latitude.toFixed(5)}, {data.longitude.toFixed(5)}</p>
          </div>
        )}
      </div>
      <button onClick={onEdit} className="text-primary-400 hover:text-primary-300 font-semibold text-sm flex items-center gap-2">
        ✏️ Editar
      </button>
    </div>
  )
}

function PredictionCard({ river, stations, floodLevel }) {
  const trendRate = calcTrendRate(river, stations)
  const pred = (target) => calcPrediction(river.current, trendRate, target)

  if (!trendRate || river.trend !== 'rising') return null

  const warning = pred(river.warningLevel)
  const danger = pred(river.dangerLevel)
  const residence = pred(floodLevel)

  return (
    <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden="true">📈</span>
        <h3 className="font-bold text-slate-100">Previsão de Cheia</h3>
        <span className="text-xs text-slate-500 font-medium">Rio subindo +{trendRate.toFixed(1)} cm/h</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {warning && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/20">
            <p className="text-xs text-amber-400 font-semibold mb-1">Nível de Alerta</p>
            <p className="text-lg font-bold text-slate-100">{warning.targetLevel.toFixed(1)}m</p>
            <p className="text-sm font-medium text-amber-400">em ~{warning.hoursLabel}</p>
          </div>
        )}
        {danger && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-red-500/20">
            <p className="text-xs text-red-400 font-semibold mb-1">Nível de Perigo</p>
            <p className="text-lg font-bold text-slate-100">{danger.targetLevel.toFixed(1)}m</p>
            <p className="text-sm font-medium text-red-400">em ~{danger.hoursLabel}</p>
          </div>
        )}
        {residence && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-primary-500/20">
            <p className="text-xs text-primary-400 font-semibold mb-1">Sua Residência</p>
            <p className="text-lg font-bold text-slate-100">{residence.targetLevel.toFixed(1)}m</p>
            <p className="text-sm font-medium text-primary-400">em ~{residence.hoursLabel}</p>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-600 mt-3">
        * Previsão baseada na taxa de subida atual. Consulte a Defesa Civil para informações oficiais.
      </p>
    </div>
  )
}
