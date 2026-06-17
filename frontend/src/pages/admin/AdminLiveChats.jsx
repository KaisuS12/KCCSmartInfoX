import { useState, useEffect, useRef } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import { MessageCircle, Send, X, Clock, User, Mail, Smartphone, Monitor, Tablet } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const DEVICE_ICON = {
  Mobile:  <Smartphone size={11} />,
  Tablet:  <Tablet size={11} />,
  Desktop: <Monitor size={11} />,
}

const ONLINE_DOT = {
  online:  'bg-green-400',
  away:    'bg-yellow-400',
  offline: 'bg-gray-300',
}

const ONLINE_LABEL = {
  online:  'Online',
  away:    'Away',
  offline: 'Offline',
}

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

function timeStr(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dateStr(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr(ts)
}

export default function AdminLiveChats() {
  const [sessions, setSessions]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [messages, setMessages]   = useState([])
  const [replyText, setReplyText] = useState('')
  const [sending, setSending]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('active')
  const lastMsgIdRef              = useRef(0)
  const sessionIntervalRef        = useRef(null)
  const msgIntervalRef            = useRef(null)
  const messagesEndRef            = useRef(null)
  const replyInputRef             = useRef(null)

  const activeSession = sessions.find(s => s.id === selected)
  const activeCnt     = sessions.filter(s => s.status === 'active').length

  useEffect(() => {
    fetchSessions()
    sessionIntervalRef.current = setInterval(fetchSessions, 4000)
    return () => clearInterval(sessionIntervalRef.current)
  }, [filter])

  useEffect(() => {
    clearInterval(msgIntervalRef.current)
    lastMsgIdRef.current = 0
    setMessages([])
    if (!selected) return
    fetchMessages()
    msgIntervalRef.current = setInterval(fetchMessages, 4000)
    return () => clearInterval(msgIntervalRef.current)
  }, [selected])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchSessions() {
    try {
      const res = await axios.get(`/api/admin/live-chats?status=${filter}`, { headers: authHeader() })
      setSessions(res.data)
    } catch {}
    finally { setLoading(false) }
  }

  async function fetchMessages() {
    if (!selected) return
    try {
      const res = await axios.get(`/api/admin/live-chats/${selected}/messages`, { headers: authHeader() })
      setMessages(res.data.messages)
    } catch {}
  }

  async function sendReply() {
    if (!replyText.trim() || !selected) return
    setSending(true)
    try {
      await axios.post(`/api/admin/live-chats/${selected}/message`, { content: replyText.trim() }, { headers: authHeader() })
      setReplyText('')
      fetchMessages()
      replyInputRef.current?.focus()
    } catch {
      toast.error('Failed to send message')
    } finally { setSending(false) }
  }

  async function closeChat(chatId) {
    try {
      await axios.put(`/api/admin/live-chats/${chatId}/close`, {}, { headers: authHeader() })
      toast.success('Chat closed')
      setSelected(null)
      fetchSessions()
    } catch {
      toast.error('Failed to close chat')
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 h-full flex flex-col gap-4" style={{ minHeight: 0 }}>

        {/* ── Page header ── */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-kcc-dark">Live Chats</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {activeCnt} active session{activeCnt !== 1 ? 's' : ''}
            </p>
          </div>
          <MessageCircle size={24} className="text-kcc-blue opacity-50" />
        </div>

        {/* ── Body ── */}
        <div className="flex gap-5 flex-1 min-h-0">

          {/* Left: session list */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 min-h-0">

            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-shrink-0">
              {['active', 'closed', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setSelected(null) }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                    filter === f
                      ? 'bg-kcc-blue text-white shadow-sm'
                      : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Session cards */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <p className="text-xs text-gray-400 text-center py-8">Loading...</p>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageCircle size={32} className="text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No {filter !== 'all' ? filter : ''} sessions</p>
                </div>
              ) : (
                sessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setSelected(s.id)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      selected === s.id
                        ? 'border-kcc-blue bg-blue-50 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative w-6 h-6 flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-kcc-blue/10 flex items-center justify-center">
                            <User size={11} className="text-kcc-blue" />
                          </div>
                          {s.status === 'active' && (
                            <span
                              title={ONLINE_LABEL[s.online_status] || 'Offline'}
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${ONLINE_DOT[s.online_status] || 'bg-gray-300'}`}
                            />
                          )}
                        </div>
                        <span className="font-semibold text-xs text-kcc-dark truncate">{s.user_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {s.device_type && (
                          <span title={s.device_type} className="text-gray-400">
                            {DEVICE_ICON[s.device_type] || <Monitor size={11} />}
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          s.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}>{s.status}</span>
                      </div>
                    </div>
                    {s.related_question && (
                      <p className="text-[10px] text-gray-400 truncate ml-8">Q: {s.related_question}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-gray-300 mt-1 ml-8">
                      <span>{s.message_count} msg{s.message_count !== 1 ? 's' : ''}</span>
                      {s.last_message_at && <><span>·</span><Clock size={8} /><span>{timeStr(s.last_message_at)}</span></>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: chat window */}
          <div className="flex-1 min-w-0 min-h-0">
            {selected && activeSession ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">

                {/* Header */}
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-kcc-blue/10 flex items-center justify-center">
                        <User size={14} className="text-kcc-blue" />
                      </div>
                      {activeSession.status === 'active' && (
                        <span
                          title={ONLINE_LABEL[activeSession.online_status] || 'Offline'}
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${ONLINE_DOT[activeSession.online_status] || 'bg-gray-300'}`}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-kcc-dark">{activeSession.user_name}</p>
                        {activeSession.status === 'active' && (
                          <span className={`text-[10px] font-medium ${
                            activeSession.online_status === 'online' ? 'text-green-500' :
                            activeSession.online_status === 'away'   ? 'text-yellow-500' : 'text-gray-400'
                          }`}>
                            · {ONLINE_LABEL[activeSession.online_status] || 'Offline'}
                          </span>
                        )}
                        {activeSession.device_type && (
                          <span title={activeSession.device_type} className="text-gray-400">
                            {DEVICE_ICON[activeSession.device_type] || <Monitor size={11} />}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1">
                        {activeSession.user_email
                          ? <><Mail size={9} />{activeSession.user_email}</>
                          : 'No email provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSession.related_question && (
                      <p className="hidden md:block text-[10px] text-gray-400 max-w-[180px] truncate bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                        Q: {activeSession.related_question}
                      </p>
                    )}
                    {activeSession.status === 'active'
                      ? <button
                          onClick={() => closeChat(selected)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 text-red-400 border border-red-100 rounded-lg hover:bg-red-100 transition"
                        ><X size={11} /> Close Chat</button>
                      : <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                          Closed {activeSession.closed_at ? dateStr(activeSession.closed_at) : ''}
                        </span>
                    }
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0">
                  {messages.length === 0
                    ? <p className="text-xs text-center text-gray-300 py-4">No messages yet</p>
                    : messages.map(m => (
                        <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            m.sender === 'admin'
                              ? 'bg-kcc-blue text-white rounded-br-sm'
                              : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                          }`}>
                            {m.content}
                            <p className={`text-[10px] mt-0.5 ${m.sender === 'admin' ? 'text-white/60' : 'text-gray-400'}`}>
                              {m.sender === 'admin' ? 'You' : activeSession.user_name} · {timeStr(m.sent_at)}
                            </p>
                          </div>
                        </div>
                      ))
                  }
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                {activeSession.status === 'active' ? (
                  <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
                    <input
                      ref={replyInputRef}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendReply())}
                      placeholder="Type a reply… (Enter to send)"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-kcc-blue transition placeholder-gray-300"
                    />
                    <button
                      onClick={sendReply}
                      disabled={sending || !replyText.trim()}
                      className="px-4 py-2 bg-kcc-blue text-white rounded-xl disabled:opacity-40 hover:bg-kcc-dark transition"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                    <p className="text-xs text-center text-gray-400">This chat has been closed</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                <MessageCircle size={36} className="text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400">Select a session to start chatting</p>
                <p className="text-xs text-gray-300 mt-1">Sessions appear here when users request live help</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  )
}
