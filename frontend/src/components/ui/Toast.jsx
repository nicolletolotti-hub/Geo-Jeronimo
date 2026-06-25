import React, { useEffect, useState } from 'react'

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const colors = {
  success: 'bg-emerald-500 border-emerald-400 text-white',
  error: 'bg-red-500 border-red-400 text-white',
  warning: 'bg-amber-500 border-amber-400 text-white',
  info: 'bg-blue-500 border-blue-400 text-white',
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 5000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-in ${colors[toast.type || 'info']}`}>
      <span className="text-lg">{icons[toast.type || 'info']}</span>
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="ml-auto opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

let toastId = 0
let listeners = []

export function showToast(message, type = 'info') {
  const id = ++toastId
  listeners.forEach(fn => fn({ id, message, type }))
  return id
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (toast) => setToasts(prev => [...prev, toast])
    listeners.push(handler)
    return () => { listeners = listeners.filter(l => l !== handler) }
  }, [])

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  if (!toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}
