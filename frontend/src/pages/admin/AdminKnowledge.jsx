import { useEffect, useState, useRef } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import { Upload, Trash2, FileText, Plus, Files } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

export default function AdminKnowledge() {
  const [docs, setDocs]         = useState([])
  const [uploading, setUploading]   = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [textForm, setTextForm] = useState({ source: '', content: '' })
  const [addingText, setAddingText] = useState(false)
  const [showTextForm, setShowTextForm] = useState(false)
  const [bulkResults, setBulkResults]   = useState([])
  const fileRef     = useRef()
  const bulkRef     = useRef()

  function fetchDocs() {
    axios.get('/api/admin/knowledge', { headers: authHeader() })
      .then(res => setDocs(res.data))
      .catch(() => {})
  }

  useEffect(() => { fetchDocs() }, [])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      const res = await axios.post('/api/admin/knowledge/upload', formData, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      })
      toast.success(res.data.message)
      fetchDocs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  async function handleBulkUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    setBulkUploading(true)
    setBulkResults([])
    try {
      const res = await axios.post('/api/admin/knowledge/upload-bulk', formData, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      })
      setBulkResults(res.data.results)
      const ok = res.data.results.filter(r => r.status === 'ok').length
      toast.success(`${ok} of ${files.length} files indexed successfully`)
      fetchDocs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bulk upload failed')
    } finally {
      setBulkUploading(false)
      bulkRef.current.value = ''
    }
  }

  async function handleDelete(id, filename) {
    if (!confirm(`Delete "${filename}"?`)) return
    try {
      await axios.delete(`/api/admin/knowledge/${id}`, { headers: authHeader() })
      toast.success('Document deleted')
      fetchDocs()
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function handleAddText(e) {
    e.preventDefault()
    if (!textForm.content.trim()) return
    setAddingText(true)
    try {
      const res = await axios.post('/api/admin/knowledge/text', textForm, { headers: authHeader() })
      toast.success(res.data.message)
      setTextForm({ source: '', content: '' })
      setShowTextForm(false)
      fetchDocs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add text')
    } finally {
      setAddingText(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-kcc-dark mb-1">Knowledge Base</h1>
        <p className="text-gray-500 text-sm mb-6">Upload documents or add text for the AI to use</p>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <label className="flex items-center gap-2 px-4 py-2 bg-kcc-blue text-white rounded-xl cursor-pointer hover:bg-kcc-dark transition-all text-sm font-medium">
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload File'}
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>

          <label className="flex items-center gap-2 px-4 py-2 bg-kcc-blue/80 text-white rounded-xl cursor-pointer hover:bg-kcc-dark transition-all text-sm font-medium">
            <Files size={16} />
            {bulkUploading ? 'Uploading...' : 'Bulk Upload'}
            <input ref={bulkRef} type="file" accept=".pdf,.docx,.txt" multiple className="hidden" onChange={handleBulkUpload} disabled={bulkUploading} />
          </label>

          <button
            onClick={() => setShowTextForm(!showTextForm)}
            className="flex items-center gap-2 px-4 py-2 bg-kcc-gold text-kcc-dark rounded-xl hover:bg-yellow-400 transition-all text-sm font-medium"
          >
            <Plus size={16} />
            Add Text
          </button>
        </div>

        {/* Bulk Upload Results */}
        {bulkResults.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 space-y-2">
            <h3 className="font-semibold text-kcc-dark text-sm mb-3">Bulk Upload Results</h3>
            {bulkResults.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 p-2 rounded-xl text-xs ${r.status === 'ok' ? 'bg-green-50 text-green-700' : r.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>
                <span className="font-mono shrink-0">{r.status === 'ok' ? '✓' : r.status === 'error' ? '✗' : '–'}</span>
                <span className="font-medium">{r.filename}</span>
                <span className="text-gray-400">— {r.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Text Form */}
        {showTextForm && (
          <form onSubmit={handleAddText} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 space-y-3">
            <h3 className="font-semibold text-kcc-dark">Add Text Information</h3>
            <input
              type="text"
              placeholder="Source name (e.g. Enrollment FAQ)"
              value={textForm.source}
              onChange={e => setTextForm(p => ({ ...p, source: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white outline-none focus:border-kcc-blue"
            />
            <textarea
              placeholder="Paste the information here..."
              value={textForm.content}
              onChange={e => setTextForm(p => ({ ...p, content: e.target.value }))}
              rows={6}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white outline-none focus:border-kcc-blue resize-none"
              required
            />
            <div className="flex gap-2">
              <button type="submit" disabled={addingText} className="px-4 py-2 bg-kcc-blue text-white rounded-xl text-sm font-medium hover:bg-kcc-dark disabled:opacity-50">
                {addingText ? 'Adding...' : 'Add to Knowledge Base'}
              </button>
              <button type="button" onClick={() => setShowTextForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Documents List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-kcc-dark mb-4">Indexed Documents ({docs.length})</h2>
          {docs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No documents yet. Upload a PDF or add text to get started.</p>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <FileText size={18} className="text-kcc-blue flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">{doc.filename}</p>
                    <p className="text-gray-400 text-xs">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id, doc.filename)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
