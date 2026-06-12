import { z } from 'zod'

export const LoginFormSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória')
})

export const RegisterFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação é obrigatória')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não correspondem',
  path: ['confirmPassword']
})

export const ResidenceFormSchema = z.object({
  address: z.string().min(5, 'Endereço deve ter no mínimo 5 caracteres').max(255),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  residents: z.number().int('Deve ser um número inteiro').min(1, 'Mínimo 1').max(20, 'Máximo 20'),
  comorbidities: z.string().max(500).optional().or(z.literal('')),
  pets: z.string().max(200).optional().or(z.literal('')),
  evacuationLogistics: z.enum(['boat', 'vehicle', 'truck'], 'Selecione uma opção válida'),
  shelterPlan: z.enum(['public_shelter', 'relatives', 'hotel', 'other'], 'Selecione uma opção válida'),
  preventiveAid: z.string().max(500).optional().or(z.literal('')),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  floodLevel: z.number().optional().nullable(),
})

export const validateForm = (schema, data) => {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = {}
    result.error.errors.forEach(error => {
      const path = error.path.join('.')
      errors[path] = error.message
    })
    return { valid: false, errors }
  }
  return { valid: true, data: result.data }
}

export default {
  LoginFormSchema,
  RegisterFormSchema,
  ResidenceFormSchema,
  validateForm
}
