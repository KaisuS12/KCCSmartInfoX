import { useState, useRef, useEffect } from 'react'
import AdminLayout from '../../components/shared/AdminLayout'
import QRCode from 'react-qr-code'
import { QrCode, Download, Printer, Copy, Check, Smartphone } from 'lucide-react'
import axios from 'axios'

export default function AdminQRCode() {
  const [url, setUrl] = useState('')
  const [networkIp, setNetworkIp] = useState('localhost')
  const [loadingIp, setLoadingIp] = useState(true)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef(null)
  const currentPort = window.location.port || '5173'

  useEffect(() => {
    axios.get('/api/local-ip')
      .then(r => {
        const ip = r.data.ip
        setNetworkIp(ip)
        setUrl(`http://${ip}:${currentPort}/chat`)
      })
      .catch(() => {
        setUrl(`http://localhost:${currentPort}/chat`)
      })
      .finally(() => setLoadingIp(false))
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const margin = 40
    const qrSize = 500
    const total = qrSize + margin * 2

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = total
    canvas.height = total

    const img = new Image()
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url_ = URL.createObjectURL(svgBlob)

    img.onload = () => {
      // White background with margin (quiet zone)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, total, total)
      ctx.drawImage(img, margin, margin, qrSize, qrSize)
      URL.revokeObjectURL(url_)

      const link = document.createElement('a')
      link.download = 'KCCSmartInfoX-QRCode.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url_
  }

  function handlePrint() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const w = window.open('', '_blank')
    w.document.write(`
      <html>
        <head>
          <title>KCCSmartInfoX QR Code</title>
          <style>
            body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:Arial,sans-serif; margin:0; padding:20px; }
            h1 { color:#003087; margin-bottom:4px; font-size:24px; }
            p  { color:#666; margin:0 0 24px; font-size:14px; }
            .qr { border:3px solid #C9A84C; border-radius:16px; padding:20px; background:#fff; }
            .url { margin-top:20px; font-size:12px; color:#888; word-break:break-all; max-width:300px; text-align:center; }
            @media print { button { display:none; } }
          </style>
        </head>
        <body>
          <h1>KCCSmartInfoX</h1>
          <p>Scan to access the KCC AI Chatbot</p>
          <div class="qr">${svgData}</div>
          <p class="url">${url}</p>
          <br/>
          <button onclick="window.print()" style="padding:10px 24px;background:#003087;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;">Print</button>
        </body>
      </html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-kcc-dark flex items-center gap-2">
            <QrCode size={24} className="text-kcc-blue" />
            QR Code Generator
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Generate a QR code for the chatbot. Print it and post on campus bulletin boards so students can scan and access instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* QR Code Display */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
            <div
              ref={qrRef}
              className="bg-white rounded-2xl mb-4"
              style={{ padding: 20, border: '4px solid #C9A84C', display: 'inline-block' }}
            >
              <QRCode
                value={url || `http://localhost:${currentPort}/chat`}
                size={220}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>
            <p className="text-xs text-gray-400 text-center break-all max-w-[220px]">{url}</p>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-5 flex-wrap justify-center">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 bg-kcc-blue text-white text-sm rounded-xl hover:bg-blue-800 transition"
              >
                <Download size={14} />
                Download PNG
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-kcc-gold text-kcc-dark text-sm font-medium rounded-xl hover:bg-yellow-400 transition"
              >
                <Printer size={14} />
                Print
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">

            {/* URL Input */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <label className="block text-sm font-semibold text-kcc-dark mb-2">
                Chatbot URL
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Change this to your network IP if students will access from their phones on campus.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-kcc-blue"
                  placeholder="http://192.168.0.109:5173/chat"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition flex-shrink-0"
                  title="Copy URL"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Quick presets */}
              <div className="mt-3 space-y-1">
                <p className="text-xs text-gray-400 font-medium">Quick presets:</p>
                <button
                  onClick={() => setUrl(`http://${networkIp}:${currentPort}/chat`)}
                  className="text-xs text-kcc-blue hover:underline block"
                >
                  Network IP + current port ({networkIp}:{currentPort}) ✓ Recommended
                </button>
                <button
                  onClick={() => setUrl(`http://${networkIp}:5173/chat`)}
                  className="text-xs text-kcc-blue hover:underline block"
                >
                  Network IP + dev server ({networkIp}:5173)
                </button>
                <button
                  onClick={() => setUrl(`http://localhost:${currentPort}/chat`)}
                  className="text-xs text-kcc-blue hover:underline block"
                >
                  Localhost (localhost:{currentPort}/chat)
                </button>
              </div>
            </div>

            {/* Usage Tips */}
            <div className="bg-kcc-blue/5 border border-kcc-blue/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone size={16} className="text-kcc-blue" />
                <p className="text-sm font-semibold text-kcc-dark">How to use</p>
              </div>
              <ol className="space-y-2 text-xs text-gray-600">
                <li className="flex gap-2">
                  <span className="text-kcc-gold font-bold flex-shrink-0">1.</span>
                  Set the URL to your network IP so campus devices can connect.
                </li>
                <li className="flex gap-2">
                  <span className="text-kcc-gold font-bold flex-shrink-0">2.</span>
                  Click <strong>Download PNG</strong> or <strong>Print</strong> to get the QR code.
                </li>
                <li className="flex gap-2">
                  <span className="text-kcc-gold font-bold flex-shrink-0">3.</span>
                  Post on bulletin boards, entrance doors, or include in printed materials.
                </li>
                <li className="flex gap-2">
                  <span className="text-kcc-gold font-bold flex-shrink-0">4.</span>
                  Students scan with their phone camera → chatbot opens instantly.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
