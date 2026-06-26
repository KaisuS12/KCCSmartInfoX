import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { UserCog, Plus, Trash2, KeyRound, Edit2, X, Check, Eye, EyeOff, ShieldCheck, ShieldOff,
         LogIn, LogOut, MessageSquare, MessageCircle, CheckCircle, UserCog as UserCogIcon, Clock, Activity } from 'lucide-react'
import AdminLayout from '../../components/shared/AdminLayout'

const ACTION_CONFIG = {
  login:                { icon: LogIn,          label: 'Logged in',              color: 'text-green-500'  },
  logout:               { icon: LogOut,         label: 'Logged out',             color: 'text-gray-400'   },
  concern_replied:      { icon: MessageSquare,  label: 'Replied to a concern',   color: 'text-blue-500'   },
  concern_resolved:     { icon: CheckCircle,    label: 'Resolved a concern',     color: 'text-green-500'  },
  concern_deleted:      { icon: X,              label: 'Deleted a concern',      color: 'text-red-400'    },
  chat_opened:          { icon: MessageCircle,  label: 'Opened a chat',          color: 'text-kcc-blue'   },
  chat_message_sent:    { icon: MessageCircle,  label: 'Sent a chat message',    color: 'text-blue-400'   },
  chat_closed:          { icon: X,              label: 'Closed a chat',          color: 'text-orange-400' },
  staff_created:        { icon: UserCogIcon,    label: 'Created a staff account',color: 'text-purple-500' },
  staff_updated:        { icon: UserCogIcon,    label: 'Updated staff account',  color: 'text-purple-400' },
  staff_deactivated:    { icon: ShieldOff,      label: 'Deactivated staff',      color: 'text-red-400'    },
  staff_deleted:        { icon: Trash2,         label: 'Deleted a staff account',color: 'text-red-500'    },
  staff_password_reset: { icon: KeyRound,       label: 'Reset staff password',   color: 'text-orange-500' },
}

function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const ALL_PERMISSIONS = [
  { key: 'dashboard',        label: 'Dashboard' },
  { key: 'knowledge',        label: 'Knowledge Base' },
  { key: 'announcements',    label: 'Announcements' },
  { key: 'analytics',        label: 'Analytics' },
  { key: 'subscribers',      label: 'Subscribers' },
  { key: 'office-processes', label: 'Office Processes' },
  { key: 'chatlogs',         label: 'Chat Logs' },
  { key: 'concerns',         label: 'Concerns' },
  { key: 'live-chats',       label: 'Live Chats' },
  { key: 'qrcode',           label: 'QR Code' },
]

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}` })

export default function AdminStaff() {
  const [staffList, setStaffList]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [editingId, setEditingId]       = useState(null)
  const [resetId, setResetId]           = useState(null)
  const [createdCreds, setCreatedCreds] = useState(null)
  const [showPass, setShowPass]         = useState(false)

  const [form, setForm] = useState({ username: '', password: '', full_name: '', permissions: [] })
  const [editPerms, setEditPerms]       = useState([])
  const [newPassword, setNewPassword]   = useState('')

  // Activity log state per-staff card
  const [activeTab, setActiveTab]         = useState({})    // { staffId: 'ratings' | 'activity' }
  const [activityLogs, setActivityLogs]   = useState({})    // { staffId: [] }
  const [activityModal, setActivityModal] = useState(null)  // staffId with full modal open

  function getTab(id) { return activeTab[id] || 'ratings' }

  async function loadActivity(staff) {
    const actor = staff.full_name || staff.username
    try {
      const res = await axios.get(`/api/admin/activity-logs?actor=${encodeURIComponent(actor)}&limit=10`, { headers: authHeader() })
      setActivityLogs(p => ({ ...p, [staff.id]: res.data }))
    } catch { /* silently ignore */ }
  }

  function switchTab(staffId, tab, staff) {
    setActiveTab(p => ({ ...p, [staffId]: tab }))
    if (tab === 'activity' && !activityLogs[staffId]) loadActivity(staff)
  }

  async function fetchStaff() {
    try {
      const res = await axios.get('/api/admin/staff', { headers: authHeader() })
      setStaffList(res.data)
    } catch { toast.error('Failed to load staff') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStaff() }, [])

  function toggleCreatePerm(key) {
    setForm(p => ({
      ...p,
      permissions: p.permissions.includes(key)
        ? p.permissions.filter(k => k !== key)
        : [...p.permissions, key],
    }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.username || !form.password) return toast.error('Username and password are required')
    try {
      await axios.post('/api/admin/staff', { ...form }, { headers: authHeader() })
      setCreatedCreds({ username: form.username, password: form.password })
      setForm({ username: '', password: '', full_name: '', permissions: [] })
      setShowCreate(false)
      fetchStaff()
      toast.success('Staff account created!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create staff')
    }
  }

  function startEdit(staff) {
    setEditingId(staff.id)
    setEditPerms(staff.permissions)
  }

  async function saveEdit(staff) {
    try {
      await axios.put(`/api/admin/staff/${staff.id}`, { permissions: editPerms }, { headers: authHeader() })
      setEditingId(null)
      fetchStaff()
      toast.success('Permissions updated')
    } catch { toast.error('Failed to update') }
  }

  async function toggleActive(staff) {
    try {
      await axios.put(`/api/admin/staff/${staff.id}`, { is_active: !staff.is_active }, { headers: authHeader() })
      fetchStaff()
      toast.success(staff.is_active ? 'Staff deactivated' : 'Staff activated')
    } catch { toast.error('Failed to update status') }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (!newPassword) return
    try {
      await axios.put(`/api/admin/staff/${resetId}/reset-password`, { new_password: newPassword }, { headers: authHeader() })
      setResetId(null)
      setNewPassword('')
      toast.success('Password reset successfully')
    } catch { toast.error('Failed to reset password') }
  }

  async function handleDelete(staff) {
    if (!confirm(`Delete staff account "${staff.username}"? This cannot be undone.`)) return
    try {
      await axios.delete(`/api/admin/staff/${staff.id}`, { headers: authHeader() })
      fetchStaff()
      toast.success('Staff deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UserCog size={24} className="text-kcc-gold" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">Staff Management</h1>
              <p className="text-sm text-gray-500">Create staff accounts and control their panel access</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-kcc-gold text-kcc-dark font-semibold rounded-xl hover:bg-yellow-400 transition text-sm"
          >
            <Plus size={16} /> Add Staff
          </button>
        </div>

        {/* Credentials dialog after creation */}
        {createdCreds && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-green-800 mb-1">Staff account created! Share these credentials:</p>
                <div className="space-y-1 text-sm text-green-700 font-mono">
                  <p>Username: <strong>{createdCreds.username}</strong></p>
                  <p>Password: <strong>{createdCreds.password}</strong></p>
                </div>
                <p className="text-xs text-green-600 mt-2">Save this — the password won't be shown again.</p>
              </div>
              <button onClick={() => setCreatedCreds(null)} className="text-green-500 hover:text-green-700">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">New Staff Account</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Juan dela Cruz"
                    value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-kcc-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Username *</label>
                  <input
                    type="text"
                    placeholder="e.g. staff_juan"
                    value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-kcc-gold"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Password *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Set a password for this staff"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-kcc-gold pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-2.5 text-gray-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Panel Access — select what this staff can use:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_PERMISSIONS.map(({ key, label }) => (
                    <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm transition ${
                      form.permissions.includes(key)
                        ? 'bg-kcc-gold/10 border-kcc-gold text-kcc-dark font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={form.permissions.includes(key)}
                        onChange={() => toggleCreatePerm(key)}
                      />
                      <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        form.permissions.includes(key) ? 'bg-kcc-gold border-kcc-gold' : 'border-gray-300'
                      }`}>
                        {form.permissions.includes(key) && <Check size={11} className="text-kcc-dark" />}
                      </span>
                      {label}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, permissions: p.permissions.length === ALL_PERMISSIONS.length ? [] : ALL_PERMISSIONS.map(x => x.key) }))}
                  className="mt-2 text-xs text-kcc-blue hover:underline"
                >
                  {form.permissions.length === ALL_PERMISSIONS.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-kcc-gold text-kcc-dark font-semibold rounded-xl hover:bg-yellow-400 text-sm transition">Create Staff</button>
              </div>
            </form>
          </div>
        )}

        {/* Staff list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
        ) : staffList.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <UserCog size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No staff accounts yet</p>
            <p className="text-sm mt-1">Click "Add Staff" to create the first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staffList.map(staff => (
              <div key={staff.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                {/* Top section */}
                <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
                  <div className="flex-1 min-w-0">
                    {/* Name row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-base">{staff.full_name || staff.username}</p>
                      {staff.full_name && <span className="text-xs text-gray-400">@{staff.username}</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        staff.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'
                      }`}>
                        {staff.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Created {new Date(staff.created_at).toLocaleDateString()} · {staff.permissions.length} permission{staff.permissions.length !== 1 ? 's' : ''}
                    </p>

                    {/* Permissions display / edit */}
                    {editingId === staff.id ? (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-2">Select permissions:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {ALL_PERMISSIONS.map(({ key, label }) => (
                            <label key={key} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition ${
                              editPerms.includes(key)
                                ? 'bg-kcc-gold/10 border-kcc-gold text-kcc-dark font-medium'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}>
                              <input type="checkbox" className="hidden"
                                checked={editPerms.includes(key)}
                                onChange={() => setEditPerms(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])}
                              />
                              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                                editPerms.includes(key) ? 'bg-kcc-gold border-kcc-gold' : 'border-gray-300'
                              }`}>
                                {editPerms.includes(key) && <Check size={9} className="text-kcc-dark" />}
                              </span>
                              {label}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => saveEdit(staff)} className="px-3 py-1.5 bg-kcc-gold text-kcc-dark text-xs font-semibold rounded-lg hover:bg-yellow-400 transition">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {staff.permissions.length === 0
                          ? <span className="text-xs text-gray-400 italic">No permissions assigned</span>
                          : staff.permissions.map(p => {
                              const label = ALL_PERMISSIONS.find(x => x.key === p)?.label || p
                              return <span key={p} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">{label}</span>
                            })
                        }
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => editingId === staff.id ? setEditingId(null) : startEdit(staff)} title="Edit permissions" className="p-2 rounded-lg text-gray-400 hover:text-kcc-blue hover:bg-blue-50 transition"><Edit2 size={15} /></button>
                    <button onClick={() => setResetId(resetId === staff.id ? null : staff.id)} title="Reset password" className="p-2 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition"><KeyRound size={15} /></button>
                    <button onClick={() => toggleActive(staff)} title={staff.is_active ? 'Deactivate' : 'Activate'} className="p-2 rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition">{staff.is_active ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}</button>
                    <button onClick={() => handleDelete(staff)} title="Delete" className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={15} /></button>
                  </div>
                </div>

                {/* Reset password inline */}
                {resetId === staff.id && (
                  <div className="px-5 pb-4">
                    <form onSubmit={handleResetPassword} className="flex items-center gap-2">
                      <input type="text" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-kcc-gold flex-1" required />
                      <button type="submit" className="px-3 py-1.5 bg-kcc-blue text-white text-xs rounded-lg hover:bg-blue-700 transition">Set</button>
                      <button type="button" onClick={() => setResetId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </form>
                  </div>
                )}

                {/* Bottom tabbed panel */}
                {editingId !== staff.id && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    {/* Tab bar */}
                    <div className="flex border-b border-gray-100">
                      {[
                        { key: 'ratings',  label: '⭐ Ratings' },
                        { key: 'activity', label: '📋 Activity' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => switchTab(staff.id, key, staff)}
                          className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 -mb-px ${
                            getTab(staff.id) === key
                              ? 'border-kcc-gold text-kcc-dark'
                              : 'border-transparent text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Ratings tab */}
                    {getTab(staff.id) === 'ratings' && (
                      <div className="px-5 py-4">
                        {staff.total_ratings === 0 ? (
                          <p className="text-xs text-gray-400 italic text-center py-1">No ratings yet — ratings appear after users complete a chat session.</p>
                        ) : (
                          <div className="flex gap-6">
                            <div className="flex flex-col items-center justify-center min-w-[72px]">
                              <p className="text-3xl font-bold text-gray-800 leading-none">{staff.avg_rating}</p>
                              <div className="flex gap-0.5 mt-1">
                                {[1,2,3,4,5].map(s => (
                                  <span key={s} className={`text-sm ${s <= Math.round(staff.avg_rating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                ))}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">{staff.total_ratings} review{staff.total_ratings !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="flex-1 space-y-1 justify-center flex flex-col">
                              {[5,4,3,2,1].map(star => {
                                const count = staff.rating_breakdown?.[star] || 0
                                const pct = staff.total_ratings ? Math.round((count / staff.total_ratings) * 100) : 0
                                return (
                                  <div key={star} className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 w-2 text-right">{star}</span>
                                    <span className="text-yellow-400 text-[10px]">★</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                      <div className="bg-yellow-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[10px] text-gray-400 w-5 text-right">{count}</span>
                                  </div>
                                )
                              })}
                            </div>
                            {staff.recent_feedbacks?.length > 0 && (
                              <div className="flex-[2] min-w-0 space-y-2">
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Reviews</p>
                                {staff.recent_feedbacks.map((fb, idx) => (
                                  <div key={idx} className="flex items-start gap-2">
                                    <div className="w-6 h-6 rounded-full bg-kcc-blue/10 text-kcc-blue flex items-center justify-center text-[10px] font-bold flex-shrink-0 uppercase">
                                      {fb.user_name?.[0] || '?'}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-medium text-gray-700">{fb.user_name}</span>
                                        <span className="flex gap-px">
                                          {[1,2,3,4,5].map(s => (
                                            <span key={s} className={`text-[10px] ${s <= fb.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                          ))}
                                        </span>
                                      </div>
                                      {fb.feedback_text
                                        ? <p className="text-[10px] text-gray-500 mt-0.5 truncate">"{fb.feedback_text}"</p>
                                        : <p className="text-[10px] text-gray-300 mt-0.5 italic">No comment</p>
                                      }
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Activity tab */}
                    {getTab(staff.id) === 'activity' && (
                      <div className="px-5 py-4">
                        {!activityLogs[staff.id] ? (
                          <p className="text-xs text-gray-400 text-center py-2">Loading activity...</p>
                        ) : activityLogs[staff.id].length === 0 ? (
                          <p className="text-xs text-gray-400 italic text-center py-2">No activity recorded yet.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {activityLogs[staff.id].slice(0, 5).map((log) => {
                              const cfg = ACTION_CONFIG[log.action] || { icon: Activity, label: log.action, color: 'text-gray-400' }
                              const Icon = cfg.icon
                              return (
                                <div key={log.id} className="flex items-start gap-2.5">
                                  <div className={`mt-0.5 flex-shrink-0 ${cfg.color}`}><Icon size={13} /></div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-medium text-gray-700 leading-tight">{cfg.label}</p>
                                    {log.detail && <p className="text-[10px] text-gray-400 truncate">{log.detail}</p>}
                                  </div>
                                  <span className="text-[10px] text-gray-300 flex-shrink-0 flex items-center gap-1">
                                    <Clock size={9} />{relativeTime(log.created_at)}
                                  </span>
                                </div>
                              )
                            })}
                            {activityLogs[staff.id].length > 5 && (
                              <button
                                onClick={() => setActivityModal(staff)}
                                className="text-[11px] text-kcc-blue hover:underline mt-1"
                              >
                                View all {activityLogs[staff.id].length > 10 ? '10+' : activityLogs[staff.id].length} entries →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity full modal */}
      {activityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-800">Activity — {activityModal.full_name || activityModal.username}</p>
                <p className="text-xs text-gray-400">Last 50 recorded actions</p>
              </div>
              <button onClick={() => setActivityModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {(activityLogs[activityModal.id] || []).map((log) => {
                const cfg = ACTION_CONFIG[log.action] || { icon: Activity, label: log.action, color: 'text-gray-400' }
                const Icon = cfg.icon
                return (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50">
                    <div className={`mt-0.5 flex-shrink-0 ${cfg.color}`}><Icon size={14} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700">{cfg.label}</p>
                      {log.detail && <p className="text-[11px] text-gray-400">{log.detail}</p>}
                    </div>
                    <span className="text-[11px] text-gray-300 flex-shrink-0 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
