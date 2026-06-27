import { useState } from 'react'
import api from '../../services/api'
import { NEIGHBORHOODS } from '../../constants/neighborhoods'
import LocationPicker from '../LocationPicker'
import { showToast } from '../ui/Toast'

const HEALTH_MARKERS = [
  { id: 'hipertensao', label: 'Hipertensão (pressão alta)' },
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'gestante', label: 'Gestante' },
  { id: 'asma_bronquite', label: 'Asma/Bronquite' },
  { id: 'acamado', label: 'Acamado' },
  { id: 'tea', label: 'TEA' },
  { id: 'renal_hemodialise', label: 'Renal/Hemodiálise' },
  { id: 'saude_mental', label: 'Saúde mental' },
  { id: 'pcd', label: 'Pessoa com deficiência (PCD)' },
  { id: 'dependente_oxigenio', label: 'Dependente de oxigênio/O2' },
  { id: 'cardiaco', label: 'Cardíaco' },
  { id: 'outras', label: 'Outras comorbidades' },
]

const PET_TYPES = [
  { id: 'cachorro', label: 'Cachorro' },
  { id: 'gato', label: 'Gato' },
  { id: 'coelho', label: 'Coelho' },
  { id: 'passaro', label: 'Pássaro' },
  { id: 'cavalo', label: 'Cavalo' },
  { id: 'galinhas', label: 'Galinhas' },
  { id: 'outros', label: 'Outros' },
]

const STEPS = [
  { id: 1, label: 'Casa', icon: '🏠' },
  { id: 2, label: 'Moradores', icon: '👨‍👩‍👧‍👦' },
  { id: 3, label: 'Emergência', icon: '🆘' },
  { id: 4, label: 'Animais', icon: '🐾' },
  { id: 5, label: 'Abrigo', icon: '🏡' },
  { id: 6, label: 'Finalizar', icon: '✅' },
]

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            currentStep === s.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-110' :
            currentStep > s.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            'bg-slate-800 text-slate-600 border border-slate-700'
          }`}>
            {currentStep > s.id ? '✓' : s.icon}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 md:w-10 h-0.5 mx-1 rounded ${
              currentStep > s.id ? 'bg-emerald-500/40' : 'bg-slate-800'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function ResidenceWizard({ initialData, onComplete, onCancel }) {
  const [step, setStep] = useState(initialData?.registration_step || 1)
  const [loading, setLoading] = useState(false)
  const [markerPosition, setMarkerPosition] = useState(
    initialData?.latitude ? { lat: initialData.latitude, lng: initialData.longitude } : null
  )

  const [form, setForm] = useState({
    address: initialData?.address || '',
    houseNumber: initialData?.house_number || '',
    neighborhood: initialData?.neighborhood || '',
    referencia: initialData?.pontos_referencia || '',
    residents: initialData?.residents || 1,
    healthMarkers: initialData?.health_markers ? JSON.parse(initialData.health_markers) : [],
    medicamentos: initialData?.medicamentos_continuos || '',
    householdMembers: initialData?.household_members ? JSON.parse(initialData.household_members) : [],
    emergencyName: initialData?.emergency_contact_name || '',
    emergencyPhone: initialData?.emergency_contact_phone || initialData?.telefone_emergencia || '',
    needsEvacuationHelp: initialData?.needs_evacuation_help || false,
    evacuationReason: initialData?.evacuation_reason || '',
    needsTruck: initialData?.needs_truck || false,
    petsInfo: initialData?.pets_info ? JSON.parse(initialData.pets_info) : [],
    possuiPets: false,
    shelterDestination: initialData?.shelter_destination || '',
    shelterPlan: initialData?.shelter_plan || '',
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleHealthMarker = (id) => {
    setForm(prev => ({
      ...prev,
      healthMarkers: prev.healthMarkers.includes(id)
        ? prev.healthMarkers.filter(m => m !== id)
        : [...prev.healthMarkers, id]
    }))
  }

  const addMember = () => {
    setForm(prev => ({
      ...prev,
      householdMembers: [...prev.householdMembers, { cpf: '', name: '', healthMarkers: [], medicamentos: '' }]
    }))
  }

  const updateMember = (index, field, value) => {
    setForm(prev => {
      const members = [...prev.householdMembers]
      members[index] = { ...members[index], [field]: value }
      return { ...prev, householdMembers: members }
    })
  }

  const toggleMemberHealth = (index, markerId) => {
    setForm(prev => {
      const members = [...prev.householdMembers]
      const current = members[index].healthMarkers || []
      members[index] = {
        ...members[index],
        healthMarkers: current.includes(markerId) ? current.filter(m => m !== markerId) : [...current, markerId]
      }
      return { ...prev, householdMembers: members }
    })
  }

  const removeMember = (index) => {
    setForm(prev => ({
      ...prev,
      householdMembers: prev.householdMembers.filter((_, i) => i !== index)
    }))
  }

  const updatePets = (petId, qty) => {
    setForm(prev => {
      const existing = prev.petsInfo.filter(p => p.id !== petId)
      if (qty > 0) existing.push({ id: petId, qty })
      return { ...prev, petsInfo: existing }
    })
  }

  const canProceed = () => {
    switch (step) {
      case 1: return form.address && form.neighborhood
      default: return true
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = {
        address: form.address,
        houseNumber: form.houseNumber,
        neighborhood: form.neighborhood,
        pontosReferencia: form.referencia,
        residents: form.residents || form.householdMembers.length + 1,
        healthMarkers: JSON.stringify(form.healthMarkers),
        medicamentosContinuos: form.medicamentos,
        householdMembers: JSON.stringify(form.householdMembers),
        emergencyContactName: form.emergencyName,
        emergencyContactPhone: form.emergencyPhone,
        needsEvacuationHelp: form.needsEvacuationHelp,
        evacuationReason: form.evacuationReason,
        needsTruck: form.needsTruck,
        petsInfo: JSON.stringify(form.petsInfo),
        shelterDestination: form.shelterDestination,
        shelterPlan: form.shelterPlan,
        registrationStep: 6,
        registrationComplete: true,
        latitude: markerPosition?.lat || null,
        longitude: markerPosition?.lng || null,
        floodLevel: initialData?.flood_level || null,
        evacuationLevel: initialData?.evacuation_level || null,
        evacuationLogistics: form.needsTruck ? 'truck' : form.needsEvacuationHelp ? 'vehicle' : '',
      }

      if (initialData?.id) {
        await api.put(`/residence/${initialData.id}`, payload)
      } else {
        await api.post('/residence', payload)
      }
      showToast('Cadastro salvo com sucesso!', 'success')
      onComplete?.()
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao salvar', 'error')
    }
    setLoading(false)
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Dados da Residência</h3>
            <LocationPicker
              markerPosition={markerPosition}
              onPositionChange={(pos) => {
                setMarkerPosition(pos)
                if (pos?.address) update('address', pos.address)
              }}
            />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Endereço</label>
              <input type="text" value={form.address} onChange={e => update('address', e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Rua, Avenida..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Número</label>
                <input type="text" value={form.houseNumber} onChange={e => update('houseNumber', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nº" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Bairro</label>
                <select value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Selecione</option>
                  {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Ponto de referência</label>
              <input type="text" value={form.referencia} onChange={e => update('referencia', e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Próximo ao mercado, igreja..." />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Moradores e Informações de Saúde</h3>
            <p className="text-sm text-slate-500">Você é o morador responsável. Preencha seus dados de saúde e adicione os demais moradores.</p>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 space-y-3">
              <p className="text-sm font-semibold text-slate-300">Sua saúde</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {HEALTH_MARKERS.map(m => (
                  <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 cursor-pointer transition-all">
                    <input type="checkbox" checked={form.healthMarkers.includes(m.id)}
                      onChange={() => toggleHealthMarker(m.id)}
                      className="rounded bg-slate-700 border-slate-500 text-primary-500 focus:ring-primary-500 w-4 h-4" />
                    <span className="text-sm text-slate-300">{m.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Medicamentos de uso contínuo</label>
                <textarea value={form.medicamentos} onChange={e => update('medicamentos', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2} placeholder="Liste os medicamentos que você utiliza regularmente..." />
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📄</span>
                  <div>
                    <p className="text-sm font-medium text-slate-300">Anexar foto de receitas</p>
                    <p className="text-xs text-slate-500">Opcional — útil caso documentos físicos sejam perdidos</p>
                  </div>
                </div>
                <input type="file" accept="image/*" multiple
                  className="mt-2 block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500/10 file:text-primary-400 hover:file:bg-primary-500/20" />
              </div>
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <p className="text-sm text-slate-500 mb-3">Adicione outros moradores da residência e suas informações de saúde.</p>
              {form.householdMembers.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm">Nenhum outro morador cadastrado.</div>
              )}
              {form.householdMembers.map((member, i) => (
                <div key={i} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-3 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-300">Morador {i + 1}</span>
                    <button onClick={() => removeMember(i)} className="text-red-400 hover:text-red-300 text-xs font-medium">Remover</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500">CPF</label>
                      <input type="text" value={member.cpf} onChange={e => updateMember(i, 'cpf', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Nome completo</label>
                      <input type="text" value={member.name} onChange={e => updateMember(i, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  </div>
                  <details className="text-xs">
                    <summary className="text-slate-400 cursor-pointer hover:text-slate-300">Informações de saúde</summary>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {HEALTH_MARKERS.map(m => (
                        <label key={m.id} className="flex items-center gap-2 text-slate-400 hover:text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={(member.healthMarkers || []).includes(m.id)}
                            onChange={() => toggleMemberHealth(i, m.id)}
                            className="rounded bg-slate-700 border-slate-500 text-primary-500 focus:ring-primary-500" />
                          <span>{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
              <button onClick={addMember}
                className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 hover:border-slate-600 font-medium transition-all text-sm">
                + Adicionar outro morador
              </button>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Emergência e Evacuação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Contato de emergência - Nome</label>
                <input type="text" value={form.emergencyName} onChange={e => update('emergencyName', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nome do contato" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone</label>
                <input type="text" value={form.emergencyPhone} onChange={e => update('emergencyPhone', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="(51) 99999-0000" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 cursor-pointer hover:border-slate-600/50 transition-all">
                <input type="checkbox" checked={form.needsEvacuationHelp}
                  onChange={e => update('needsEvacuationHelp', e.target.checked)}
                  className="rounded bg-slate-700 border-slate-500 text-primary-500 focus:ring-primary-500 w-5 h-5" />
                <div>
                  <span className="text-sm font-medium text-slate-300">Precisa de auxílio para sair da residência</span>
                  <p className="text-xs text-slate-500">Dificuldade de locomoção, idoso, acamado, PCD</p>
                </div>
              </label>
              {form.needsEvacuationHelp && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Motivo</label>
                  <select value={form.evacuationReason} onChange={e => update('evacuationReason', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Selecione</option>
                    <option value="locomocao">Dificuldade de locomoção</option>
                    <option value="idoso">Idoso</option>
                    <option value="acamado">Acamado</option>
                    <option value="pcd">Pessoa com deficiência (PCD)</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              )}
              <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 cursor-pointer hover:border-slate-600/50 transition-all">
                <input type="checkbox" checked={form.needsTruck}
                  onChange={e => update('needsTruck', e.target.checked)}
                  className="rounded bg-slate-700 border-slate-500 text-primary-500 focus:ring-primary-500 w-5 h-5" />
                <span className="text-sm text-slate-300">Necessita de caminhão para retirada de pertences</span>
              </label>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Animais na Residência</h3>
            <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 cursor-pointer hover:border-slate-600/50 transition-all">
              <input type="checkbox" checked={form.possuiPets}
                onChange={e => update('possuiPets', e.target.checked)}
                className="rounded bg-slate-700 border-slate-500 text-primary-500 focus:ring-primary-500 w-5 h-5" />
              <span className="text-sm text-slate-300">Possui pets na residência</span>
            </label>
            {form.possuiPets && (
              <div className="grid grid-cols-2 gap-3">
                {PET_TYPES.map(pet => {
                  const current = form.petsInfo.find(p => p.id === pet.id)
                  return (
                    <div key={pet.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <span className="text-sm text-slate-300">{pet.label}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updatePets(pet.id, (current?.qty || 0) - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 font-bold text-sm">−</button>
                        <span className="w-6 text-center text-sm font-bold text-slate-200">{current?.qty || 0}</span>
                        <button onClick={() => updatePets(pet.id, (current?.qty || 0) + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 font-bold text-sm">+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Plano em caso de evacuação</h3>
            <p className="text-sm text-slate-500">Se precisar sair de casa devido a uma emergência, para onde pretende ir?</p>
            <div className="space-y-2">
              {[
                { value: 'familia', label: 'Casa de familiares' },
                { value: 'amigos', label: 'Casa de amigos' },
                { value: 'outro_local', label: 'Outro local' },
                { value: 'abrigo_publico', label: 'Precisa de abrigo público' },
              ].map(opt => (
                <label key={opt.value}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    form.shelterDestination === opt.value
                      ? 'bg-primary-500/10 border-primary-500/30'
                      : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600/50'
                  }`}>
                  <input type="radio" name="shelterDestination" value={opt.value}
                    checked={form.shelterDestination === opt.value}
                    onChange={e => update('shelterDestination', e.target.value)}
                    className="accent-primary-500 w-4 h-4" />
                  <span className="text-sm text-slate-300">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-slate-100">Revisão Final</h3>
            <p className="text-slate-400">Verifique se todos os dados estão corretos antes de finalizar.</p>
            <div className="text-left space-y-3 bg-slate-800/40 rounded-xl p-5 border border-slate-700/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Endereço:</span> <span className="text-slate-200">{form.address}, {form.houseNumber}</span></div>
                <div><span className="text-slate-500">Bairro:</span> <span className="text-slate-200">{form.neighborhood}</span></div>
                <div><span className="text-slate-500">Moradores:</span> <span className="text-slate-200">{form.householdMembers.length + 1}</span></div>
                <div><span className="text-slate-500">Animais:</span> <span className="text-slate-200">{form.petsInfo.length > 0 ? `${form.petsInfo.reduce((a, p) => a + p.qty, 0)} pets` : 'Nenhum'}</span></div>
                <div><span className="text-slate-500">Auxílio evacuação:</span> <span className="text-slate-200">{form.needsEvacuationHelp ? 'Sim' : 'Não'}</span></div>
                <div><span className="text-slate-500">Plano abrigo:</span> <span className="text-slate-200">{form.shelterDestination ? form.shelterDestination.replace(/_/g, ' ') : 'Não informado'}</span></div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <StepIndicator currentStep={step} />
      <div className="min-h-[300px]">
        {renderStep()}
      </div>
      <div className="flex justify-between mt-6 pt-4 border-t border-slate-800">
        <div>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)}
              className="px-6 py-2.5 border border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium transition-all">
              ← Anterior
            </button>
          ) : onCancel && (
            <button onClick={onCancel}
              className="px-6 py-2.5 border border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium transition-all">
              Cancelar
            </button>
          )}
        </div>
        {step < 6 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
            className="px-8 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/20">
            Próximo →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
            className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20">
            {loading ? 'Salvando...' : '✓ Finalizar Cadastro'}
          </button>
        )}
      </div>
    </div>
  )
}
