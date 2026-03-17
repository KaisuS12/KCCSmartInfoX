import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, BookOpen, GraduationCap, Award, Phone, ChevronRight, Megaphone } from 'lucide-react'
import axios from 'axios'
import kccLogo from '../assets/kcc-logo.png'

const QUICK_LINKS = [
  { icon: GraduationCap, label: 'How to Enroll', q: 'How to enroll at KCC?' },
  { icon: BookOpen,      label: 'Courses Offered', q: 'What courses are offered at KCC?' },
  { icon: Award,         label: 'Scholarships', q: 'What scholarships are available at KCC?' },
  { icon: Phone,         label: 'Contact & Offices', q: 'What are the office hours and contacts at KCC?' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    axios.get('/api/announcements').then(res => setAnnouncements(res.data.slice(0, 3))).catch(() => {})
  }, [])

  function goChat(q) {
    navigate('/chat', { state: { initialQuestion: q } })
  }

  return (
    <div className="min-h-screen bg-kcc-dark text-white flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-kcc-blue/30">
        <div className="flex items-center gap-3">
          <img src={kccLogo} alt="KCC" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">KCCSmartInfoX</h1>
            <p className="text-gray-400 text-xs">Kabankalan Catholic College</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 px-4 py-2 bg-kcc-gold text-kcc-dark text-sm font-semibold rounded-full hover:bg-yellow-400 transition-all"
        >
          <MessageCircle size={15} />
          Chat Now
        </button>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-16">
        <img src={kccLogo} alt="KCC" className="w-24 h-24 rounded-full object-cover mb-6 ring-4 ring-kcc-gold/40" />
        <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
          Welcome to<br />
          <span className="text-kcc-gold">KCCSmartInfoX</span>
        </h2>
        <p className="text-gray-400 text-sm max-w-sm mb-8">
          Your 24/7 AI assistant for Kabankalan Catholic College. Ask anything about enrollment, courses, policies, and more — instantly.
        </p>
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 px-8 py-3 bg-kcc-blue text-white font-semibold rounded-2xl hover:bg-kcc-dark border border-kcc-blue hover:border-kcc-gold transition-all text-sm"
        >
          <MessageCircle size={18} />
          Start Chatting
          <ChevronRight size={16} />
        </button>
      </section>

      {/* Quick Links */}
      <section className="px-6 pb-10">
        <h3 className="text-white font-semibold text-sm mb-4 text-center">Quick Topics</h3>
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {QUICK_LINKS.map(({ icon: Icon, label, q }) => (
            <button
              key={label}
              onClick={() => goChat(q)}
              className="flex flex-col items-center gap-2 p-4 bg-kcc-blue/20 border border-kcc-blue/30 rounded-2xl hover:bg-kcc-blue/40 hover:border-kcc-gold transition-all"
            >
              <Icon size={22} className="text-kcc-gold" />
              <span className="text-white text-xs font-medium text-center">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="px-6 pb-10">
          <div className="max-w-sm mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone size={16} className="text-kcc-gold" />
              <h3 className="text-white font-semibold text-sm">Latest Announcements</h3>
            </div>
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="p-4 bg-kcc-blue/20 border border-kcc-blue/30 rounded-2xl">
                  <h4 className="text-white text-sm font-semibold mb-1">{a.title}</h4>
                  <p className="text-gray-400 text-xs line-clamp-2">{a.content}</p>
                  <p className="text-gray-500 text-xs mt-2">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About strip */}
      <div className="mt-auto border-t border-kcc-blue/30 px-6 py-6 text-center">
        <p className="text-gray-500 text-xs">
          Kabankalan Catholic College · Kabankalan City, Negros Occidental
        </p>
        <p className="text-gray-600 text-xs mt-1">Powered by KCCSmartInfoX AI</p>
      </div>
    </div>
  )
}
