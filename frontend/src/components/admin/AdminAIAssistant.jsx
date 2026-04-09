import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, History, MessageSquare } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'

const API = 'http://localhost:8000/api'

const QUICK_CHIPS = [
  { label: '📊 Stats',             message: 'show me the dashboard stats' },
  { label: '❓ Unanswered',         message: 'show unanswered questions' },
  { label: '🔥 Top Questions',      message: 'show top asked questions' },
  { label: '➕ Add Knowledge',      message: 'add to knowledge base: ' },
  { label: '📁 Documents',          message: 'show knowledge base documents' },
  { label: '🏢 Office Processes',   message: 'show office processes' },
  { label: '👥 Subscribers',        message: 'show subscribers' },
  { label: '📢 Post Announcement',  message: 'post announcement: ' },
]

const ACTION_LABELS = {
  add_knowledge:        '➕ Added Knowledge',
  delete_knowledge:     '🗑️ Deleted Knowledge',
  post_announcement:    '📢 Posted Announcement',
  delete_announcement:  '🗑️ Deleted Announcement',
  get_stats:            '📊 Viewed Stats',
  get_unanswered:       '❓ Viewed Unanswered',
  get_top_questions:    '🔥 Viewed Top Questions',
  get_subscribers:      '👥 Viewed Subscribers',
  get_documents:        '📁 Viewed Documents',
  get_office_processes: '🏢 Viewed Office Processes',
}

const WELCOME = `Hi Admin! 👋 I'm your **AI Assistant**.

I can help you:
- **Add / delete** knowledge base entries
- **Show** documents, office processes, subscribers
- **Post / delete** announcements
- **View stats**, top questions, unanswered
- **Answer** any admin question

What can I do for you?`

export default function AdminAIAssistant() {
  const [open, setOpen]       = useState(false)
  const [tab, setTab]         = useState('chat')
  const [messages, setMessages] = useState([{ role: 'ai', text: WELCOME }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const bottomRef             = useRef(null)
  const inputRef              = useRef(null)

  useEffect(() => {
    if (open && tab === 'history') fetchHistory()
  }, [open, tab])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open && tab === 'chat') inputRef.current?.focus()
  }, [open, tab])

  async function fetchHistory() {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await axios.get(`${API}/admin/ai/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setHistory(res.data)
    } catch {}
  }

  async function sendMessage(text) {
    const msg = (text ?? input).trim()
    if (!msg) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await axios.post(
        `${API}/admin/ai/chat`,
        { message: msg },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setMessages(prev => [...prev, { role: 'ai', text: res.data.reply }])
      // refresh history badge silently
      fetchHistory()
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '❌ Something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  function handleChip(chip) {
    if (chip.message.endsWith(': ')) {
      setInput(chip.message)
      inputRef.current?.focus()
    } else {
      sendMessage(chip.message)
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Admin AI Assistant"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-xl hover:shadow-purple-500/50 hover:scale-110 transition-all duration-200 flex items-center justify-center"
        >
          <Bot size={24} />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Admin AI Assistant</p>
                <p className="text-xs text-purple-200">Powered by Groq</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-white/20 rounded-full p-1.5 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={() => setTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                tab === 'chat'
                  ? 'text-purple-700 border-b-2 border-purple-700 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare size={14} /> Chat
            </button>
            <button
              onClick={() => setTab('history')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                tab === 'history'
                  ? 'text-purple-700 border-b-2 border-purple-700 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <History size={14} />
              History
              {history.length > 0 && (
                <span className="ml-1 text-xs bg-purple-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                  {history.length}
                </span>
              )}
            </button>
          </div>

          {/* ── CHAT TAB ── */}
          {tab === 'chat' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'ai' && (
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                        <Bot size={14} className="text-purple-700" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-purple-600 text-white rounded-tr-none'
                          : 'bg-gray-100 text-gray-800 rounded-tl-none'
                      }`}
                    >
                      {m.role === 'ai' ? (
                        <ReactMarkdown
                          components={{
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1">{children}</ol>,
                            li: ({ children }) => <li className="ml-2">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      ) : (
                        m.text
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Bot size={14} className="text-purple-700" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick Action Chips */}
              <div className="px-3 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
                {QUICK_CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => handleChip(chip)}
                    className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-1 hover:bg-purple-100 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-200 flex gap-2 flex-shrink-0">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a command or question..."
                  className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:border-purple-400 bg-white text-gray-800 placeholder-gray-400"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {history.length === 0 ? (
                <div className="text-center text-gray-400 mt-16">
                  <History size={40} className="mx-auto mb-3 opacity-25" />
                  <p className="text-sm font-medium">No actions yet</p>
                  <p className="text-xs mt-1">Actions like adding knowledge or posting announcements will appear here.</p>
                </div>
              ) : (
                history.map(h => (
                  <div key={h.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">
                        {ACTION_LABELS[h.action] || h.action}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          h.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {h.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{h.details}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {new Date(
                        h.created_at.includes('T') || h.created_at.endsWith('Z')
                          ? h.created_at
                          : h.created_at.replace(' ', 'T') + 'Z'
                      ).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
