import { useEffect, useState } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import {
  MessageSquare, Search, CheckCircle, XCircle,
  Download, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react'
import axios from 'axios'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

export default function AdminChatLogs() {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [expanded, setExpanded] = useState(null)

  function fetchLogs() {
    setLoading(true)
    axios.get('/api/admin/chatlogs', { headers: authHeader() })
      .then(res => setLogs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [])

  function handleExport() {
    const token = localStorage.getItem('admin_token')
    window.open(`/api/admin/analytics/unanswered/export?token=${token}&filter=${filter}`, '_blank')
  }

  const exportLabel =
    filter === 'answered'   ? 'Export Answered' :
    filter === 'unanswered' ? 'Export Unanswered' : 'Export All'

  const filtered = logs.filter(l => {
    const matchSearch = l.question.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all'        ? true :
      filter === 'answered'   ? l.is_answered :
      !l.is_answered
    return matchSearch && matchFilter
  })

  const answeredCount   = logs.filter(l => l.is_answered).length
  const unansweredCount = logs.filter(l => !l.is_answered).length

  function formatDate(str) {
    const d = new Date(str.includes('T') || str.endsWith('Z') ? str : str.replace(' ', 'T') + 'Z')
    return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // ── Stat filter cards ──────────────────────────────────────────────────────
  const statCards = [
    {
      key:        'all',
      label:      'Total Questions',
      value:      logs.length,
      icon:       MessageSquare,
      accentColor: '#3b82f6',
      iconBg:     'bg-blue-500/15',
      iconColor:  'text-blue-400',
    },
    {
      key:        'answered',
      label:      'Answered',
      value:      answeredCount,
      icon:       CheckCircle,
      accentColor: '#22c55e',
      iconBg:     'bg-green-500/15',
      iconColor:  'text-green-400',
    },
    {
      key:        'unanswered',
      label:      'Unanswered',
      value:      unansweredCount,
      icon:       XCircle,
      accentColor: '#f59e0b',
      iconBg:     'bg-amber-500/15',
      iconColor:  'text-amber-400',
    },
  ]

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Logs</p>
            <h1 className="text-xl font-bold text-white">Chat Logs</h1>
            <p className="text-gray-500 text-xs mt-0.5">All questions asked by users — latest 200</p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition px-3 py-2 rounded-xl border border-white/10 hover:border-white/20"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── FAMIS-style Filter Stat Cards ───────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {statCards.map(({ key, label, value, icon: Icon, accentColor, iconBg, iconColor }) => {
            const active = filter === key
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`relative text-left bg-[#111c3a] border rounded-2xl p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30
                  ${active ? 'border-white/25 ring-1' : 'border-white/10 hover:border-white/20'}
                `}
                style={active ? { ringColor: accentColor } : {}}
              >
                {/* Accent top line */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl transition-opacity duration-200"
                  style={{ backgroundColor: accentColor, opacity: active ? 1 : 0.4 }}
                />
                {/* Active glow overlay */}
                {active && (
                  <div className="absolute inset-0 rounded-2xl opacity-5" style={{ backgroundColor: accentColor }} />
                )}
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accentColor }}>
                      {label}
                    </p>
                    <p className="text-3xl font-bold text-white leading-none mb-1">{value}</p>
                    <p className="text-xs" style={{ color: active ? accentColor : '#6b7280' }}>
                      {active ? '● Filtering' : 'Click to filter'}
                    </p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
                    <Icon size={20} className={iconColor} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Search + Export ─────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#111c3a] border border-white/10 rounded-xl focus:outline-none focus:border-kcc-blue/50 placeholder-gray-600 transition"
              style={{ color: '#fff' }}
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#111c3a] border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            <Download size={14} />
            {exportLabel}
          </button>
        </div>

        {/* ── Logs List ───────────────────────────────────────────────────── */}
        <div className="bg-[#111c3a] border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-600 mb-4 font-medium">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {filter !== 'all' && <span className="ml-1 text-gray-700">— filtered by <span className="text-white/50">{filter}</span></span>}
          </p>

          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={22} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">No logs found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(log => (
                <div
                  key={log.id}
                  className={`rounded-xl border transition-all duration-150 cursor-pointer group ${
                    log.is_answered
                      ? 'border-green-500/15 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/25'
                      : 'border-amber-500/15 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/25'
                  }`}
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  {/* Row */}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.is_answered ? 'bg-green-400' : 'bg-amber-400'}`} />

                    {/* Question + date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{log.question}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatDate(log.created_at)}</p>
                    </div>

                    {/* Badge */}
                    <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      log.is_answered
                        ? 'bg-green-500/15 text-green-400 border-green-500/25'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                    }`}>
                      {log.is_answered ? 'Answered' : 'Unanswered'}
                    </span>

                    {/* Expand chevron */}
                    {log.answer && (
                      <div className="flex-shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors">
                        {expanded === log.id
                          ? <ChevronUp size={15} />
                          : <ChevronDown size={15} />
                        }
                      </div>
                    )}
                  </div>

                  {/* Expanded answer */}
                  {expanded === log.id && log.answer && (
                    <div className="mx-4 mb-4 mt-1 pt-3 border-t border-white/8">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">AI Answer</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{log.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-gray-700 text-xs pb-2">Showing latest 200 entries</p>
      </div>
    </AdminLayout>
  )
}
