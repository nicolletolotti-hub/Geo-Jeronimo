import { emergencyContacts } from '../constants/emergencyContacts'

function ContactCard({ name, phone, description }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <div className="text-sm font-semibold text-slate-200">{name}</div>
      <a href={`tel:${phone.replace(/\D/g, '')}`}
        className="inline-block mt-1.5 text-lg font-bold text-primary-400 hover:text-primary-300 transition-colors">
        {phone}
      </a>
      <div className="text-xs text-slate-500 mt-1">{description}</div>
    </div>
  )
}

export default function EmergencyContacts() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-100">Contatos de Emergência</h1>
        <p className="text-sm text-slate-500 mt-1">Telefones úteis para situações de emergência em São Jerônimo</p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Disponível offline — dados salvos no dispositivo
        </div>
      </div>

      <div className="space-y-4">
        {emergencyContacts.map(section => (
          <section key={section.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{section.categoryIcon}</span>
              <h2 className="text-base font-bold text-slate-300">{section.category}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.contacts.map((c, i) => (
                <ContactCard key={i} {...c} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-500 text-center">
        Em caso de emergência, ligue imediatamente para o número correspondente.
        Mantenha a calma e informe sua localização com precisão.
      </div>
    </div>
  )
}
