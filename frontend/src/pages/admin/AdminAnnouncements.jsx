import { useEffect, useState, useRef } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import { Megaphone, Trash2, Send, Clock, Calendar, ImagePlus, X, Pencil, Save, ChevronLeft, ChevronRight } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

function StatusBadge({ publishAt, expiresAt }) {
  const now = new Date()
  const toDate = (s) => s ? new Date(s.includes('T') || s.endsWith('Z') ? s : s.replace(' ', 'T') + 'Z') : null
  const pub = toDate(publishAt)
  const exp = toDate(expiresAt)

  if (exp && exp < now) return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Expired</span>
  if (pub && pub > now) return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> Scheduled</span>
  return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Live</span>
}

const EMPTY_INSTANT  = { title: '', content: '' }
const EMPTY_SCHEDULE = { title: '', content: '', publish_at: '', expires_at: '' }

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements]   = useState([])
  const [tab, setTab]                       = useState('instant')
  const [instant, setInstant]               = useState(EMPTY_INSTANT)
  const [sched, setSched]                   = useState(EMPTY_SCHEDULE)
  const [posting, setPosting]               = useState(false)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [instantImage, setInstantImage]     = useState(null)
  const [schedImage, setSchedImage]         = useState(null)
  const [editingAnn, setEditingAnn]         = useState(null)
  const [savingEdit, setSavingEdit]         = useState(false)
  const [page, setPage]                     = useState(1)
  const ANN_PAGE_SIZE = 10
  const instantImgRef                       = useRef()
  const schedImgRef                         = useRef()

  function fetchAll() {
    axios.get('/api/announcements/all', { headers: authHeader() })
      .then(res => setAnnouncements(res.data))
      .catch(() => axios.get('/api/announcements').then(res => setAnnouncements(res.data)).catch(() => {}))
    axios.get('/api/subscribers').then(res => setSubscriberCount(res.data.count)).catch(() => {})
  }

  useEffect(() => { fetchAll() }, [])

  function buildForm(fields, image) {
    const fd = new FormData()
    Object.entries(fields).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v) })
    if (image) fd.append('image', image)
    return fd
  }

  async function handleInstant(e) {
    e.preventDefault()
    if (!instant.title.trim() || !instant.content.trim()) return
    setPosting(true)
    try {
      await axios.post('/api/announcements',
        buildForm({ title: instant.title, content: instant.content }, instantImage),
        { headers: authHeader() }
      )
      toast.success(`Posted! Email sent to ${subscriberCount} subscriber(s).`)
      setInstant(EMPTY_INSTANT)
      setInstantImage(null)
      if (instantImgRef.current) instantImgRef.current.value = ''
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to post')
    } finally {
      setPosting(false)
    }
  }

  async function handleSchedule(e) {
    e.preventDefault()
    if (!sched.title.trim() || !sched.content.trim() || !sched.publish_at) return
    setPosting(true)
    const toUTC = (val) => val ? new Date(val).toISOString() : null
    try {
      await axios.post('/api/announcements',
        buildForm({
          title: sched.title,
          content: sched.content,
          publish_at: toUTC(sched.publish_at),
          expires_at: toUTC(sched.expires_at),
        }, schedImage),
        { headers: authHeader() }
      )
      toast.success(`Scheduled for ${new Date(sched.publish_at).toLocaleString()}`)
      setSched(EMPTY_SCHEDULE)
      setSchedImage(null)
      if (schedImgRef.current) schedImgRef.current.value = ''
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to schedule')
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return
    try {
      await axios.delete(`/api/announcements/${id}`, { headers: authHeader() })
      toast.success('Deleted')
      fetchAll()
    } catch {
      toast.error('Failed to delete')
    }
  }

  function startEdit(a) {
    const toLocal = (s) => {
      if (!s) return ''
      const d = new Date(s.includes('T') || s.endsWith('Z') ? s : s.replace(' ', 'T') + 'Z')
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    setEditingAnn({
      id: a.id,
      title: a.title,
      content: a.content,
      publish_at: toLocal(a.publish_at),
      expires_at: toLocal(a.expires_at),
    })
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingAnn.title.trim() || !editingAnn.content.trim()) return
    setSavingEdit(true)
    const toUTC = (val) => val ? new Date(val).toISOString() : null
    try {
      const fd = new FormData()
      fd.append('title', editingAnn.title)
      fd.append('content', editingAnn.content)
      if (editingAnn.publish_at) fd.append('publish_at', toUTC(editingAnn.publish_at))
      if (editingAnn.expires_at) fd.append('expires_at', toUTC(editingAnn.expires_at))
      await axios.put(`/api/announcements/${editingAnn.id}`, fd, { headers: authHeader() })
      toast.success('Announcement updated')
      setEditingAnn(null)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update')
    } finally {
      setSavingEdit(false)
    }
  }

  const minDatetime = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)

  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-kcc-dark mb-1">Announcements</h1>
        <p className="text-gray-500 text-sm mb-6">
          Post announcements — emailed to
          <span className="text-kcc-blue font-semibold"> {subscriberCount} subscriber(s)</span>.
        </p>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab('instant')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === 'instant'
                ? 'bg-kcc-blue text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Send size={15} />
            Post Now
          </button>
          <button
            onClick={() => setTab('schedule')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === 'schedule'
                ? 'bg-kcc-gold text-kcc-dark shadow-sm'
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Calendar size={15} />
            Schedule
          </button>
        </div>

        {/* ── Instant Post Form ── */}
        {tab === 'instant' && (
          <form onSubmit={handleInstant} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone size={18} className="text-kcc-gold" />
              <h2 className="font-semibold text-kcc-dark">Post Instantly</h2>
              <span className="text-xs text-gray-400">— goes live immediately & emails subscribers</span>
            </div>
            <input
              type="text"
              placeholder="Title (e.g. No Classes Tomorrow)"
              value={instant.title}
              onChange={e => setInstant(p => ({ ...p, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue"
              required
            />
            <textarea
              placeholder="Write your announcement here..."
              value={instant.content}
              onChange={e => setInstant(p => ({ ...p, content: e.target.value }))}
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue resize-none"
              required
            />
            {/* Image upload */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium">Attach Image <span className="text-gray-400">(optional)</span></label>
              {instantImage ? (
                <div className="relative inline-block">
                  <img src={URL.createObjectURL(instantImage)} alt="preview" className="h-32 rounded-xl object-cover border border-gray-200" />
                  <button type="button" onClick={() => { setInstantImage(null); instantImgRef.current.value = '' }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-kcc-blue text-gray-400 hover:text-kcc-blue transition-all w-fit text-sm">
                  <ImagePlus size={16} />
                  Choose image
                  <input ref={instantImgRef} type="file" accept="image/*" className="hidden"
                    onChange={e => setInstantImage(e.target.files[0] || null)} />
                </label>
              )}
            </div>
            <button
              type="submit"
              disabled={posting}
              className="flex items-center gap-2 px-5 py-2 bg-kcc-blue text-white rounded-xl text-sm font-medium hover:bg-kcc-dark disabled:opacity-50 transition-all"
            >
              <Send size={15} />
              {posting ? 'Posting...' : 'Post & Send Email Now'}
            </button>
          </form>
        )}

        {/* ── Schedule Form ── */}
        {tab === 'schedule' && (
          <form onSubmit={handleSchedule} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={18} className="text-kcc-gold" />
              <h2 className="font-semibold text-kcc-dark">Schedule Announcement</h2>
              <span className="text-xs text-gray-400">— set when it goes live</span>
            </div>
            <input
              type="text"
              placeholder="Title (e.g. Enrollment Schedule)"
              value={sched.title}
              onChange={e => setSched(p => ({ ...p, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-gold"
              required
            />
            <textarea
              placeholder="Write your announcement here..."
              value={sched.content}
              onChange={e => setSched(p => ({ ...p, content: e.target.value }))}
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-gold resize-none"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium">Publish at <span className="text-red-400">*</span></label>
                <input
                  type="datetime-local"
                  min={minDatetime}
                  value={sched.publish_at}
                  onChange={e => setSched(p => ({ ...p, publish_at: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-gold"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium">Expires at <span className="text-gray-400">(optional)</span></label>
                <input
                  type="datetime-local"
                  min={minDatetime}
                  value={sched.expires_at}
                  onChange={e => setSched(p => ({ ...p, expires_at: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-gold"
                />
              </div>
            </div>
            {/* Image upload */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium">Attach Image <span className="text-gray-400">(optional)</span></label>
              {schedImage ? (
                <div className="relative inline-block">
                  <img src={URL.createObjectURL(schedImage)} alt="preview" className="h-32 rounded-xl object-cover border border-gray-200" />
                  <button type="button" onClick={() => { setSchedImage(null); schedImgRef.current.value = '' }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-kcc-gold text-gray-400 hover:text-kcc-gold transition-all w-fit text-sm">
                  <ImagePlus size={16} />
                  Choose image
                  <input ref={schedImgRef} type="file" accept="image/*" className="hidden"
                    onChange={e => setSchedImage(e.target.files[0] || null)} />
                </label>
              )}
            </div>
            <button
              type="submit"
              disabled={posting || !sched.publish_at}
              className="flex items-center gap-2 px-5 py-2 bg-kcc-gold text-kcc-dark rounded-xl text-sm font-medium hover:bg-yellow-400 disabled:opacity-50 transition-all"
            >
              <Clock size={15} />
              {posting ? 'Scheduling...' : 'Schedule Announcement'}
            </button>
          </form>
        )}

        {/* Edit Modal */}
        {editingAnn && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveEdit}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-lg space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-kcc-dark flex items-center gap-2">
                  <Pencil size={16} className="text-kcc-blue" /> Edit Announcement
                </h3>
                <button type="button" onClick={() => setEditingAnn(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <input
                type="text"
                value={editingAnn.title}
                onChange={e => setEditingAnn(p => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue"
              />
              <textarea
                value={editingAnn.content}
                onChange={e => setEditingAnn(p => ({ ...p, content: e.target.value }))}
                placeholder="Content"
                rows={5}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Publish at</label>
                  <input
                    type="datetime-local"
                    value={editingAnn.publish_at}
                    onChange={e => setEditingAnn(p => ({ ...p, publish_at: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Expires at</label>
                  <input
                    type="datetime-local"
                    value={editingAnn.expires_at}
                    onChange={e => setEditingAnn(p => ({ ...p, expires_at: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-kcc-blue text-white rounded-xl text-sm font-medium hover:bg-kcc-dark disabled:opacity-50 transition-all"
                >
                  <Save size={14} />
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAnn(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Announcements List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-kcc-dark">All Announcements ({announcements.length})</h2>
            {Math.ceil(announcements.length / ANN_PAGE_SIZE) > 1 && (
              <span className="text-xs text-gray-400">Page {page} of {Math.ceil(announcements.length / ANN_PAGE_SIZE)}</span>
            )}
          </div>
          {announcements.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No announcements yet.</p>
          ) : (
            <>
            <div className="space-y-3">
              {announcements.slice((page - 1) * ANN_PAGE_SIZE, page * ANN_PAGE_SIZE).map(a => (
                <div key={a.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-kcc-dark text-sm">{a.title}</h3>
                        <StatusBadge publishAt={a.publish_at} expiresAt={a.expires_at} />
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{a.content}</p>
                      {a.image_url && (
                        <img src={a.image_url} alt="announcement" className="mt-2 rounded-xl max-h-40 object-cover border border-gray-100" />
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                        <span>Created: {new Date(a.created_at).toLocaleString()}</span>
                        {a.publish_at && <span className="text-yellow-600">Publishes: {new Date(a.publish_at.replace(' ', 'T') + 'Z').toLocaleString()}</span>}
                        {a.expires_at && <span className="text-red-400">Expires: {new Date(a.expires_at.replace(' ', 'T') + 'Z').toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(a)} className="p-2 text-kcc-blue hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination */}
            {Math.ceil(announcements.length / ANN_PAGE_SIZE) > 1 && (
              <div className="flex items-center justify-center gap-2 mt-5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-kcc-blue hover:text-kcc-blue disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.ceil(announcements.length / ANN_PAGE_SIZE) }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === Math.ceil(announcements.length / ANN_PAGE_SIZE) || Math.abs(p - page) <= 1)
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
                  onClick={() => setPage(p => Math.min(Math.ceil(announcements.length / ANN_PAGE_SIZE), p + 1))}
                  disabled={page === Math.ceil(announcements.length / ANN_PAGE_SIZE)}
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
