import { useState, useEffect } from 'react'
import { X, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'

function InfoItem({ title, content }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-kcc-blue/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-kcc-blue/30 hover:bg-kcc-blue/50 text-white text-sm font-medium transition-all"
      >
        <span>{title}</span>
        {open ? <ChevronUp size={16} className="text-kcc-gold" /> : <ChevronDown size={16} className="text-kcc-gold" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-kcc-dark/60 text-gray-300 text-sm leading-relaxed whitespace-pre-line">
          {content}
        </div>
      )}
    </div>
  )
}

export default function SchoolInfoPanel({ onClose }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/school-info')
      .then(res => setItems(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-kcc-dark border border-kcc-blue/40 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-kcc-blue/40">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-kcc-gold" />
            <h2 className="text-white font-semibold">School Information</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-kcc-blue/40 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Info List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-8">Loading...</p>
          ) : items.map(item => (
            <InfoItem key={item.id} title={item.title} content={item.content} />
          ))}
        </div>

        <div className="px-5 py-3 border-t border-kcc-blue/40 text-center">
          <p className="text-gray-500 text-xs">
            For more specific questions, use the chatbot.
          </p>
        </div>
      </div>
    </div>
  )
}
