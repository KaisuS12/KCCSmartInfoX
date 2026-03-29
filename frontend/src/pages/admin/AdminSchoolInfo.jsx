import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Save, BookOpen } from 'lucide-react'
import AdminLayout from '../../components/shared/AdminLayout'

function InfoEditor({ item, token, onSaved }) {
  const [title,   setTitle]   = useState(item.title)
  const [content, setContent] = useState(item.content)
  const [saving,  setSaving]  = useState(false)
  const dirty = title !== item.title || content !== item.content

  async function save() {
    setSaving(true)
    try {
      await axios.put(`/api/school-info/${item.id}`, { title, content }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Section saved!')
      onSaved(item.id, title, content)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-kcc-blue/10 border border-gray-200 dark:border-kcc-blue/30 rounded-xl p-5 space-y-3">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full text-sm font-semibold border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-kcc-gold"
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={5}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-kcc-gold resize-y"
      />
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-4 py-2 bg-kcc-gold text-kcc-dark text-sm font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-40 transition-all"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function AdminSchoolInfo() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('admin_token')

  useEffect(() => {
    axios.get('/api/school-info')
      .then(res => setItems(res.data))
      .catch(() => toast.error('Failed to load sections'))
      .finally(() => setLoading(false))
  }, [])

  function handleSaved(id, title, content) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, title, content } : i))
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen size={22} className="text-kcc-gold" />
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">School Info Panel</h1>
            <p className="text-gray-400 text-sm">Edit the sections shown to users in the School Info panel.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <InfoEditor
                key={item.id}
                item={item}
                token={token}
                onSaved={handleSaved}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
