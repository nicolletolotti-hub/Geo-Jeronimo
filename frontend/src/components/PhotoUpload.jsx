import { useState, useRef } from 'react'

export default function PhotoUpload({ photos = [], onAdd, onRemove, maxPhotos = 5, readOnly = false }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Máximo 2MB por foto'); return }
    if (!file.type.startsWith('image/')) { alert('Apenas imagens'); return }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        await onAdd(reader.result)
      } catch (err) { alert(err.response?.data?.error || 'Erro ao enviar') }
      setUploading(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-400 font-medium">Fotos de Receitas / Documentos</p>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <div key={i} className="relative group">
            <img src={photo} alt={`Receita ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-600" />
            {!readOnly && (
              <button type="button" onClick={() => onRemove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >&times;</button>
            )}
          </div>
        ))}
        {!readOnly && photos.length < maxPhotos && (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="w-20 h-20 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-500 hover:border-primary-500 hover:text-primary-400 transition-all text-2xl"
          >{uploading ? <span className="animate-spin w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full" /> : '+'}</button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <p className="text-[10px] text-slate-500">Máx. {maxPhotos} fotos, 2MB cada. Formatos: JPG, PNG</p>
    </div>
  )
}
