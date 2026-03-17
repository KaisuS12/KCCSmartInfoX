import { useState } from 'react'
import { X, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

const INFO_ITEMS = [
  {
    title: 'Enrollment Process',
    content: `1. Secure enrollment form from the Registrar's Office.
2. Fill out the form completely and accurately.
3. Submit required documents (report card, birth certificate, ID photo).
4. Pay enrollment fees at the Cashier's Office.
5. Receive your class schedule and student ID.

For transferees: present Transfer Credentials and honorable dismissal.`,
  },
  {
    title: 'How to Get Your TOR',
    content: `1. Visit the Registrar's Office and request a Transcript of Records form.
2. Fill out the request form and indicate the purpose.
3. Pay the required fee at the Cashier's Office.
4. Submit the official receipt back to the Registrar.
5. Wait for processing (typically 3–5 working days).
6. Claim your TOR on the specified release date.`,
  },
  {
    title: 'Discipline Office (DO) Policies',
    content: `Students are expected to follow the school's Code of Conduct.
Common violations and corresponding sanctions are outlined in the Student Handbook.
For inquiries about specific penalties, visit the Discipline Office directly or ask the chatbot for details.`,
  },
  {
    title: 'School Fees & Payment',
    content: `Tuition and other fees are set each academic year.
Payment can be made at the Cashier's Office during office hours.
Instalment plans may be available — inquire at the Accounting Office.
Official receipts are issued for every payment.`,
  },
  {
    title: 'Office Hours',
    content: `Monday to Friday: 8:00 AM – 5:00 PM
Saturday: 8:00 AM – 12:00 NN (selected offices only)
Offices are closed on Sundays and holidays.`,
  },
  {
    title: 'Contact & Offices',
    content: `Kabankalan Catholic College, Inc.
Kabankalan City, Negros Occidental

Registrar's Office — for academic records, enrollment
Discipline Office — for student conduct matters
Accounting/Cashier — for payments and fees
Guidance Office — for student welfare and counseling

You may also use this chatbot to ask specific questions!`,
  },
]

function InfoItem({ title, content }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-kcc-blue/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-kcc-blue/30 hover:bg-kcc-blue/50 text-white text-sm font-medium transition-all"
      >
        <span>{title}</span>
        {open ? <ChevronUp size={16} className="text-kcc-gold" /> : <ChevronDown size={16} className="text-kcc-gold" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-kcc-dark/60 text-gray-300 text-sm leading-relaxed whitespace-pre-line">
          {content}
        </div>
      )}
    </div>
  )
}

export default function SchoolInfoPanel({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-kcc-dark border border-kcc-blue/40 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-kcc-blue/40">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-kcc-gold" />
            <h2 className="text-white font-semibold">School Information</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-kcc-blue/40 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Info List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {INFO_ITEMS.map(item => (
            <InfoItem key={item.title} {...item} />
          ))}
        </div>

        <div className="px-5 py-3 border-t border-kcc-blue/40 text-center">
          <p className="text-gray-500 text-xs">
            For more specific questions, use the chatbot.
          </p>
        </div>
      </div>
    </div>
  )
}
