import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { LoginFormSchema, RegisterFormSchema, ResidenceFormSchema, validateForm } from '../utils/validation'
import { assessResidenceRisk, getRiskConfig } from '../utils/riskAssessment'
import LocationPicker from '../components/LocationPicker'

export default function CitizenPortal() {
  const { user, login, logout, isAuthenticated } = useAuth()
  const [showLogin, setShowLogin] = useState(true)
  const [showRegistration, setShowRegistration] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-3 tracking-tight">Portal do Cidadão</h1>
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
      login(response.data.user, response.data.token)
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
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
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
    const validation = validateForm(RegisterFormSchema, formData)
    if (!validation.valid) { setErrors(validation.errors); return }
    setLoading(true)
    try {
      const { confirmPassword, ...registerData } = validation.data
      const response = await api.post('/auth/register', registerData)
      login(response.data.user, response.data.token)
      onSuccess()
    } catch (error) {
      setApiError(error.response?.data?.error || 'Erro ao cadastrar')
    } finally { setLoading(false) }
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
  const [riskAssessment, setRiskAssessment] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        try {
          const resResponse = await api.get('/residence')
          setResidence(resResponse.data)
        } catch (error) {
          if (error.response?.status !== 404) throw error
        }
        const riverResponse = await api.get('/river/current')
        setRiverLevel(riverResponse.data)
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
                  ? `Sua residência será afetada quando atingir ${residence.flood_level}m`
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
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">Dados da Residência</h2>
          <ResidenceInfo data={residence} onEdit={() => setShowForm(true)} />
          {showForm && <ResidenceForm initialData={residence} onSuccess={() => {
            setShowForm(false)
            api.get('/residence').then(res => setResidence(res.data)).catch(console.error)
          }} />}
        </div>
      )}
    </div>
  )
}

function ResidenceForm({ initialData, onSuccess }) {
  const [formData, setFormData] = useState(initialData || {
    address: '',
    neighborhood: '',
    residents: 1,
    comorbidities: '',
    pets: '',
    evacuationLogistics: '',
    shelterPlan: '',
    preventiveAid: '',
    latitude: null,
    longitude: null,
    floodLevel: null,
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
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) : value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handlePositionChange = async (pos) => {
    setMarkerPosition(pos)
    setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }))
    setCalculatingRisk(true)
    try {
      const risk = await assessResidenceRisk(pos.lat, pos.lng, null)
      if (risk.affectedAt) {
        setFormData(prev => ({ ...prev, floodLevel: risk.affectedAt }))
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
      latitude: formData.latitude,
      longitude: formData.longitude,
      floodLevel: formData.floodLevel || 10,
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

      <div>
        <label htmlFor="address" className="block text-sm font-semibold text-slate-300 mb-2">Endereço Completo</label>
        <input id="address" name="address" type="text" value={formData.address} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
            errors.address ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        />
        {errors.address && <p className="text-red-400 text-sm mt-1 font-medium">{errors.address}</p>}
      </div>

      <div>
        <label htmlFor="neighborhood" className="block text-sm font-semibold text-slate-300 mb-2">Bairro</label>
        <select id="neighborhood" name="neighborhood" value={formData.neighborhood} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 ${
            errors.neighborhood ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <option value="">Selecione um bairro</option>
          <option value="Centro">Centro</option>
          <option value="Industrial">Industrial</option>
          <option value="São Pedro">São Pedro</option>
          <option value="Boa Vista">Boa Vista</option>
          <option value="Santo Antônio">Santo Antônio</option>
          <option value="Morro do Cruzeiro">Morro do Cruzeiro</option>
          <option value="Estação">Estação</option>
          <option value="Vila Nova">Vila Nova</option>
          <option value="Cohab">Cohab</option>
          <option value="Santa Rita">Santa Rita</option>
          <option value="Passo do Leão">Passo do Leão</option>
          <option value="Quilombo">Quilombo</option>
          <option value="Faxinal">Faxinal</option>
          <option value="Cerro dos Nunes">Cerro dos Nunes</option>
          <option value="Bom Jesus">Bom Jesus</option>
          <option value="Esperança">Esperança</option>
          <option value="Promorar">Promorar</option>
          <option value="Cidade Baixa">Cidade Baixa</option>
        </select>
        {errors.neighborhood && <p className="text-red-400 text-sm mt-1 font-medium">{errors.neighborhood}</p>}
      </div>

      <div>
        <label htmlFor="residents" className="block text-sm font-semibold text-slate-300 mb-2">Quantidade de Moradores</label>
        <input id="residents" name="residents" type="number" min="1" max="20" value={formData.residents} onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 ${
            errors.residents ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
          }`}
        />
        {errors.residents && <p className="text-red-400 text-sm mt-1 font-medium">{errors.residents}</p>}
      </div>

      <div>
        <label htmlFor="comorbidities" className="block text-sm font-semibold text-slate-300 mb-2">Comorbidades ou Necessidades Médicas</label>
        <textarea id="comorbidities" name="comorbidities" value={formData.comorbidities} onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500" rows="2"
        />
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
        {data.comorbidities && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Comorbidades</p>
            <p className="font-semibold text-slate-100">{data.comorbidities}</p>
          </div>
        )}
        {data.pets && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Pets</p>
            <p className="font-semibold text-slate-100">{data.pets}</p>
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
