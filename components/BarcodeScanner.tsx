'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const zxingRef = useRef<any>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [useZxing, setUseZxing] = useState(false)

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    // ZXing stream temizliği
    if (zxingRef.current) {
      try { zxingRef.current.reset() } catch {}
      zxingRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // ── Native BarcodeDetector (Android Chrome, Desktop Chrome) ───────────────
  const startNative = useCallback(async () => {
    let detector: any
    try {
      // @ts-ignore
      detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
      })
    } catch {
      return false
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

      const scan = () => {
        const video = videoRef.current
        if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(scan); return }
        detector.detect(video).then((barcodes: any[]) => {
          if (barcodes.length > 0) {
            stopCamera()
            onDetected(barcodes[0].rawValue)
          } else {
            rafRef.current = requestAnimationFrame(scan)
          }
        }).catch(() => { rafRef.current = requestAnimationFrame(scan) })
      }
      scan()
      return true
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Kamera izni gerekli. Tarayıcı ayarlarından izin ver.')
        setStatus('error')
      }
      return false
    }
  }, [onDetected, stopCamera])

  // ── ZXing fallback (iOS Safari, Firefox, vb.) ─────────────────────────────
  const startZxing = useCallback(async () => {
    setUseZxing(true)
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library')
      const reader = new BrowserMultiFormatReader()
      zxingRef.current = reader

      setStatus('scanning')

      // decodeFromConstraints: ZXing kendi stream yönetimini yapıyor (iOS uyumlu)
      await reader.decodeFromConstraints(
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current!,
        (result, _err) => {
          if (result) {
            stopCamera()
            onDetected(result.getText())
          }
        }
      )
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Kamera izni gerekli. Safari → Ayarlar → ucuzcuapp.com → Kamera → İzin Ver')
      } else {
        setErrorMsg('Kamera açılamadı: ' + (err.message || 'Bilinmeyen hata'))
      }
      setStatus('error')
    }
  }, [onDetected, stopCamera])

  // ── Başlangıç: native varsa kullan, yoksa ZXing ───────────────────────────
  useEffect(() => {
    const init = async () => {
      const hasNative = 'BarcodeDetector' in window
      if (hasNative) {
        const ok = await startNative()
        if (!ok) await startZxing() // native başarısız olduysa fallback
      } else {
        await startZxing()
      }
    }
    init()
    return () => stopCamera()
  }, [startNative, startZxing, stopCamera])

  // Torch
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] })
      setTorchOn(!torchOn)
    } catch {}
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
        <div className="text-center">
          <span className="text-white font-semibold">Barkod Tara</span>
          {useZxing && <div className="text-xs text-green-400 mt-0.5">iOS uyumlu mod</div>}
        </div>
        {status === 'scanning' ? (
          <button onClick={toggleTorch} className="text-white p-2">
            <svg className="w-6 h-6" fill={torchOn ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </button>
        ) : <div className="w-10" />}
      </div>

      {/* Kamera */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />

        {/* Tarama çerçevesi */}
        {status === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Karartılmış kenarlar */}
            <div className="absolute inset-0 bg-black/40" style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 10% 25%, 10% 75%, 90% 75%, 90% 25%, 10% 25%)'
            }} />
            <div className="relative w-72 h-48">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-sm"/>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-sm"/>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-sm"/>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-sm"/>
              <div className="absolute inset-x-0 top-0 h-0.5 bg-green-400 opacity-80"
                style={{ animation: 'scanline 2s ease-in-out infinite' }}/>
            </div>
          </div>
        )}

        {/* Yükleniyor */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
              <p className="text-sm">Kamera açılıyor...</p>
            </div>
          </div>
        )}

        {/* Hata */}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-6">
            <div className="text-center text-white">
              <div className="text-5xl mb-4">📷</div>
              <p className="text-sm text-red-400 font-semibold mb-2">Kamera Açılamadı</p>
              <p className="text-xs text-gray-300">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Alt: ipucu + manuel giriş */}
      <div className="bg-gray-900 px-4 py-4">
        {status === 'scanning' && (
          <p className="text-gray-400 text-xs text-center mb-3">
            Barkodu çerçeve içine getir
          </p>
        )}
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
          0%   { transform: translateY(0px); opacity: 1; }
          50%  { transform: translateY(180px); opacity: 0.7; }
          100% { transform: translateY(0px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
