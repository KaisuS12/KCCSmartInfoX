import { useEffect, useState } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import { Users, Mail, RefreshCw } from 'lucide-react'
import axios from 'axios'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)

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
          <h2 className="font-semibold text-kcc-dark mb-4 flex items-center gap-2">
            <Mail size={16} className="text-kcc-blue" />
            Subscriber Emails
          </h2>
          {subscribers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No subscribers yet.</p>
          ) : (
            <div className="space-y-2">
              {subscribers.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-kcc-blue rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {s.email[0].toUpperCase()}
                    </div>
                    <span className="text-gray-800 text-sm">{s.email}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
