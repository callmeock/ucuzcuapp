'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  MultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  NotFoundException,
} from '@zxing/library'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function createReader() {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.QR_CODE,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  const reader = new MultiFormatReader()
  reader.setHints(hints)
  return reader
}

function luminancesFromImageData(imageData: ImageData): Uint8ClampedArray {
  const { data, width, height } = imageData
  const luminances = new Uint8ClampedArray(width * height)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    luminances[i] = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) | 0
  }
  return luminances
}

function decodeLuminance(reader: MultiFormatReader, luminances: Uint8ClampedArray, w: number, h: number): string | null {
  try {
    const source = new RGBLuminanceSource(luminances, w, h)
    const bitmap = new BinaryBitmap(new HybridBinarizer(source))
    const result = reader.decodeWithState(bitmap)
    reader.reset()
    return result.getText()
  } catch (e) {
    reader.reset()
    if (!(e instanceof NotFoundException)) {
      /* ignore other decode errors */
    }
    return null
  }
}

/** 0° + 90° + 270° — dikey kutu barkodları için */
function decodeCanvas(reader: MultiFormatReader, canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const w = canvas.width
  const h = canvas.height

  let text = decodeLuminance(reader, luminancesFromImageData(ctx.getImageData(0, 0, w, h)), w, h)
  if (text) return text

  const rot = document.createElement('canvas')
  rot.width = h
  rot.height = w
  const rctx = rot.getContext('2d', { willReadFrequently: true })
  if (!rctx) return null

  for (const angle of [90, -90] as const) {
    rctx.clearRect(0, 0, h, w)
    rctx.save()
    if (angle === 90) {
      rctx.translate(h, 0)
      rctx.rotate(Math.PI / 2)
    } else {
      rctx.translate(0, w)
      rctx.rotate(-Math.PI / 2)
    }
    rctx.drawImage(canvas, 0, 0)
    rctx.restore()
    text = decodeLuminance(reader, luminancesFromImageData(rctx.getImageData(0, 0, h, w)), h, w)
    if (text) return text
  }
  return null
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const detectedRef = useRef(false)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [engine, setEngine] = useState('')

  const finish = useCallback((code: string) => {
    if (detectedRef.current) return
    detectedRef.current = true
    onDetected(code)
  }, [onDetected])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const startZxingLoop = useCallback(async () => {
    setEngine('ZXing')
    try {
      const reader = createReader()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()
      setStatus('scanning')

      const canvas = document.createElement('canvas')

      timerRef.current = setInterval(() => {
        if (detectedRef.current) return
        if (video.readyState < 2) return
        const vw = video.videoWidth
        const vh = video.videoHeight
        if (!vw || !vh) return

        // Ortadaki geniş alan
        const cropW = Math.floor(vw * 0.9)
        const cropH = Math.floor(vh * 0.55)
        const sx = Math.floor((vw - cropW) / 2)
        const sy = Math.floor((vh - cropH) / 2)

        canvas.width = cropW
        canvas.height = cropH
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH)

        const text = decodeCanvas(reader, canvas)
        if (text) {
          stopCamera()
          finish(text)
        }
      }, 280)
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      if (e.name === 'NotAllowedError') {
        setErrorMsg('Kamera izni gerekli. Safari → Ayarlar → ucuzcuapp.com → Kamera → İzin Ver')
      } else {
        setErrorMsg('Kamera açılamadı: ' + (e.message || 'Bilinmeyen hata'))
      }
      setStatus('error')
    }
  }, [finish, stopCamera])

  const startNative = useCallback(async () => {
    // @ts-expect-error BarcodeDetector
    if (typeof window.BarcodeDetector !== 'function') return false
    if (isIOS()) return false

    let detector: { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
    try {
      // @ts-expect-error BarcodeDetector
      detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
      })
    } catch {
      return false
    }

    try {
      setEngine('Native')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('scanning')

      const scan = () => {
        if (detectedRef.current) return
        const video = videoRef.current
        if (!video || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(scan)
          return
        }
        detector.detect(video).then((barcodes) => {
          if (barcodes.length > 0) {
            stopCamera()
            finish(barcodes[0].rawValue)
          } else {
            rafRef.current = requestAnimationFrame(scan)
          }
        }).catch(() => { rafRef.current = requestAnimationFrame(scan) })
      }
      scan()
      return true
    } catch (err: unknown) {
      const e = err as { name?: string }
      if (e.name === 'NotAllowedError') {
        setErrorMsg('Kamera izni gerekli.')
        setStatus('error')
      }
      return false
    }
  }, [finish, stopCamera])

  useEffect(() => {
    const init = async () => {
      const ok = await startNative()
      if (!ok && !detectedRef.current) await startZxingLoop()
    }
    init()
    return () => stopCamera()
  }, [startNative, startZxingLoop, stopCamera])

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
      setTorchOn(!torchOn)
    } catch { /* yok */ }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim().length >= 4) {
      stopCamera()
      finish(manualCode.trim())
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 safe-top">
        <button type="button" onClick={() => { stopCamera(); onClose() }} className="text-white p-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <div className="text-center">
          <span className="text-white font-semibold">Barkod Tara</span>
          {engine && <div className="text-xs text-green-400 mt-0.5">{engine}</div>}
        </div>
        {status === 'scanning' ? (
          <button type="button" onClick={toggleTorch} className="text-white p-2" aria-label="Flaş">
            <svg className="w-6 h-6" fill={torchOn ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </button>
        ) : <div className="w-10" />}
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />

        {status === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/40" style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 12% 18%, 12% 82%, 88% 82%, 88% 18%, 12% 18%)',
            }} />
            <div className="relative w-56 h-72">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-sm"/>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-sm"/>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-sm"/>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-sm"/>
              <div className="absolute inset-x-0 top-0 h-0.5 bg-green-400 opacity-80"
                style={{ animation: 'scanline 2.2s ease-in-out infinite' }}/>
            </div>
          </div>
        )}

        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
              <p className="text-sm">Kamera açılıyor...</p>
            </div>
          </div>
        )}

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

      <div className="bg-gray-900 px-4 py-4 safe-bottom">
        {status === 'scanning' && (
          <p className="text-gray-400 text-xs text-center mb-3 leading-relaxed">
            Barkodu çerçeveye dik getir · kutuyu düz tut · yansımayı azaltmak için hafif eğin
          </p>
        )}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Elle yaz: 04963406"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-green-500"
            style={{ fontSize: '16px' }}
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
          50%  { transform: translateY(260px); opacity: 0.7; }
          100% { transform: translateY(0px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
