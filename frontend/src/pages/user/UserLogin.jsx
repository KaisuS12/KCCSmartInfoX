import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Lock, Mail } from 'lucide-react'
import kccLogo from '../../assets/kcc-logo.png'

export default function UserLogin() {
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate             = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('/api/users/login', form)
      localStorage.setItem('user_token', res.data.token)
      localStorage.setItem('user_profile', JSON.stringify(res.data.user))
      toast.success(`Welcome back, ${res.data.user.name}!`)
      navigate('/chat')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-kcc-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={kccLogo} alt="KCC Logo" className="w-16 h-16 rounded-full object-cover mx-auto mb-4" />
          <h1 className="text-white text-2xl font-bold">KCCSmartInfoX</h1>
          <p className="text-gray-400 text-sm mt-1">Student Login</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-kcc-blue/20 border border-kcc-blue/40 rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-gray-400 text-xs">Email</label>
            <div className="flex items-center gap-2 bg-kcc-dark border border-kcc-blue/40 rounded-xl px-3 py-2 focus-within:border-kcc-gold">
              <Mail size={16} className="text-gray-500" />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@email.com"
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

        <p className="text-center text-gray-500 text-sm mt-4">
          No account?{' '}
          <Link to="/register" className="text-kcc-gold hover:underline">Register here</Link>
        </p>
        <p className="text-center text-gray-600 text-sm mt-2">
          <Link to="/chat" className="hover:text-gray-400">Continue without login →</Link>
        </p>
      </div>
    </div>
  )
}
