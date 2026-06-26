import { useState, useCallback, useEffect } from 'react'

export default function AppShell({
  children,
  header,
  sidebar,
  footer,
  mapContainer,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), [])
  const toggleMobileSidebar = useCallback(() => setMobileSidebarOpen(v => !v), [])

  useEffect(() => {
    if (!mobileSidebarOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mobileSidebarOpen])

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <div className="absolute inset-0 z-0">
        {mapContainer}
      </div>

      {header && (
        <div className="absolute top-0 left-0 right-0 z-20">
          {header}
        </div>
      )}

      {sidebar && (
        <>
          <button
            onClick={toggleMobileSidebar}
            className="md:hidden fixed top-14 left-2 z-30 p-2 rounded-lg bg-slate-800/90 backdrop-blur-sm border border-slate-700 shadow-lg text-slate-300 hover:bg-slate-700 transition-colors"
            aria-label="Abrir painel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {mobileSidebarOpen && (
            <div
              className="md:hidden fixed inset-0 z-30 bg-black/50"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}

          <div className={`
            md:hidden fixed top-0 left-0 z-40 h-full w-[300px] max-w-[85vw]
            bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50
            shadow-2xl overflow-y-auto overflow-x-hidden
            transition-transform duration-300 ease-in-out
            ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="flex items-center justify-between p-2 border-b border-slate-800/80">
              <span className="text-sm font-bold text-slate-200">Painel</span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                aria-label="Fechar painel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sidebar}
          </div>

          <div className={`
            hidden md:flex h-full z-10
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? 'w-[300px]' : 'w-0'}
          `}>
            <div className={`
              w-[300px] h-full overflow-y-auto overflow-x-hidden
              bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50
              ${sidebarOpen ? '' : 'hidden'}
            `}>
              {sidebar}
            </div>
            <button
              onClick={toggleSidebar}
              className="flex-shrink-0 w-5 h-full flex items-center justify-center bg-slate-800/90 backdrop-blur-sm border-l border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label={sidebarOpen ? 'Recolher painel' : 'Expandir painel'}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${sidebarOpen ? '' : 'rotate-180'}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </>
      )}

      <div className="absolute inset-0 z-[5] pointer-events-none">
        {children}
      </div>

      {footer && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          {footer}
        </div>
      )}
    </div>
  )
}
