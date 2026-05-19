import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Send, Megaphone, BookOpen, Copy, ThumbsUp, ThumbsDown, Home, Sun, Moon, FileText, Phone, Mic, MicOff, Globe, X, AlertTriangle, RefreshCw } from 'lucide-react'
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
  enroll:     ['What are the enrollment requirements?', 'When is the enrollment period?', 'How much is the tuition?'],
  tuition:    ['Are there payment schemes?', 'What are the miscellaneous fees?', 'Are scholarships available?'],
  scholarship:['What are the scholarship requirements?', 'How do I apply for a scholarship?'],
  tor:        ['How long does it take to get TOR?', 'What are the requirements for TOR?'],
  course:     ['What are the requirements for enrollment?', 'How much is the tuition?'],
}

function getFollowups(answer) {
  const lower = answer.toLowerCase()
  if (lower.includes('enroll'))                         return FAQ_FOLLOWUPS.enroll
  if (lower.includes('tuition') || lower.includes('fee')) return FAQ_FOLLOWUPS.tuition
  if (lower.includes('scholarship'))                    return FAQ_FOLLOWUPS.scholarship
  if (lower.includes('tor') || lower.includes('transcript')) return FAQ_FOLLOWUPS.tor
  if (lower.includes('course') || lower.includes('program')) return FAQ_FOLLOWUPS.course
  return []
}

export default function ChatPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [messages, setMessages]             = useState([])
  const [input, setInput]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [showInfo, setShowInfo]             = useState(false)
  const [darkMode, setDarkMode]             = useState(() => localStorage.getItem('theme') !== 'light')
  const [lang, setLang]                     = useState(() => localStorage.getItem('lang') || 'en')
  const [isListening, setIsListening]       = useState(false)
  const [concernModal, setConcernModal]     = useState(null) // { question, msgIndex }
  const [concernForm, setConcernForm]       = useState({ name: '', email: '', message: '' })
  const [concernSending, setConcernSending] = useState(false)
  const bottomRef  = useRef(null)
  const recognitionRef = useRef(null)
  const textareaRef = useRef(null)

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

  useEffect(() => {
    localStorage.setItem('lang', lang)
  }, [lang])

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input is not supported in this browser. Please use Chrome.'); return }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognition = new SR()
    recognition.lang = lang === 'fil' ? 'fil-PH' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
    }
    recognition.onend  = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  async function sendMessage(text) {
    const question = text || input.trim()
    if (!question) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)

    const history = messages.slice(-4).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))

    try {
      const res = await axios.post('/api/chat', { question, history, lang })
      const followups = getFollowups(res.data.answer)
      setMessages(prev => [...prev, {
        role: 'ai',
        text: res.data.answer,
        chat_log_id: res.data.chat_log_id,
        is_answered: res.data.is_answered,
        sources: res.data.sources || [],
        feedback: null,
        followups,
      }])
    } catch (err) {
      const isRateLimit = err.response?.status === 429
      setMessages(prev => [...prev, {
        role: 'ai',
        text: isRateLimit
          ? "You're sending messages too fast. Please wait a moment."
          : "Sorry, I'm having trouble connecting right now. Please try again.",
        error: true,
        retryText: question,
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

  async function submitConcern(e) {
    e.preventDefault()
    if (!concernModal) return
    setConcernSending(true)
    try {
      await axios.post('/api/concerns', {
        name: concernForm.name.trim(),
        email: concernForm.email.trim(),
        message: concernForm.message.trim(),
        related_question: concernModal.question,
      })
      setMessages(prev => prev.map((m, i) =>
        i === concernModal.msgIndex ? { ...m, concernSent: true } : m
      ))
      setConcernModal(null)
      setConcernForm({ name: '', email: '', message: '' })
    } catch {
      alert('Failed to submit. Please try again.')
    } finally {
      setConcernSending(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isEmpty = messages.length === 0

  // Theme tokens
  const bg      = darkMode ? 'bg-[#0a0f1e]'      : 'bg-gray-50'
  const hdr     = darkMode ? 'bg-[#0d1426]/90 border-white/10' : 'bg-white/90 border-gray-200'
  const bubble  = darkMode ? 'bg-white/8 text-white border border-white/10' : 'bg-white text-gray-800 border border-gray-100 shadow-sm'
  const inp     = darkMode ? 'bg-white/8 border-white/10 text-white'        : 'bg-white border-gray-200 text-gray-800'
  const bot     = darkMode ? 'bg-[#0d1426]/90 border-white/10'              : 'bg-white/90 border-gray-100'

  return (
    <div className={`flex flex-col h-screen ${bg} relative`}>

      {/* ── Header ── */}
      <header className={`flex items-center justify-between px-4 py-2.5 border-b z-20 backdrop-blur-md ${hdr}`}>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/')}
            className={`p-1.5 rounded-lg transition-all ${darkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <Home size={15} />
          </button>
          <img src={kccLogo} alt="KCC" className="w-7 h-7 rounded-full object-cover" />
          <div>
            <h1 className={`font-bold text-sm leading-tight ${darkMode ? 'text-white' : 'text-gray-800'}`}>KCCSmartInfoX</h1>
            <p className="text-gray-400 text-[11px]">Kabankalan Catholic College</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Lang toggle */}
          <button
            onClick={() => setLang(l => l === 'en' ? 'fil' : 'en')}
            title="Toggle language"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              lang === 'fil'
                ? 'bg-kcc-gold text-kcc-dark'
                : darkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Globe size={12} />
            {lang === 'fil' ? 'FIL' : 'EN'}
          </button>

          {/* Dark mode */}
          <button
            onClick={() => setDarkMode(d => !d)}
            title="Toggle theme"
            className={`p-1.5 rounded-lg transition-all ${darkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            {darkMode ? <Sun size={14} className="text-kcc-gold" /> : <Moon size={14} />}
          </button>

          {/* Panels — desktop */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => { setShowAnnouncements(true); setShowInfo(false) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                darkMode ? 'bg-white/8 hover:bg-white/15 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <Megaphone size={13} />
              Announcements
            </button>
            <button
              onClick={() => { setShowInfo(true); setShowAnnouncements(false) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                darkMode ? 'bg-white/8 hover:bg-white/15 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <BookOpen size={13} />
              School Info
            </button>
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28 md:pb-6">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center min-h-full text-center px-4 py-10 gap-0">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-kcc-gold/20 rounded-full blur-2xl scale-150" />
              <img src={kccLogo} alt="KCC" className="relative w-20 h-20 rounded-full object-cover ring-4 ring-kcc-gold/30 shadow-xl animate-float" />
            </div>
            <h2 className={`text-xl font-bold mb-1.5 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Hi! I'm KCCSmartInfoX
            </h2>
            <p className={`text-sm mb-7 max-w-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Ask me anything about Kabankalan Catholic College — enrollment, policies, offices, and more.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className={`text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                    darkMode
                      ? 'bg-white/6 border-white/10 text-gray-300 hover:bg-white/12 hover:border-kcc-gold/40 hover:text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-kcc-gold/60 hover:text-gray-800 shadow-sm'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div key={i} className={`msg-animate flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
              {msg.role === 'ai' && (
                <img src={kccLogo} alt="KCC" className="w-7 h-7 rounded-full object-cover mr-2 mt-1 flex-shrink-0" />
              )}
              <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-kcc-gold text-kcc-dark rounded-tr-sm font-medium'
                    : msg.error
                      ? 'bg-red-500/15 text-red-400 rounded-tl-sm border border-red-500/20'
                      : `${bubble} rounded-tl-sm`
                }`}
              >
                {msg.role === 'ai' ? (
                  <ReactMarkdown
                    components={{
                      ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 my-1">{children}</ul>,
                      ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1">{children}</ol>,
                      li:     ({ children }) => <li className="ml-2">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-kcc-gold">{children}</strong>,
                      p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    }}
                  >
                    {msg.text.replace(/[•·●▪◆◉○▸►]/g, (_, offset, str) => {
                      const before = str.slice(0, offset).trimEnd()
                      return before.length > 0 ? '\n- ' : '- '
                    })}
                  </ReactMarkdown>
                ) : msg.text}
              </div>
            </div>

            {/* Source tags */}
            {msg.role === 'ai' && !msg.error && msg.sources?.length > 0 && (
              <div className="ml-9 mt-1.5 flex flex-wrap gap-1.5">
                {msg.sources.map(src => (
                  <span
                    key={src}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                      darkMode
                        ? 'text-gray-500 bg-white/5 border-white/10'
                        : 'text-gray-400 bg-gray-50 border-gray-200'
                    }`}
                  >
                    <FileText size={9} />
                    {src}
                  </span>
                ))}
              </div>
            )}

            {/* Human fallback + Concern Form trigger */}
            {msg.role === 'ai' && msg.is_answered === false && (
              <div className={`ml-9 mt-2 max-w-[82%] rounded-xl border px-4 py-3 text-xs ${
                darkMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-blue-50 border-blue-100 text-gray-500'
              }`}>
                <p className="font-semibold mb-1.5 flex items-center gap-1.5">
                  <Phone size={11} /> Still need help? Contact us directly:
                </p>
                <p>📧 registrar@kcc.edu.ph</p>
                <p>📍 KCC Main Campus, Kabankalan City, Negros Occidental</p>
                <p>🕐 Mon–Fri: 8:00 AM – 5:00 PM &nbsp;|&nbsp; Sat: 8:00 AM – 12:00 PM</p>
                <div className="mt-3 pt-3 border-t border-current/10">
                  {msg.concernSent ? (
                    <p className="text-green-500 font-semibold flex items-center gap-1.5">
                      ✓ Concern submitted! We'll reply to your email.
                    </p>
                  ) : (
                    <button
                      onClick={() => {
                        setConcernModal({ question: messages[i - 1]?.text || msg.text, msgIndex: i })
                        setConcernForm({ name: '', email: '', message: messages[i - 1]?.text || '' })
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-kcc-blue text-white rounded-lg text-xs font-medium hover:bg-kcc-dark transition"
                    >
                      <AlertTriangle size={11} /> Submit a Concern
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Retry button on error */}
            {msg.role === 'ai' && msg.error && msg.retryText && (
              <div className="ml-9 mt-1.5">
                <button
                  onClick={() => {
                    setMessages(prev => prev.filter((_, idx) => idx !== i))
                    sendMessage(msg.retryText)
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition border border-red-500/20"
                >
                  <RefreshCw size={11} /> Retry
                </button>
              </div>
            )}

            {/* Actions: copy + feedback */}
            {msg.role === 'ai' && !msg.error && (
              <div className="flex items-center gap-2 ml-9 mt-1">
                <button
                  onClick={() => copyText(msg.text)}
                  className={`flex items-center gap-1 text-[11px] transition-all px-1.5 py-0.5 rounded hover:text-kcc-gold ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}
                  title="Copy"
                >
                  <Copy size={10} /> Copy
                </button>
                {msg.feedback == null ? (
                  <>
                    <button
                      onClick={() => submitFeedback(i, 'up')}
                      className={`transition-all px-1.5 py-0.5 rounded hover:text-green-400 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}
                      title="Helpful"
                    >
                      <ThumbsUp size={11} />
                    </button>
                    <button
                      onClick={() => submitFeedback(i, 'down')}
                      className={`transition-all px-1.5 py-0.5 rounded hover:text-red-400 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}
                      title="Not helpful"
                    >
                      <ThumbsDown size={11} />
                    </button>
                  </>
                ) : (
                  <span className={`text-[11px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {msg.feedback === 'up' ? '👍 Thanks!' : "👎 Noted, we'll improve this."}
                  </span>
                )}
              </div>
            )}

            {/* Follow-up suggestions */}
            {msg.role === 'ai' && msg.followups?.length > 0 && (
              <div className="ml-9 mt-2 flex flex-wrap gap-1.5">
                {msg.followups.map(fq => (
                  <button
                    key={fq}
                    onClick={() => sendMessage(fq)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all hover:border-kcc-gold/60 hover:text-kcc-gold ${
                      darkMode
                        ? 'bg-white/5 border-white/10 text-gray-400'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    {fq}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start animate-fadeIn">
            <img src={kccLogo} alt="KCC" className="w-7 h-7 rounded-full object-cover mr-2 mt-1 flex-shrink-0" />
            <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${darkMode ? 'bg-white/8 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className={`px-4 py-3 border-t backdrop-blur-md ${bot} md:mb-0 mb-14`}>
        <div className={`flex items-end gap-2 rounded-2xl px-4 py-2.5 border ${inp}`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={lang === 'fil' ? 'Magtanong tungkol sa KCC...' : 'Ask anything about KCC...'}
            rows={1}
            maxLength={500}
            className={`flex-1 bg-transparent text-sm resize-none outline-none max-h-28 py-0.5 ${
              darkMode ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
            }`}
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={toggleVoice}
            title={isListening ? 'Stop listening' : 'Voice input'}
            className={`p-1.5 rounded-xl transition-all flex-shrink-0 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : darkMode ? 'text-gray-500 hover:text-kcc-gold' : 'text-gray-400 hover:text-kcc-blue'
            }`}
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="p-1.5 rounded-xl bg-kcc-gold text-kcc-dark disabled:opacity-30 disabled:cursor-not-allowed hover:bg-yellow-400 transition-all flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <p className={`text-[11px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            Answers are based on official KCC information only.
          </p>
          {input.length > 0 && (
            <span className={`text-[11px] flex-shrink-0 ml-2 ${
              input.length >= 450
                ? 'text-red-400 font-semibold'
                : input.length >= 350
                ? 'text-yellow-500'
                : darkMode ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {input.length}/500
            </span>
          )}
        </div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 flex border-t z-20 ${darkMode ? 'bg-[#0d1426] border-white/10' : 'bg-white border-gray-200'}`}>
        <button
          onClick={() => navigate('/')}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-all ${darkMode ? 'text-gray-500 hover:text-kcc-gold' : 'text-gray-400 hover:text-kcc-blue'}`}
        >
          <Home size={19} />
          <span className="text-[10px]">Home</span>
        </button>
        <button
          onClick={() => setShowAnnouncements(true)}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-all ${darkMode ? 'text-gray-500 hover:text-kcc-gold' : 'text-gray-400 hover:text-kcc-blue'}`}
        >
          <Megaphone size={19} />
          <span className="text-[10px]">News</span>
        </button>
        <button
          onClick={() => setShowInfo(true)}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-all ${darkMode ? 'text-gray-500 hover:text-kcc-gold' : 'text-gray-400 hover:text-kcc-blue'}`}
        >
          <BookOpen size={19} />
          <span className="text-[10px]">Info</span>
        </button>
      </nav>

      {/* ── Panels ── */}
      {showAnnouncements && <div className="animate-slideDown"><AnnouncementsPanel onClose={() => setShowAnnouncements(false)} /></div>}
      {showInfo          && <div className="animate-slideDown"><SchoolInfoPanel    onClose={() => setShowInfo(false)} /></div>}

      {/* ── Concern Modal ── */}
      {concernModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-xl p-6 transition-all duration-200 scale-100 ${darkMode ? 'bg-[#1a2236]' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-bold text-base flex items-center gap-2 ${darkMode ? 'text-white' : 'text-kcc-dark'}`}>
                <AlertTriangle size={16} className="text-kcc-gold" /> Submit a Concern
              </h2>
              <button onClick={() => setConcernModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {concernModal.question && (
              <div className={`text-xs rounded-xl px-3 py-2 mb-4 ${darkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <span className="font-semibold">Related question:</span> {concernModal.question}
              </div>
            )}

            <form onSubmit={submitConcern} className="space-y-3">
              <div>
                <label className={`text-xs font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Your Name *</label>
                <input
                  type="text"
                  required
                  value={concernForm.name}
                  onChange={e => setConcernForm(p => ({ ...p, name: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-kcc-blue ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'border-gray-200 text-gray-800'}`}
                  placeholder="e.g. Juan dela Cruz"
                />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Your Email *</label>
                <input
                  type="email"
                  required
                  value={concernForm.email}
                  onChange={e => setConcernForm(p => ({ ...p, email: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-kcc-blue ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'border-gray-200 text-gray-800'}`}
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Your Concern / Message *</label>
                <textarea
                  required
                  rows={4}
                  value={concernForm.message}
                  onChange={e => setConcernForm(p => ({ ...p, message: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-kcc-blue resize-none ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'border-gray-200 text-gray-800'}`}
                  placeholder="Describe your concern in detail..."
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConcernModal(null)}
                  className={`flex-1 py-2 rounded-xl text-sm border transition ${darkMode ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={concernSending}
                  className="flex-1 py-2 rounded-xl text-sm bg-kcc-blue text-white font-medium hover:bg-kcc-dark disabled:opacity-50 transition"
                >
                  {concernSending ? 'Submitting...' : 'Submit Concern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
