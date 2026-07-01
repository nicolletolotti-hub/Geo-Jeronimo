// Marcadores de saúde por pessoa, usados tanto no cadastro (ResidenceWizard)
// quanto na visualização administrativa (SaudeTab). Os ids 'hipertensao' e
// 'diabetes' correspondem a HAS e DM nas planilhas dos Agentes Comunitários
// de Saúde (ver backend/src/utils/healthSheetParser.js).
export const HEALTH_MARKERS = [
  { id: 'hipertensao', label: 'Hipertensão (pressão alta / HAS)' },
  { id: 'diabetes', label: 'Diabetes (DM)' },
  { id: 'gestante', label: 'Gestante' },
  { id: 'idoso', label: 'Idoso' },
  { id: 'asma_bronquite', label: 'Asma/Bronquite' },
  { id: 'acamado', label: 'Acamado' },
  { id: 'domiciliado', label: 'Domiciliado (acompanhamento em casa)' },
  { id: 'tea', label: 'TEA' },
  { id: 'renal_hemodialise', label: 'Renal/Hemodiálise' },
  { id: 'saude_mental', label: 'Saúde mental' },
  { id: 'pcd', label: 'Pessoa com deficiência (PCD)' },
  { id: 'dependente_oxigenio', label: 'Dependente de oxigênio/O2' },
  { id: 'cardiaco', label: 'Cardíaco' },
  { id: 'outras', label: 'Outras comorbidades' },
]

export function healthMarkerLabel(id) {
  return HEALTH_MARKERS.find(m => m.id === id)?.label || id
}
