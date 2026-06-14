import { z } from 'zod'

const booleanDefault = z.boolean().optional().default(false)

export const RegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  agentArea: z.string().max(200).optional().or(z.literal('')),
})

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
})

const ComorbidadesSchema = {
  comorbidadeRespiratoria: booleanDefault,
  comorbidadeCardiaca: booleanDefault,
  comorbidadeDiabetes: booleanDefault,
  comorbidadeRenal: booleanDefault,
  comorbidadeNeurologica: booleanDefault,
  comorbidadeMobilidade: booleanDefault,
  comorbidadeSaudeMental: booleanDefault,
  comorbidadeAlergias: booleanDefault,
  comorbidadeOxigenio: booleanDefault,
  comorbidadeQuimioterapia: booleanDefault,
}

const ContatoSchema = {
  telefoneContato: z.string().max(20).optional().or(z.literal('')),
  telefoneEmergencia: z.string().max(20).optional().or(z.literal('')),
  possuiVeiculo: booleanDefault,
  possuiAnimaisGrandePorte: booleanDefault,
  acessoSuperior: booleanDefault,
  medicamentosContinuos: z.string().max(500).optional().or(z.literal('')),
  necessitaEnergia: booleanDefault,
  abrigoPreferencial: z.string().max(200).optional().or(z.literal('')),
  pontosReferencia: z.string().max(500).optional().or(z.literal('')),
}

export const ResidenceSchema = z.object({
  address: z.string().min(5, 'Endereço deve ter no mínimo 5 caracteres').max(255),
  neighborhood: z.string().min(1, 'Bairro é obrigatório').max(100),
  residents: z.number().int('Número de residentes deve ser inteiro').min(1, 'Mínimo 1 residente').max(20, 'Máximo 20 residentes'),
  comorbidities: z.string().max(500).optional().or(z.literal('')),
  hasElderly: booleanDefault,
  hasChildren: booleanDefault,
  hasPregnant: booleanDefault,
  hasDisabled: booleanDefault,
  ...ComorbidadesSchema,
  ...ContatoSchema,
  pets: z.string().max(200).optional().or(z.literal('')),
  evacuationLogistics: z.enum(['boat', 'vehicle', 'truck', ''], 'Tipo de logística inválida'),
  shelterPlan: z.enum(['public_shelter', 'relatives', 'hotel', 'other', ''], 'Plano de abrigo inválido'),
  preventiveAid: z.string().max(500).optional().or(z.literal('')),
  houseNumber: z.string().max(20).optional().or(z.literal('')),
  floodLevel: z.number().min(0, 'Nível de inundação inválido').max(20, 'Nível máximo é 20m').optional().nullable(),
  evacuationLevel: z.number().min(0, 'Nível de evacuação inválido').max(20, 'Nível máximo é 20m').optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable()
})

export const AgentResidenceSchema = ResidenceSchema.extend({
  userEmail: z.string().email('Email do cidadão inválido').optional(),
  userName: z.string().min(3, 'Nome do cidadão deve ter no mínimo 3 caracteres').optional(),
  evacuationStatus: z.enum(['unknown', 'not_rescued', 'evacuated', 'in_shelter', 'with_family']).optional().default('unknown'),
  agentNotes: z.string().max(1000).optional().or(z.literal('')),
  shelterName: z.string().max(200).optional().or(z.literal('')),
})

export const EvacuationStatusSchema = z.object({
  evacuationStatus: z.enum(['unknown', 'not_rescued', 'evacuated', 'in_shelter', 'with_family']),
  shelterName: z.string().max(200).optional().or(z.literal('')),
  agentNotes: z.string().max(1000).optional().or(z.literal('')),
})

export const RiverLevelSchema = z.object({
  level: z.number().min(0, 'Nível deve ser >= 0').max(20, 'Nível máximo é 20m'),
  source: z.string().max(50).optional().default('manual')
})

export const AlertSchema = z.object({
  type: z.enum(['danger', 'warning', 'info'], 'Tipo de alerta inválido'),
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(150),
  message: z.string().min(5, 'Mensagem deve ter no mínimo 5 caracteres').max(1000),
  source: z.string().min(1, 'Fonte é obrigatória').max(100)
})

export const ShelterSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(200),
  address: z.string().max(500).optional().or(z.literal('')),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  capacity: z.number().int().min(0).optional().default(0),
  type: z.enum(['shelter', 'meeting_point', 'route'], 'Tipo inválido').optional().default('shelter'),
  contact: z.string().max(100).optional().or(z.literal('')),
})

export const AgentApprovalSchema = z.object({
  userId: z.number().int(),
  action: z.enum(['approve', 'reject']),
})

export const ImportRowSchema = z.object({
  address: z.string().min(1, 'Endereço obrigatório'),
  neighborhood: z.string().min(1, 'Bairro obrigatório'),
  residents: z.number().int().min(0).optional().default(0),
  name: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  hasElderly: z.boolean().optional().default(false),
  hasChildren: z.boolean().optional().default(false),
  hasPregnant: z.boolean().optional().default(false),
  hasDisabled: z.boolean().optional().default(false),
  evacuationLogistics: z.enum(['boat', 'vehicle', 'truck']).optional().default('vehicle'),
  shelterPlan: z.enum(['public_shelter', 'relatives', 'hotel', 'other']).optional().default('relatives'),
  floodLevel: z.number().min(0).max(20).optional().default(10),
})

export const validateData = (schema, data) => {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || []
    const errors = issues.map(e => `${(e.path || []).join('.')}: ${e.message}`)
    return { valid: false, errors }
  }
  return { valid: true, data: result.data }
}

export default {
  RegisterSchema, LoginSchema, ResidenceSchema, AgentResidenceSchema,
  EvacuationStatusSchema, RiverLevelSchema, AlertSchema, ShelterSchema,
  AgentApprovalSchema, ImportRowSchema,
  validateData
}
