import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle, ChevronRight, Megaphone, ChevronDown, ChevronUp,
  DollarSign, BookOpen, Award, MapPin, Phone, Mail
} from 'lucide-react'
import axios from 'axios'
import kccLogo from '../assets/kcc-logo.png'

// ─── Office Process Data ───────────────────────────────────────────────────────
const OFFICES = [
  {
    id: 'cashier',
    icon: DollarSign,
    name: 'Cashier / Accounting',
    tagline: 'Payments, fees & receipts',
    sections: [
      {
        heading: 'How to Pay School Fees',
        steps: [
          'Go to the Cashier\'s Office during office hours (Mon–Fri 8AM–5PM).',
          'Present your Assessment Form / Statement of Account.',
          'Choose your payment option: full payment or installment plan.',
          'Pay the required amount. Official Receipt (OR) will be issued immediately.',
          'Keep your OR — it is required for clearance and enrollment.',
        ],
      },
      {
        heading: 'Payment Methods',
        steps: [
          'Cash payment at the Cashier\'s Window.',
          'Installment plan — inquire at the Accounting Office for terms.',
          'Scholarships & discounts are applied automatically — confirm with Accounting.',
        ],
      },
      {
        heading: 'Getting a Queue Number',
        steps: [
          'Proceed to the Cashier\'s Office.',
          'Get a queue number from the counter or guard on duty.',
          'Wait for your number to be called.',
          'Present your documents and proceed with payment.',
        ],
      },
    ],
  },
  {
    id: 'registrar',
    icon: BookOpen,
    name: 'Registrar\'s Office',
    tagline: 'Enrollment, TOR & records',
    sections: [
      {
        heading: 'Enrollment Process',
        steps: [
          'Secure an Enrollment Form from the Registrar\'s Office.',
          'Fill out the form completely and accurately.',
          'Submit required documents: Report Card, Birth Certificate, ID photo.',
          'Have your form assessed and get your Statement of Account.',
          'Pay the required fees at the Cashier\'s Office.',
          'Return your Official Receipt to the Registrar to receive your Class Schedule and Student ID.',
        ],
      },
      {
        heading: 'How to Request a TOR',
        steps: [
          'Visit the Registrar\'s Office and request a Transcript of Records (TOR) form.',
          'Fill out the form and indicate the purpose (e.g., employment, further studies).',
          'Pay the required fee at the Cashier\'s Office.',
          'Submit the Official Receipt to the Registrar.',
          'Wait for processing — typically 3–5 working days.',
          'Claim your TOR on the specified release date.',
        ],
      },
      {
        heading: 'Other Documents',
        steps: [
          'Certifications (Good Moral, Enrolment, Grades) — request at the Registrar\'s window.',
          'Diploma — available upon graduation; inquire for release schedule.',
          'For transferees: present Transfer Credentials and Honorable Dismissal.',
        ],
      },
    ],
  },
  {
    id: 'scholarship',
    icon: Award,
    name: 'Scholarship Office',
    tagline: 'Financial aid & grants',
    sections: [
      {
        heading: 'Types of Scholarships',
        steps: [
          'Academic Scholarship — for students with outstanding grades (GWA 1.0–1.5).',
          'Government Scholarships — CHED, UNIFAST, TUPAD beneficiaries.',
          'Institutional Grants — partial discounts for deserving students.',
          'Sports & Cultural Grants — for varsity athletes and cultural performers.',
        ],
      },
      {
        heading: 'Application Requirements',
        steps: [
          'Accomplished Scholarship Application Form (from Scholarship Office).',
          'Latest Report Card / Grade Sheet with qualifying GWA.',
          'Certificate of Good Moral Character.',
          'Copy of Enrollment Form / Registration.',
          'Any supporting documents required by the specific scholarship.',
        ],
      },
      {
        heading: 'Application Process',
        steps: [
          'Get an application form from the Scholarship Office.',
          'Fill out the form and attach all required documents.',
          'Submit to the Scholarship Office on or before the deadline.',
          'Wait for evaluation — results are posted on the bulletin board.',
          'If approved, report to Accounting for discount application.',
        ],
      },
      {
        heading: 'Scholarship Renewal',
        steps: [
          'Maintain the required GWA each semester.',
          'Submit a renewal form every enrollment period.',
          'Failure to meet GWA requirements results in cancellation.',
        ],
      },
    ],
  },
]

// ─── Office Card Component ─────────────────────────────────────────────────────
function OfficeCard({ office }) {
  const [open, setOpen] = useState(false)
  const Icon = office.icon

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
      open ? 'border-kcc-gold/60 bg-kcc-blue/20' : 'border-kcc-blue/30 bg-kcc-blue/10 hover:border-kcc-gold/40'
    }`}>
      {/* Card Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-kcc-gold/20 flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-kcc-gold" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{office.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">{office.tagline}</p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          {open
            ? <ChevronUp size={18} className="text-kcc-gold" />
            : <ChevronDown size={18} className="text-gray-400" />
          }
        </div>
      </button>

      {/* Expanded Content */}
      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-kcc-blue/30 pt-4">
          {office.sections.map((section, si) => (
            <div key={si}>
              <p className="text-kcc-gold text-xs font-semibold uppercase tracking-wide mb-2">
                {section.heading}
              </p>
              <ol className="space-y-1.5">
                {section.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-2 text-gray-300 text-sm leading-relaxed">
                    <span className="text-kcc-gold font-bold flex-shrink-0 text-xs mt-0.5">
                      {idx + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Announcement Carousel ─────────────────────────────────────────────────────
function AnnouncementCarousel({ announcements }) {
  const [active, setActive] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (announcements.length <= 1) return
    timerRef.current = setInterval(() => {
      setActive(i => (i + 1) % announcements.length)
    }, 4000)
    return () => clearInterval(timerRef.current)
  }, [announcements.length])

  function goTo(idx) {
    setActive(idx)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActive(i => (i + 1) % announcements.length)
    }, 4000)
  }

  if (announcements.length === 0) return null

  const ann = announcements[active]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone size={16} className="text-kcc-gold" />
        <h3 className="text-white font-semibold text-sm">Latest Announcements</h3>
        {announcements.length > 1 && (
          <span className="ml-auto text-gray-500 text-xs">{active + 1} / {announcements.length}</span>
        )}
      </div>

      {/* Slide */}
      <div className="flex-1 bg-gradient-to-br from-kcc-blue/30 to-kcc-blue/10 border border-kcc-gold/30 rounded-2xl overflow-hidden flex flex-col min-h-[220px]">
        {ann.image_url && (
          <img
            src={ann.image_url}
            alt={ann.title}
            className="w-full h-40 object-cover"
          />
        )}
        <div className="flex items-start gap-3 p-5 flex-1">
          <div className="w-1.5 rounded-full bg-kcc-gold self-stretch flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-kcc-gold font-semibold uppercase tracking-wide mb-1">
              {new Date(ann.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <h4 className="text-white font-bold text-base leading-snug mb-2">{ann.title}</h4>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">{ann.content}</p>
          </div>
        </div>
      </div>

      {/* Dot Indicators */}
      {announcements.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {announcements.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === active ? 'w-5 h-2 bg-kcc-gold' : 'w-2 h-2 bg-gray-600 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main LandingPage ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    axios.get('/api/announcements')
      .then(res => setAnnouncements(res.data.slice(0, 5)))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-kcc-dark text-white flex flex-col">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-kcc-blue/30 flex-shrink-0">
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

      {/* ── Hero Section: Carousel + Welcome ── */}
      <section className="px-6 py-10 lg:py-14">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

          {/* Left: Announcements Carousel */}
          <div className="order-2 lg:order-1">
            {announcements.length > 0
              ? <AnnouncementCarousel announcements={announcements} />
              : (
                <div className="flex flex-col items-center justify-center min-h-[220px] border border-kcc-blue/20 rounded-2xl bg-kcc-blue/5 text-gray-500 text-sm">
                  <Megaphone size={28} className="mb-2 opacity-30" />
                  No announcements yet.
                </div>
              )
            }
          </div>

          {/* Right: Welcome / CTA */}
          <div className="order-1 lg:order-2 flex flex-col items-center lg:items-start text-center lg:text-left">
            <img
              src={kccLogo}
              alt="KCC"
              className="w-24 h-24 rounded-full object-cover mb-5 ring-4 ring-kcc-gold/40 shadow-lg"
            />
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
              Welcome to<br />
              <span className="text-kcc-gold">KCCSmartInfoX</span>
            </h2>
            <p className="text-gray-400 text-sm max-w-xs mb-8 leading-relaxed">
              Your 24/7 AI assistant for Kabankalan Catholic College.
              Ask anything about enrollment, courses, policies, and more — instantly.
            </p>
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 px-7 py-3 bg-kcc-blue border border-kcc-blue hover:border-kcc-gold text-white font-semibold rounded-2xl hover:bg-kcc-dark transition-all text-sm"
            >
              <MessageCircle size={17} />
              Start Chatting
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Office Process Cards ── */}
      <section className="px-6 pb-12 border-t border-kcc-blue/20 pt-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-white text-xl font-bold mb-1">Office Processes & Guidelines</h2>
            <p className="text-gray-400 text-sm">
              Step-by-step guides for common school transactions. Tap an office to expand.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {OFFICES.map(office => (
              <OfficeCard key={office.id} office={office} />
            ))}
          </div>
          <p className="text-center text-gray-500 text-xs mt-6">
            Have a specific question?{' '}
            <button onClick={() => navigate('/chat')} className="text-kcc-gold hover:underline">
              Ask the chatbot
            </button>
          </p>
        </div>
      </section>

      {/* ── About Us ── */}
      <section className="px-6 pb-12 border-t border-kcc-blue/20 pt-10 mt-auto">
        <div className="max-w-3xl mx-auto text-center">
          <img
            src={kccLogo}
            alt="KCC"
            className="w-16 h-16 rounded-full object-cover mx-auto mb-4 opacity-90"
          />
          <h2 className="text-white text-lg font-bold mb-1">About Kabankalan Catholic College</h2>
          <p className="text-kcc-gold text-xs font-semibold uppercase tracking-widest mb-4">
            Est. in the Heart of Kabankalan City
          </p>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xl mx-auto mb-6">
            Kabankalan Catholic College, Inc. is a Catholic educational institution in Kabankalan City,
            Negros Occidental, committed to providing quality education grounded in Christian values,
            academic excellence, and community service.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-6 text-left">
            <div className="bg-kcc-blue/10 border border-kcc-blue/20 rounded-xl p-4">
              <p className="text-kcc-gold text-xs font-bold uppercase tracking-wide mb-1">Vision</p>
              <p className="text-gray-300 text-xs leading-relaxed">
                A leading Catholic institution forming competent, morally upright, and socially responsible
                citizens for God and country.
              </p>
            </div>
            <div className="bg-kcc-blue/10 border border-kcc-blue/20 rounded-xl p-4">
              <p className="text-kcc-gold text-xs font-bold uppercase tracking-wide mb-1">Mission</p>
              <p className="text-gray-300 text-xs leading-relaxed">
                To provide accessible, quality, and values-based education that develops the full potential
                of every student.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-gray-500 text-xs">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-kcc-gold" />
              Kabankalan City, Negros Occidental
            </span>
            <span className="hidden sm:block text-gray-700">·</span>
            <span className="flex items-center gap-1.5">
              <Phone size={13} className="text-kcc-gold" />
              Registrar's Office — Mon–Fri 8AM–5PM
            </span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <div className="border-t border-kcc-blue/20 px-6 py-4 text-center flex-shrink-0">
        <p className="text-gray-600 text-xs">Powered by KCCSmartInfoX AI · {new Date().getFullYear()}</p>
      </div>

    </div>
  )
}
