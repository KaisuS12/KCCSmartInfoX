import { useEffect, useState } from 'react'
import { X, Megaphone, Mail, Bell } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function AnnouncementsPanel({ onClose }) {
  const [announcements, setAnnouncements] = useState([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    setLoading(true)
    axios.get('/api/announcements')
      .then(res => setAnnouncements(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSubscribe(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribing(true)
    try {
      const res = await axios.post('/api/subscribe', { email })
      toast.success(res.data.message || 'Subscribed!')
      setEmail('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to subscribe')
    } finally {
      setSubscribing(false)
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-kcc-dark border border-kcc-blue/40 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-kcc-blue/40">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-kcc-gold" />
            <h2 className="text-white font-semibold">Announcements</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-kcc-blue/40 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Announcements List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading && (
            <div className="text-center text-gray-400 text-sm py-8">Loading...</div>
          )}
          {!loading && announcements.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              No announcements yet.
            </div>
          )}
          {announcements.map(a => (
            <div key={a.id} className="bg-kcc-blue/30 rounded-xl p-4 border border-kcc-blue/30">
              <h3 className="text-white font-semibold text-sm mb-1">{a.title}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{a.content}</p>
              {a.image_url && (
                <img
                  src={a.image_url}
                  alt="announcement"
                  className="mt-3 w-full rounded-xl object-cover max-h-48 border border-kcc-blue/30"
                />
              )}
              <p className="text-gray-500 text-xs mt-2">{formatDate(a.created_at)}</p>
            </div>
          ))}
        </div>

        {/* Subscribe */}
        <div className="px-5 py-4 border-t border-kcc-blue/40 bg-kcc-dark/80">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={14} className="text-kcc-gold" />
            <p className="text-white text-sm font-medium">Get notified via email</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-kcc-blue/30 border border-kcc-blue/40 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-kcc-gold"
            />
            <button
              type="submit"
              disabled={subscribing}
              className="px-4 py-2 bg-kcc-gold text-kcc-dark rounded-xl text-sm font-semibold hover:bg-yellow-400 disabled:opacity-50 transition-all flex items-center gap-1"
            >
              <Mail size={14} />
              {subscribing ? '...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
