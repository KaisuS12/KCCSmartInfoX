import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/shared/AdminLayout'
import {
  MessageSquare, AlertCircle, Users, FileText,
  TrendingUp, ThumbsUp, ThumbsDown, BookOpen,
  ArrowRight, RefreshCw, CheckCircle, AlertTriangle
} from 'lucide-react'
import axios from 'axios'

function StatCard({ icon: Icon, label, value, color, bg, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon size={18} className={color} />
        </div>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
      <p className="text-2xl font-bold text-kcc-dark mt-1">{value ?? '—'}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [pendingConcerns, setPending] = useState(0)
  const navigate                      = useNavigate()

  function fetchData() {
    const token = localStorage.getItem('admin_token')
    const headers = { Authorization: `Bearer ${token}` }
    setLoading(true)
    axios.get('/api/admin/analytics', { headers })
      .then(res => setData(res.data)).catch(() => {}).finally(() => setLoading(false))
    axios.get('/api/admin/concerns', { headers })
      .then(res => setPending(res.data.filter(c => c.status === 'pending').length)).catch(() => {})
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const answerRate = data?.answer_rate ?? null

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-kcc-dark">Dashboard</h1>
            <p className="text-gray-500 text-sm">Overview of KCCSmartInfoX activity</p>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 text-sm text-gray-400 hover:text-kcc-blue transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={MessageSquare} label="Total Questions"  value={data?.total_questions}   color="text-kcc-blue"  bg="bg-blue-50" />
          <StatCard icon={CheckCircle}   label="Answered"         value={data?.answered}          color="text-green-600" bg="bg-green-50" />
          <StatCard icon={AlertCircle}   label="Unanswered"       value={data?.unanswered}        color="text-red-500"   bg="bg-red-50" />
          <StatCard icon={TrendingUp}    label="Answer Rate"
            value={answerRate !== null ? `${answerRate}%` : '—'}
            color={answerRate >= 80 ? 'text-green-600' : answerRate >= 50 ? 'text-yellow-600' : 'text-red-500'}
            bg={answerRate >= 80 ? 'bg-green-50' : answerRate >= 50 ? 'bg-yellow-50' : 'bg-red-50'}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users}         label="Subscribers"       value={data?.total_subscribers} color="text-purple-600" bg="bg-purple-50" />
          <StatCard icon={FileText}      label="Documents"         value={data?.total_documents}   color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard icon={ThumbsUp}      label="Helpful"           value={data?.thumbs_up}         color="text-green-600" bg="bg-green-50" />
          <StatCard
            icon={AlertTriangle}
            label="Pending Concerns"
            value={pendingConcerns}
            color={pendingConcerns > 0 ? 'text-orange-500' : 'text-gray-400'}
            bg={pendingConcerns > 0 ? 'bg-orange-50' : 'bg-gray-50'}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/admin/knowledge')}
            className="flex items-center justify-between p-4 bg-kcc-blue text-white rounded-2xl hover:bg-kcc-dark transition-all"
          >
            <div className="flex items-center gap-3">
              <BookOpen size={20} />
              <span className="text-sm font-medium">Add Knowledge</span>
            </div>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/admin/analytics')}
            className="flex items-center justify-between p-4 bg-kcc-gold text-kcc-dark rounded-2xl hover:bg-yellow-400 transition-all"
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={20} />
              <span className="text-sm font-medium">View Analytics</span>
            </div>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/admin/announcements')}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 text-kcc-dark rounded-2xl hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={20} className="text-kcc-blue" />
              <span className="text-sm font-medium">Post Announcement</span>
            </div>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/admin/concerns')}
            className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 text-kcc-dark rounded-2xl hover:bg-orange-100 transition-all"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-orange-500" />
              <span className="text-sm font-medium">
                View Concerns {pendingConcerns > 0 && <span className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingConcerns}</span>}
              </span>
            </div>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Unanswered Questions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-kcc-dark font-semibold flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              Recent Unanswered Questions
              {data?.unanswered > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{data.unanswered}</span>
              )}
            </h2>
            {data?.unanswered > 0 && (
              <button
                onClick={() => navigate('/admin/knowledge')}
                className="text-xs text-kcc-blue hover:underline flex items-center gap-1"
              >
                Fix gaps <ArrowRight size={12} />
              </button>
            )}
          </div>

          {!data?.unanswered_questions?.length ? (
            <div className="text-center py-8">
              <CheckCircle size={28} className="text-green-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No unanswered questions — great job!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.unanswered_questions.slice(0, 10).map(q => (
                <div key={q.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-800 text-sm">{q.question}</p>
                    <p className="text-gray-400 text-xs mt-1">{new Date(q.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {data.unanswered_questions.length > 10 && (
                <button onClick={() => navigate('/admin/analytics')} className="w-full text-center text-xs text-kcc-blue hover:underline py-2">
                  View all {data.unanswered_questions.length} unanswered →
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-gray-300 text-xs mt-4">Auto-refreshes every 10 seconds</p>
      </div>
    </AdminLayout>
  )
}
