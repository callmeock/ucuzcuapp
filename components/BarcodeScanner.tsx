'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const rafRef = useRef<number>(0)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error' | 'unsupported'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [torchOn, setTorchOn] = useState(false)

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const startScanning = useCallback(async () => {
    // BarcodeDetector API kontrolü
    if (!('BarcodeDetector' in window)) {
      setStatus('unsupported')
      return
    }

    try {
      // @ts-ignore
      detectorRef.current = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
      })
    } catch {
      setStatus('unsupported')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('scanning')
      scan()
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Kamera izni gerekli. Tarayıcı ayarlarından izin ver.')
      } else {
        setErrorMsg('Kamera açılamadı: ' + err.message)
      }
      setStatus('error')
    }
  }, [])

  const scan = useCallback(() => {
    const video = videoRef.current
    const detector = detectorRef.current
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scan)
      return
    }

    detector.detect(video).then((barcodes: any[]) => {
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue
        stopCamera()
        onDetected(code)
      } else {
        rafRef.current = requestAnimationFrame(scan)
      }
    }).catch(() => {
      rafRef.current = requestAnimationFrame(scan)
    })
  }, [onDetected, stopCamera])

  useEffect(() => {
    startScanning()
    return () => stopCamera()
  }, [startScanning, stopCamera])

  // Torch (el feneri)
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] })
      setTorchOn(!torchOn)
    } catch { /* torch desteklenmiyor */ }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim().length >= 4) {
      stopCamera()
      onDetected(manualCode.trim())
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <button onClick={() => { stopCamera(); onClose() }} className="text-white p-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <span className="text-white font-semibold">Barkod Tara</span>
        {status === 'scanning' && (
          <button onClick={toggleTorch} className="text-white p-2">
            <svg className="w-6 h-6" fill={torchOn ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </button>
        )}
        {status !== 'scanning' && <div className="w-10" />}
      </div>

      {/* Kamera */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Tarama çerçevesi */}
        {status === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-72 h-48">
              {/* Köşeler */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-sm"/>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-sm"/>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-sm"/>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-sm"/>
              {/* Tarama çizgisi animasyonu */}
              <div className="absolute inset-x-2 top-0 h-0.5 bg-green-400 animate-[scanline_2s_ease-in-out_infinite]"
                style={{ animation: 'scanline 2s ease-in-out infinite' }}/>
            </div>
          </div>
        )}

        {/* Durum mesajları */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
              <p className="text-sm">Kamera açılıyor...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="text-center text-white">
              <div className="text-5xl mb-4">📷</div>
              <p className="text-sm text-red-400 mb-2">{errorMsg}</p>
            </div>
          </div>
        )}

        {status === 'unsupported' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="text-center text-white">
              <div className="text-5xl mb-4">📱</div>
              <p className="text-sm text-yellow-300">
                Bu tarayıcı barkod okumayı desteklemiyor.<br/>
                Chrome veya Android kullan, ya da kodu elle gir.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Manuel giriş */}
      <div className="bg-gray-900 px-4 py-4">
        <p className="text-gray-400 text-xs text-center mb-3">
          {status === 'scanning' ? 'Barkodu kameraya göster' : 'Barkod numarasını elle gir'}
        </p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Barkod numarası (ör: 8690526040018)"
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-green-500"
          />
          <button
            type="submit"
            disabled={manualCode.trim().length < 4}
            className="bg-green-500 disabled:bg-gray-700 text-white px-4 rounded-xl font-semibold text-sm transition-colors"
          >
            Ara
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes scanline {
          0%   { transform: translateY(0); opacity: 1; }
          50%  { transform: translateY(180px); opacity: 0.8; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
