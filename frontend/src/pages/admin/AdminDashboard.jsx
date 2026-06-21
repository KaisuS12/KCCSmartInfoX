import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/shared/AdminLayout'
import {
  AlertCircle, Users, FileText,
  TrendingUp, ThumbsUp, BookOpen,
  ArrowRight, RefreshCw, CheckCircle, AlertTriangle,
  Megaphone, MessageCircle, Activity, Zap, Info
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import axios from 'axios'

const PIE_COLORS = ['#22c55e', '#ef4444']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── FAMIS-style big stat card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, iconColor, iconBg, accentColor, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative bg-[#111c3a] border border-white/10 rounded-2xl p-5 overflow-hidden transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30' : ''}`}
    >
      {accentColor && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: accentColor }} />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Colored label — key FAMIS visual */}
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 truncate" style={{ color: accentColor || '#94a3b8' }}>
            {label}
          </p>
          <p className="text-3xl font-bold text-white leading-none mb-1.5">{value ?? '—'}</p>
          {sub && <p className="text-gray-500 text-xs leading-snug">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </div>
  )
}

// ── Mini quick-action card ─────────────────────────────────────────────────────
function ActionCard({ icon: Icon, label, sub, iconBg, iconColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-[#111c3a] border border-white/8 rounded-xl px-4 py-3 hover:border-kcc-blue/40 hover:bg-[#1a2a50] transition-all duration-150 text-left w-full group"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={16} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium leading-tight">{label}</p>
        {sub && <p className="text-gray-500 text-xs mt-0.5 truncate">{sub}</p>}
      </div>
      <ArrowRight size={14} className="text-gray-600 group-hover:text-kcc-blue group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  )
}

// ── Custom tooltip for charts ──────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a2a50] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [pendingConcerns, setPending] = useState(0)
  const [activeLiveChats, setActiveLiveChats] = useState(0)
  const [backendOnline, setBackendOnline] = useState(null)
  const [chartRange, setChartRange]   = useState('week')   // 'week' | 'month'
  const navigate = useNavigate()

  function fetchData() {
    const token = localStorage.getItem('admin_token')
    const headers = { Authorization: `Bearer ${token}` }
    setLoading(true)
    axios.get('/api/admin/analytics', { headers })
      .then(res => { setData(res.data); setBackendOnline(true) })
      .catch(() => setBackendOnline(false))
      .finally(() => setLoading(false))
    axios.get('/api/admin/concerns', { headers })
      .then(res => setPending(res.data.filter(c => c.status === 'pending').length)).catch(() => {})
    axios.get('/api/admin/live-chats?status=active', { headers })
      .then(res => setActiveLiveChats(res.data.length)).catch(() => {})
  }

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, 15000)
    return () => clearInterval(iv)
  }, [])

  // Chart data
  const dailyDataAll = (data?.daily_data || []).slice(-14).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    Questions: d.count,
    Answered: d.answered ?? 0,
    Unanswered: d.unanswered ?? 0,
  }))
  const dailyData = chartRange === 'week' ? dailyDataAll.slice(-7) : dailyDataAll
  const rangeTotals = dailyData.reduce((acc, d) => ({
    questions:  acc.questions + d.Questions,
    answered:   acc.answered + d.Answered,
    unanswered: acc.unanswered + d.Unanswered,
  }), { questions: 0, answered: 0, unanswered: 0 })
  const rangeAnswerRate = rangeTotals.questions > 0 ? Math.round((rangeTotals.answered / rangeTotals.questions) * 1000) / 10 : 0

  const pieData = [
    { name: 'Answered',   value: data?.answered   || 0 },
    { name: 'Unanswered', value: data?.unanswered || 0 },
  ]

  const answerRate = data?.answer_rate ?? null
  const rateColor = answerRate >= 80 ? '#22c55e' : answerRate >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">

        {/* ── Top Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Overview</p>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {backendOnline !== null && (
              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                backendOnline
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {backendOnline ? 'Online' : 'Offline'}
              </div>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Welcome Banner + 2 Stacked Cards ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Welcome card */}
          <div className="lg:col-span-2 relative bg-gradient-to-br from-[#0f1f45] via-[#1a2a5e] to-[#111c3a] border border-kcc-blue/25 rounded-2xl p-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-kcc-gold/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-kcc-blue/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <p className="text-kcc-gold text-xs font-semibold uppercase tracking-widest mb-1">{greeting()}</p>
              <h2 className="text-white text-2xl font-bold mb-1">Welcome back, Admin!</h2>
              <p className="text-gray-400 text-sm mb-5">Here's what's happening in KCCSmartInfoX today.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Questions', value: data?.total_questions ?? '—', color: 'text-kcc-blue',   icon: MessageCircle, iconBg: 'bg-kcc-blue/15',
                    formula: 'Count of every question logged in chat_logs, all time.' },
                  { label: 'Answered',        value: data?.answered       ?? '—', color: 'text-green-400',  icon: CheckCircle,   iconBg: 'bg-green-500/15',
                    formula: 'Total Questions − Unanswered (questions where is_answered = true).' },
                  { label: 'Unanswered',      value: data?.unanswered     ?? '—', color: 'text-red-400',    icon: AlertTriangle, iconBg: 'bg-red-500/15',
                    formula: 'Count of questions where is_answered = false (AI had no good answer).' },
                  { label: 'Answer Rate',     value: answerRate !== null ? `${answerRate}%` : '—', color: answerRate >= 80 ? 'text-green-400' : answerRate >= 50 ? 'text-yellow-400' : 'text-red-400', icon: Activity, iconBg: 'bg-yellow-500/15',
                    formula: '(Answered ÷ Total Questions) × 100, rounded to 1 decimal.' },
                ].map(s => (
                  <div key={s.label} className="group relative bg-white/5 rounded-xl px-3 py-2.5 border border-white/8 flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                      <s.icon size={15} className={s.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xl font-bold leading-tight ${s.color}`}>{s.value}</p>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{s.label}</p>
                    </div>
                    <Info size={12} className="text-gray-600 flex-shrink-0 cursor-help" />
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <div className="bg-[#0a1228] border border-white/10 text-gray-300 text-[11px] leading-relaxed rounded-lg px-3 py-2 shadow-xl">
                        <span className={`font-semibold ${s.color}`}>{s.label}</span> — {s.formula}
                      </div>
                      <div className="w-2 h-2 bg-[#0a1228] border-r border-b border-white/10 rotate-45 mx-auto -mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stacked cards */}
          <div className="flex flex-col gap-4">
            <StatCard
              icon={Users}
              label="Subscribers"
              value={data?.total_subscribers ?? '—'}
              sub="Email subscribers"
              iconBg="bg-purple-500/15"
              iconColor="text-purple-400"
              accentColor="#a855f7"
              onClick={() => navigate('/admin/subscribers')}
            />
            <StatCard
              icon={FileText}
              label="Documents"
              value={data?.total_documents ?? '—'}
              sub="Knowledge base entries"
              iconBg="bg-indigo-500/15"
              iconColor="text-indigo-400"
              accentColor="#6366f1"
              onClick={() => navigate('/admin/knowledge')}
            />
          </div>
        </div>

        {/* ── 4 Stat Cards Row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={ThumbsUp}
            label="Helpful Ratings"
            value={data?.thumbs_up ?? '—'}
            sub={`${data?.thumbs_down ?? 0} not helpful`}
            iconBg="bg-green-500/15"
            iconColor="text-green-400"
            accentColor="#22c55e"
          />
          <StatCard
            icon={AlertTriangle}
            label="Pending Concerns"
            value={pendingConcerns}
            sub={pendingConcerns > 0 ? 'Needs attention' : 'All clear'}
            iconBg={pendingConcerns > 0 ? 'bg-orange-500/15' : 'bg-gray-700/30'}
            iconColor={pendingConcerns > 0 ? 'text-orange-400' : 'text-gray-500'}
            accentColor={pendingConcerns > 0 ? '#f97316' : '#374151'}
            onClick={() => navigate('/admin/concerns')}
          />
          <StatCard
            icon={MessageCircle}
            label="Active Live Chats"
            value={activeLiveChats}
            sub={activeLiveChats > 0 ? 'Users waiting' : 'No active chats'}
            iconBg={activeLiveChats > 0 ? 'bg-blue-500/15' : 'bg-gray-700/30'}
            iconColor={activeLiveChats > 0 ? 'text-blue-400' : 'text-gray-500'}
            accentColor={activeLiveChats > 0 ? '#3b82f6' : '#374151'}
            onClick={() => navigate('/admin/live-chats')}
          />
          <StatCard
            icon={Activity}
            label="Answer Rate"
            value={answerRate !== null ? `${answerRate}%` : '—'}
            sub={answerRate >= 80 ? 'Excellent' : answerRate >= 50 ? 'Needs improvement' : 'Critical'}
            iconBg="bg-yellow-500/15"
            iconColor="text-yellow-400"
            accentColor="#eab308"
          />
        </div>

        {/* ── Charts Row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Daily Questions Area Chart */}
          <div className="lg:col-span-2 bg-[#111c3a] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Daily Questions</h3>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/8">
                {['week', 'month'].map(r => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className={`text-xs px-3 py-1 rounded-md capitalize transition ${
                      chartRange === r ? 'bg-kcc-blue text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Questions',   value: rangeTotals.questions,         color: 'text-kcc-blue' },
                { label: 'Answered',    value: rangeTotals.answered,          color: 'text-green-400' },
                { label: 'Unanswered',  value: rangeTotals.unanswered,        color: 'text-red-400' },
                { label: 'Answer Rate', value: `${rangeAnswerRate}%`,         color: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label}>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="answeredGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="unansweredGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 'dataMax']} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Unanswered"
                    stroke="#f97316"
                    strokeWidth={2}
                    fill="url(#unansweredGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Answered"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#answeredGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-600 text-sm">
                No data available yet
              </div>
            )}
          </div>

          {/* Answer Rate Pie */}
          <div className="bg-[#111c3a] border border-white/8 rounded-2xl p-5 flex flex-col">
            <div className="mb-4">
              <h3 className="text-white font-semibold text-sm">Response Overview</h3>
              <p className="text-gray-500 text-xs mt-0.5">Answered vs Unanswered</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-bold" style={{ color: rateColor }}>
                    {answerRate !== null ? `${answerRate}%` : '—'}
                  </p>
                  <p className="text-gray-500 text-[10px]">Rate</p>
                </div>
              </div>

              <div className="flex gap-4 mt-3">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-gray-400 text-xs">{d.name}</span>
                    <span className="text-white text-xs font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Row: Quick Actions + Unanswered ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Quick Actions */}
          <div className="bg-[#111c3a] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={15} className="text-kcc-gold" />
              <h3 className="text-white font-semibold text-sm">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              <ActionCard
                icon={BookOpen}
                label="Add Knowledge"
                sub="Upload documents or text"
                iconBg="bg-kcc-blue/15"
                iconColor="text-kcc-blue"
                onClick={() => navigate('/admin/knowledge')}
              />
              <ActionCard
                icon={Megaphone}
                label="Post Announcement"
                sub="Notify students & subscribers"
                iconBg="bg-yellow-500/15"
                iconColor="text-yellow-400"
                onClick={() => navigate('/admin/announcements')}
              />
              <ActionCard
                icon={TrendingUp}
                label="View Analytics"
                sub="Detailed chat analytics"
                iconBg="bg-green-500/15"
                iconColor="text-green-400"
                onClick={() => navigate('/admin/analytics')}
              />
              <ActionCard
                icon={AlertTriangle}
                label="View Concerns"
                sub={pendingConcerns > 0 ? `${pendingConcerns} pending` : 'No pending concerns'}
                iconBg={pendingConcerns > 0 ? 'bg-orange-500/15' : 'bg-gray-700/20'}
                iconColor={pendingConcerns > 0 ? 'text-orange-400' : 'text-gray-500'}
                onClick={() => navigate('/admin/concerns')}
              />
            </div>
          </div>

          {/* Unanswered Questions */}
          <div className="lg:col-span-2 bg-[#111c3a] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-red-400" />
                <h3 className="text-white font-semibold text-sm">Recent Unanswered Questions</h3>
                {(data?.unanswered || 0) > 0 && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                    {data.unanswered}
                  </span>
                )}
              </div>
              {(data?.unanswered || 0) > 0 && (
                <button
                  onClick={() => navigate('/admin/knowledge')}
                  className="text-xs text-kcc-blue hover:underline flex items-center gap-1"
                >
                  Fix gaps <ArrowRight size={11} />
                </button>
              )}
            </div>

            {!data?.unanswered_questions?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center mb-3">
                  <CheckCircle size={22} className="text-green-400" />
                </div>
                <p className="text-white text-sm font-medium">All questions answered!</p>
                <p className="text-gray-500 text-xs mt-1">Great job keeping up with student questions.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scroll">
                {data.unanswered_questions.slice(0, 10).map((q, i) => (
                  <div key={q.id} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl hover:bg-red-500/10 transition-colors">
                    <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-400 text-[10px] font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 text-sm leading-snug">{q.question}</p>
                      <p className="text-gray-600 text-xs mt-1">
                        {new Date(q.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {data.unanswered_questions.length > 10 && (
                  <button
                    onClick={() => navigate('/admin/analytics')}
                    className="w-full text-center text-xs text-kcc-blue hover:underline py-2"
                  >
                    View all {data.unanswered_questions.length} unanswered →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs pb-2">Auto-refreshes every 15 seconds</p>
      </div>
    </AdminLayout>
  )
}
