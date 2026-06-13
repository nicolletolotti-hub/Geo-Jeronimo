import { useState, useEffect } from 'react'

export default function WelcomeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('welcomeDismissed')
    if (!dismissed) setVisible(true)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem('welcomeDismissed', 'true')
  }

  if (!visible) return null

  return (
    <div className="relative bg-gradient-to-br from-primary-600/10 via-primary-500/5 to-sky-600/10 border border-primary-500/30 rounded-2xl p-6 md:p-8 shadow-lg overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Fechar aviso"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div className="flex items-start gap-4">
        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-primary-500/20 flex-shrink-0 items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-400">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-xl font-bold text-slate-100 mb-2">
            Seja bem-vindo(a) ao GeoJeronimo!
          </h2>
          <p className="text-slate-300 leading-relaxed text-sm md:text-base">
            Olá! Me chamo <strong className="text-primary-300">Nicolle Tolotti</strong> e desenvolvi este site para que, em possíveis novas enchentes, você, morador de{' '}
            <strong className="text-sky-300">São Jerônimo</strong>, possa ter um pouco mais de segurança.
          </p>
          <p className="text-slate-300 leading-relaxed text-sm md:text-base mt-2">
            Aqui é possível receber alertas, verificar quando realmente tomar uma atitude, com dicas e monitoramento 24h do nível do Rio Jacuí.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/portal"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-primary-500/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Cadastrar minha residência
            </a>
            <a
              href="/mapa"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
              Ver mapa de inundação
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
