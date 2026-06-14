import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/mapa',
    icon: '🗺️',
    title: 'Mapa de Inundação',
    desc: 'Simule diferentes níveis do Rio Jacuí e veja quais bairros e ruas são afetados. Visualize o impacto em tempo real com imagens de satélite.',
  },
  {
    to: '/portal',
    icon: '👤',
    title: 'Painel do Usuário',
    desc: 'Cadastre sua residência no mapa e descubra automaticamente em qual nível do rio sua casa é afetada. Receba alertas personalizados de evacuação.',
  },
  {
    to: '/admin',
    icon: '⚙️',
    title: 'Painel do Servidor',
    desc: 'Gestão de residências cadastradas, priorização de resgate, relatórios de saúde e assistência social. Acesso restrito a servidores municipais.',
  },
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-100 tracking-tight mb-3">
          GeoJeronimo
        </h1>
        <p className="text-slate-400 text-base leading-relaxed">
          Monitoramento e alerta de cheias do Rio Jacuí para proteger a população de São Jerônimo - RS
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg hover:border-primary-500/40 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-0.5"
          >
            <span className="text-3xl block mb-4" aria-hidden="true">{card.icon}</span>
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-primary-400 transition-colors mb-2">
              {card.title}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {card.desc}
            </p>
          </Link>
        ))}
      </div>

    </div>
  )
}
