import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoginForm from '../components/LoginForm'
import RegistrationForm from '../components/citizen/RegistrationForm'
import CitizenDashboard from '../components/citizen/CitizenDashboard'
import { ALLOW_CITIZEN_SELF_REGISTRATION } from '../constants/features'

export default function CitizenPortal() {
  const { logout, isAuthenticated } = useAuth()
  const [showLogin, setShowLogin] = useState(true)
  const [showRegistration, setShowRegistration] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-3 tracking-tight">Painel do Morador de São Jerônimo</h1>
          <p className="text-slate-400 text-lg">
            {ALLOW_CITIZEN_SELF_REGISTRATION
              ? 'Cadastre sua residência e receba alertas personalizados'
              : 'Consulte o risco da sua residência e receba alertas personalizados'}
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl">
          {ALLOW_CITIZEN_SELF_REGISTRATION ? (
            <>
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

              {showLogin && <LoginForm mode="citizen" onLogin={() => setShowLogin(false)} />}
              {showRegistration && <RegistrationForm onSuccess={() => setShowLogin(true)} />}
            </>
          ) : (
            <>
              <LoginForm mode="citizen" onLogin={() => {}} />
              <p className="text-sm text-slate-500 mt-6 text-center">
                O cadastro de residências agora é feito pelos agentes de saúde e da Defesa Civil.
                Se você ainda não tem cadastro, procure o agente responsável pela sua área.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return <CitizenDashboard onLogout={logout} />
}
