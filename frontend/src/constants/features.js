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
