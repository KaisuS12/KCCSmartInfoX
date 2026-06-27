import { useState, useEffect } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import { KeyRound, Eye, EyeOff, ShieldCheck, ClipboardList, CheckCircle, XCircle, Monitor, LogOut, Clock, MessageSquare, ToggleLeft, ToggleRight, Save } from 'lucide-react'
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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const CHAT_DEFAULTS = {
  chat_enabled: 'true',
  use_office_hours: 'false',
  office_hours_start: '08:00',
  office_hours_end: '17:00',
  office_days: 'Mon,Tue,Wed,Thu,Fri',
  chat_offline_message: 'Live chat is currently unavailable. Please submit a concern or try again during office hours.',
  is_available: true,
}

export default function AdminSettings() {
  const [form, setForm]       = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [saving, setSaving]   = useState(false)
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showCon, setShowCon] = useState(false)
  const [logs, setLogs]       = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [chatCfg, setChatCfg] = useState(CHAT_DEFAULTS)
  const [chatSaving, setChatSaving] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    axios.get('/api/admin/login-logs', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLogsLoading(false))

    axios.get('/api/settings/chat')
      .then(r => setChatCfg(r.data))
      .catch(() => {})
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

  function toggleDay(day) {
    const current = new Set(chatCfg.office_days.split(',').map(d => d.trim()).filter(Boolean))
    if (current.has(day)) current.delete(day)
    else current.add(day)
    // keep DAYS ordering
    const ordered = DAYS.filter(d => current.has(d))
    setChatCfg(p => ({ ...p, office_days: ordered.join(',') }))
  }

  async function saveChatSettings() {
    setChatSaving(true)
    try {
      const res = await axios.put('/api/admin/settings/chat', {
        chat_enabled: chatCfg.chat_enabled,
        use_office_hours: chatCfg.use_office_hours,
        office_hours_start: chatCfg.office_hours_start,
        office_hours_end: chatCfg.office_hours_end,
        office_days: chatCfg.office_days,
        chat_offline_message: chatCfg.chat_offline_message,
      }, { headers: authHeader() })
      setChatCfg(res.data)
      toast.success('Chat settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setChatSaving(false)
    }
  }

  const activeDays = new Set(chatCfg.office_days.split(',').map(d => d.trim()).filter(Boolean))

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl">
        <h1 className="text-2xl font-bold text-kcc-dark mb-1">Settings</h1>
        <p className="text-gray-500 text-sm mb-6">Manage your admin account</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Left: Change Password ── */}
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

        {/* ── Right: Audit Log ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <ClipboardList size={17} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-kcc-dark text-sm">Admin Audit Log</h2>
              <p className="text-xs text-gray-400">Last 50 admin session events — login, logout, timeout</p>
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
              {logs.map(log => {
                const cfg = {
                  success: { bg: 'bg-green-50 border-green-100', icon: <CheckCircle size={16} className="text-green-500 flex-shrink-0" />, badge: 'bg-green-100 text-green-700', label: 'Login Success' },
                  failed:  { bg: 'bg-red-50 border-red-100',     icon: <XCircle size={16} className="text-red-400 flex-shrink-0" />,     badge: 'bg-red-100 text-red-700',   label: 'Login Failed' },
                  logout:  { bg: 'bg-gray-50 border-gray-200',   icon: <LogOut size={16} className="text-gray-400 flex-shrink-0" />,     badge: 'bg-gray-100 text-gray-600', label: 'Logged Out' },
                  timeout: { bg: 'bg-orange-50 border-orange-100', icon: <Clock size={16} className="text-orange-400 flex-shrink-0" />,  badge: 'bg-orange-100 text-orange-700', label: 'Session Timeout' },
                }[log.action] || { bg: 'bg-gray-50 border-gray-200', icon: <Monitor size={16} className="text-gray-400 flex-shrink-0" />, badge: 'bg-gray-100 text-gray-600', label: log.action }

                return (
                  <div key={log.id} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${cfg.bg}`}>
                    {cfg.icon}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        <span className="text-gray-600 text-xs font-medium">{log.username}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1"><Monitor size={11} />{formatUA(log.user_agent)}</span>
                        <span>IP: {log.ip_address || 'unknown'}</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        </div> {/* end grid */}

        {/* ── Full-width: Live Chat Availability ── */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <MessageSquare size={17} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-kcc-dark text-sm">Live Chat Availability</h2>
                <p className="text-xs text-gray-400">Control when students can start a live chat session</p>
              </div>
            </div>
            {/* Status pill */}
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              chatCfg.is_available
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {chatCfg.is_available ? '● Currently Available' : '○ Currently Offline'}
            </span>
          </div>

          <div className="space-y-5">

            {/* ── Master Enable / Disable ── */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {chatCfg.chat_enabled === 'true' ? 'Live Chat is ON' : 'Live Chat is OFF'}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {chatCfg.chat_enabled === 'true'
                    ? 'Users can start a chat session right now'
                    : 'All chat sessions are blocked — offline message is shown'}
                </p>
              </div>
              <button
                onClick={() => setChatCfg(p => ({ ...p, chat_enabled: p.chat_enabled === 'true' ? 'false' : 'true' }))}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                  chatCfg.chat_enabled === 'true'
                    ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {chatCfg.chat_enabled === 'true'
                  ? <><ToggleRight size={17} /> Enabled</>
                  : <><ToggleLeft size={17} /> Disabled</>
                }
              </button>
            </div>

            {/* ── Optional Office Hours Schedule ── */}
            <div className={`rounded-xl border transition-colors ${chatCfg.use_office_hours === 'true' ? 'border-kcc-blue/30 bg-blue-50/30' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Office Hours Schedule</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Automatically go offline outside set hours (Philippines time)
                  </p>
                </div>
                <button
                  onClick={() => setChatCfg(p => ({ ...p, use_office_hours: p.use_office_hours === 'true' ? 'false' : 'true' }))}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                    chatCfg.use_office_hours === 'true'
                      ? 'bg-kcc-blue border-kcc-blue text-white hover:bg-kcc-dark'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {chatCfg.use_office_hours === 'true'
                    ? <><ToggleRight size={17} /> On</>
                    : <><ToggleLeft size={17} /> Off</>
                  }
                </button>
              </div>

              {chatCfg.use_office_hours === 'true' && (
                <div className="px-4 pb-4 space-y-4 border-t border-blue-100">
                  {/* Hours */}
                  <div className="pt-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Hours</p>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[11px] text-gray-400">From</label>
                        <input
                          type="time"
                          value={chatCfg.office_hours_start}
                          onChange={e => setChatCfg(p => ({ ...p, office_hours_start: e.target.value }))}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue"
                        />
                      </div>
                      <span className="text-gray-400 mt-5">–</span>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[11px] text-gray-400">To</label>
                        <input
                          type="time"
                          value={chatCfg.office_hours_end}
                          onChange={e => setChatCfg(p => ({ ...p, office_hours_end: e.target.value }))}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Days */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Days</p>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS.map(day => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            activeDays.has(day)
                              ? 'bg-kcc-blue text-white border-kcc-blue'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Offline message */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Offline Message</p>
              <textarea
                rows={2}
                value={chatCfg.chat_offline_message}
                onChange={e => setChatCfg(p => ({ ...p, chat_offline_message: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue resize-none"
                placeholder="Message shown to students when live chat is unavailable..."
              />
              <p className="text-[11px] text-gray-400 mt-0.5">Shown in place of the "Chat with Admin" button when offline</p>
            </div>

          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={saveChatSettings}
              disabled={chatSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-kcc-blue text-white rounded-xl text-sm font-medium hover:bg-kcc-dark disabled:opacity-50 transition-all"
            >
              <Save size={14} />
              {chatSaving ? 'Saving...' : 'Save Chat Settings'}
            </button>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
