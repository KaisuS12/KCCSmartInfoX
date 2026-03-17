import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Send, Megaphone, BookOpen, Copy, ThumbsUp, ThumbsDown, Home, Sun, Moon } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import AnnouncementsPanel from '../../components/user/AnnouncementsPanel'
import SchoolInfoPanel from '../../components/user/SchoolInfoPanel'
import TypingIndicator from '../../components/user/TypingIndicator'
import kccLogo from '../../assets/kcc-logo.png'

const SUGGESTED = [
  'How to enroll?',
  'How to get my TOR?',
  'What are the penalties in the DO?',
  'What are the office hours?',
]

const FAQ_FOLLOWUPS = {
  enroll: ['What are the enrollment requirements?', 'When is the enrollment period?', 'How much is the tuition?'],
  tuition: ['Are there payment schemes?', 'What are the miscellaneous fees?', 'Are scholarships available?'],
  scholarship: ['What are the scholarship requirements?', 'How do I apply for a scholarship?'],
  tor: ['How long does it take to get TOR?', 'What are the requirements for TOR?'],
  course: ['What are the requirements for enrollment?', 'How much is the tuition?'],
}

function getFollowups(answer) {
  const lower = answer.toLowerCase()
  if (lower.includes('enroll')) return FAQ_FOLLOWUPS.enroll
  if (lower.includes('tuition') || lower.includes('fee')) return FAQ_FOLLOWUPS.tuition
  if (lower.includes('scholarship')) return FAQ_FOLLOWUPS.scholarship
  if (lower.includes('tor') || lower.includes('transcript')) return FAQ_FOLLOWUPS.tor
  if (lower.includes('course') || lower.includes('program')) return FAQ_FOLLOWUPS.course
  return []
}

export default function ChatPage() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const [messages, setMessages]               = useState([])
  const [input, setInput]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [showInfo, setShowInfo]               = useState(false)
  const [darkMode, setDarkMode]               = useState(() => localStorage.getItem('theme') !== 'light')
  const bottomRef                             = useRef(null)

  // Handle initial question from landing page
  useEffect(() => {
    if (location.state?.initialQuestion) {
      sendMessage(location.state.initialQuestion)
      window.history.replaceState({}, '')
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  async function sendMessage(text) {
    const question = text || input.trim()
    if (!question) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)

    try {
      const res = await axios.post('/api/chat', { question })
      const followups = getFollowups(res.data.answer)
      setMessages(prev => [...prev, {
        role: 'ai',
        text: res.data.answer,
        chat_log_id: res.data.chat_log_id,
        feedback: null,
        followups,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: "Sorry, I'm having trouble connecting right now. Please try again.",
        error: true
      }])
    } finally {
      setLoading(false)
    }
  }

  async function submitFeedback(msgIndex, rating) {
    const msg = messages[msgIndex]
    if (!msg || msg.feedback) return

    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, feedback: rating } : m))

    try {
      await axios.post('/api/chat/feedback', {
        chat_log_id: msg.chat_log_id || 0,
        question: messages[msgIndex - 1]?.text || '',
        answer: msg.text,
        rating,
      })
    } catch { /* silent */ }
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isEmpty = messages.length === 0

  const bg      = darkMode ? 'bg-kcc-dark'   : 'bg-gray-50'
  const hdr     = darkMode ? 'bg-kcc-dark border-kcc-blue/40' : 'bg-white border-gray-200'
  const bubble  = darkMode ? 'bg-kcc-blue/50 text-white' : 'bg-white text-gray-800 border border-gray-100 shadow-sm'
  const inp     = darkMode ? 'bg-kcc-blue/30 border-kcc-blue/40 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
  const bot     = darkMode ? 'bg-kcc-dark border-kcc-blue/40' : 'bg-white border-gray-200'

  return (
    <div className={`flex flex-col h-screen ${bg} relative`}>

      {/* Header */}
      <header className={`flex items-center justify-between px-4 py-3 border-b z-10 ${hdr}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-1 rounded-lg hover:bg-gray-100/20 transition-all">
            <Home size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
          </button>
          <img src={kccLogo} alt="KCC Logo" className="w-8 h-8 rounded-full object-cover" />
          <div>
            <h1 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>KCCSmartInfoX</h1>
            <p className="text-gray-400 text-xs">Kabankalan Catholic College</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setDarkMode(d => !d)} className="p-2 rounded-lg hover:bg-gray-100/20 transition-all" title="Toggle theme">
            {darkMode ? <Sun size={15} className="text-kcc-gold" /> : <Moon size={15} className="text-gray-500" />}
          </button>
          <button
            onClick={() => { setShowAnnouncements(true); setShowInfo(false) }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-kcc-blue/40 hover:bg-kcc-gold hover:text-kcc-dark text-white text-xs transition-all"
          >
            <Megaphone size={14} />
            <span className="hidden sm:inline">Announcements</span>
          </button>
          <button
            onClick={() => { setShowInfo(true); setShowAnnouncements(false) }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-kcc-blue/40 hover:bg-kcc-gold hover:text-kcc-dark text-white text-xs transition-all"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">School Info</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-20 md:pb-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-20">
            <img src={kccLogo} alt="KCC Logo" className="w-16 h-16 rounded-full object-cover mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Hi! I'm KCCSmartInfoX</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              Ask me anything about Kabankalan Catholic College — enrollment, policies, offices, and more.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left px-4 py-3 rounded-xl bg-kcc-blue/40 hover:bg-kcc-gold hover:text-kcc-dark text-white text-sm transition-all border border-kcc-blue/30"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`msg-animate flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
              {msg.role === 'ai' && (
                <img src={kccLogo} alt="KCC" className="w-7 h-7 rounded-full object-cover mr-2 mt-1 flex-shrink-0" />
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-kcc-gold text-kcc-dark rounded-tr-sm font-medium'
                    : msg.error
                      ? 'bg-red-900/40 text-red-300 rounded-tl-sm'
                      : `${bubble} rounded-tl-sm`
                }`}
              >
                {msg.role === 'ai' ? (
                  <ReactMarkdown
                    components={{
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1">{children}</ol>,
                      li: ({ children }) => <li className="ml-2">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-kcc-gold">{children}</strong>,
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : msg.text}
              </div>
            </div>

            {/* AI action bar: copy + feedback */}
            {msg.role === 'ai' && !msg.error && (
              <div className="flex items-center gap-2 ml-9 mt-1">
                <button
                  onClick={() => copyText(msg.text)}
                  className="flex items-center gap-1 text-gray-400 hover:text-kcc-gold text-xs transition-all px-1 py-0.5 rounded"
                  title="Copy"
                >
                  <Copy size={11} /> Copy
                </button>
                {msg.feedback === null || msg.feedback === undefined ? (
                  <>
                    <button
                      onClick={() => submitFeedback(i, 'up')}
                      className="text-gray-400 hover:text-green-400 transition-all px-1 py-0.5 rounded"
                      title="Helpful"
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button
                      onClick={() => submitFeedback(i, 'down')}
                      className="text-gray-400 hover:text-red-400 transition-all px-1 py-0.5 rounded"
                      title="Not helpful"
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">
                    {msg.feedback === 'up' ? '👍 Thanks!' : '👎 Noted — we\'ll improve this.'}
                  </span>
                )}
              </div>
            )}

            {/* FAQ Follow-up suggestions */}
            {msg.role === 'ai' && msg.followups && msg.followups.length > 0 && (
              <div className="ml-9 mt-2 flex flex-wrap gap-2">
                {msg.followups.map(fq => (
                  <button
                    key={fq}
                    onClick={() => sendMessage(fq)}
                    className="text-xs px-3 py-1 rounded-full bg-kcc-blue/20 border border-kcc-blue/40 text-kcc-gold hover:bg-kcc-blue/40 transition-all"
                  >
                    {fq}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start msg-animate">
            <div className="w-7 h-7 rounded-full bg-kcc-gold flex items-center justify-center mr-2 mt-1 flex-shrink-0">
              <span className="text-kcc-dark font-bold text-xs">K</span>
            </div>
            <div className="bg-kcc-blue/50 px-4 py-3 rounded-2xl rounded-tl-sm">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`px-4 py-3 border-t ${bot} md:mb-0 mb-14`}>
        <div className={`flex items-end gap-2 rounded-2xl px-4 py-2 border ${inp}`}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about KCC..."
            rows={1}
            className={`flex-1 bg-transparent text-sm resize-none outline-none max-h-32 py-1 ${darkMode ? 'text-white placeholder-gray-400' : 'text-gray-800 placeholder-gray-400'}`}
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="p-2 rounded-xl bg-kcc-gold text-kcc-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-400 transition-all flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-gray-500 text-xs mt-2">
          Answers are based on official KCC information only.
        </p>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t border-kcc-blue/30 bg-kcc-dark z-20">
        <button onClick={() => navigate('/')} className="flex-1 flex flex-col items-center py-3 text-gray-400 hover:text-kcc-gold transition-all">
          <Home size={20} />
          <span className="text-xs mt-0.5">Home</span>
        </button>
        <button onClick={() => setShowAnnouncements(true)} className="flex-1 flex flex-col items-center py-3 text-gray-400 hover:text-kcc-gold transition-all">
          <Megaphone size={20} />
          <span className="text-xs mt-0.5">News</span>
        </button>
        <button onClick={() => setShowInfo(true)} className="flex-1 flex flex-col items-center py-3 text-gray-400 hover:text-kcc-gold transition-all">
          <BookOpen size={20} />
          <span className="text-xs mt-0.5">Info</span>
        </button>
      </nav>

      {/* Panels */}
      {showAnnouncements && <AnnouncementsPanel onClose={() => setShowAnnouncements(false)} />}
      {showInfo          && <SchoolInfoPanel    onClose={() => setShowInfo(false)} />}
    </div>
  )
}
