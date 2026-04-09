import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/shared/AdminLayout'

const ICONS    = ['BookOpen', 'DollarSign', 'Award', 'GraduationCap', 'Building2', 'Heart', 'Megaphone', 'Phone']
const COLORS   = ['yellow', 'blue', 'green', 'purple', 'red']
const COLOR_LABELS = { yellow: '🟡 Yellow', blue: '🔵 Blue', green: '🟢 Green', purple: '🟣 Purple', red: '🔴 Red' }

function emptyOffice() {
  return { name: '', tagline: '', icon: 'BookOpen', color: 'blue', order: 0, sections: [] }
}
function emptySection() {
  return { heading: '', steps: [''] }
}

export default function AdminOfficeProcesses() {
  const [offices, setOffices]   = useState([])
  const [editing, setEditing]   = useState(null)   // null | office object (new or existing)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [openSections, setOpenSections] = useState({})

  useEffect(() => { fetchOffices() }, [])

  async function fetchOffices() {
    try {
      const res = await axios.get('/api/office-processes')
      setOffices(res.data)
    } catch { toast.error('Failed to load office processes') }
  }

  function startNew() {
    setEditing({ ...emptyOffice(), _isNew: true })
    setOpenSections({})
  }

  function startEdit(office) {
    setEditing({ ...office, sections: office.sections.map(s => ({ ...s, steps: [...s.steps] })) })
    setOpenSections({})
  }

  async function handleSave() {
    if (!editing.name.trim()) { toast.error('Office name is required'); return }
    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) { toast.error('Not logged in — please log in again'); setSaving(false); return }

      const sections = (editing.sections || [])
        .filter(s => s.heading && s.heading.trim())
        .map(s => ({
          heading: s.heading.trim(),
          steps: (s.steps || []).filter(st => st && st.trim()).map(st => st.trim()),
        }))

      const payload = {
        name: editing.name.trim(),
        tagline: (editing.tagline || '').trim(),
        icon: editing.icon || 'BookOpen',
        color: editing.color || 'blue',
        order: Number(editing.order) || 0,
        sections,
      }

      const headers = { Authorization: `Bearer ${token}` }

      if (editing._isNew) {
        await axios.post('/api/admin/office-processes', payload, { headers })
        toast.success('Office process created!')
      } else {
        await axios.put(`/api/admin/office-processes/${editing.id}`, payload, { headers })
        toast.success('Office process updated!')
      }
      setEditing(null)
      fetchOffices()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save'
      toast.error(msg)
      console.error('Save failed:', err.response?.data || err)
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this office process?')) return
    setDeleting(id)
    try {
      const token = localStorage.getItem('admin_token')
      await axios.delete(`/api/admin/office-processes/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Deleted')
      fetchOffices()
    } catch { toast.error('Failed to delete') } finally { setDeleting(null) }
  }

  // ── Section helpers ──────────────────────────────────────────────────────
  function addSection() {
    setEditing(prev => ({ ...prev, sections: [...prev.sections, emptySection()] }))
    setOpenSections(prev => ({ ...prev, [editing.sections.length]: true }))
  }

  function removeSection(si) {
    setEditing(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== si) }))
  }

  function updateSection(si, field, value) {
    setEditing(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === si ? { ...s, [field]: value } : s),
    }))
  }

  function addStep(si) {
    setEditing(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === si ? { ...s, steps: [...s.steps, ''] } : s),
    }))
  }

  function updateStep(si, stepIdx, value) {
    setEditing(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === si ? { ...s, steps: s.steps.map((st, j) => j === stepIdx ? value : st) } : s
      ),
    }))
  }

  function removeStep(si, stepIdx) {
    setEditing(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === si ? { ...s, steps: s.steps.filter((_, j) => j !== stepIdx) } : s
      ),
    }))
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Office Processes</h1>
            <p className="text-gray-400 text-sm mt-0.5">Manage the step-by-step guides shown on the landing page</p>
          </div>
          {!editing && (
            <button
              onClick={startNew}
              className="flex items-center gap-2 px-4 py-2 bg-kcc-gold text-kcc-dark text-sm font-semibold rounded-xl hover:bg-yellow-400 transition-all"
            >
              <Plus size={16} /> Add Office
            </button>
          )}
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="bg-[#0d1a35] border border-white/10 rounded-2xl p-5 mb-6">
            <h2 className="text-white font-semibold mb-4">
              {editing._isNew ? 'New Office Process' : `Editing: ${editing.name}`}
            </h2>

            {/* Basic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Office Name *</label>
                <input
                  value={editing.name}
                  onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-kcc-gold/50"
                  placeholder="e.g. Registrar's Office"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Tagline</label>
                <input
                  value={editing.tagline}
                  onChange={e => setEditing(p => ({ ...p, tagline: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-kcc-gold/50"
                  placeholder="e.g. Enrollment, TOR & records"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Icon</label>
                <select
                  value={editing.icon}
                  onChange={e => setEditing(p => ({ ...p, icon: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-kcc-gold/50"
                >
                  {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Color</label>
                <select
                  value={editing.color}
                  onChange={e => setEditing(p => ({ ...p, color: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-kcc-gold/50"
                >
                  {COLORS.map(c => <option key={c} value={c}>{COLOR_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Display Order</label>
                <input
                  type="number"
                  value={editing.order}
                  onChange={e => setEditing(p => ({ ...p, order: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-kcc-gold/50"
                />
              </div>
            </div>

            {/* Sections */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Sections</label>
                <button
                  onClick={addSection}
                  className="flex items-center gap-1 text-xs text-kcc-gold hover:text-yellow-300 transition-all"
                >
                  <Plus size={13} /> Add Section
                </button>
              </div>

              <div className="space-y-2">
                {editing.sections.map((section, si) => (
                  <div key={si} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    {/* Section header — no input inside button */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setOpenSections(p => ({ ...p, [si]: !p[si] }))}
                        className="p-1 text-gray-400 hover:text-white flex-shrink-0"
                      >
                        {openSections[si] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <input
                        value={section.heading}
                        onChange={e => updateSection(si, 'heading', e.target.value)}
                        className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
                        placeholder="Section heading (e.g. How to Pay School Fees)"
                      />
                      <button
                        type="button"
                        onClick={() => removeSection(si)}
                        className="text-gray-500 hover:text-red-400 transition-all p-1 flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Steps */}
                    {openSections[si] && (
                      <div className="px-4 pb-3 border-t border-white/5 pt-3 space-y-2">
                        {section.steps.map((step, stepIdx) => (
                          <div key={stepIdx} className="flex items-start gap-2">
                            <span className="text-gray-500 text-xs mt-2 w-4 flex-shrink-0">{stepIdx + 1}.</span>
                            <input
                              value={step}
                              onChange={e => updateStep(si, stepIdx, e.target.value)}
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-kcc-gold/40 placeholder-gray-600"
                              placeholder={`Step ${stepIdx + 1}`}
                            />
                            <button
                              onClick={() => removeStep(si, stepIdx)}
                              className="text-gray-600 hover:text-red-400 transition-all mt-1.5"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addStep(si)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-kcc-gold transition-all mt-1"
                        >
                          <Plus size={11} /> Add Step
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {editing.sections.length === 0 && (
                  <p className="text-gray-600 text-xs text-center py-4">No sections yet. Click "Add Section" to create one.</p>
                )}
              </div>
            </div>

            {/* Form actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-kcc-gold text-kcc-dark text-sm font-semibold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-all"
              >
                <Save size={14} /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-300 text-sm rounded-xl hover:bg-white/10 transition-all"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Office list */}
        <div className="space-y-3">
          {offices.length === 0 && !editing && (
            <div className="text-center py-12 text-gray-500 text-sm">
              No office processes yet. Click "Add Office" to create the first one.
            </div>
          )}
          {offices.map(office => (
            <div
              key={office.id}
              className="flex items-center justify-between bg-[#0d1a35] border border-white/10 rounded-2xl px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <GripVertical size={14} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{office.name}</p>
                  <p className="text-gray-500 text-xs">{office.tagline} · {office.sections.length} section{office.sections.length !== 1 ? 's' : ''} · Order: {office.order}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(office)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition-all"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(office.id)}
                  disabled={deleting === office.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-all"
                >
                  <Trash2 size={12} /> {deleting === office.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
