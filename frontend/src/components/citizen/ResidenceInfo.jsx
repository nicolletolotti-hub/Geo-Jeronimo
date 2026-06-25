import api from '../../services/api'
import PhotoUpload from '../PhotoUpload'

export default function ResidenceInfo({ data, onEdit, onDelete, onUpdate }) {
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">Endereço</p>
          <p className="font-semibold text-slate-100">{data.address}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">Bairro</p>
          <p className="font-semibold text-slate-100">{data.neighborhood}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">Moradores</p>
          <p className="font-semibold text-slate-100">{data.residents}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-400 font-medium mb-1">Evacuação</p>
          <p className="font-semibold text-slate-100">
            {data.evacuation_logistics === 'boat' ? '🚤 Barco' : data.evacuation_logistics === 'truck' ? '🚚 Caminhão' : '🚗 Veículo'}
          </p>
        </div>
        {(data.has_elderly || data.has_children || data.has_pregnant || data.has_disabled) && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-2">Grupos Vulneráveis</p>
            <div className="flex flex-wrap gap-2">
              {data.has_elderly && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">Idoso(s)</span>}
              {data.has_children && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Criança(s)</span>}
              {data.has_pregnant && <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded-full">Gestante(s)</span>}
              {data.has_disabled && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">PCD</span>}
            </div>
          </div>
        )}
        {[
          { key: 'comorbidade_respiratoria', label: 'Respiratório' },
          { key: 'comorbidade_cardiaca', label: 'Cardíaco' },
          { key: 'comorbidade_diabetes', label: 'Diabetes' },
          { key: 'comorbidade_renal', label: 'Renal' },
          { key: 'comorbidade_neurologica', label: 'Neurológico' },
          { key: 'comorbidade_mobilidade', label: 'Mobilidade reduzida' },
          { key: 'comorbidade_saude_mental', label: 'Saúde mental' },
          { key: 'comorbidade_alergias', label: 'Alergias' },
          { key: 'comorbidade_oxigenio', label: 'Depende de O₂' },
          { key: 'comorbidade_quimioterapia', label: 'Quimioterapia' },
        ].some(({ key }) => data[key]) && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-2">Comorbidades</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'comorbidade_respiratoria', label: 'Respiratório' },
                { key: 'comorbidade_cardiaca', label: 'Cardíaco' },
                { key: 'comorbidade_diabetes', label: 'Diabetes' },
                { key: 'comorbidade_renal', label: 'Renal' },
                { key: 'comorbidade_neurologica', label: 'Neurológico' },
                { key: 'comorbidade_mobilidade', label: 'Mobilidade reduzida' },
                { key: 'comorbidade_saude_mental', label: 'Saúde mental' },
                { key: 'comorbidade_alergias', label: 'Alergias' },
                { key: 'comorbidade_oxigenio', label: 'Depende de O₂' },
                { key: 'comorbidade_quimioterapia', label: 'Quimioterapia' },
              ].filter(({ key }) => data[key]).map(({ key, label }) => (
                <span key={key} className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">{label}</span>
              ))}
            </div>
          </div>
        )}
        {data.comorbidities && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Outras Comorbidades</p>
            <p className="font-semibold text-slate-100">{data.comorbidities}</p>
          </div>
        )}
        {data.telefone_contato && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Telefone</p>
            <p className="font-semibold text-slate-100">{data.telefone_contato}</p>
          </div>
        )}
        {data.telefone_emergencia && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Telefone Emergência</p>
            <p className="font-semibold text-slate-100">{data.telefone_emergencia}</p>
          </div>
        )}
        {data.medicamentos_continuos && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Medicamentos Contínuos</p>
            <p className="font-semibold text-slate-100">{data.medicamentos_continuos}</p>
          </div>
        )}
        {data.abrigo_preferencial && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Abrigo Preferencial</p>
            <p className="font-semibold text-slate-100">{data.abrigo_preferencial}</p>
          </div>
        )}
        {data.pontos_referencia && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Pontos de Referência</p>
            <p className="font-semibold text-slate-100">{data.pontos_referencia}</p>
          </div>
        )}
        {data.possui_veiculo && (
          <div className="bg-slate-800 p-4 rounded-xl border border-sky-500/30">
            <p className="text-sm text-slate-400 font-medium mb-1">Possui Veículo</p>
            <p className="font-semibold text-sky-400">Sim</p>
          </div>
        )}
        {data.necessita_energia && (
          <div className="bg-slate-800 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
            <p className="text-sm text-red-400 font-medium mb-1">Depende de Energia Elétrica</p>
            <p className="font-semibold text-red-400">Sim — prioridade no resgate</p>
          </div>
        )}
        {data.evacuation_status && data.evacuation_status !== 'unknown' && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Status de Evacuação</p>
            <p className="font-semibold text-slate-100">
              {data.evacuation_status === 'not_rescued' ? 'Aguardando Resgate' :
               data.evacuation_status === 'evacuated' ? 'Evacuado' :
               data.evacuation_status === 'in_shelter' ? 'Em Abrigo' :
               data.evacuation_status === 'with_family' ? 'Com Familiares' : '—'}
            </p>
          </div>
        )}
        {data.pets && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Pets</p>
            <p className="font-semibold text-slate-100">{data.pets}</p>
          </div>
        )}
        {data.flood_level && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Nível de Inundação</p>
            <p className="font-semibold text-slate-100">{data.flood_level}m</p>
          </div>
        )}
        {data.evacuation_level && (
          <div className="bg-slate-800 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <p className="text-sm text-amber-400 font-medium mb-1">Nível de Alerta (Evacuação)</p>
            <p className="font-bold text-amber-300">{data.evacuation_level}m</p>
            <p className="text-xs text-amber-500/80 mt-1">Quando o rio atingir este nível, prepare-se para sair de casa.</p>
          </div>
        )}
        {data.latitude && data.longitude && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 font-medium mb-1">Coordenadas</p>
            <p className="font-semibold text-slate-100 text-sm">{data.latitude.toFixed(5)}, {data.longitude.toFixed(5)}</p>
          </div>
        )}
      </div>

      <PhotoUpload
        photos={(() => { try { return JSON.parse(data.prescription_photos || '[]') } catch { return [] } })()}
        onAdd={async (photo) => {
          await api.post('/residence/photo', { photo })
          const res = await api.get('/residence')
          onUpdate(res.data)
        }}
        onRemove={async (index) => {
          await api.delete(`/residence/photo/${index}`)
          const res = await api.get('/residence')
          onUpdate(res.data)
        }}
      />

      <div className="flex gap-4">
        <button onClick={onEdit} className="text-primary-400 hover:text-primary-300 font-semibold text-sm flex items-center gap-2">
          ✏️ Editar
        </button>
        {onDelete && (
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 font-semibold text-sm flex items-center gap-2">
            🗑️ Excluir
          </button>
        )}
      </div>
    </div>
  )
}
