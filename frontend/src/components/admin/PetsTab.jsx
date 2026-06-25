import { useState, useEffect } from 'react'
import api from '../../services/api'
import Badge from '../ui/Badge'
import LoadingSkeleton from '../ui/LoadingSkeleton'
import EmptyState from '../ui/EmptyState'
import { showToast } from '../ui/Toast'

const PET_TYPES = ['Cachorro', 'Gato', 'Ave', 'Peixe', 'Roedor', 'Réptil', 'Equino', 'Bovino', 'Suíno', 'Outro']
const OWNER_LOCATIONS = [
  { value: 'propria_residencia', label: 'Própria residência' },
  { value: 'abrigo', label: 'Abrigo' },
  { value: 'com_familiares', label: 'Com familiares' },
  { value: 'evacuado', label: 'Evacuado' },
  { value: 'nao_localizado', label: 'Não localizado' },
]

export default function PetsTab() {
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    ownerName: '', ownerCpf: '', ownerAddress: '', ownerNeighborhood: '', ownerPhone: '',
    ownerLocation: 'propria_residencia', petName: '', petType: 'Cachorro', petBreed: '', petAge: '', notes: ''
  })

  const loadPets = async () => {
    try {
      const res = await api.get('/pets')
      setPets(res.data)
    } catch (err) {
      console.error('Erro ao carregar pets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPets() }, [])

  const resetForm = () => {
    setForm({ ownerName: '', ownerCpf: '', ownerAddress: '', ownerNeighborhood: '', ownerPhone: '', ownerLocation: 'propria_residencia', petName: '', petType: 'Cachorro', petBreed: '', petAge: '', notes: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/pets/${editingId}`, form)
      } else {
        await api.post('/pets', form)
      }
      resetForm()
      loadPets()
      showToast('Pet salvo com sucesso!', 'success')
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar pet')
      showToast('Erro ao salvar pet', 'error')
    }
  }

  const handleEdit = (pet) => {
    setForm({ ownerName: pet.owner_name, ownerCpf: pet.owner_cpf, ownerAddress: pet.owner_address || '', ownerNeighborhood: pet.owner_neighborhood || '', ownerPhone: pet.owner_phone || '', ownerLocation: pet.owner_location || 'propria_residencia', petName: pet.pet_name, petType: pet.pet_type, petBreed: pet.pet_breed || '', petAge: pet.pet_age || '', notes: pet.notes || '' })
    setEditingId(pet.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este pet?')) return
    try {
      await api.delete(`/pets/${id}`)
      loadPets()
      showToast('Pet removido com sucesso!', 'success')
    } catch (err) {
      showToast('Erro ao remover pet', 'error')
    }
  }

  const filtered = pets.filter(p =>
    !search || p.pet_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.owner_cpf?.includes(search)
  )

  const locationLabel = (v) => OWNER_LOCATIONS.find(l => l.value === v)?.label || v

  if (loading) return <LoadingSkeleton rows={5} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">🦮 Defesa Animal</h2>
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-all"
        >
          {showForm ? 'Cancelar' : '+ Cadastrar Pet'}
        </button>
      </div>

      <div className="flex gap-3 items-center">
        <input type="text" placeholder="Buscar por pet, dono ou CPF..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500" />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-100">{editingId ? 'Editar Pet' : 'Novo Pet'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Nome do Dono *</label>
              <input value={form.ownerName} onChange={e => setForm({...form, ownerName: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" required />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">CPF do Dono *</label>
              <input value={form.ownerCpf} onChange={e => setForm({...form, ownerCpf: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" required />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Endereço</label>
              <input value={form.ownerAddress} onChange={e => setForm({...form, ownerAddress: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Bairro</label>
              <input value={form.ownerNeighborhood} onChange={e => setForm({...form, ownerNeighborhood: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Telefone</label>
              <input value={form.ownerPhone} onChange={e => setForm({...form, ownerPhone: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Onde o Dono Está</label>
              <select value={form.ownerLocation} onChange={e => setForm({...form, ownerLocation: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100">
                {OWNER_LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Nome do Pet *</label>
              <input value={form.petName} onChange={e => setForm({...form, petName: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" required />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Tipo *</label>
              <select value={form.petType} onChange={e => setForm({...form, petType: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100">
                {PET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Raça</label>
              <input value={form.petBreed} onChange={e => setForm({...form, petBreed: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Idade</label>
              <input value={form.petAge} onChange={e => setForm({...form, petAge: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" placeholder="Ex: 3 anos" />
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
          <thead>
            <tr className="text-slate-400 border-b border-slate-800">
              <th className="text-left py-3 px-3">Pet</th>
              <th className="text-left py-3 px-3">Dono</th>
              <th className="text-left py-3 px-3">CPF</th>
              <th className="text-left py-3 px-3">Telefone</th>
              <th className="text-left py-3 px-3">Localização</th>
              <th className="text-left py-3 px-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-slate-800/50 text-slate-300 hover:bg-slate-800/30">
                <td className="py-3 px-3">
                  <div className="font-semibold text-slate-100">{p.pet_name}</div>
                  <div className="text-xs text-slate-500">{p.pet_type}{p.pet_breed ? ` - ${p.pet_breed}` : ''}</div>
                </td>
                <td className="py-3 px-3">{p.owner_name}</td>
                <td className="py-3 px-3 font-mono text-xs">{p.owner_cpf ? `***.${p.owner_cpf.slice(-3)}` : '-'}</td>
                <td className="py-3 px-3">{p.owner_phone || '-'}</td>
                <td className="py-3 px-3">
                  <Badge variant={p.owner_location === 'abrigo' ? 'info' : p.owner_location === 'evacuado' ? 'warning' : p.owner_location === 'nao_localizado' ? 'danger' : 'success'}>
                    {locationLabel(p.owner_location)}
                  </Badge>
                </td>
                <td className="py-3 px-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(p)} className="text-primary-400 hover:text-primary-300 text-xs font-semibold">Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState
            icon="🐾"
            title="Nenhum pet cadastrado"
            description="Nenhum pet foi encontrado na busca."
          />
        )}
      </div>
    </div>
  )
}
