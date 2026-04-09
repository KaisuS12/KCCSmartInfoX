import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle, ChevronRight, Megaphone, ChevronDown, ChevronUp,
  DollarSign, BookOpen, Award, MapPin, Phone, Sparkles, GraduationCap, Building2, Heart
} from 'lucide-react'
import axios from 'axios'
import kccLogo from '../assets/kcc-logo.png'

// Map icon name string → lucide component
const ICON_MAP = {
  DollarSign, BookOpen, Award, GraduationCap, Building2, Heart, Megaphone, Phone,
}

const COLOR_MAP = {
  yellow: { border: 'border-yellow-500/30', bg: 'from-yellow-500/10 to-transparent', icon: 'bg-yellow-500/20 text-yellow-400', heading: 'text-yellow-400' },
  blue:   { border: 'border-blue-400/30',   bg: 'from-blue-500/10 to-transparent',   icon: 'bg-blue-500/20 text-blue-400',     heading: 'text-blue-400' },
  green:  { border: 'border-green-500/30',  bg: 'from-green-500/10 to-transparent',  icon: 'bg-green-500/20 text-green-400',   heading: 'text-green-400' },
  purple: { border: 'border-purple-500/30', bg: 'from-purple-500/10 to-transparent', icon: 'bg-purple-500/20 text-purple-400', heading: 'text-purple-400' },
  red:    { border: 'border-red-500/30',    bg: 'from-red-500/10 to-transparent',    icon: 'bg-red-500/20 text-red-400',       heading: 'text-red-400' },
}

// ─── Office Card ──────────────────────────────────────────────────────────────
function OfficeCard({ office }) {
  const [open, setOpen] = useState(false)
  const [openSections, setOpenSections] = useState({})
  const colors = COLOR_MAP[office.color] || COLOR_MAP.blue
  const Icon = ICON_MAP[office.icon] || BookOpen

  function toggleSection(idx) {
    setOpenSections(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
      open ? `${colors.border} bg-gradient-to-b ${colors.bg}` : 'border-white/10 bg-white/5 hover:border-white/20'
    }`}>
      {/* Card header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
            <Icon size={19} />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{office.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">{office.tagline}</p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded body — grid slide (no delay) */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s ease',
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/10 divide-y divide-white/5">
            {office.sections.map((section, si) => (
              <div key={si}>
                <button
                  onClick={() => toggleSection(si)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <span className={`text-xs font-semibold uppercase tracking-wide ${colors.heading}`}>
                    {section.heading}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-gray-500 flex-shrink-0 transition-transform duration-300 ${openSections[si] ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Steps — grid slide */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: openSections[si] ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.3s ease',
                  }}
                >
                  <div className="overflow-hidden">
                    <ol className="px-5 pb-4 pt-1 space-y-2">
                      {section.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-2.5 text-gray-300 text-sm leading-relaxed">
                          <span className={`font-bold flex-shrink-0 text-xs mt-0.5 w-4 ${colors.heading}`}>
                            {idx + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Announcement Carousel ────────────────────────────────────────────────────
function AnnouncementCarousel({ announcements }) {
  const [active, setActive] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (announcements.length <= 1) return
    timerRef.current = setInterval(() => setActive(i => (i + 1) % announcements.length), 4000)
    return () => clearInterval(timerRef.current)
  }, [announcements.length])

  function goTo(idx) {
    setActive(idx)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setActive(i => (i + 1) % announcements.length), 4000)
  }

  if (!announcements.length) return null
  const ann = announcements[active]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-kcc-gold/20 flex items-center justify-center">
          <Megaphone size={13} className="text-kcc-gold" />
        </div>
        <h3 className="text-white font-semibold text-sm">Latest Announcements</h3>
        {announcements.length > 1 && (
          <span className="ml-auto text-gray-500 text-xs">{active + 1}/{announcements.length}</span>
        )}
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex flex-col min-h-[240px]">
        {ann.image_url && (
          <img src={ann.image_url} alt={ann.title} className="w-full h-44 object-cover" />
        )}
        <div className="flex-1 p-5">
          <p className="text-kcc-gold text-xs font-semibold uppercase tracking-wider mb-2">
            {new Date(ann.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <h4 className="text-white font-bold text-base leading-snug mb-2">{ann.title}</h4>
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">{ann.content}</p>
        </div>
      </div>

      {announcements.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {announcements.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === active ? 'w-6 h-1.5 bg-kcc-gold' : 'w-1.5 h-1.5 bg-gray-600 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState([])
  const [offices, setOffices] = useState([])

  useEffect(() => {
    axios.get('/api/announcements').then(res => setAnnouncements(res.data.slice(0, 5))).catch(() => {})
    axios.get('/api/office-processes').then(res => setOffices(res.data)).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-kcc-dark text-white flex flex-col overflow-x-hidden">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-kcc-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-kcc-blue/10 rounded-full blur-3xl" />
      </div>

      {/* ── Header ── */}
      <header className="relative flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img src={kccLogo} alt="KCC" className="w-9 h-9 rounded-full object-cover ring-2 ring-kcc-gold/30" />
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">KCCSmartInfoX</h1>
            <p className="text-gray-500 text-xs">Kabankalan Catholic College</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 px-4 py-2 bg-kcc-gold text-kcc-dark text-sm font-bold rounded-full hover:bg-yellow-300 transition-all shadow-lg shadow-kcc-gold/20"
        >
          <MessageCircle size={14} />
          Chat Now
        </button>
      </header>

      {/* ── Hero ── */}
      <section className="relative px-6 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1">
            {announcements.length > 0
              ? <AnnouncementCarousel announcements={announcements} />
              : (
                <div className="flex flex-col items-center justify-center min-h-[240px] border border-white/10 rounded-2xl bg-white/5 text-gray-600 text-sm gap-2">
                  <Megaphone size={26} className="opacity-30" />
                  <span>No announcements yet.</span>
                </div>
              )
            }
          </div>

          <div className="order-1 lg:order-2 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-kcc-gold/20 rounded-full blur-2xl scale-150" />
              <img src={kccLogo} alt="KCC" className="relative w-24 h-24 rounded-full object-cover ring-4 ring-kcc-gold/40 shadow-2xl" />
            </div>
            <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-kcc-gold/10 border border-kcc-gold/20">
              <Sparkles size={12} className="text-kcc-gold" />
              <span className="text-kcc-gold text-xs font-semibold">AI-Powered Assistant</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
              Welcome to<br />
              <span className="text-kcc-gold">KCCSmartInfoX</span>
            </h2>
            <p className="text-gray-400 text-sm max-w-sm mb-8 leading-relaxed">
              Your 24/7 AI assistant for Kabankalan Catholic College.
              Instant answers about enrollment, courses, policies, and more.
            </p>
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2.5 px-7 py-3.5 bg-kcc-gold text-kcc-dark font-bold rounded-2xl hover:bg-yellow-300 transition-all shadow-lg shadow-kcc-gold/20 text-sm group"
            >
              <MessageCircle size={16} />
              Start Chatting
              <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Office Process Cards ── */}
      {offices.length > 0 && (
        <section className="relative px-6 pb-14 border-t border-white/10 pt-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-kcc-gold text-xs font-semibold uppercase tracking-widest mb-2">Step-by-Step Guides</p>
              <h2 className="text-white text-2xl font-bold">Office Processes & Guidelines</h2>
              <p className="text-gray-500 text-sm mt-2">Tap an office to expand, then tap a section to see the steps.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {offices.map(office => <OfficeCard key={office.id} office={office} />)}
            </div>
            <p className="text-center text-gray-600 text-xs mt-8">
              Have a specific question?{' '}
              <button onClick={() => navigate('/chat')} className="text-kcc-gold hover:underline font-medium">
                Ask the chatbot →
              </button>
            </p>
          </div>
        </section>
      )}

      {/* ── About Us ── */}
      <section className="relative px-6 pb-14 border-t border-white/10 pt-12">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-kcc-gold text-xs font-semibold uppercase tracking-widest mb-4">About Us</p>
          <h2 className="text-white text-2xl font-bold mb-3">Kabankalan Catholic College</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xl mx-auto mb-8">
            A Catholic educational institution in Kabankalan City, Negros Occidental — committed to
            quality education grounded in Christian values, academic excellence, and community service.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8 text-left">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-kcc-gold text-xs font-bold uppercase tracking-widest mb-2">Vision</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                A leading Catholic institution forming competent, morally upright, and socially responsible citizens for God and country.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-kcc-gold text-xs font-bold uppercase tracking-widest mb-2">Mission</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                To provide accessible, quality, and values-based education that develops the full potential of every student.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 text-gray-500 text-xs">
            <span className="flex items-center gap-1.5"><MapPin size={13} className="text-kcc-gold" />Kabankalan City, Negros Occidental</span>
            <span className="hidden sm:block text-gray-700">·</span>
            <span className="flex items-center gap-1.5"><Phone size={13} className="text-kcc-gold" />Mon–Fri 8:00 AM – 5:00 PM</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-5 text-center">
        <p className="text-gray-700 text-xs">© {new Date().getFullYear()} KCCSmartInfoX · Kabankalan Catholic College · All rights reserved</p>
      </footer>
    </div>
  )
}
