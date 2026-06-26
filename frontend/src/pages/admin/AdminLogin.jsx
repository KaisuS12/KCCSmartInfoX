import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Lock, User } from 'lucide-react'
import kccLogo from '../../assets/kcc-logo.png'

export default function AdminLogin() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('/api/admin/login', form)
      localStorage.setItem('admin_token', res.data.token)
      localStorage.setItem('admin_role', res.data.role || 'admin')
      localStorage.setItem('admin_permissions', JSON.stringify(res.data.permissions || []))
      localStorage.setItem('admin_display_name', res.data.display_name || 'Admin')
      const firstPage = res.data.role === 'staff' && res.data.permissions?.length
        ? `/admin/${res.data.permissions[0]}`
        : '/admin/dashboard'
      navigate(firstPage)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-kcc-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={kccLogo} alt="KCC Logo" className="w-16 h-16 rounded-full object-cover mx-auto mb-4" />
          <h1 className="text-white text-2xl font-bold">KCCSmartInfoX</h1>
          <p className="text-gray-400 text-sm mt-1">Admin Panel</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-kcc-blue/20 border border-kcc-blue/40 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-center mb-2">Sign In</h2>

          <div className="space-y-1">
            <label className="text-gray-400 text-xs">Username</label>
            <div className="flex items-center gap-2 bg-kcc-dark border border-kcc-blue/40 rounded-xl px-3 py-2 focus-within:border-kcc-gold">
              <User size={16} className="text-gray-500" />
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder="admin"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-gray-400 text-xs">Password</label>
            <div className="flex items-center gap-2 bg-kcc-dark border border-kcc-blue/40 rounded-xl px-3 py-2 focus-within:border-kcc-gold">
              <Lock size={16} className="text-gray-500" />
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-kcc-gold text-kcc-dark font-semibold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-all"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-4">
          Kabankalan Catholic College, Inc. — Admin Access Only
        </p>
      </div>
    </div>
  )
}
