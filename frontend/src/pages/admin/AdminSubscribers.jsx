import { useEffect, useState } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import { Users, Mail, RefreshCw, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

const PAGE_SIZE = 20

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [page, setPage] = useState(1)

  function fetchData() {
    axios.get('/api/admin/subscribers', { headers: authHeader() })
      .then(res => {
        setSubscribers(res.data)
        setLastUpdated(new Date().toLocaleTimeString())
      }).catch(() => {})
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  async function handleDelete(id, email) {
    if (!confirm(`Remove subscriber "${email}"?`)) return
    try {
      await axios.delete(`/api/admin/subscribers/${id}`, { headers: authHeader() })
      toast.success('Subscriber removed')
      fetchData()
      // Go back a page if last item on current page was deleted
      const newTotal = subscribers.length - 1
      if ((page - 1) * PAGE_SIZE >= newTotal && page > 1) setPage(p => p - 1)
    } catch {
      toast.error('Failed to remove')
    }
  }

  const totalPages = Math.max(1, Math.ceil(subscribers.length / PAGE_SIZE))
  const paginated  = subscribers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-kcc-dark">Subscribers</h1>
          <button onClick={fetchData} className="flex items-center gap-1 text-xs text-gray-400 hover:text-kcc-blue transition-all">
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Users who subscribed to email announcements
          {lastUpdated && <span className="ml-2 text-gray-400">· Updated {lastUpdated}</span>}
        </p>

        {/* Count card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Users size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-kcc-dark">{subscribers.length}</p>
            <p className="text-gray-500 text-sm">Total Subscribers</p>
          </div>
        </div>

        {/* Email list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-kcc-dark flex items-center gap-2">
              <Mail size={16} className="text-kcc-blue" />
              Subscriber Emails
            </h2>
            {totalPages > 1 && (
              <span className="text-xs text-gray-400">
                Page {page} of {totalPages}
              </span>
            )}
          </div>

          {subscribers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No subscribers yet.</p>
          ) : (
            <>
              <div className="space-y-2">
                {paginated.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-kcc-blue rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {s.email[0].toUpperCase()}
                      </div>
                      <span className="text-gray-800 text-sm">{s.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleDelete(s.id, s.email)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                        title="Remove subscriber"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-kcc-blue hover:text-kcc-blue disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className="text-gray-400 text-sm px-1">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            page === p
                              ? 'bg-kcc-blue text-white'
                              : 'border border-gray-200 text-gray-600 hover:border-kcc-blue hover:text-kcc-blue'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )
                  }
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-kcc-blue hover:text-kcc-blue disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
