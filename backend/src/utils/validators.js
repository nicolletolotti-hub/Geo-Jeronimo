import { z } from 'zod'

// Auth Validators
export const RegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100)
})

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
})

// Residence Validators
export const ResidenceSchema = z.object({
  address: z.string().min(5, 'Endereço deve ter no mínimo 5 caracteres').max(255),
  neighborhood: z.string().min(1, 'Bairro é obrigatório').max(100),
  residents: z.number().int('Número de residentes deve ser inteiro').min(1, 'Mínimo 1 residente').max(20, 'Máximo 20 residentes'),
  comorbidities: z.string().max(500).optional().or(z.literal('')),
  pets: z.string().max(200).optional().or(z.literal('')),
  evacuationLogistics: z.enum(['boat', 'vehicle', 'truck'], 'Tipo de logística inválida'),
  shelterPlan: z.enum(['public_shelter', 'relatives', 'hotel', 'other'], 'Plano de abrigo inválido'),
  preventiveAid: z.string().max(500).optional().or(z.literal('')),
  floodLevel: z.number().min(0, 'Nível de inundação inválido').max(20, 'Nível máximo é 20m').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
})

// River Level Validators
export const RiverLevelSchema = z.object({
  level: z.number().min(0, 'Nível deve ser >= 0').max(20, 'Nível máximo é 20m'),
  source: z.string().max(50).optional().default('manual')
})

// Alert Validators
export const AlertSchema = z.object({
  type: z.enum(['danger', 'warning', 'info'], 'Tipo de alerta inválido'),
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(150),
  message: z.string().min(5, 'Mensagem deve ter no mínimo 5 caracteres').max(1000),
  source: z.string().min(1, 'Fonte é obrigatória').max(100)
})

// Validation helper
export const validateData = (schema, data) => {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    return { valid: false, errors }
  }
  return { valid: true, data: result.data }
}

export default {
  RegisterSchema,
  LoginSchema,
  ResidenceSchema,
  RiverLevelSchema,
  AlertSchema,
  validateData
}
