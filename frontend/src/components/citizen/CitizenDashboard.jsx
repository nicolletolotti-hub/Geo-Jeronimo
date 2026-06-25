import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { assessResidenceRisk, getRiskConfig } from '../../utils/riskAssessment'
import ResidenceFloodMap from '../ResidenceFloodMap'
import ResidenceForm from './ResidenceForm'
import ResidenceInfo from './ResidenceInfo'
import CitizenPredictionCard from './CitizenPredictionCard'
import { showToast } from '../ui/Toast'

export default function CitizenDashboard({ onLogout }) {
  const { user } = useAuth()
  const [residence, setResidence] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)
  const [riverLevel, setRiverLevel] = useState(null)
  const [stations, setStations] = useState(null)
  const [riskAssessment, setRiskAssessment] = useState(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdErr, setPwdErr] = useState('')

  const handleChangePassword = async () => {
    setPwdMsg(''); setPwdErr('')
    try {
      await api.put('/auth/change-password', { currentPassword: currentPwd, newPassword: newPwd })
      setPwdMsg('Senha alterada com sucesso!')
      showToast('Senha alterada com sucesso!', 'success')
      setCurrentPwd(''); setNewPwd('')
    } catch (err) {
      setPwdErr(err.response?.data?.error || 'Erro ao alterar senha')
      showToast('Erro ao alterar senha', 'error')
    }
  }

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
        <div className="flex items-center gap-3">
          <button onClick={() => setShowChangePassword(!showChangePassword)}
            className="px-4 py-3 border border-slate-700 rounded-xl hover:bg-slate-800 text-slate-300 font-semibold transition-all duration-300 text-sm"
          >
            🔑 Alterar Senha
          </button>
          <button onClick={onLogout}
            className="px-6 py-3 border border-slate-700 rounded-xl hover:bg-slate-800 text-slate-300 font-semibold transition-all duration-300"
          >
            Sair
          </button>
        </div>
      </div>

      {showChangePassword && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Alterar Senha</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full sm:w-auto">
              <label className="text-sm text-slate-400 mb-1 block">Senha Atual</label>
              <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <label className="text-sm text-slate-400 mb-1 block">Nova Senha</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
            </div>
            <button onClick={handleChangePassword}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-all duration-300"
            >
              Salvar
            </button>
          </div>
          {pwdMsg && <p className="text-sm mt-3 text-emerald-400">{pwdMsg}</p>}
          {pwdErr && <p className="text-sm mt-3 text-red-400">{pwdErr}</p>}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-4 rounded-xl flex items-start gap-3">
          <span className="text-xl mt-0.5">🔔</span>
          <div>
            <p className="font-bold text-base">Residência cadastrada com sucesso!</p>
            <p className="text-sm text-emerald-300/80 mt-1">Você receberá notificações no seu navegador sempre que o nível do rio representar risco para sua residência. Ative as notificações no menu de instalação do app para não perder nenhum alerta.</p>
          </div>
          <button onClick={() => setSuccessMsg(false)} className="ml-auto text-emerald-400/60 hover:text-emerald-300 text-lg">&times;</button>
        </div>
      )}

      {riverLevel && (
        <div className={`border-l-4 rounded-xl p-6 shadow-lg ${
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
                  ? `Inundação em ${residence.flood_level}m | Alerta evacuação em ${residence.evacuation_level ?? (residence.flood_level - 1)}m`
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
        <CitizenPredictionCard river={riverLevel} stations={stations} floodLevel={residence.flood_level} />
      )}

      {loading ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl">
          <p className="text-lg font-medium text-slate-400">Carregando...</p>
        </div>
      ) : !residence ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-8">
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
            setSuccessMsg(true)
            api.get('/residence').then(res => setResidence(res.data)).catch(console.error)
          }} />}
        </div>
      ) : (
        <>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-8">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Dados da Residência</h2>
            <ResidenceInfo data={residence} onEdit={() => setShowForm(true)} onUpdate={(d) => setResidence(d)} onDelete={async () => {
              try {
                await api.delete('/residence')
                setResidence(null)
                setSuccessMsg(false)
                showToast('Residência excluída com sucesso!', 'success')
              } catch (error) {
                showToast(error.response?.data?.error || 'Erro ao excluir residência', 'error')
              }
            }} />
            {showForm && <ResidenceForm initialData={residence} onSuccess={() => {
              setShowForm(false)
              setSuccessMsg(true)
              api.get('/residence').then(res => setResidence(res.data)).catch(console.error)
            }} />}
          </div>
          <ResidenceFloodMap residence={residence} riverLevel={riverLevel} />
        </>
      )}
    </div>
  )
}
