import { useState, useEffect } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import { AlertTriangle, CheckCircle, Trash2, Send, ChevronDown, ChevronUp, Clock, Mail } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { SkeleSummaryCard, SkeleListItem } from '../../components/shared/Skeleton'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

export default function AdminConcerns() {
  const [concerns, setConcerns] = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [replies, setReplies]   = useState({})
  const [sending, setSending]   = useState(null)
  const [filter, setFilter]     = useState('all')

  async function fetchConcerns() {
    try {
      const res = await axios.get('/api/admin/concerns', { headers: authHeader() })
      setConcerns(res.data)
    } catch {
      toast.error('Failed to load concerns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConcerns() }, [])

  async function handleReply(id) {
    const reply = replies[id]?.trim()
    if (!reply) { toast.error('Reply cannot be empty'); return }
    setSending(id)
    try {
      await axios.put(`/api/admin/concerns/${id}/reply`, { reply }, { headers: authHeader() })
      toast.success('Reply sent to student email')
      setReplies(p => ({ ...p, [id]: '' }))
      setExpanded(null)
      fetchConcerns()
    } catch {
      toast.error('Failed to send reply')
    } finally {
      setSending(null)
    }
  }

  async function handleResolve(id) {
    try {
      await axios.put(`/api/admin/concerns/${id}/resolve`, {}, { headers: authHeader() })
      toast.success('Marked as resolved')
      fetchConcerns()
    } catch {
      toast.error('Failed to resolve')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this concern?')) return
    try {
      await axios.delete(`/api/admin/concerns/${id}`, { headers: authHeader() })
      toast.success('Deleted')
      fetchConcerns()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const filtered = concerns.filter(c => filter === 'all' ? true : c.status === filter)
  const pending  = concerns.filter(c => c.status === 'pending').length
  const resolved = concerns.filter(c => c.status === 'resolved').length

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-kcc-dark mb-1 flex items-center gap-2">
          <AlertTriangle size={22} className="text-kcc-gold" /> Student Concerns
        </h1>
        <p className="text-gray-500 text-sm mb-6">View and reply to concerns submitted by students</p>

        {/* Summary cards — all 3 are clickable filters */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-2xl p-4 border shadow-sm text-left transition-all ${
              filter === 'all'
                ? 'bg-kcc-blue border-kcc-blue'
                : 'bg-white border-gray-100 hover:bg-gray-50'
            }`}
          >
            {loading ? <SkeleSummaryCard /> : <>
              <p className={`text-2xl font-bold ${filter === 'all' ? 'text-white' : 'text-kcc-dark'}`}>{concerns.length}</p>
              <p className={`text-xs mt-1 ${filter === 'all' ? 'text-blue-100' : 'text-gray-400'}`}>All Concerns</p>
            </>}
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`rounded-2xl p-4 border shadow-sm text-left transition-all ${
              filter === 'pending'
                ? 'bg-orange-500 border-orange-500'
                : 'bg-orange-50 border-orange-100 hover:bg-orange-100'
            }`}
          >
            <p className={`text-2xl font-bold ${filter === 'pending' ? 'text-white' : 'text-orange-500'}`}>{pending}</p>
            <p className={`text-xs mt-1 ${filter === 'pending' ? 'text-orange-100' : 'text-orange-400'}`}>Pending</p>
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`rounded-2xl p-4 border shadow-sm text-left transition-all ${
              filter === 'resolved'
                ? 'bg-green-600 border-green-600'
                : 'bg-green-50 border-green-100 hover:bg-green-100'
            }`}
          >
            <p className={`text-2xl font-bold ${filter === 'resolved' ? 'text-white' : 'text-green-600'}`}>{resolved}</p>
            <p className={`text-xs mt-1 ${filter === 'resolved' ? 'text-green-100' : 'text-green-400'}`}>Resolved</p>
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <SkeleListItem key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No concerns here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-kcc-dark text-sm">{c.name}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={11} />{c.email}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === 'pending'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {c.status === 'pending' ? 'Pending' : 'Resolved'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm truncate">{c.message}</p>
                    {c.related_question && (
                      <p className="text-xs text-gray-400 mt-1 truncate">Q: {c.related_question}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-1 flex items-center gap-1">
                      <Clock size={10} /> {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                    {expanded === c.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === c.id && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Full Message</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{c.message}</p>
                      </div>

                      {c.admin_reply && (
                        <div>
                          <p className="text-xs font-semibold text-green-600 mb-1">Your Reply (sent)</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap bg-green-50 rounded-xl p-3 border border-green-100">{c.admin_reply}</p>
                        </div>
                      )}

                      {c.status === 'pending' && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Reply to Student</p>
                          <textarea
                            rows={3}
                            value={replies[c.id] || ''}
                            onChange={e => setReplies(p => ({ ...p, [c.id]: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue resize-none"
                            placeholder="Type your reply here — it will be sent to the student's email..."
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleReply(c.id)}
                              disabled={sending === c.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-kcc-blue text-white text-sm rounded-xl hover:bg-kcc-dark disabled:opacity-50 transition"
                            >
                              <Send size={13} />
                              {sending === c.id ? 'Sending...' : 'Send Reply'}
                            </button>
                            <button
                              onClick={() => handleResolve(c.id)}
                              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition"
                            >
                              <CheckCircle size={13} />
                              Mark Resolved
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
