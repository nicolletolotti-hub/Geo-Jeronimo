import { useState, useEffect } from 'react'
import api from '../../services/api'
import { EVAC_STATUS } from '../../constants/statusColors'
import Badge from '../ui/Badge'

export default function AssistenciaTab({ residences }) {
  const semApoio = residences.filter(r => r.shelter_plan === 'other' || !r.shelter_plan)
  const emAbrigo = residences.filter(r => r.evacuation_status === 'in_shelter' || r.shelter_name)
  const [belongings, setBelongings] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ familyName: '', familyCpf: '', familyPhone: '', registrationNumber: '', itemName: '', itemQty: 1, storageLocation: '', notes: '' })
  const [itemsList, setItemsList] = useState([])

  const loadBelongings = async () => {
    try {
      const res = await api.get('/belongings')
      setBelongings(res.data)
    } catch { setBelongings([]) }
  }

  useEffect(() => { loadBelongings() }, [])

  const resetForm = () => {
    setForm({ familyName: '', familyCpf: '', familyPhone: '', registrationNumber: '', itemName: '', itemQty: 1, storageLocation: '', notes: '' })
    setItemsList([])
    setEditingId(null)
    setShowForm(false)
  }

  const addItem = () => {
    if (!form.itemName) return
    setItemsList([...itemsList, { name: form.itemName, qty: parseInt(form.itemQty) || 1 }])
    setForm({ ...form, itemName: '', itemQty: 1 })
  }

  const removeItem = (idx) => setItemsList(itemsList.filter((_, i) => i !== idx))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { familyName: form.familyName, familyCpf: form.familyCpf, familyPhone: form.familyPhone, registrationNumber: form.registrationNumber, items: itemsList, storageLocation: form.storageLocation, notes: form.notes }
      if (editingId) {
        await api.put(`/belongings/${editingId}`, payload)
      } else {
        await api.post('/belongings', payload)
      }
      resetForm()
      loadBelongings()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    }
  }

  const handleEdit = (b) => {
    const itens = JSON.parse(b.items || '[]')
    setItemsList(itens)
    setForm({ familyName: b.family_name, familyCpf: b.family_cpf || '', familyPhone: b.family_phone || '', registrationNumber: b.registration_number || '', itemName: '', itemQty: 1, storageLocation: b.storage_location || '', notes: b.notes || '' })
    setEditingId(b.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este registro de pertences?')) return
    await api.delete(`/belongings/${id}`)
    loadBelongings()
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-purple-500/30 p-6">
          <div className="text-3xl font-bold text-purple-400">{residences.filter(r => r.shelter_plan === 'public_shelter').length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">🏠 Precisam de Abrigo Público</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-amber-500/30 p-6">
          <div className="text-3xl font-bold text-amber-400">{semApoio.length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">⚠️ Sem Rede de Apoio</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-emerald-500/30 p-6">
          <div className="text-3xl font-bold text-emerald-400">{emAbrigo.length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">✅ Em Abrigo / Acolhidos</div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">🤝 Famílias que Precisam de Acolhimento</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Endereço</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Moradores</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Plano Abrigo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Abrigo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {residences.filter(r => r.shelter_plan === 'public_shelter' || r.evacuation_status === 'not_rescued').map(r => (
                <tr key={r.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.address}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.neighborhood}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.residents}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.shelter_plan === 'public_shelter' ? 'Abrigo Público' : r.shelter_plan === 'relatives' ? 'Parentes' : r.shelter_plan === 'hotel' ? 'Hotel' : 'Outro'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.evacuation_status === 'not_rescued' ? 'danger' : r.evacuation_status === 'evacuated' ? 'success' : r.evacuation_status === 'in_shelter' ? 'info' : r.evacuation_status === 'with_family' ? 'info' : 'neutral'}>
                      {EVAC_STATUS[r.evacuation_status]?.label || '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.shelter_name || '—'}</td>
                </tr>
              ))}
              {residences.filter(r => r.shelter_plan === 'public_shelter' || r.evacuation_status === 'not_rescued').length === 0 &&
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Nenhuma família precisa de acolhimento no momento</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-amber-500/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">📦 Registro de Pertences</h2>
          <button onClick={() => { resetForm(); setShowForm(!showForm) }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl text-sm transition-all"
          >
            {showForm ? 'Cancelar' : '+ Novo Registro'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">{editingId ? 'Editar' : 'Novo'} Registro de Pertences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Nome da Família *</label>
                <input value={form.familyName} onChange={e => setForm({...form, familyName: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" required />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">CPF (opcional)</label>
                <input value={form.familyCpf} onChange={e => setForm({...form, familyCpf: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Telefone</label>
                <input value={form.familyPhone} onChange={e => setForm({...form, familyPhone: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Nº Registro / Patrimônio</label>
                <input value={form.registrationNumber} onChange={e => setForm({...form, registrationNumber: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" placeholder="Ex: PAT-001" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Local de Armazenamento</label>
                <input value={form.storageLocation} onChange={e => setForm({...form, storageLocation: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" placeholder="Ex: Galpão 1, Abrigo Municipal" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-400 mb-1 block">Itens</label>
                <div className="flex gap-2 mb-2">
                  <input value={form.itemName} onChange={e => setForm({...form, itemName: e.target.value})}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-100" placeholder="Ex: Sofá, Mesa, Cama..." />
                  <input type="number" min="1" value={form.itemQty} onChange={e => setForm({...form, itemQty: e.target.value})}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-center" />
                  <button type="button" onClick={addItem}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-all">+</button>
                </div>
                {itemsList.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {itemsList.map((item, i) => (
                      <span key={i} className="flex items-center gap-1 bg-slate-700 px-3 py-1 rounded-full text-xs text-slate-200">
                        {item.name} x{item.qty}
                        <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-400 mb-1 block">Observações</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
              </div>
            </div>
            <button type="submit" className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-all">
              {editingId ? 'Atualizar' : 'Cadastrar'}
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Família</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Registro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Itens</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Armazenamento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {belongings.map(b => {
                const itens = JSON.parse(b.items || '[]')
                return (
                  <tr key={b.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100">{b.family_name}</div>
                      {b.family_phone && <div className="text-xs text-slate-500">{b.family_phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-300">{b.registration_number || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {itens.map((item, i) => (
                          <span key={i} className="bg-slate-700/50 px-2 py-0.5 rounded text-xs text-slate-300">{item.name} x{item.qty}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{b.storage_location || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(b)} className="text-primary-400 hover:text-primary-300 text-xs font-semibold">Editar</button>
                        <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold">Excluir</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {belongings.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-500">Nenhum registro de pertences.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
