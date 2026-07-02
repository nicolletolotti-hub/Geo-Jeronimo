/**
 * public.js — Endpoints públicos, sem login, para o morador consultar o
 * próprio risco de enchente.
 *
 * Regra dura: NUNCA devolver nome, telefone, comorbidades, health_markers
 * ou household_members aqui. Isso é garantido pelo SELECT explícito
 * (nunca `SELECT r.*`), não por filtro depois de buscar — assim não tem
 * como um campo novo em `residences` vazar por engano nessa rota.
 */
import express from 'express'
import rateLimit from 'express-rate-limit'
import db from '../database/db.js'
import { runQuery } from '../database/helpers.js'
import { geocodeStreet } from '../utils/streetGeocoder.js'
import { findAffectedLevel } from '../utils/floodRisk.js'

const router = express.Router()

// Endpoint público e sem login: limite bem mais apertado que o global de
// /api/ (300/15min) pra dificultar varredura de endereços.
const riskLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas consultas. Tente novamente em alguns minutos.' },
})

function buildMessage({ evacuationLevel, floodLevel }) {
  if (evacuationLevel == null || floodLevel == null) {
    return 'Ainda não temos o cálculo de risco para esse endereço. Em caso de dúvida, procure a Defesa Civil.'
  }
  return `Se o Rio Jacuí atingir ${evacuationLevel}m, prepare-se para evacuar — esse endereço é atingido pela enchente a partir de ${floodLevel}m.`
}

router.get('/risk-lookup', riskLookupLimiter, async (req, res) => {
  try {
    const address = String(req.query.address || '').trim()
    if (address.length < 3) {
      return res.status(400).json({ error: 'Informe um endereço com pelo menos 3 caracteres' })
    }

    // 1) Tenta casar com uma residência já cadastrada por um agente/cidadão.
    //    SELECT explícito — nunca dado de saúde ou identificação pessoal.
    const matches = await runQuery(db, `
      SELECT address, neighborhood, flood_level, evacuation_level
      FROM residences
      WHERE address ILIKE $1
      ORDER BY LENGTH(address) ASC
      LIMIT 5
    `, [`%${address}%`])

    if (matches.length === 1) {
      const r = matches[0]
      return res.json({
        found: true,
        estimate: false,
        address: r.address,
        neighborhood: r.neighborhood,
        evacuationLevel: r.evacuation_level,
        message: buildMessage({ evacuationLevel: r.evacuation_level, floodLevel: r.flood_level }),
      })
    }

    if (matches.length > 1) {
      return res.json({
        found: false,
        estimate: false,
        ambiguous: true,
        message: 'Encontramos mais de um endereço parecido. Tente incluir o número da casa na busca.',
      })
    }

    // 2) Sem residência cadastrada: estimativa genérica por rua, mesma
    //    geocodificação usada no import (Fase 3) — não é o cadastro oficial,
    //    é só uma estimativa pra rua inteira.
    const geo = geocodeStreet(address)
    if (geo) {
      const affectedAt = findAffectedLevel(geo.lat, geo.lng)
      if (affectedAt != null) {
        const evacuationLevel = Math.max(0, parseFloat((affectedAt - 1).toFixed(2)))
        return res.json({
          found: false,
          estimate: true,
          message: `${buildMessage({ evacuationLevel, floodLevel: affectedAt })} (estimativa pela rua — esse endereço ainda não tem cadastro oficial de um agente)`,
        })
      }
    }

    return res.json({
      found: false,
      estimate: false,
      message: 'Não encontramos esse endereço na nossa base. Em caso de dúvida, procure a Defesa Civil.',
    })
  } catch (error) {
    console.error('Public risk-lookup error:', error)
    res.status(500).json({ error: 'Erro ao consultar endereço' })
  }
})

export default router
