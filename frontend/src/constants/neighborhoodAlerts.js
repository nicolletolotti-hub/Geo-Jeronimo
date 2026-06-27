export const RISK_LEVELS = {
  low: {
    level: 'Baixo',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: '🟢',
    message: 'Área sem risco de inundação no cenário atual.',
    recommendation: 'Nenhuma ação necessária. Mantenha-se informado sobre as condições do rio.',
  },
  attention: {
    level: 'Atenção',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: '🟡',
    message: 'Monitoramento recomendado devido à elevação do Rio Jacuí.',
    recommendation: 'Acompanhe as atualizações da Defesa Civil. Revise seu plano de emergência familiar.',
  },
  alert: {
    level: 'Alerta',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: '🟠',
    message: 'Possibilidade de impacto conforme nível projetado.',
    recommendation: 'Prepare documentos, medicamentos e itens essenciais. Identifique rotas de evacuação.',
  },
  danger: {
    level: 'Perigo',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: '🔴',
    message: 'Recomenda-se preparação para evacuação conforme orientações oficiais.',
    recommendation: 'Evacue imediatamente se houver ordem da Defesa Civil. Dirija-se ao ponto de encontro mais próximo.',
  },
}

export function getNeighborhoodAlert(riverLevel, warningLevel, dangerLevel, floodLevel) {
  if (riverLevel >= dangerLevel) return RISK_LEVELS.danger
  if (riverLevel >= warningLevel) return RISK_LEVELS.alert
  if (riverLevel >= floodLevel * 0.7) return RISK_LEVELS.attention
  return RISK_LEVELS.low
}
