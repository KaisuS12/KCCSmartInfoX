import { useState, useEffect } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import { KeyRound, Eye, EyeOff, ShieldCheck, ClipboardList, CheckCircle, XCircle, Monitor } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

function PasswordField({ label, value, onChange, show, onToggle }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-800 outline-none focus:border-kcc-blue"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

function formatUA(ua = '') {
  if (!ua) return 'Unknown device'
  if (/iPhone|iPad/i.test(ua)) return 'iPhone / iPad'
  if (/Android/i.test(ua)) return 'Android Phone'
  if (/Windows/i.test(ua)) return 'Windows PC'
  if (/Mac/i.test(ua)) return 'Mac'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'Unknown device'
}

export default function AdminSettings() {
  const [form, setForm]       = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [saving, setSaving]   = useState(false)
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showCon, setShowCon] = useState(false)
  const [logs, setLogs]       = useState([])
  const [logsLoading, setLogsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    axios.get('/api/admin/login-logs', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLogsLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    if (form.new_password.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    setSaving(true)
    try {
      await axios.put('/api/admin/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      }, { headers: authHeader() })
      toast.success('Password changed successfully')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-kcc-dark mb-1">Settings</h1>
        <p className="text-gray-500 text-sm mb-6">Manage your admin account</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 bg-kcc-blue/10 rounded-xl flex items-center justify-center">
              <KeyRound size={17} className="text-kcc-blue" />
            </div>
            <div>
              <h2 className="font-semibold text-kcc-dark text-sm">Change Password</h2>
              <p className="text-xs text-gray-400">Must be at least 6 characters</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              label="Current Password"
              value={form.current_password}
              onChange={e => setForm(p => ({ ...p, current_password: e.target.value }))}
              show={showCur}
              onToggle={() => setShowCur(s => !s)}
            />
            <PasswordField
              label="New Password"
              value={form.new_password}
              onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
              show={showNew}
              onToggle={() => setShowNew(s => !s)}
            />
            <div>
              <PasswordField
                label="Confirm New Password"
                value={form.confirm_password}
                onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                show={showCon}
                onToggle={() => setShowCon(s => !s)}
              />
              {form.confirm_password && form.new_password !== form.confirm_password && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  ⚠ Passwords do not match
                </p>
              )}
              {form.confirm_password && form.new_password === form.confirm_password && form.new_password && (
                <p className="text-green-600 text-xs mt-1.5 flex items-center gap-1">
                  ✓ Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !form.current_password || !form.new_password || !form.confirm_password}
              className="flex items-center gap-2 px-5 py-2.5 bg-kcc-blue text-white rounded-xl text-sm font-medium hover:bg-kcc-dark disabled:opacity-50 transition-all"
            >
              <ShieldCheck size={15} />
              {saving ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* ── Login Audit Log ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <ClipboardList size={17} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-kcc-dark text-sm">Login Audit Log</h2>
              <p className="text-xs text-gray-400">Last 50 login attempts — successful and failed</p>
            </div>
          </div>

          {logsLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No login activity yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map(log => (
                <div
                  key={log.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
                    log.action === 'success'
                      ? 'bg-green-50 border-green-100'
                      : 'bg-red-50 border-red-100'
                  }`}
                >
                  {log.action === 'success'
                    ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                    : <XCircle size={16} className="text-red-400 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        log.action === 'success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {log.action === 'success' ? 'Login Success' : 'Login Failed'}
                      </span>
                      <span className="text-gray-600 text-xs font-medium">{log.username}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Monitor size={11} />
                        {formatUA(log.user_agent)}
                      </span>
                      <span>IP: {log.ip_address || 'unknown'}</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}
