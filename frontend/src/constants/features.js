/**
 * Flags de feature simples, lidas em build time (Vite).
 *
 * ALLOW_CITIZEN_SELF_REGISTRATION: os ACS relataram risco de moradores se
 * autocadastrarem tentando vantagem indevida em benefícios. A decisão foi
 * migrar o cadastro oficial para os agentes (POST /residence/agent-register),
 * mas sem apagar o autocadastro do código — só desligar a aba quando o time
 * decidir ativar a restrição. Ligado por padrão (comportamento atual
 * preservado) até alguém setar VITE_ALLOW_CITIZEN_SELF_REGISTRATION=false
 * nas variáveis de ambiente do deploy.
 */
export const ALLOW_CITIZEN_SELF_REGISTRATION =
  import.meta.env.VITE_ALLOW_CITIZEN_SELF_REGISTRATION !== 'false'

/**
 * SHOW_CITIZEN_PORTAL: o Painel do Morador não vai ser usado por enquanto
 * (decisão de 02/07/2026) — o cadastro passou a ser feito pelos agentes, e
 * o cidadão comum ainda não tem uso definido para o portal. Tirado do menu
 * de navegação, mas a rota /portal e o componente continuam no código
 * (nada foi apagado) para reativar rápido quando decidirem usar de novo.
 * Desligado por padrão; setar VITE_SHOW_CITIZEN_PORTAL=true para reexibir.
 */
export const SHOW_CITIZEN_PORTAL =
  import.meta.env.VITE_SHOW_CITIZEN_PORTAL === 'true'
