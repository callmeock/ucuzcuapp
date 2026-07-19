'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

const DEMO_BARCODE = '04963406'
const READER_ID = 'ucuzcu-barcode-reader'

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const doneRef = useRef(false)
  const [manualCode, setManualCode] = useState('')

  const finish = (raw: string) => {
    if (doneRef.current) return
    const code = String(raw).replace(/\D/g, '')
    if (code.length < 6) return
    doneRef.current = true
    const scanner = scannerRef.current
    scannerRef.current = null
    if (scanner) {
      scanner.clear().catch(() => {}).finally(() => onDetected(code))
    } else {
      onDetected(code)
    }
  }

  useEffect(() => {
    doneRef.current = false
    const scanner = new Html5QrcodeScanner(
      READER_ID,
      {
        fps: 12,
        // 1D barkodlar için geniş kutu (kare QR kutusu UPC'yi keser)
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const w = Math.floor(Math.min(viewfinderWidth * 0.92, 360))
          const h = Math.floor(Math.min(viewfinderHeight * 0.35, 140))
          return { width: w, height: h }
        },
        aspectRatio: 1.777778,
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      },
      /* verbose */ false,
    )
    scannerRef.current = scanner

    scanner.render(
      (decodedText) => finish(decodedText),
      () => { /* kare kare sessiz */ },
    )

    return () => {
      scannerRef.current = null
      scanner.clear().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black safe-top shrink-0">
        <button
          type="button"
          onClick={() => {
            doneRef.current = true
            scannerRef.current?.clear().catch(() => {})
            onClose()
          }}
          className="text-white p-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <span className="text-white font-semibold">Barkod Tara</span>
        <div className="w-10" />
      </div>

      {/* html5-qrcode kendi UI'sini buraya basar: kamera + dosya seç */}
      <div className="flex-1 overflow-y-auto bg-black">
        <div id={READER_ID} className="ucuzcu-html5-qr" />
      </div>

      <div className="bg-gray-900 px-4 py-4 safe-bottom space-y-3 shrink-0 border-t border-gray-800">
        <p className="text-xs text-gray-400 text-center">
          Kamerada olmazsa üstteki <span className="text-gray-200">“Choose Image”</span> ile fotoğraf seç
        </p>

        <button
          type="button"
          onClick={() => finish(DEMO_BARCODE)}
          className="w-full bg-red-600 hover:bg-red-500 text-white rounded-xl py-3 text-sm font-bold"
        >
          Demo kola barkodu kullan (04963406)
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            finish(manualCode)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            inputMode="numeric"
            placeholder="Veya barkodu elle yaz"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-green-500"
            style={{ fontSize: '16px' }}
          />
          <button
            type="submit"
            disabled={manualCode.replace(/\D/g, '').length < 6}
            className="bg-green-500 disabled:bg-gray-700 text-white px-4 rounded-xl font-semibold text-sm"
          >
            Ara
          </button>
        </form>
      </div>

      <style jsx global>{`
        .ucuzcu-html5-qr {
          padding: 12px;
        }
        .ucuzcu-html5-qr video {
          border-radius: 12px !important;
          max-height: 55vh;
          object-fit: cover;
        }
        #ucuzcu-barcode-reader__dashboard_section_csr button,
        #ucuzcu-barcode-reader__dashboard_section_fsr button {
          background: #22c55e !important;
          color: #fff !important;
          border: none !important;
          padding: 10px 14px !important;
          margin: 4px !important;
          border-radius: 10px !important;
          font-weight: 600 !important;
        }
        #ucuzcu-barcode-reader__dashboard_section {
          background: #111 !important;
          color: #ddd !important;
          border-radius: 12px;
          padding: 8px !important;
        }
        #ucuzcu-barcode-reader__header_message {
          color: #9ca3af !important;
          font-size: 12px !important;
        }
      `}</style>
    </div>
  )
}
