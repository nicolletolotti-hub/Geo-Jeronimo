import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { RegisterFormSchema, validateForm } from '../../utils/validation'
import { showToast } from '../ui/Toast'

export default function RegistrationForm({ onSuccess }) {
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
      const registerData = { ...validation.data }
      delete registerData.confirmPassword
      const response = await api.post('/auth/register', registerData)
      const { user, token } = response.data
      if (user.agentArea) {
        setAgentPending(true)
        showToast('Cadastro de agente realizado! Aguardando validação.', 'success')
      } else {
        login(user, token, response.data.refreshToken)
        showToast('Cadastro realizado com sucesso!', 'success')
        onSuccess()
      }
    } catch (error) {
      setApiError(error.response?.data?.error || 'Erro ao cadastrar')
      showToast('Erro ao cadastrar', 'error')
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
