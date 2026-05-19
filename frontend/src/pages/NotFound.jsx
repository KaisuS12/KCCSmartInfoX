import { useNavigate } from 'react-router-dom'
import { Home, MessageSquare } from 'lucide-react'
import kccLogo from '../assets/kcc-logo.png'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <img src={kccLogo} alt="KCC" className="w-16 h-16 rounded-full object-cover mb-6 shadow" />

      <div className="text-8xl font-black text-kcc-blue mb-2">404</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Page Not Found</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-5 py-2.5 bg-kcc-blue text-white rounded-xl text-sm font-medium hover:bg-kcc-dark transition"
        >
          <Home size={15} /> Go Home
        </button>
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 px-5 py-2.5 bg-kcc-gold text-kcc-dark rounded-xl text-sm font-medium hover:bg-yellow-400 transition"
        >
          <MessageSquare size={15} /> Open Chatbot
        </button>
      </div>

      <p className="text-gray-300 text-xs mt-12">KCCSmartInfoX — Kabankalan Catholic College</p>
    </div>
  )
}
