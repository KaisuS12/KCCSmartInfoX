import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  LayoutDashboard, BookOpen, Megaphone,
  BarChart2, Users, LogOut, Sun, Moon, Info, QrCode, Building2, MessageSquare, Settings, AlertTriangle
} from 'lucide-react'
import kccLogo from '../../assets/kcc-logo.png'

const navItems = [
  { to: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/knowledge',     icon: BookOpen,        label: 'Knowledge Base' },
  { to: '/admin/announcements', icon: Megaphone,       label: 'Announcements' },
  { to: '/admin/analytics',     icon: BarChart2,       label: 'Analytics' },
  { to: '/admin/subscribers',   icon: Users,           label: 'Subscribers' },
  { to: '/admin/school-info',   icon: Info,            label: 'School Info' },
  { to: '/admin/office-processes', icon: Building2,    label: 'Office Processes' },
  { to: '/admin/chatlogs',      icon: MessageSquare,   label: 'Chat Logs' },
  { to: '/admin/concerns',      icon: AlertTriangle,   label: 'Concerns' },
  { to: '/admin/qrcode',        icon: QrCode,          label: 'QR Code' },
  { to: '/admin/settings',      icon: Settings,        label: 'Settings' },
]

const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => localStorage.getItem('admin_theme') === 'dark')
  const timerRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('admin_theme', dark ? 'dark' : 'light')
  }, [dark])

  // Auto-logout on inactivity
  useEffect(() => {
    function resetTimer() {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        localStorage.removeItem('admin_token')
        navigate('/admin/login')
      }, INACTIVITY_MS)
    }
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [navigate])

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          localStorage.removeItem('admin_token')
          navigate('/admin/login')
        }
        return Promise.reject(err)
      }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [navigate])

  function handleLogout() {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  return (
    <div className={`flex h-screen font-sans ${dark ? 'admin-dark' : 'bg-gray-100'}`}>
      {/* Sidebar */}
      <aside className="w-64 bg-kcc-dark flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-kcc-blue flex items-center gap-3">
          <img src={kccLogo} alt="KCC Logo" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          <div>
            <h1 className="text-kcc-gold font-bold text-lg leading-tight">KCCSmartInfoX</h1>
            <p className="text-gray-400 text-xs mt-1">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-kcc-gold text-kcc-dark font-semibold'
                    : 'text-gray-300 hover:bg-kcc-blue hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Dark mode toggle + Logout */}
        <div className="p-4 border-t border-kcc-blue space-y-1">
          <button
            onClick={() => setDark(d => !d)}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm text-gray-300 hover:bg-kcc-blue hover:text-white transition-all"
          >
            {dark ? <Sun size={18} className="text-kcc-gold" /> : <Moon size={18} />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm text-gray-300 hover:bg-red-600 hover:text-white transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>


    </div>
  )
}
