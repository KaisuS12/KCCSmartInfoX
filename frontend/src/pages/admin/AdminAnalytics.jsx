import { useEffect, useState, useCallback } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, AreaChart, Area,
} from 'recharts'
import {
  AlertCircle, TrendingUp, Download, RefreshCw, CheckCircle,
  MessageSquare, ThumbsUp, ThumbsDown, Sparkles,
  ChevronDown, ChevronUp, Plus, Printer, Activity,
} from 'lucide-react'
import axios from 'axios'
import { SkeleStatCard, SkeleListItem, SkeleChartArea } from '../../components/shared/Skeleton'

const API = (path) => `/api${path}`
const token = () => localStorage.getItem('admin_token')

// ── FAMIS-style stat card (same as Dashboard) ─────────────────────────────────
function StatCard({ icon: Icon, label, value, accentColor, iconBg, iconColor, sub }) {
  return (
    <div className="relative bg-[#111c3a] border border-white/10 rounded-2xl p-5 overflow-hidden transition-all duration-200">
      {accentColor && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: accentColor }} />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 truncate" style={{ color: accentColor || '#94a3b8' }}>
            {label}
          </p>
          <p className="text-3xl font-bold text-white leading-none mb-1.5">{value ?? '—'}</p>
          {sub && <p className="text-gray-500 text-xs">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </div>
  )
}

// ── Custom dark tooltip ────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a2a50] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function AdminAnalytics() {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [tab, setTab]             = useState('unanswered')
  const [faqSuggestions, setFaqSuggestions] = useState(null)
  const [faqLoading, setFaqLoading]         = useState(false)
  const [faqOpen, setFaqOpen]               = useState(false)
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
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>KCCSmartInfoX Analytics Report — ${dateStr}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;padding:36px}.header{text-align:center;border-bottom:3px solid #003087;padding-bottom:18px;margin-bottom:28px}.kcc-circle{display:inline-block;width:56px;height:56px;background:#c9a84c;border-radius:50%;line-height:56px;font-size:18px;font-weight:900;color:#003087;margin-bottom:8px}.header h1{font-size:20px;color:#003087;font-weight:900}.header p{color:#666;font-size:11px;margin-top:4px}.section{margin-bottom:30px}.section-title{font-size:13px;font-weight:700;color:#003087;border-left:4px solid #c9a84c;padding-left:10px;margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#003087;color:#fff;padding:8px 10px;text-align:left}td{padding:6px 10px;border-bottom:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}.box{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}.val{font-size:22px;font-weight:900;color:#003087}.lbl{font-size:10px;color:#6b7280;margin-top:2px}.green .val{color:#166534}.red .val{color:#991b1b}.gold .val{color:#92400e}.footer{text-align:center;color:#9ca3af;font-size:10px;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:24px}@media print{body{padding:16px}}</style>
    </head><body>
    <div class="header"><div class="kcc-circle">KCC</div><h1>KCCSmartInfoX — Analytics Report</h1><p>Kabankalan Catholic College &nbsp;|&nbsp; Generated: ${dateStr}</p></div>
    <div class="section"><div class="section-title">Overall Statistics</div><div class="grid"><div class="box"><div class="val">${data.total_questions}</div><div class="lbl">Total Questions</div></div><div class="box green"><div class="val">${data.answered}</div><div class="lbl">Answered</div></div><div class="box red"><div class="val">${data.unanswered}</div><div class="lbl">Unanswered</div></div><div class="box gold"><div class="val">${data.answer_rate}%</div><div class="lbl">Answer Rate</div></div></div><div class="grid"><div class="box green"><div class="val">${data.thumbs_up}</div><div class="lbl">Helpful Ratings</div></div><div class="box red"><div class="val">${data.thumbs_down}</div><div class="lbl">Not Helpful</div></div><div class="box"><div class="val">${data.total_documents}</div><div class="lbl">Knowledge Docs</div></div><div class="box"><div class="val">${data.total_subscribers}</div><div class="lbl">Subscribers</div></div></div></div>
    ${dailyRows ? `<div class="section"><div class="section-title">Questions Per Day</div><table><thead><tr><th>Date</th><th>Questions Asked</th></tr></thead><tbody>${dailyRows}</tbody></table></div>` : ''}
    ${topQRows ? `<div class="section"><div class="section-title">Top 10 Most Asked Questions</div><table><thead><tr><th>#</th><th>Question</th><th style="text-align:center">Times Asked</th></tr></thead><tbody>${topQRows}</tbody></table></div>` : ''}
    ${unansRows ? `<div class="section"><div class="section-title">Unanswered Questions</div><table><thead><tr><th>#</th><th>Question</th><th>Date</th></tr></thead><tbody>${unansRows}</tbody></table></div>` : ''}
    ${feedbackRows ? `<div class="section"><div class="section-title">Questions Marked "Not Helpful"</div><table><thead><tr><th>#</th><th>Question</th><th>Date</th></tr></thead><tbody>${feedbackRows}</tbody></table></div>` : ''}
    <div class="footer">KCCSmartInfoX &nbsp;|&nbsp; AI-Powered Campus Information System &nbsp;|&nbsp; ${dateStr}</div>
    </body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  const filtered    = (data?.unanswered_questions ?? []).filter(q => q.question.toLowerCase().includes(search.toLowerCase()))
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const topChartData = (data?.top_questions ?? []).map(q => ({
    question: q.question.length > 40 ? q.question.slice(0, 40) + '…' : q.question,
    count: q.count,
  }))
  const answerRate = data?.answer_rate ?? null

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading && !data) return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div><div className="h-5 w-32 bg-white/10 rounded mb-2" /><div className="h-3 w-56 bg-white/5 rounded" /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeleStatCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <SkeleStatCard key={i} />)}
        </div>
        <div className="bg-[#111c3a] border border-white/10 rounded-2xl p-5"><SkeleChartArea height={200} /></div>
        <div className="bg-[#111c3a] border border-white/10 rounded-2xl p-5 space-y-2">
          {[...Array(6)].map((_, i) => <SkeleListItem key={i} />)}
        </div>
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Overview</p>
            <h1 className="text-xl font-bold text-white">Analytics</h1>
            <p className="text-gray-500 text-xs mt-0.5">Questions asked, AI performance & knowledge gaps</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={!data}
              className="flex items-center gap-2 text-sm bg-kcc-blue text-white px-4 py-2 rounded-xl hover:bg-blue-800 disabled:opacity-50 transition"
            >
              <Printer size={14} />
              Print Report
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition px-3 py-2 rounded-xl border border-white/10 hover:border-white/20"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Top 4 Stat Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={MessageSquare}
            label="Total Questions"
            value={data?.total_questions}
            accentColor="#3b82f6"
            iconBg="bg-blue-500/15"
            iconColor="text-blue-400"
            sub="All time"
          />
          <StatCard
            icon={CheckCircle}
            label="Answered"
            value={data?.answered}
            accentColor="#22c55e"
            iconBg="bg-green-500/15"
            iconColor="text-green-400"
            sub="Successfully resolved"
          />
          <StatCard
            icon={AlertCircle}
            label="Unanswered"
            value={data?.unanswered}
            accentColor="#ef4444"
            iconBg="bg-red-500/15"
            iconColor="text-red-400"
            sub="Need attention"
          />
          <StatCard
            icon={Activity}
            label="Answer Rate"
            value={answerRate !== null ? `${answerRate}%` : '—'}
            accentColor={answerRate >= 80 ? '#22c55e' : answerRate >= 50 ? '#eab308' : '#ef4444'}
            iconBg="bg-purple-500/15"
            iconColor="text-purple-400"
            sub={answerRate >= 80 ? 'Excellent' : answerRate >= 50 ? 'Needs improvement' : 'Critical'}
          />
        </div>

        {/* ── Feedback Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={ThumbsUp}
            label="Helpful Ratings"
            value={data?.thumbs_up}
            accentColor="#22c55e"
            iconBg="bg-green-500/15"
            iconColor="text-green-400"
            sub="Users found answers helpful"
          />
          <StatCard
            icon={ThumbsDown}
            label="Not Helpful Ratings"
            value={data?.thumbs_down}
            accentColor="#ef4444"
            iconBg="bg-red-500/15"
            iconColor="text-red-400"
            sub="Answers to improve"
          />
        </div>

        {/* ── Daily Chart ───────────────────────────────────────────────────── */}
        <div className="bg-[#111c3a] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-semibold text-sm">Questions Per Day (Last 7 Days)</h2>
              <p className="text-gray-500 text-xs mt-0.5">Daily chat activity</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-kcc-blue bg-kcc-blue/10 px-2.5 py-1 rounded-full border border-kcc-blue/20">
              <TrendingUp size={11} />
              Activity
            </div>
          </div>
          {data?.daily_data?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.daily_data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#003087" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#003087" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Questions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#aGrad)"
                  dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#3b82f6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">No data yet.</div>
          )}
        </div>

        {/* ── Tab Section ───────────────────────────────────────────────────── */}
        <div className="bg-[#111c3a] border border-white/10 rounded-2xl p-5">

          {/* Tab buttons */}
          <div className="flex gap-2 mb-5 border-b border-white/8 pb-4">
            {[
              { key: 'unanswered', label: `Unanswered (${data?.unanswered ?? 0})`,                    icon: AlertCircle },
              { key: 'top',        label: 'Top Questions',                                              icon: TrendingUp  },
              { key: 'feedback',   label: `Needs Improvement (${data?.bad_answers?.length ?? 0})`,     icon: ThumbsDown  },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  tab === key
                    ? 'bg-kcc-blue text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* ── Unanswered Tab ────────────────────────────────────────────── */}
          {tab === 'unanswered' && (
            <div className="animate-fadeIn">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-gray-500 text-xs">Add info to the knowledge base to fix these gaps.</p>
                <div className="flex gap-2 flex-wrap">
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
                      className="flex items-center gap-2 text-sm bg-white/10 text-white border border-white/10 px-4 py-2 rounded-xl hover:bg-white/15 transition disabled:opacity-60"
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
                    className="w-full flex items-center justify-between px-4 py-3 bg-kcc-gold/10 hover:bg-kcc-gold/15 transition"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Sparkles size={15} className="text-kcc-gold" />
                      AI-Suggested Knowledge Base Content
                      {faqSuggestions && <span className="text-xs font-normal text-gray-400">({faqSuggestions.based_on} questions analyzed)</span>}
                    </span>
                    {faqOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                  </button>
                  <div className="p-4 space-y-3 bg-[#0d1830]">
                    {faqLoading ? (
                      <div className="text-center py-6 text-gray-400 text-sm">Analyzing unanswered questions with AI…</div>
                    ) : faqSuggestions?.suggestions?.length ? (
                      <>
                        <p className="text-xs text-gray-500 mb-2">Review before adding to the knowledge base. Click <strong className="text-white">+ Add</strong> to copy to clipboard.</p>
                        {faqSuggestions.suggestions.map((s, i) => (
                          <div key={i} className="bg-[#111c3a] rounded-xl border border-white/10 p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-sm font-semibold text-white">{s.topic}</p>
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
                            <p className="text-gray-400 text-xs leading-relaxed">{s.content}</p>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-center text-gray-500 text-sm py-4">No suggestions generated. Try again.</p>
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 mb-4 focus:outline-none focus:border-kcc-blue/50 transition"
                  style={{ color: '#fff' }}
                />
              )}

              {!data?.unanswered_questions?.length ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={28} className="text-green-400" />
                  </div>
                  <p className="text-white text-sm font-medium">No unanswered questions yet!</p>
                  <p className="text-gray-500 text-xs mt-1">Great knowledge base coverage.</p>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No results for "{search}"</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {paginated.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl hover:bg-red-500/10 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-red-400 text-[10px] font-bold">{(page - 1) * PAGE_SIZE + i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-sm break-words">{q.question}</p>
                          <p className="text-gray-600 text-xs mt-1">{new Date(q.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                      <span className="text-xs">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                          className="px-3 py-1 rounded-lg border border-white/10 text-xs text-gray-400 disabled:opacity-40 hover:bg-white/5 transition">‹ Prev</button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                          className="px-3 py-1 rounded-lg border border-white/10 text-xs text-gray-400 disabled:opacity-40 hover:bg-white/5 transition">Next ›</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Top Questions Tab ─────────────────────────────────────────── */}
          {tab === 'top' && (
            <div className="animate-fadeIn">
              <p className="text-gray-500 text-xs mb-4">Most frequently asked questions by users.</p>
              {topChartData.length ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="question" tick={{ fill: '#9ca3af', fontSize: 10 }} width={190} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Times Asked" radius={[0, 6, 6, 0]}>
                      {topChartData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#FFD700' : '#003087'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-sm text-center py-10">No questions logged yet.</p>
              )}
            </div>
          )}

          {/* ── Needs Improvement Tab ─────────────────────────────────────── */}
          {tab === 'feedback' && (
            <div className="animate-fadeIn">
              <p className="text-gray-500 text-xs mb-4">Questions users marked "Not Helpful" — improve these in the knowledge base.</p>
              {!data?.bad_answers?.length ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
                    <ThumbsUp size={28} className="text-green-400" />
                  </div>
                  <p className="text-white text-sm font-medium">No negative feedback yet!</p>
                  <p className="text-gray-500 text-xs mt-1">All responses are helpful.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {data.bad_answers.map(f => (
                    <div key={f.id} className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl hover:bg-orange-500/10 transition-colors">
                      <p className="text-gray-200 text-sm font-medium mb-1">Q: {f.question}</p>
                      <p className="text-gray-500 text-xs line-clamp-2">A: {f.answer}</p>
                      <p className="text-gray-600 text-xs mt-2">{new Date(f.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-gray-700 text-xs pb-2">Auto-refreshes every 30 seconds</p>
      </div>
    </AdminLayout>
  )
}
