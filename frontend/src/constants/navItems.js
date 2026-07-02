import { SHOW_CITIZEN_PORTAL } from './features'

export const navItems = [
  { path: '/mapa', label: 'Mapa de Inundação', icon: '🗺️' },
  { path: '/consulta', label: 'Consultar Risco', icon: '🔍' },
  ...(SHOW_CITIZEN_PORTAL ? [{ path: '/portal', label: 'Painel do Morador', icon: '👤' }] : []),
  { path: '/historico-2024', label: 'Histórico da Enchente 2024', icon: '📜' },
]
