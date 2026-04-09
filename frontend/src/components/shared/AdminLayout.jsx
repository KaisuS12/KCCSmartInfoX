import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Megaphone,
  BarChart2, Users, LogOut, Sun, Moon, Info, QrCode, Building2
} from 'lucide-react'
import kccLogo from '../../assets/kcc-logo.png'
import AdminAIAssistant from '../admin/AdminAIAssistant'

const navItems = [
  { to: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/knowledge',     icon: BookOpen,        label: 'Knowledge Base' },
  { to: '/admin/announcements', icon: Megaphone,       label: 'Announcements' },
  { to: '/admin/analytics',     icon: BarChart2,       label: 'Analytics' },
  { to: '/admin/subscribers',   icon: Users,           label: 'Subscribers' },
  { to: '/admin/school-info',   icon: Info,            label: 'School Info' },
  { to: '/admin/office-processes', icon: Building2,    label: 'Office Processes' },
  { to: '/admin/qrcode',        icon: QrCode,          label: 'QR Code' },
]

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => localStorage.getItem('admin_theme') === 'dark')

  useEffect(() => {
    localStorage.setItem('admin_theme', dark ? 'dark' : 'light')
  }, [dark])

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

      {/* AI Assistant — floats over all admin pages (outside flex flow) */}
      <div className="contents">
        <AdminAIAssistant />
      </div>
    </div>
  )
}
