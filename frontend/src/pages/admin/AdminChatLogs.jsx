import { useEffect, useState } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import { MessageSquare, Search, CheckCircle, XCircle, Download } from 'lucide-react'
import axios from 'axios'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

export default function AdminChatLogs() {
  const [logs, setLogs]       = useState([])
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all') // 'all' | 'answered' | 'unanswered'
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    axios.get('/api/admin/chatlogs', { headers: authHeader() })
      .then(res => setLogs(res.data))
      .catch(() => {})
  }, [])

  function handleExport() {
    const token = localStorage.getItem('admin_token')
    window.open(`/api/admin/analytics/unanswered/export?token=${token}`, '_blank')
  }

  const filtered = logs.filter(l => {
    const matchSearch = l.question.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'answered' ? l.is_answered :
      !l.is_answered
    return matchSearch && matchFilter
  })

  const answeredCount   = logs.filter(l => l.is_answered).length
  const unansweredCount = logs.filter(l => !l.is_answered).length

  function formatDate(str) {
    const d = new Date(str.includes('T') || str.endsWith('Z') ? str : str.replace(' ', 'T') + 'Z')
    return d.toLocaleString()
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-kcc-dark mb-1">Chat Logs</h1>
        <p className="text-gray-500 text-sm mb-6">All questions asked by users — latest 200</p>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <MessageSquare size={18} className="text-kcc-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold text-kcc-dark">{logs.length}</p>
              <p className="text-xs text-gray-500">Total Questions</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-kcc-dark">{answeredCount}</p>
              <p className="text-xs text-gray-500">Answered</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <XCircle size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-kcc-dark">{unansweredCount}</p>
              <p className="text-xs text-gray-500">Unanswered</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-kcc-blue text-gray-800"
            />
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {[['all', 'All'], ['answered', 'Answered'], ['unanswered', 'Unanswered']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === val
                    ? 'bg-kcc-blue text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-kcc-blue hover:text-kcc-blue transition-all"
          >
            <Download size={14} />
            Export Unanswered
          </button>
        </div>

        {/* Logs list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-3">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No logs found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(log => (
                <div
                  key={log.id}
                  className={`rounded-xl border p-3 cursor-pointer transition-all ${
                    log.is_answered
                      ? 'border-green-100 bg-green-50/40 hover:bg-green-50'
                      : 'border-amber-100 bg-amber-50/40 hover:bg-amber-50'
                  }`}
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0">
                      {log.is_answered
                        ? <CheckCircle size={15} className="text-green-500" />
                        : <XCircle size={15} className="text-amber-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{log.question}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.created_at)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                      log.is_answered
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {log.is_answered ? 'Answered' : 'Unanswered'}
                    </span>
                  </div>
                  {expanded === log.id && log.answer && (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-200/70">
                      <p className="text-xs text-gray-500 font-medium mb-1">AI Answer:</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{log.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
