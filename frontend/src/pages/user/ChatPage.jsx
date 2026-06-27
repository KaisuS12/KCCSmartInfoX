import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Send, Megaphone, Copy, ThumbsUp, ThumbsDown, Home, Sun, Moon, Phone, Mic, MicOff, Globe, X, AlertTriangle, RefreshCw, MessageCircle, LogOut, History, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import AnnouncementsPanel from '../../components/user/AnnouncementsPanel'
import TypingIndicator from '../../components/user/TypingIndicator'
import kccLogo from '../../assets/kcc-logo.png'

const SUGGESTED = [
  'How to enroll?',
  'What course is best for me? 🎯',
  'How to get my TOR?',
  'What are the office hours?',
]

function getFollowups(question, answer) {
  const q = (question || '').toLowerCase()
  const a = (answer   || '').toLowerCase()

  // AI gave a course recommendation — suggest relevant next steps
  const isRecommendation = a.includes('recommend') || a.includes('best fit') ||
    a.includes('would suit') || a.includes('sounds like') || a.includes('perfect for') ||
    a.includes('angkop') || a.includes('maganda para sa') || a.includes('irerekomenda')
  if (isRecommendation) {
    const COURSE_NAMES = ['BSIT', 'BSBA', 'BSA', 'BSAIS', 'BSMA', 'BSTM', 'BEED', 'BSED', 'BSPsych', 'BSCrim']
    const mentioned = COURSE_NAMES.find(c => answer.toUpperCase().includes(c))
    if (mentioned) {
      return [`Tell me more about ${mentioned}`, 'How to enroll?', 'Are scholarships available?']
    }
    return ['Tell me more about that course', 'How to enroll?', 'What are the requirements?']
  }

  // AI is asking which department to pick → show the 3 + "All 3" as quick-reply buttons
  if (a.includes('which') && a.includes('department') &&
      a.includes('ceas') && a.includes('cmat') && a.includes('coc')) {
    return ['CEAS', 'CMAT', 'COC', 'All 3 departments']
  }

  // After listing courses (one or all departments)
  const showedCourses = a.includes('bachelor of') || a.includes('bsit') ||
                        a.includes('bsba') || a.includes('bscrim') ||
                        a.includes('bsed') || a.includes('beed')
  if (showedCourses) {
    // Showed all 3 departments
    const showedAll = a.includes('ceas') && a.includes('cmat') && a.includes('coc')
    if (showedAll) return ['How to enroll?', 'How much is the tuition?', 'Are scholarships available?']
    const dept = a.includes('ceas') || q.includes('ceas') ? 'CEAS'
               : a.includes('cmat') || q.includes('cmat') ? 'CMAT'
               : a.includes('coc')  || q.includes('coc')  ? 'COC'
               : null
    if (dept) return [`How to enroll in ${dept}?`, 'How much is the tuition?', 'Are scholarships available?']
    return ['How to enroll?', 'How much is the tuition?', 'Are scholarships available?']
  }

  // Enrollment
  if (q.includes('enroll') || a.includes('enrollment form') || a.includes('registrar')) {
    return ['What are the enrollment requirements?', 'When is the enrollment period?', 'How much is the tuition?']
  }

  // Tuition / fees / payment
  if (q.includes('tuition') || q.includes('fee') || a.includes('installment') || a.includes('cashier')) {
    return ['Are there installment payment options?', 'What are the miscellaneous fees?', 'Are scholarships available?']
  }

  // Scholarship
  if (q.includes('scholarship') || a.includes('scholarship')) {
    return ['What are the scholarship requirements?', 'How do I apply for a scholarship?', 'What types of scholarships are available?']
  }

  // TOR / transcript / credentials
  if (q.includes('tor') || q.includes('transcript') || a.includes('transcript')) {
    return ['How long does it take to get my TOR?', 'What are the requirements for TOR?', 'What are the office hours?']
  }

  // Library
  if (q.includes('library') || a.includes('library card') || a.includes('library')) {
    return ['What are the library hours?', 'How do I get a library card?', 'What are the library rules?']
  }

  // Office hours / contacts
  if (q.includes('office') || q.includes('contact') || a.includes('office hours')) {
    return ['Where is the registrar office?', 'What are the library hours?', 'How to contact the accounting office?']
  }

  // Discipline / penalties / handbook
  if (q.includes('penalt') || q.includes('disci') || q.includes('handbook') || a.includes('violation')) {
    return ['What are the other school rules?', 'What are the attendance policies?', 'How many absences are allowed?']
  }

  // Absence / attendance
  if (q.includes('absent') || q.includes('attendance') || a.includes('absent') || a.includes('consecutive')) {
    return ['What are the grading policies?', 'What are the school rules?', 'How do I request a leave of absence?']
  }

  return []
}

export default function ChatPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [messages, setMessages]             = useState([])
  const [input, setInput]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [darkMode, setDarkMode]             = useState(() => localStorage.getItem('theme') !== 'light')
  const [lang, setLang]                     = useState(() => localStorage.getItem('lang') || 'en')
  const [isListening, setIsListening]       = useState(false)
  const [voiceInterim, setVoiceInterim]     = useState('')
  const [concernModal, setConcernModal]     = useState(null) // { question, msgIndex }
  const [concernForm, setConcernForm]       = useState({ name: '', email: '', message: '' })
  const [liveChats, setLiveChats]           = useState({})
  const liveChatRefs = useRef({})
  // { [msgIndex]: { intervalId, lastMsgId, chatId } }
  const [concernSending, setConcernSending] = useState(false)
  // ── User auth ──
  const [user, setUser]             = useState(null)
  const [userToken, setUserToken]   = useState(() => localStorage.getItem('user_token') || '')
  const [loginModal, setLoginModal] = useState(false)
  const [loginForm, setLoginForm]   = useState({ email: '', name: '', password: '', mode: 'login' })
  const [loginLoading, setLoginLoading] = useState(false)
  const [showMyChats, setShowMyChats]   = useState(false)
  const [myChats, setMyChats]           = useState([])
  const [expandedChat, setExpandedChat] = useState(null)
  const [chatMsgs, setChatMsgs]         = useState([])
  const [myChatInput, setMyChatInput]   = useState('')
  const [myChatSending, setMyChatSending] = useState(false)
  const [loginError, setLoginError]     = useState('')
  const [chatStartedMsgs, setChatStartedMsgs] = useState(new Set())
  const [unreadLive, setUnreadLive]     = useState(0)
  const audioCtxRef                     = useRef(null)
  const myChatPollRef = useRef({ intervalId: null, lastMsgId: 0, chatId: null })
  const myChatBottomRef = useRef(null)
  const heartbeatRef = useRef({})   // { [chatId]: intervalId }
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

  // Cleanup all polling on unmount
  useEffect(() => () => {
    Object.values(liveChatRefs.current).forEach(r => clearInterval(r?.intervalId))
    Object.values(heartbeatRef.current).forEach(id => clearInterval(id))
    stopMyChatPolling()
  }, [])

  // Stop My Chats polling when panel closes
  useEffect(() => {
    if (!showMyChats) {
      stopMyChatPolling()
      setExpandedChat(null)
    }
  }, [showMyChats])

  // Auto-scroll My Chats messages when new ones arrive
  useEffect(() => {
    myChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs])

  // Validate stored user token on mount
  useEffect(() => {
    if (!userToken) return
    axios.get('/api/user/me', { headers: { Authorization: `Bearer ${userToken}` } })
      .then(res => setUser(res.data))
      .catch(() => { localStorage.removeItem('user_token'); setUserToken('') })
  }, [])

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Voice input is not supported in this browser. Please use Google Chrome.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      setVoiceInterim('')
      return
    }

    const recognition = new SR()
    recognition.lang            = lang === 'fil' ? 'fil-PH' : 'en-US'
    recognition.interimResults  = true   // show live transcript while speaking
    recognition.continuous      = false
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      let interim = ''
      let final   = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final   += e.results[i][0].transcript
        else                      interim += e.results[i][0].transcript
      }
      setVoiceInterim(interim)
      if (final) {
        setInput(prev => prev ? prev + ' ' + final.trim() : final.trim())
        setVoiceInterim('')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setVoiceInterim('')
      textareaRef.current?.focus()
    }

    recognition.onerror = (e) => {
      setIsListening(false)
      setVoiceInterim('')
      if (e.error === 'not-allowed') {
        alert('Microphone access was denied. Please click the lock icon in your browser address bar and allow microphone access, then try again.')
      } else if (e.error === 'no-speech') {
        // silent — user just didn't say anything
      } else if (e.error === 'network') {
        alert('Voice input requires an internet connection. Please check your connection and try again.')
      } else {
        alert(`Voice input error: "${e.error}". Please try again.`)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
    } catch (err) {
      console.warn('Voice recognition start failed:', err)
      setIsListening(false)
    }
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
      const followups = res.data.followups?.length > 0
        ? res.data.followups
        : getFollowups(question, res.data.answer)
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

  // ── notification helpers ──────────────────────────────────────────────────────
  function initAudioCtx() {
    // Must be called during a user gesture so the context starts in 'running' state
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      audioCtxRef.current.resume()
    } catch {}
  }

  function playPing() {
    try {
      const ctx = audioCtxRef.current
      if (!ctx) return
      ctx.resume().then(() => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'; osc.frequency.value = 880
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
      })
    } catch {}
  }

  function notifyUser(senderName) {
    setUnreadLive(n => n + 1)
    playPing()
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification('KCCSmartInfoX — Live Support', {
        body: `${senderName} replied to your message`,
        icon: '/favicon.ico',
      })
    }
  }

  function requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  // ── User Auth ─────────────────────────────────────────────────────────────────

  function userAuthHeader() {
    return { Authorization: `Bearer ${localStorage.getItem('user_token') || ''}` }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoginLoading(true)
    try {
      const isLogin = loginForm.mode === 'login'
      const path = isLogin ? '/api/user/login' : '/api/user/register'
      const body = isLogin
        ? { email: loginForm.email.trim(), password: loginForm.password }
        : { email: loginForm.email.trim(), name: loginForm.name.trim(), password: loginForm.password }
      const res = await axios.post(path, body)
      const { token } = res.data
      localStorage.setItem('user_token', token)
      setUserToken(token)
      const me = await axios.get('/api/user/me', { headers: { Authorization: `Bearer ${token}` } })
      setUser(me.data)
      setLoginModal(false)
      setLoginForm({ email: '', name: '', password: '', mode: 'login' })
      requestNotifPermission()
    } catch (err) {
      setLoginError(err.response?.data?.detail || 'Failed. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('user_token')
    setUserToken('')
    setUser(null)
    setShowMyChats(false)
    setLiveChats({})
    Object.values(liveChatRefs.current).forEach(r => clearInterval(r?.intervalId))
    liveChatRefs.current = {}
    Object.values(heartbeatRef.current).forEach(id => clearInterval(id))
    heartbeatRef.current = {}
  }

  async function loadMyChats() {
    try {
      const res = await axios.get('/api/user/live-chats', { headers: userAuthHeader() })
      setMyChats(res.data)
    } catch {}
  }

  function stopMyChatPolling() {
    const chatId = myChatPollRef.current.chatId
    clearInterval(myChatPollRef.current.intervalId)
    myChatPollRef.current = { intervalId: null, lastMsgId: 0, chatId: null }
    if (chatId) stopHeartbeat(chatId)
  }

  function startMyChatPolling(chatId, lastId) {
    stopMyChatPolling()
    myChatPollRef.current = { intervalId: null, lastMsgId: lastId, chatId }
    const ivId = setInterval(async () => {
      const ref = myChatPollRef.current
      if (!ref.chatId) return
      try {
        const res = await axios.get(`/api/live-chat/${ref.chatId}/messages?offset=${ref.lastMsgId}`)
        if (res.data.messages.length > 0) {
          const lastMsg = res.data.messages[res.data.messages.length - 1]
          myChatPollRef.current = { ...myChatPollRef.current, lastMsgId: lastMsg.id }
          setChatMsgs(prev => [...prev, ...res.data.messages])
        }
        if (res.data.chat_status === 'closed') {
          const closedId = ref.chatId
          stopMyChatPolling()
          stopHeartbeat(closedId)
          setMyChats(prev => prev.map(c => c.id === closedId ? { ...c, status: 'closed' } : c))
        }
      } catch {}
    }, 4000)
    myChatPollRef.current.intervalId = ivId
  }

  // Reopen a chat from My Chats history as the floating Live Support panel
  const RESTORED_KEY = 9999
  async function reopenInFloatingPanel(chatId) {
    initAudioCtx()  // user gesture here — warm up AudioContext
    // Clean up any previously restored chat slot
    if (liveChatRefs.current[RESTORED_KEY]) {
      clearInterval(liveChatRefs.current[RESTORED_KEY].intervalId)
      stopHeartbeat(liveChatRefs.current[RESTORED_KEY].chatId)
    }
    try {
      const res = await axios.get(`/api/live-chat/${chatId}/messages?offset=0`)
      const msgs = res.data.messages || []
      const lastId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0
      liveChatRefs.current[RESTORED_KEY] = { chatId, lastMsgId: lastId, intervalId: null }
      setLiveChats(p => ({ ...p, [RESTORED_KEY]: {
        phase: 'chat',
        chatId,
        messages: msgs,
        inputText: '',
        sending: false,
        closed: false,
        adminJoined: res.data.admin_opened || false,
        openedBy: res.data.opened_by || null,
        feedbackSubmitted: false,
        feedbackRating: 0,
        feedbackText: '',
      }}))
      const intervalId = setInterval(() => pollLiveChat(RESTORED_KEY), 4000)
      liveChatRefs.current[RESTORED_KEY].intervalId = intervalId
      startHeartbeat(chatId)
      setShowMyChats(false)
    } catch {}
  }

  async function loadChatMessages(chatId, chatStatus) {
    if (expandedChat === chatId) {
      setExpandedChat(null)
      stopMyChatPolling()
      return
    }
    try {
      const res = await axios.get(`/api/user/live-chats/${chatId}/messages`, { headers: userAuthHeader() })
      const msgs = res.data.messages
      setChatMsgs(msgs)
      setExpandedChat(chatId)
      setMyChatInput('')
      if (chatStatus === 'active') {
        const lastId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0
        startMyChatPolling(chatId, lastId)
        startHeartbeat(chatId)
      }
    } catch {}
  }

  async function sendReplyFromHistory(chatId) {
    if (!myChatInput.trim() || myChatSending) return
    setMyChatSending(true)
    try {
      const res = await axios.post(`/api/live-chat/${chatId}/message`, { content: myChatInput.trim() })
      myChatPollRef.current = { ...myChatPollRef.current, lastMsgId: res.data.id }
      setChatMsgs(prev => [...prev, res.data])
      setMyChatInput('')
    } catch {}
    finally { setMyChatSending(false) }
  }

  // ── Live Chat ─────────────────────────────────────────────────────────────────

  function startHeartbeat(chatId) {
    if (heartbeatRef.current[chatId]) clearInterval(heartbeatRef.current[chatId])
    heartbeatRef.current[chatId] = setInterval(() => {
      axios.put(`/api/live-chat/${chatId}/heartbeat`).catch(() => {})
    }, 20000)
    // send one immediately on start
    axios.put(`/api/live-chat/${chatId}/heartbeat`).catch(() => {})
  }

  function stopHeartbeat(chatId) {
    if (heartbeatRef.current[chatId]) {
      clearInterval(heartbeatRef.current[chatId])
      delete heartbeatRef.current[chatId]
    }
  }

  async function openLiveChat(msgIndex, relatedQuestion) {
    if (!user) return
    // Prevent multiple simultaneous live chats
    if (Object.keys(liveChats).length > 0) return
    initAudioCtx()  // warm up AudioContext during user gesture so pings work later
    setChatStartedMsgs(prev => new Set([...prev, msgIndex]))
    liveChatRefs.current[msgIndex] = { lastMsgId: 0, intervalId: null, chatId: null }
    setLiveChats(p => ({ ...p, [msgIndex]: { phase: 'connecting', relatedQuestion, messages: [], inputText: '', sending: false, closed: false, adminJoined: false, openedBy: null, feedbackSubmitted: false, feedbackRating: 0, feedbackText: '' } }))
    try {
      const res = await axios.post('/api/live-chat/start',
        { related_question: relatedQuestion || null },
        { headers: userAuthHeader() }
      )
      const chatId = res.data.chat_id
      liveChatRefs.current[msgIndex].chatId = chatId
      // fetch initial messages (greeting)
      const firstRes = await axios.get(`/api/live-chat/${chatId}/messages?offset=0`)
      const initMsgs = firstRes.data.messages || []
      if (initMsgs.length > 0) {
        liveChatRefs.current[msgIndex].lastMsgId = initMsgs[initMsgs.length - 1].id
      }
      setLiveChats(p => ({ ...p, [msgIndex]: { ...p[msgIndex], phase: 'chat', chatId, messages: initMsgs } }))
      // start polling + heartbeat
      const intervalId = setInterval(() => pollLiveChat(msgIndex), 4000)
      liveChatRefs.current[msgIndex].intervalId = intervalId
      startHeartbeat(chatId)
    } catch {
      setLiveChats(p => { const n = { ...p }; delete n[msgIndex]; return n })
      alert('Failed to start chat. Please try again.')
    }
  }

  async function pollLiveChat(msgIndex) {
    // Read chatId + lastMsgId from ref to avoid stale closure
    const ref = liveChatRefs.current[msgIndex]
    if (!ref?.chatId) return
    try {
      const res = await axios.get(`/api/live-chat/${ref.chatId}/messages?offset=${ref.lastMsgId}`)
      if (res.data.messages.length > 0) {
        const lastId = res.data.messages[res.data.messages.length - 1].id
        liveChatRefs.current[msgIndex] = { ...ref, lastMsgId: lastId }
        const adminMsgs = res.data.messages.filter(m => m.sender === 'admin')
        if (adminMsgs.length > 0) {
          const senderName = res.data.opened_by || 'Admin'
          notifyUser(senderName)
        }
        setLiveChats(p => ({
          ...p,
          [msgIndex]: { ...p[msgIndex], messages: [...(p[msgIndex]?.messages || []), ...res.data.messages] }
        }))
      }
      if (res.data.admin_opened) {
        const name = res.data.opened_by || 'Admin'
        setLiveChats(p => {
          const wasJoined = p[msgIndex]?.adminJoined
          if (!wasJoined) notifyUser(name)  // ping once when staff first joins
          return { ...p, [msgIndex]: { ...p[msgIndex], adminJoined: true, openedBy: name } }
        })
      }
      if (res.data.chat_status === 'closed') {
        clearInterval(ref.intervalId)
        stopHeartbeat(ref.chatId)
        setLiveChats(p => ({ ...p, [msgIndex]: { ...p[msgIndex], closed: true } }))
      }
    } catch { /* silent */ }
  }

  async function sendLiveChatMessage(msgIndex) {
    const lc = liveChats[msgIndex]
    if (!lc?.inputText?.trim() || lc.sending) return
    const ref = liveChatRefs.current[msgIndex]
    if (!ref?.chatId) return
    setLiveChats(p => ({ ...p, [msgIndex]: { ...p[msgIndex], sending: true } }))
    try {
      const res = await axios.post(`/api/live-chat/${ref.chatId}/message`, { content: lc.inputText.trim() })
      liveChatRefs.current[msgIndex] = { ...ref, lastMsgId: res.data.id }
      setLiveChats(p => ({
        ...p,
        [msgIndex]: { ...p[msgIndex], inputText: '', sending: false,
                      messages: [...(p[msgIndex]?.messages || []), res.data] }
      }))
    } catch {
      setLiveChats(p => ({ ...p, [msgIndex]: { ...p[msgIndex], sending: false } }))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

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
              onClick={() => setShowAnnouncements(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                darkMode ? 'bg-white/8 hover:bg-white/15 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <Megaphone size={13} />
              Announcements
            </button>
          </div>

          {/* User account pill */}
          {user ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowMyChats(v => !v); if (!showMyChats) loadMyChats(); setUnreadLive(0) }}
                title="My Chats"
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  darkMode ? 'bg-white/8 hover:bg-white/15 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <History size={12} />
                <span className="hidden sm:inline max-w-[70px] truncate">{user.name}</span>
                {unreadLive > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadLive > 9 ? '9+' : unreadLive}
                  </span>
                )}
              </button>
              <button
                onClick={handleLogout}
                title="Logout"
                className={`p-1.5 rounded-lg transition-all ${darkMode ? 'hover:bg-white/10 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLoginModal(true)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                darkMode ? 'text-kcc-gold hover:bg-white/8' : 'text-kcc-blue hover:bg-blue-50'
              }`}
            >
              Login
            </button>
          )}
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
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-2 flex-wrap">
                        {user && !chatStartedMsgs.has(i) && Object.keys(liveChats).length === 0 && (
                          <button
                            onClick={() => openLiveChat(i, messages[i - 1]?.text || '')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition"
                          >
                            <MessageCircle size={11} /> Chat with Admin
                          </button>
                        )}
                        {user && chatStartedMsgs.has(i) && !liveChats[i] && (
                          <button
                            onClick={() => { setShowMyChats(true); loadMyChats() }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                              darkMode ? 'border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10' : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            <History size={11} /> View in My Chats
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setConcernModal({ question: messages[i - 1]?.text || msg.text, msgIndex: i })
                            setConcernForm({ name: '', email: '', message: messages[i - 1]?.text || '' })
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-kcc-blue text-white rounded-lg text-xs font-medium hover:bg-kcc-dark transition"
                        >
                          <AlertTriangle size={11} /> Submit a Concern
                        </button>
                      </div>
                      {!user && (
                        <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          <button onClick={() => setLoginModal(true)} className="text-kcc-blue hover:underline">Login</button>
                          {' '}to chat with admin in real-time
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live chat status badge (inline) */}
            {msg.role === 'ai' && msg.is_answered === false && liveChats[i] && (
              <div className={`ml-9 mt-2 max-w-[82%] rounded-xl border px-3.5 py-2.5 text-xs flex items-center gap-2 ${
                darkMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-white border-gray-200 shadow-sm text-gray-500'
              }`}>
                {liveChats[i].phase === 'connecting' ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-green-500 border-t-transparent animate-spin flex-shrink-0" />
                    Connecting to support...
                  </>
                ) : liveChats[i].closed ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                    Chat ended
                  </>
                ) : liveChats[i].adminJoined ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                    <span className="text-green-500 font-medium">{liveChats[i].openedBy || 'Admin'} is here</span>
                    <span className={`ml-auto text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>See panel ↘</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
                    <span className="text-yellow-500">Waiting for admin...</span>
                    <span className={`ml-auto text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>See panel ↘</span>
                  </>
                )}
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
                    disabled={loading}
                    className={`text-xs px-3 py-1 rounded-full border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:border-kcc-gold/60 hover:text-kcc-gold ${
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
            onFocus={() => setShowMyChats(false)}
            disabled={loading}
            placeholder={
              loading
                ? (lang === 'fil' ? 'Naghihintay ng sagot...' : 'Waiting for response...')
                : isListening
                  ? (voiceInterim || (lang === 'fil' ? '🎤 Nakikinig...' : '🎤 Listening...'))
                  : (lang === 'fil' ? 'Magtanong tungkol sa KCC...' : 'Ask anything about KCC...')
            }
            rows={1}
            maxLength={500}
            className={`flex-1 bg-transparent text-sm resize-none outline-none max-h-28 py-0.5 transition-opacity ${
              loading
                ? 'opacity-40 cursor-not-allowed'
                : darkMode ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
            }`}
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={toggleVoice}
            disabled={loading}
            title={isListening ? 'Stop listening' : 'Voice input'}
            className={`p-1.5 rounded-xl transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
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

        {/* Live interim voice transcript */}
        {isListening && voiceInterim && (
          <div className={`mt-1.5 px-3 py-1 rounded-xl text-xs italic flex items-center gap-1.5 ${
            darkMode ? 'text-gray-400 bg-white/5' : 'text-gray-500 bg-gray-100'
          }`}>
            <span className="text-red-400 animate-pulse">●</span>
            {voiceInterim}
          </div>
        )}

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
      </nav>

      {/* ── Panels ── */}
      {showAnnouncements && <div className="animate-slideDown"><AnnouncementsPanel onClose={() => setShowAnnouncements(false)} /></div>}

      {/* ── Floating Live Chat Panel ── */}
      {(() => {
        const idx = Object.keys(liveChats).find(k => liveChats[k]?.phase === 'chat')
        if (idx == null) return null
        const i   = parseInt(idx)
        const lc  = liveChats[i]
        const ref = liveChatRefs.current[i]
        return (
          <div className={`
            fixed z-40 flex flex-col overflow-hidden shadow-2xl
            bottom-0 left-0 right-0 h-[72vh] rounded-t-3xl
            md:bottom-4 md:right-4 md:left-auto md:w-96 md:h-[520px] md:rounded-2xl
            ${darkMode ? 'bg-[#0d1426] border border-white/10' : 'bg-white border border-gray-200'}
          `}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 flex-shrink-0 border-b ${
              darkMode ? 'border-white/10' : 'border-gray-100'
            }`}>
              {/* Drag handle (mobile) */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300/50 md:hidden" />
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className={lc.closed ? 'text-gray-400' : 'text-green-500'} />
                <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-kcc-dark'}`}>
                  Live Support
                </p>
                {!lc.closed && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
              </div>
              <div className="flex items-center gap-2">
                {lc.closed ? (
                  <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Chat ended</span>
                ) : lc.adminJoined ? (
                  <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {lc.openedBy || 'Admin'} is here
                  </span>
                ) : (
                  <span className="text-xs text-yellow-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    Waiting...
                  </span>
                )}
                <button
                  onClick={() => {
                    clearInterval(liveChatRefs.current[i]?.intervalId)
                    stopHeartbeat(ref?.chatId)
                    setLiveChats(p => { const n = { ...p }; delete n[i]; return n })
                    // Open My Chats so user can continue from history
                    loadMyChats()
                    setShowMyChats(true)
                  }}
                  className={`p-1 rounded-lg transition ${darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                  title="Minimise to My Chats"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {lc.messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-sm px-3.5 py-2 rounded-2xl max-w-[78%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-kcc-blue text-white rounded-br-sm'
                      : darkMode ? 'bg-white/10 text-gray-200 rounded-bl-sm' : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                  }`}>{m.content}</span>
                </div>
              ))}

              {/* Feedback after close */}
              {lc.closed && (
                <div className="pt-2">
                  <div className={`h-px mb-4 ${darkMode ? 'bg-white/10' : 'bg-gray-100'}`} />
                  {!lc.feedbackSubmitted ? (
                    <div className={`rounded-2xl p-4 ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
                      <p className={`text-sm font-semibold text-center mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        How was your experience? ⭐
                      </p>
                      <div className="flex justify-center gap-2 mb-3">
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            onClick={() => setLiveChats(p => ({ ...p, [i]: { ...p[i], feedbackRating: star } }))}
                            className={`text-2xl transition-transform hover:scale-110 ${
                              (lc.feedbackRating || 0) >= star ? 'text-yellow-400' : (darkMode ? 'text-gray-600' : 'text-gray-300')
                            }`}
                          >★</button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Leave a comment (optional)"
                        value={lc.feedbackText || ''}
                        onChange={e => setLiveChats(p => ({ ...p, [i]: { ...p[i], feedbackText: e.target.value } }))}
                        className={`w-full text-xs rounded-xl px-3 py-2 outline-none border resize-none mb-3 ${
                          darkMode ? 'bg-white/10 border-white/10 text-gray-200 placeholder-gray-500' : 'border-gray-200 text-gray-700 placeholder-gray-400'
                        }`}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setLiveChats(p => ({ ...p, [i]: { ...p[i], feedbackSubmitted: true } }))}
                          className={`text-xs px-3 py-1.5 rounded-xl border transition ${darkMode ? 'border-white/10 text-gray-400 hover:text-gray-300' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                        >Skip</button>
                        <button
                          disabled={!lc.feedbackRating}
                          onClick={async () => {
                            if (!ref?.chatId || !lc.feedbackRating) return
                            try {
                              await axios.post(`/api/live-chat/${ref.chatId}/feedback`, {
                                rating: lc.feedbackRating,
                                feedback_text: lc.feedbackText || null,
                              })
                              setLiveChats(p => ({ ...p, [i]: { ...p[i], feedbackSubmitted: true } }))
                            } catch {}
                          }}
                          className="text-xs px-4 py-1.5 bg-green-600 text-white rounded-xl disabled:opacity-40 hover:bg-green-700 transition font-medium"
                        >Submit</button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-center text-sm py-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      Thank you for your feedback! 🙏
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Input */}
            {!lc.closed && (
              <div className={`border-t px-3 py-3 flex gap-2 flex-shrink-0 ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={lc.inputText || ''}
                  onChange={e => setLiveChats(p => ({ ...p, [i]: { ...p[i], inputText: e.target.value } }))}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendLiveChatMessage(i) } }}
                  className={`flex-1 text-sm rounded-xl px-3.5 py-2 outline-none border transition focus:border-green-500 ${
                    darkMode ? 'bg-white/10 border-white/10 text-white placeholder-gray-500' : 'border-gray-200 text-gray-700 placeholder-gray-400'
                  }`}
                />
                <button
                  onClick={() => sendLiveChatMessage(i)}
                  disabled={lc.sending || !lc.inputText?.trim()}
                  className="px-3 py-2 bg-green-600 text-white rounded-xl disabled:opacity-40 hover:bg-green-700 transition flex-shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        )
      })()}

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

      {/* ── Login / Register Modal ── */}
      {loginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-[#1a2236]' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <img src={kccLogo} alt="KCC" className="w-7 h-7 rounded-full object-cover" />
                <div>
                  <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-kcc-dark'}`}>KCCSmartInfoX</p>
                  <p className="text-[11px] text-gray-400">Student Account</p>
                </div>
              </div>
              <button onClick={() => { setLoginModal(false); setLoginError('') }} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div className={`flex rounded-xl p-1 mb-5 ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
              {['login', 'register'].map(m => (
                <button
                  key={m}
                  onClick={() => { setLoginForm(p => ({ ...p, mode: m })); setLoginError('') }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    loginForm.mode === m
                      ? 'bg-kcc-blue text-white shadow-sm'
                      : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              {loginError && (
                <div className="flex items-start gap-2 text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">
                  <span className="mt-px flex-shrink-0">⚠</span>
                  <span>{loginError}</span>
                </div>
              )}
              <input
                type="email"
                required
                placeholder="Email address"
                value={loginForm.email}
                onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                style={{ color: darkMode ? '#fff' : '#374151', backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#fff' }}
                className="w-full text-sm border rounded-xl px-3.5 py-2.5 outline-none focus:border-kcc-blue transition border-gray-200"
              />
              {loginForm.mode === 'register' && (
                <input
                  type="text"
                  required
                  placeholder="Display name"
                  value={loginForm.name}
                  onChange={e => setLoginForm(p => ({ ...p, name: e.target.value }))}
                  style={{ color: darkMode ? '#fff' : '#374151', backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#fff' }}
                  className="w-full text-sm border rounded-xl px-3.5 py-2.5 outline-none focus:border-kcc-blue transition border-gray-200"
                />
              )}
              <input
                type="password"
                required
                placeholder="Password"
                value={loginForm.password}
                onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                style={{ color: darkMode ? '#fff' : '#374151', backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#fff' }}
                className="w-full text-sm border rounded-xl px-3.5 py-2.5 outline-none focus:border-kcc-blue transition border-gray-200"
              />
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 rounded-xl text-sm bg-kcc-blue text-white font-semibold hover:bg-kcc-dark disabled:opacity-50 transition"
              >
                {loginLoading ? (loginForm.mode === 'login' ? 'Logging in...' : 'Creating account...') : (loginForm.mode === 'login' ? 'Login' : 'Create Account')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── My Chats Panel ── */}
      {showMyChats && user && (
        <div className={`fixed top-0 right-0 h-full w-80 z-40 shadow-2xl flex flex-col animate-slideDown ${darkMode ? 'bg-[#0d1426] border-l border-white/10' : 'bg-white border-l border-gray-200'}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
            <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-kcc-dark'}`}>My Chats</p>
            <button onClick={() => setShowMyChats(false)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {myChats.length === 0 ? (
              <div className="text-center py-10">
                <MessageCircle size={28} className="mx-auto mb-2 text-gray-300" />
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No conversations yet</p>
              </div>
            ) : (
              myChats.map(c => {
                const isActive   = c.status === 'active'
                const isExpanded = expandedChat === c.id
                return (
                  <div key={c.id} className={`rounded-xl border overflow-hidden ${
                    isActive
                      ? darkMode ? 'bg-green-900/10 border-green-500/30' : 'bg-green-50 border-green-200'
                      : darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'
                  }`}>
                    {/* Header row */}
                    <button
                      onClick={() => { if (isActive) { reopenInFloatingPanel(c.id); setUnreadLive(0) } else loadChatMessages(c.id, c.status) }}
                      className="w-full px-3 py-2.5 text-left flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                            isActive
                              ? 'bg-green-500/20 text-green-400'
                              : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                            {c.status}
                          </span>
                          <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {c.related_question && (
                          <p className={`text-xs mt-1 truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {c.related_question}
                          </p>
                        )}
                        <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                          {c.message_count} message{c.message_count !== 1 ? 's' : ''}
                          {isActive && <span className="ml-1.5 text-green-400 font-medium">• tap to open chat</span>}
                        </p>
                      </div>
                      {isActive ? (
                        <MessageCircle size={13} className="text-green-400 flex-shrink-0 ml-2" />
                      ) : isExpanded
                        ? <ChevronUp size={12} className="text-gray-400 flex-shrink-0 ml-2" />
                        : <ChevronDown size={12} className="text-gray-400 flex-shrink-0 ml-2" />}
                    </button>

                    {/* Expanded messages */}
                    {isExpanded && (
                      <div className={`border-t flex flex-col ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
                        {/* Messages */}
                        <div className="px-3 py-2 space-y-1.5 max-h-52 overflow-y-auto">
                          {chatMsgs.map(m => (
                            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <span className={`text-[11px] px-2.5 py-1.5 rounded-xl max-w-[85%] leading-relaxed ${
                                m.sender === 'user'
                                  ? 'bg-kcc-blue text-white rounded-br-sm'
                                  : darkMode ? 'bg-white/10 text-gray-200 rounded-bl-sm' : 'bg-white text-gray-700 border border-gray-100 rounded-bl-sm'
                              }`}>{m.content}</span>
                            </div>
                          ))}
                          {!isActive && (
                            <p className={`text-center text-[10px] pt-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                              Chat ended by admin.
                            </p>
                          )}
                          <div ref={myChatBottomRef} />
                        </div>

                        {/* Reply input — only for active chats */}
                        {isActive && (
                          <div className={`border-t px-2 py-2 flex gap-1.5 ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
                            <input
                              type="text"
                              placeholder="Reply to admin..."
                              value={myChatInput}
                              onChange={e => setMyChatInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') sendReplyFromHistory(c.id) }}
                              style={{ color: darkMode ? '#fff' : '#374151' }}
                              className={`flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none border focus:border-green-500 transition ${
                                darkMode ? 'bg-white/10 border-white/10 placeholder-gray-500' : 'border-gray-200 placeholder-gray-400'
                              }`}
                            />
                            <button
                              onClick={() => sendReplyFromHistory(c.id)}
                              disabled={myChatSending || !myChatInput.trim()}
                              className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg disabled:opacity-40 hover:bg-green-700 transition flex-shrink-0"
                            >
                              <Send size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
