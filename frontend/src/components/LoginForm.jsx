import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { LoginFormSchema, validateForm } from '../utils/validation'

const inputClass = (hasError) =>
  `w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
    hasError ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
  }`

export default function LoginForm({ mode = 'citizen', onLogin }) {
  const { login } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '', cpf: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const isCitizen = mode === 'citizen'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')

    const payload = { email: formData.email, password: formData.password }
    if (isCitizen && formData.cpf) payload.cpf = formData.cpf

    const validation = validateForm(LoginFormSchema, payload)
    if (!validation.valid) { setErrors(validation.errors); return }

    setLoading(true)
    try {
      const response = await api.post('/auth/login', validation.data)
      login(response.data.user, response.data.token, response.data.refreshToken)
      onLogin?.(response.data.user, response.data.token, response.data.refreshToken)
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

      {isCitizen && (
        <div>
          <label htmlFor={`${mode}-cpf`} className="block text-sm font-semibold text-slate-300 mb-2">CPF</label>
          <input id={`${mode}-cpf`} name="cpf" type="text" value={formData.cpf} onChange={handleChange}
            placeholder="000.000.000-00"
            className={inputClass(errors.cpf)}
          />
          {errors.cpf && <p className="text-red-400 text-sm mt-1 font-medium">{errors.cpf}</p>}
        </div>
      )}

      <div>
        <label htmlFor={`${mode}-email`} className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
        <input id={`${mode}-email`} name="email" type="email" value={formData.email} onChange={handleChange}
          className={inputClass(errors.email)}
        />
        {errors.email && <p className="text-red-400 text-sm mt-1 font-medium">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor={`${mode}-password`} className="block text-sm font-semibold text-slate-300 mb-2">Senha</label>
        <input id={`${mode}-password`} name="password" type="password" value={formData.password} onChange={handleChange}
          className={inputClass(errors.password)}
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
