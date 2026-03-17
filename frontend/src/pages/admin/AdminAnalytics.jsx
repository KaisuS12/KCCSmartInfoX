import { useEffect, useState, useCallback } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell,
} from 'recharts'
import { AlertCircle, TrendingUp, Download, RefreshCw, CheckCircle, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react'
import axios from 'axios'

const API = (path) => `/api${path}`
const token = () => localStorage.getItem('admin_token')

function StatCard({ icon: Icon, label, value, color = 'text-kcc-blue', bg = 'bg-blue-50' }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`${bg} p-3 rounded-xl`}>
        <Icon size={22} className={color} />
      </div>
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-2xl font-bold text-kcc-dark">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState('unanswered') // 'unanswered' | 'top' | 'feedback'
  const PAGE_SIZE = 15

  const fetchData = useCallback(() => {
    setLoading(true)
    axios.get(API('/admin/analytics'), { headers: { Authorization: `Bearer ${token()}` } })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await axios.get(API('/admin/analytics/unanswered/export'), {
        headers: { Authorization: `Bearer ${token()}` },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `unanswered_questions_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Export failed.')
    } finally {
      setExporting(false)
    }
  }

  const filtered = (data?.unanswered_questions ?? []).filter(q =>
    q.question.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Top questions — shorten long text for chart
  const topChartData = (data?.top_questions ?? []).map(q => ({
    question: q.question.length > 40 ? q.question.slice(0, 40) + '…' : q.question,
    count: q.count,
  }))

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-kcc-dark">Analytics</h1>
            <p className="text-gray-500 text-sm">Questions asked, AI performance & knowledge gaps</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-kcc-blue transition"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard icon={MessageSquare} label="Total Questions" value={data?.total_questions} />
          <StatCard icon={CheckCircle}   label="Answered"       value={data?.answered}        color="text-green-600" bg="bg-green-50" />
          <StatCard icon={AlertCircle}   label="Unanswered"     value={data?.unanswered}      color="text-red-500"   bg="bg-red-50" />
          <StatCard icon={TrendingUp}    label="Answer Rate"
            value={data?.answer_rate != null ? `${data.answer_rate}%` : '—'}
            color="text-purple-600" bg="bg-purple-50"
          />
        </div>

        {/* Feedback stat cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard icon={ThumbsUp}   label="Helpful Ratings"     value={data?.thumbs_up}   color="text-green-600" bg="bg-green-50" />
          <StatCard icon={ThumbsDown} label="Not Helpful Ratings" value={data?.thumbs_down} color="text-red-500"   bg="bg-red-50" />
        </div>

        {/* Daily Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold text-kcc-dark mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-kcc-blue" />
            Questions Per Day (Last 7 Days)
          </h2>
          {data?.daily_data?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.daily_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#003087" radius={[4, 4, 0, 0]} name="Questions" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No data yet.</p>
          )}
        </div>

        {/* Tab section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {/* Tabs */}
          <div className="flex gap-2 mb-5 border-b border-gray-100 pb-3">
            {[
              { key: 'unanswered', label: `Unanswered (${data?.unanswered ?? 0})`, icon: AlertCircle },
              { key: 'top',        label: `Top Questions`,                           icon: TrendingUp },
              { key: 'feedback',   label: `Needs Improvement (${data?.bad_answers?.length ?? 0})`, icon: ThumbsDown },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  tab === key ? 'bg-kcc-blue text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Unanswered Tab */}
          {tab === 'unanswered' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-xs">Add info to the knowledge base to fix these gaps.</p>
                {data?.unanswered > 0 && (
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 text-sm bg-kcc-blue text-white px-4 py-2 rounded-xl hover:bg-blue-800 transition disabled:opacity-60"
                  >
                    <Download size={14} />
                    {exporting ? 'Exporting…' : 'Export CSV'}
                  </button>
                )}
              </div>

              {data?.unanswered > 0 && (
                <input
                  type="text"
                  placeholder="Search questions…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 mb-4 focus:outline-none focus:ring-2 focus:ring-kcc-blue"
                />
              )}

              {!data?.unanswered_questions?.length ? (
                <div className="text-center py-10">
                  <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm font-medium">No unanswered questions yet!</p>
                  <p className="text-gray-400 text-xs mt-1">Great knowledge base!</p>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No results for "{search}"</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {paginated.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                        <span className="text-red-300 text-xs font-mono mt-0.5 shrink-0">#{(page - 1) * PAGE_SIZE + i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-sm break-words">{q.question}</p>
                          <p className="text-gray-400 text-xs mt-1">{new Date(q.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                      <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">‹ Prev</button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">Next ›</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Top Questions Tab */}
          {tab === 'top' && (
            <>
              <p className="text-gray-400 text-xs mb-4">Most frequently asked questions by users.</p>
              {topChartData.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topChartData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="question" tick={{ fontSize: 10 }} width={180} />
                    <Tooltip />
                    <Bar dataKey="count" name="Times Asked" radius={[0, 4, 4, 0]}>
                      {topChartData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#C9A84C' : '#003087'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm text-center py-10">No questions logged yet.</p>
              )}
            </>
          )}

          {/* Feedback / Needs Improvement Tab */}
          {tab === 'feedback' && (
            <>
              <p className="text-gray-400 text-xs mb-4">Questions users marked as "Not Helpful" — improve these answers in the knowledge base.</p>
              {!data?.bad_answers?.length ? (
                <div className="text-center py-10">
                  <ThumbsUp size={32} className="text-green-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm font-medium">No negative feedback yet!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {data.bad_answers.map(f => (
                    <div key={f.id} className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                      <p className="text-gray-800 text-sm font-medium mb-1">Q: {f.question}</p>
                      <p className="text-gray-500 text-xs line-clamp-2">A: {f.answer}</p>
                      <p className="text-gray-400 text-xs mt-2">{new Date(f.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-gray-300 text-xs mt-4">Auto-refreshes every 30 seconds</p>
      </div>
    </AdminLayout>
  )
}
