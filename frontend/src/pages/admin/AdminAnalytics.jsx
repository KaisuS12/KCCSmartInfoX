import { useEffect, useState, useCallback } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell,
} from 'recharts'
import { AlertCircle, TrendingUp, Download, RefreshCw, CheckCircle, MessageSquare, ThumbsUp, ThumbsDown, Sparkles, ChevronDown, ChevronUp, Plus, Printer } from 'lucide-react'
import axios from 'axios'
import { SkeleStatCard, SkeleListItem, SkeleChartArea } from '../../components/shared/Skeleton'

const API = (path) => `/api${path}`
const token = () => localStorage.getItem('admin_token')

function StatCard({ icon: Icon, label, value, color = 'text-kcc-blue', bg = 'bg-blue-50' }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
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
  const [faqSuggestions, setFaqSuggestions] = useState(null)
  const [faqLoading, setFaqLoading] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
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

  const handleFaqGenerate = async () => {
    setFaqLoading(true)
    setFaqOpen(true)
    try {
      const res = await axios.post(API('/admin/analytics/faq-suggestions'), {}, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      setFaqSuggestions(res.data)
    } catch {
      alert('Failed to generate suggestions. Try again.')
    } finally {
      setFaqLoading(false)
    }
  }

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

  function handlePrint() {
    if (!data) return
    const dateStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

    const topQRows = (data.top_questions ?? []).map((q, i) =>
      `<tr><td>${i + 1}</td><td>${q.question}</td><td style="text-align:center;font-weight:bold;">${q.count}</td></tr>`
    ).join('')

    const unansRows = (data.unanswered_questions ?? []).slice(0, 50).map((q, i) =>
      `<tr><td>${i + 1}</td><td>${q.question}</td><td>${new Date(q.created_at).toLocaleDateString('en-PH')}</td></tr>`
    ).join('')

    const dailyRows = (data.daily_data ?? []).map(d =>
      `<tr><td>${d.date}</td><td style="text-align:center;">${d.count}</td></tr>`
    ).join('')

    const feedbackRows = (data.bad_answers ?? []).map((f, i) =>
      `<tr><td>${i + 1}</td><td>${f.question}</td><td>${new Date(f.created_at).toLocaleDateString('en-PH')}</td></tr>`
    ).join('')

    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <title>KCCSmartInfoX Analytics Report — ${dateStr}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;padding:36px}
    .header{text-align:center;border-bottom:3px solid #003087;padding-bottom:18px;margin-bottom:28px}
    .kcc-circle{display:inline-block;width:56px;height:56px;background:#c9a84c;border-radius:50%;line-height:56px;font-size:18px;font-weight:900;color:#003087;letter-spacing:-1px;margin-bottom:8px}
    .header h1{font-size:20px;color:#003087;font-weight:900}
    .header p{color:#666;font-size:11px;margin-top:4px}
    .section{margin-bottom:30px}
    .section-title{font-size:13px;font-weight:700;color:#003087;border-left:4px solid #c9a84c;padding-left:10px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#003087;color:#fff;padding:8px 10px;text-align:left}
    td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
    tr:nth-child(even) td{background:#f9fafb}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}
    .box{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
    .val{font-size:22px;font-weight:900;color:#003087}
    .lbl{font-size:10px;color:#6b7280;margin-top:2px}
    .green .val{color:#166534}.red .val{color:#991b1b}.gold .val{color:#92400e}
    .footer{text-align:center;color:#9ca3af;font-size:10px;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:24px}
    @media print{body{padding:16px}}
  </style>
</head>
<body>
  <div class="header">
    <div class="kcc-circle">KCC</div>
    <h1>KCCSmartInfoX — Analytics Report</h1>
    <p>Kalinga-Apayao State College Conner Campus &nbsp;|&nbsp; Generated: ${dateStr}</p>
  </div>

  <div class="section">
    <div class="section-title">Overall Statistics</div>
    <div class="grid">
      <div class="box"><div class="val">${data.total_questions}</div><div class="lbl">Total Questions</div></div>
      <div class="box green"><div class="val">${data.answered}</div><div class="lbl">Answered</div></div>
      <div class="box red"><div class="val">${data.unanswered}</div><div class="lbl">Unanswered</div></div>
      <div class="box gold"><div class="val">${data.answer_rate}%</div><div class="lbl">Answer Rate</div></div>
    </div>
    <div class="grid">
      <div class="box green"><div class="val">${data.thumbs_up}</div><div class="lbl">Helpful Ratings</div></div>
      <div class="box red"><div class="val">${data.thumbs_down}</div><div class="lbl">Not Helpful</div></div>
      <div class="box"><div class="val">${data.total_documents}</div><div class="lbl">Knowledge Docs</div></div>
      <div class="box"><div class="val">${data.total_subscribers}</div><div class="lbl">Subscribers</div></div>
    </div>
  </div>

  ${dailyRows ? `<div class="section">
    <div class="section-title">Questions Per Day (Last 7 Days)</div>
    <table><thead><tr><th>Date</th><th>Questions Asked</th></tr></thead><tbody>${dailyRows}</tbody></table>
  </div>` : ''}

  ${topQRows ? `<div class="section">
    <div class="section-title">Top 10 Most Asked Questions</div>
    <table><thead><tr><th>#</th><th>Question</th><th style="text-align:center">Times Asked</th></tr></thead><tbody>${topQRows}</tbody></table>
  </div>` : ''}

  ${unansRows ? `<div class="section">
    <div class="section-title">Unanswered Questions (up to 50 most recent)</div>
    <table><thead><tr><th>#</th><th>Question</th><th>Date</th></tr></thead><tbody>${unansRows}</tbody></table>
  </div>` : ''}

  ${feedbackRows ? `<div class="section">
    <div class="section-title">Questions Marked "Not Helpful"</div>
    <table><thead><tr><th>#</th><th>Question</th><th>Date</th></tr></thead><tbody>${feedbackRows}</tbody></table>
  </div>` : ''}

  <div class="footer">KCCSmartInfoX &nbsp;|&nbsp; AI-Powered Campus Information System &nbsp;|&nbsp; ${dateStr}</div>
</body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 400)
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

  if (loading && !data) return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-kcc-dark">Analytics</h1>
            <p className="text-gray-500 text-sm">Questions asked, AI performance & knowledge gaps</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[...Array(4)].map((_, i) => <SkeleStatCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[...Array(2)].map((_, i) => <SkeleStatCard key={i} />)}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <SkeleChartArea height={200} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-2">
          {[...Array(6)].map((_, i) => <SkeleListItem key={i} />)}
        </div>
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-kcc-dark">Analytics</h1>
            <p className="text-gray-500 text-sm">Questions asked, AI performance & knowledge gaps</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={!data}
              className="flex items-center gap-2 text-sm bg-kcc-blue text-white px-4 py-2 rounded-xl hover:bg-kcc-dark disabled:opacity-50 transition"
            >
              <Printer size={14} />
              Print Report
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-kcc-blue transition"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
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
            <div key="unanswered" className="animate-fadeIn">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-gray-400 text-xs">Add info to the knowledge base to fix these gaps.</p>
                <div className="flex gap-2">
                  {data?.unanswered > 0 && (
                    <button
                      onClick={handleFaqGenerate}
                      disabled={faqLoading}
                      className="flex items-center gap-2 text-sm bg-kcc-gold text-kcc-dark px-4 py-2 rounded-xl hover:bg-yellow-400 transition disabled:opacity-60 font-medium"
                    >
                      <Sparkles size={14} />
                      {faqLoading ? 'Generating…' : 'AI Suggest Content'}
                    </button>
                  )}
                  {data?.unanswered > 0 && (
                    <button
                      onClick={handleExport}
                      disabled={exporting}
                      className="flex items-center gap-2 text-sm bg-kcc-blue text-white px-4 py-2 rounded-xl hover:bg-blue-800 transition disabled:opacity-60"
                    >
                      {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                      {exporting ? 'Exporting…' : 'Export CSV'}
                    </button>
                  )}
                </div>
              </div>

              {/* FAQ Suggestions Panel */}
              {faqOpen && (
                <div className="mb-4 border border-kcc-gold/30 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setFaqOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-kcc-gold/10 hover:bg-kcc-gold/20 transition"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-kcc-dark">
                      <Sparkles size={15} className="text-kcc-gold" />
                      AI-Suggested Knowledge Base Content
                      {faqSuggestions && <span className="text-xs font-normal text-gray-500">({faqSuggestions.based_on} questions analyzed)</span>}
                    </span>
                    {faqOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <div className="p-4 space-y-3 bg-amber-50/50">
                    {faqLoading ? (
                      <div className="text-center py-6 text-gray-400 text-sm">Analyzing unanswered questions with AI…</div>
                    ) : faqSuggestions?.suggestions?.length ? (
                      <>
                        <p className="text-xs text-gray-500 mb-2">Review and verify these before adding to the knowledge base. Click <strong>+ Add</strong> to copy to clipboard.</p>
                        {faqSuggestions.suggestions.map((s, i) => (
                          <div key={i} className="bg-white rounded-xl border border-amber-200 p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-sm font-semibold text-kcc-dark">{s.topic}</p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${s.topic}\n\n${s.content}`)
                                  alert('Copied! Paste it in Knowledge Base → Add Text.')
                                }}
                                className="flex items-center gap-1 text-xs bg-kcc-blue text-white px-2.5 py-1 rounded-lg hover:bg-blue-800 transition flex-shrink-0"
                              >
                                <Plus size={11} /> Add
                              </button>
                            </div>
                            <p className="text-gray-600 text-xs leading-relaxed">{s.content}</p>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-center text-gray-400 text-sm py-4">No suggestions generated. Try again.</p>
                    )}
                  </div>
                </div>
              )}

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
            </div>
          )}

          {/* Top Questions Tab */}
          {tab === 'top' && (
            <div key="top" className="animate-fadeIn">
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
            </div>
          )}

          {/* Feedback / Needs Improvement Tab */}
          {tab === 'feedback' && (
            <div key="feedback" className="animate-fadeIn">
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
            </div>
          )}
        </div>

        <p className="text-center text-gray-300 text-xs mt-4">Auto-refreshes every 30 seconds</p>
      </div>
    </AdminLayout>
  )
}
