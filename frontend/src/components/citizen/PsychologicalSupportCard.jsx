import { useState } from 'react'

const TIPS = [
  {
    title: 'Respiração profunda',
    content: 'Inspire pelo nariz contando até 4, segure por 4 segundos, expire pela boca contando até 6. Repita 5 vezes.',
    icon: '🫁',
  },
  {
    title: 'Mantenha a rotina',
    content: 'Manter horários regulares para refeições e descanso ajuda a reduzir a ansiedade em momentos de incerteza.',
    icon: '📋',
  },
  {
    title: 'Converse com alguém',
    content: 'Compartilhar seus sentimentos com familiares, amigos ou vizinhos alivia o estresse e fortalece a comunidade.',
    icon: '💬',
  },
  {
    title: 'Limite o excesso de notícias',
    content: 'Buscar informações em fontes oficiais é importante, mas evite exposição contínua a conteúdos que gerem medo ou pânico.',
    icon: '📵',
  },
]

const WARNING_SIGNS = [
  'Dificuldade para dormir por vários dias seguidos',
  'Pensamentos recorrentes sobre o evento traumático',
  'Irritabilidade ou explosões de raiva frequentes',
  'Isolamento social e afastamento de atividades habituais',
  'Sensação constante de medo ou que algo ruim vai acontecer',
  'Sintomas físicos como taquicardia, tremores ou falta de ar',
]

export default function PsychologicalSupportCard() {
  const [showSigns, setShowSigns] = useState(false)

  return (
    <div className="bg-gradient-to-br from-violet-900/20 to-indigo-900/20 border border-violet-800/30 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">💜</span>
        <div>
          <h3 className="text-lg font-bold text-violet-200 mb-2">
            Cuidados emocionais após situações de emergência
          </h3>
          <p className="text-sm text-violet-300/80 leading-relaxed">
            Eventos como enchentes e evacuações podem causar estresse, ansiedade e outros impactos emocionais.
            Cuidar da saúde mental é tão importante quanto cuidar da segurança física.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {TIPS.map((tip, idx) => (
          <div key={idx} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-start gap-2">
              <span className="text-lg mt-0.5">{tip.icon}</span>
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-1">{tip.title}</h4>
                <p className="text-xs text-slate-400">{tip.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowSigns(!showSigns)}
        className="text-sm text-violet-300 hover:text-violet-200 font-medium transition-colors mb-3"
      >
        {showSigns ? '▼ Ocultar' : '▶'} Sinais de alerta emocional
      </button>

      {showSigns && (
        <div className="mb-4 bg-slate-800/40 rounded-xl p-4 border border-amber-800/30">
          <h4 className="text-sm font-bold text-amber-300 mb-2">⚠️ Fique atento se você ou alguém próximo apresentar:</h4>
          <ul className="space-y-1.5">
            {WARNING_SIGNS.map((sign, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>{sign}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-slate-800/50 rounded-xl p-4 border border-violet-800/30">
        <h4 className="text-sm font-bold text-slate-200 mb-2">🚪 O que fazer caso precise evacuar</h4>
        <ul className="space-y-1 text-xs text-slate-400">
          <li>• Mantenha documentos e medicamentos em local de fácil acesso</li>
          <li>• Identifique com antecedência as rotas de evacuação do seu bairro</li>
          <li>• Tenha uma bolsa pronta com itens essenciais (água, lanterna, pilhas, carregador)</li>
          <li>• Combine com familiares um ponto de encontro fora da área de risco</li>
          <li>• Ajude vizinhos idosos, pessoas com deficiência ou crianças pequenas</li>
          <li>• Siga sempre as orientações da Defesa Civil</li>
        </ul>
      </div>

      <div className="mt-4 p-3 bg-violet-800/20 rounded-xl border border-violet-700/30">
        <p className="text-sm text-violet-300/90 leading-relaxed">
          <strong>🧠 Lembre-se:</strong> sentir medo, ansiedade ou tristeza após uma emergência é uma reação
          normal. Se esses sentimentos persistirem por mais de duas semanas ou interferirem nas suas atividades
          diárias, procure ajuda profissional.
        </p>
      </div>

      <p className="mt-3 text-xs text-violet-400/60 italic text-center">
        Em caso de sofrimento intenso, procure a rede de saúde do município.
      </p>
    </div>
  )
}
