import rateLimit from 'express-rate-limit'

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const cpf = (req.body?.cpf || '').replace(/\D/g, '')
    return cpf ? `${req.ip}:${cpf}` : req.ip
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    })
  },
})

export default loginLimiter
