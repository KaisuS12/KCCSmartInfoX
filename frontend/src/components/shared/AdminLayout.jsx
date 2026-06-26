import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import {
  LayoutDashboard, BookOpen, Megaphone,
  BarChart2, Users, LogOut, Sun, Moon, QrCode, Building2, MessageSquare, Settings, AlertTriangle, MessageCircle, UserCog, ShieldCheck
} from 'lucide-react'
import kccLogo from '../../assets/kcc-logo.png'

const ALL_NAV_ITEMS = [
  { key: 'dashboard',        to: '/admin/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'knowledge',        to: '/admin/knowledge',        icon: BookOpen,        label: 'Knowledge Base' },
  { key: 'announcements',    to: '/admin/announcements',    icon: Megaphone,       label: 'Announcements' },
  { key: 'analytics',        to: '/admin/analytics',        icon: BarChart2,       label: 'Analytics' },
  { key: 'subscribers',      to: '/admin/subscribers',      icon: Users,           label: 'Subscribers' },
  { key: 'office-processes', to: '/admin/office-processes', icon: Building2,       label: 'Office Processes' },
  { key: 'chatlogs',         to: '/admin/chatlogs',         icon: MessageSquare,   label: 'Chat Logs' },
  { key: 'concerns',         to: '/admin/concerns',         icon: AlertTriangle,   label: 'Concerns' },
  { key: 'live-chats',       to: '/admin/live-chats',       icon: MessageCircle,   label: 'Live Chats', badge: true },
  { key: 'qrcode',           to: '/admin/qrcode',           icon: QrCode,          label: 'QR Code' },
]

const ADMIN_ONLY_ITEMS = [
  { key: 'settings', to: '/admin/settings', icon: Settings, label: 'Settings' },
  { key: 'staff',    to: '/admin/staff',    icon: UserCog,  label: 'Staff Management' },
]

const INACTIVITY_MS = 30 * 60 * 1000

export default function AdminLayout({ children }) {
  const navigate   = useNavigate()
  const location   = useLocation()
  const [dark, setDark]               = useState(() => localStorage.getItem('admin_theme') === 'dark')
  const [liveChatCount, setLiveChatCount] = useState(0)
  const timerRef = useRef(null)

  const role        = localStorage.getItem('admin_role') || 'admin'
  const isAdmin     = role === 'admin'
  const permissions = JSON.parse(localStorage.getItem('admin_permissions') || '[]')

  // Build visible nav: admin sees all, staff sees only allowed keys
  const visibleNav = isAdmin
    ? [...ALL_NAV_ITEMS, ...ADMIN_ONLY_ITEMS]
    : ALL_NAV_ITEMS.filter(item => permissions.includes(item.key))

  // Redirect staff away from pages they don't have access to
  useEffect(() => {
    if (isAdmin) return
    const currentKey = location.pathname.replace('/admin/', '')
    const allowed = permissions
    const isAllowed = allowed.some(p => location.pathname.startsWith(`/admin/${p}`))
    if (!isAllowed && allowed.length > 0) {
      navigate(`/admin/${allowed[0]}`, { replace: true })
    }
  }, [location.pathname, isAdmin, permissions, navigate])

  useEffect(() => {
    localStorage.setItem('admin_theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (!isAdmin) return // only admin needs live chat badge
    async function fetchLiveChatCount() {
      try {
        const res = await axios.get('/api/admin/live-chats?status=active', {
          headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
        })
        setLiveChatCount(res.data.filter(c => c.status === 'active').length)
      } catch {}
    }
    fetchLiveChatCount()
    const t = setInterval(fetchLiveChatCount, 15000)
    return () => clearInterval(t)
  }, [isAdmin])

  // Also show live chat badge for staff who have live-chats permission
  useEffect(() => {
    if (isAdmin || !permissions.includes('live-chats')) return
    async function fetchCount() {
      try {
        const res = await axios.get('/api/admin/live-chats?status=active', {
          headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
        })
        setLiveChatCount(res.data.filter(c => c.status === 'active').length)
      } catch {}
    }
    fetchCount()
    const t = setInterval(fetchCount, 15000)
    return () => clearInterval(t)
  }, [isAdmin, permissions])

  function logLogout(action) {
    const token = localStorage.getItem('admin_token')
    if (!token) return
    axios.post('/api/admin/logout-log', { action }, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {})
  }

  useEffect(() => {
    function resetTimer() {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        logLogout('timeout')
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_role')
        localStorage.removeItem('admin_permissions')
        localStorage.removeItem('admin_display_name')
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
          localStorage.removeItem('admin_role')
          localStorage.removeItem('admin_permissions')
          navigate('/admin/login')
        }
        return Promise.reject(err)
      }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [navigate])

  function handleLogout() {
    logLogout('logout')
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_role')
    localStorage.removeItem('admin_permissions')
    navigate('/admin/login')
  }

  return (
    <div className={`flex h-screen font-sans ${dark ? 'admin-dark' : 'bg-gray-100'}`}>
      {/* Sidebar */}
      <aside className="w-64 bg-kcc-dark flex flex-col flex-shrink-0">
        {/* Logo + role badge */}
        <div className="p-6 border-b border-kcc-blue flex items-center gap-3">
          <img src={kccLogo} alt="KCC Logo" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          <div>
            <h1 className="text-kcc-gold font-bold text-lg leading-tight">KCCSmartInfoX</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldCheck size={11} className={isAdmin ? 'text-kcc-gold' : 'text-blue-400'} />
              <p className={`text-xs font-medium ${isAdmin ? 'text-gray-400' : 'text-blue-400'}`}>
                {isAdmin ? 'Admin Panel' : 'Staff Panel'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, icon: Icon, label, badge }) => (
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
              {badge && liveChatCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {liveChatCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Dark mode + Logout */}
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
