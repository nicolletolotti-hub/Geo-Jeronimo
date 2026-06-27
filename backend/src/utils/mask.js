export function maskCPF(cpf) {
  if (!cpf || typeof cpf !== 'string') return cpf || null
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.slice(0, 3) + '.***.***-' + digits.slice(9, 11)
}
