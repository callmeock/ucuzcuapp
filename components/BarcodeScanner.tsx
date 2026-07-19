'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  MultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

function createReader() {
  const hints = new Map<DecodeHintType, unknown>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.QR_CODE,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  // @ts-expect-error ALSO_INVERTED bazı sürümlerde var
  if (DecodeHintType.ALSO_INVERTED != null) {
    // @ts-expect-error
    hints.set(DecodeHintType.ALSO_INVERTED, true)
  }
  const reader = new MultiFormatReader()
  reader.setHints(hints)
  return reader
}

function rgbaToLuminance(data: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const lum = new Uint8ClampedArray(w * h)
  for (let i = 0; i < w * h; i++) {
    const o = i * 4
    lum[i] = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) | 0
  }
  return lum
}

function rotateLum90CW(lum: Uint8ClampedArray, w: number, h: number) {
  const out = new Uint8ClampedArray(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[x * h + (h - 1 - y)] = lum[y * w + x]
    }
  }
  return { lum: out, w: h, h: w }
}

function tryDecode(reader: MultiFormatReader, lum: Uint8ClampedArray, w: number, h: number): string | null {
  try {
    const source = new RGBLuminanceSource(lum, w, h)
    const bitmap = new BinaryBitmap(new HybridBinarizer(source))
    const result = reader.decode(bitmap)
    reader.reset()
    return result.getText()
  } catch {
    try { reader.reset() } catch { /* ignore */ }
    return null
  }
}

/** Tam kare + 3 rotasyon. Statik testte tam kare UPC-A okuyor. */
function decodeImageData(reader: MultiFormatReader, imageData: ImageData): string | null {
  let cur = {
    lum: rgbaToLuminance(imageData.data, imageData.width, imageData.height),
    w: imageData.width,
    h: imageData.height,
  }
  for (let i = 0; i < 4; i++) {
    const text = tryDecode(reader, cur.lum, cur.w, cur.h)
    if (text) return text.replace(/\D/g, '') || text
    cur = rotateLum90CW(cur.lum, cur.w, cur.h)
  }
  return null
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const detectedRef = useRef(false)
  const readerRef = useRef<MultiFormatReader | null>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [hint, setHint] = useState('Barkodu yakından, net göster')

  const finish = useCallback((code: string) => {
    if (detectedRef.current) return
    const cleaned = code.replace(/\D/g, '')
    if (cleaned.length < 6) return
    detectedRef.current = true
    onDetected(cleaned)
  }, [onDetected])

  const stopCamera = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    const reader = createReader()
    readerRef.current = reader
    const canvas = document.createElement('canvas')

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
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
        video.muted = true
        await video.play()
        setStatus('scanning')

        let ticks = 0
        timerRef.current = setInterval(() => {
          if (detectedRef.current) return
          if (video.readyState < 2) return
          const vw = video.videoWidth
          const vh = video.videoHeight
          if (!vw || !vh) return

          // Performans: uzun kenarı max 1280
          const scale = Math.min(1, 1280 / Math.max(vw, vh))
          const tw = Math.floor(vw * scale)
          const th = Math.floor(vh * scale)
          canvas.width = tw
          canvas.height = th
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) return
          ctx.drawImage(video, 0, 0, tw, th)

          // Tam kare — kırpma YOK (statik testte tam kare çalıştı)
          const text = decodeImageData(reader, ctx.getImageData(0, 0, tw, th))
          if (text) {
            stopCamera()
            finish(text)
            return
          }

          ticks++
          if (ticks === 12) setHint('Daha yaklaş · barkod çerçeveyi doldursun')
          if (ticks === 30) setHint('Yansımayı kes · kutuyu hafif eğ')
          if (ticks === 50) setHint('Olmazsa alttan fotoğraf seç veya elle yaz')
        }, 400)
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string }
        if (e.name === 'NotAllowedError') {
          setErrorMsg('Kamera izni gerekli. Ayarlardan izin ver.')
        } else {
          setErrorMsg(e.message || 'Kamera açılamadı')
        }
        setStatus('error')
      }
    }

    start()
    return () => stopCamera()
  }, [finish, stopCamera])

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
      setTorchOn(!torchOn)
    } catch { /* destek yok */ }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setHint('Fotoğraf okunuyor...')
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      // yüksek çözünürlük koru ama max 2000
      const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.floor(bitmap.width * scale)
      canvas.height = Math.floor(bitmap.height * scale)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const reader = readerRef.current || createReader()
      const text = decodeImageData(reader, ctx.getImageData(0, 0, canvas.width, canvas.height))
      bitmap.close()
      if (text) {
        stopCamera()
        finish(text)
      } else {
        setHint('Fotoğrafta barkod bulunamadı — daha net çek veya elle yaz')
      }
    } catch {
      setHint('Fotoğraf okunamadı')
    }
    e.target.value = ''
  }

  const handleManualSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const code = manualCode.replace(/\D/g, '')
    if (code.length >= 6) {
      stopCamera()
      finish(code)
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
        <span className="text-white font-semibold">Barkod Tara</span>
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
            <div className="relative w-64 h-64 border-2 border-green-400/80 rounded-2xl">
              <div className="absolute -top-8 inset-x-0 text-center text-white text-xs font-medium drop-shadow">
                {hint}
              </div>
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
            <div className="text-center text-white space-y-3">
              <p className="text-sm text-red-400 font-semibold">Kamera Açılamadı</p>
              <p className="text-xs text-gray-300">{errorMsg}</p>
              <p className="text-xs text-gray-400">Fotoğraf seçerek veya elle yazarak devam edebilirsin.</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 px-4 py-4 safe-bottom space-y-3">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white rounded-xl py-3 text-sm font-semibold"
        >
          Galeriden / fotoğraftan oku
        </button>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Elle yaz (ör: 04963406)"
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
    </div>
  )
}
