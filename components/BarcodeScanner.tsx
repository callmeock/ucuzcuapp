'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

const DEMO_BARCODE = '04963406'
const READER_ID = 'ucuzcu-barcode-reader'

const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
]

const SCAN_CONFIG = {
  fps: 12,
  qrbox: (w: number, h: number) => ({
    width: Math.floor(Math.min(w * 0.88, 340)),
    height: Math.floor(Math.min(h * 0.28, 130)),
  }),
  aspectRatio: 1.777778,
  disableFlip: false,
  // videoConstraints VERME — html5-qrcode onu verirsen start()'taki
  // facingMode/deviceId'yi tamamen yok sayıyor ve ön kameraya düşebiliyor.
}

/** Arka kamera deviceId — önce exact environment ile zorla */
async function resolveBackCamera(): Promise<string | MediaTrackConstraints> {
  // 1) Tarayıcıya doğrudan arka kamerayı iste
  const tryConstraints: MediaTrackConstraints[] = [
    { facingMode: { exact: 'environment' } },
    { facingMode: 'environment' },
  ]

  for (const video of tryConstraints) {
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video })
      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings()
      const deviceId = settings.deviceId
      const facing = settings.facingMode
      stream.getTracks().forEach((t) => t.stop())
      stream = null

      // Gerçekten arka mı?
      if (facing === 'environment' && deviceId) return deviceId
      if (deviceId && facing !== 'user') return deviceId
    } catch {
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }

  // 2) Etiketlere bak (izin sonrası label dolar)
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videos = devices.filter((d) => d.kind === 'videoinput')
    const back = videos.find((d) => /back|rear|environment|arka|world/i.test(d.label))
    if (back?.deviceId) return back.deviceId
    const notFront = videos.find((d) => d.label && !/front|user|ön|face|selfie/i.test(d.label))
    if (notFront?.deviceId && videos.length > 1) return notFront.deviceId
  } catch { /* ignore */ }

  // 3) Son çare: exact facingMode constraint (deviceId yok)
  return { facingMode: { exact: 'environment' } }
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const doneRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'starting' | 'ready' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)

  const stop = useCallback(async () => {
    const s = scannerRef.current
    scannerRef.current = null
    if (!s) return
    try {
      if (s.isScanning) await s.stop()
      s.clear()
    } catch { /* ignore */ }
  }, [])

  const finish = useCallback(async (raw: string) => {
    if (doneRef.current) return
    const code = String(raw).replace(/\D/g, '')
    if (code.length < 6) return
    doneRef.current = true
    await stop()
    onDetected(code)
  }, [onDetected, stop])

  useEffect(() => {
    doneRef.current = false
    let cancelled = false

    const start = async () => {
      // DOM'un mount olmasını bekle
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      if (cancelled) return

      const scanner = new Html5Qrcode(READER_ID, {
        verbose: false,
        formatsToSupport: FORMATS,
        useBarCodeDetectorIfSupported: true,
      })
      scannerRef.current = scanner

      const camera = await resolveBackCamera()
      if (cancelled) return

      const startWith = async (cam: string | MediaTrackConstraints) => {
        await scanner.start(
          cam,
          SCAN_CONFIG,
          (text) => { void finish(text) },
          () => { /* frame miss */ },
        )
      }

      try {
        await startWith(camera)
        if (cancelled) {
          await stop()
          return
        }

        // Açılan kamera ön mü kontrol et — ise kapatıp arka kamerayı zorla
        let facing = ''
        try {
          facing = scanner.getRunningTrackSettings()?.facingMode || ''
        } catch { /* ignore */ }

        if (facing === 'user') {
          try { await scanner.stop() } catch { /* ignore */ }
          await startWith({ facingMode: { exact: 'environment' } })
        }

        if (cancelled) {
          await stop()
          return
        }
        setStatus('ready')
        try {
          const caps = scanner.getRunningTrackCameraCapabilities()
          setHasTorch(!!caps?.torchFeature?.()?.isSupported?.())
        } catch {
          setHasTorch(false)
        }
      } catch (err: unknown) {
        // Fallback zinciri
        const fallbacks: MediaTrackConstraints[] = [
          { facingMode: { exact: 'environment' } },
          { facingMode: 'environment' },
        ]
        let started = false
        for (const fb of fallbacks) {
          try {
            if (scanner.isScanning) {
              try { await scanner.stop() } catch { /* ignore */ }
            }
            await startWith(fb)
            started = true
            break
          } catch { /* next */ }
        }
        if (!cancelled) {
          if (started) {
            setStatus('ready')
            try {
              const caps = scanner.getRunningTrackCameraCapabilities()
              setHasTorch(!!caps?.torchFeature?.()?.isSupported?.())
            } catch { setHasTorch(false) }
          } else {
            const e = err as { message?: string }
            setErrorMsg(e.message || 'Arka kamera açılamadı')
            setStatus('error')
          }
        }
      }
    }

    start()
    return () => {
      cancelled = true
      void stop()
    }
  }, [finish, stop])

  const toggleTorch = async () => {
    const s = scannerRef.current
    if (!s?.isScanning) return
    try {
      const caps = s.getRunningTrackCameraCapabilities()
      const torch = caps.torchFeature()
      if (!torch.isSupported()) return
      const next = !torchOn
      await torch.apply(next)
      setTorchOn(next)
    } catch { /* ignore */ }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      // Tarama çalışıyorsa dosya için geçici olarak durdurma gerekebilir
      const wasScanning = scannerRef.current?.isScanning
      if (wasScanning) {
        try { await scannerRef.current!.pause(true) } catch { /* ignore */ }
      }
      // Ayrı instance ile dosya oku (çakışmasın)
      const tmpId = 'ucuzcu-barcode-file'
      let el = document.getElementById(tmpId)
      if (!el) {
        el = document.createElement('div')
        el.id = tmpId
        el.style.display = 'none'
        document.body.appendChild(el)
      }
      const fileScanner = new Html5Qrcode(tmpId, { verbose: false, formatsToSupport: FORMATS })
      const text = await fileScanner.scanFile(file, false)
      fileScanner.clear()
      await finish(text)
    } catch {
      setErrorMsg('Fotoğrafta barkod bulunamadı — daha net çek')
      try { await scannerRef.current?.resume() } catch { /* ignore */ }
    }
  }

  const handleClose = async () => {
    doneRef.current = true
    await stop()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-3 py-3 safe-top bg-gradient-to-b from-black/80 to-transparent">
        <button type="button" onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">Barkod Tara</p>
          <p className="text-[11px] text-white/60">Arka kamera</p>
        </div>
        {hasTorch ? (
          <button
            type="button"
            onClick={toggleTorch}
            className={`w-10 h-10 flex items-center justify-center rounded-full ${torchOn ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}
            aria-label="Flaş"
          >
            <svg className="w-5 h-5" fill={torchOn ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Kamera alanı */}
      <div className="relative flex-1 min-h-0 bg-black">
        <div id={READER_ID} className="ucuzcu-reader absolute inset-0" />

        {status === 'starting' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black gap-3">
            <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">Arka kamera açılıyor…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black px-8 text-center gap-2">
            <p className="text-red-400 font-semibold text-sm">Kamera açılamadı</p>
            <p className="text-white/50 text-xs">{errorMsg}</p>
            <p className="text-white/40 text-xs mt-2">Fotoğraf seçerek veya elle yazarak devam et</p>
          </div>
        )}

        {status === 'ready' && (
          <div className="absolute bottom-4 inset-x-0 z-10 pointer-events-none text-center">
            <p className="inline-block text-xs text-white/90 bg-black/50 rounded-full px-3 py-1.5">
              Barkodu yeşil alana hizala
            </p>
          </div>
        )}
      </div>

      {/* Alt aksiyonlar */}
      <div className="relative z-20 bg-gray-950 px-4 pt-3 pb-4 safe-bottom space-y-2.5 border-t border-white/10">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Fotoğraf
          </button>
          <button
            type="button"
            onClick={() => void finish(DEMO_BARCODE)}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-xl py-3 text-sm font-semibold"
          >
            Demo kola
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void finish(manualCode)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            inputMode="numeric"
            placeholder="Barkodu elle yaz"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 bg-white/10 text-white placeholder:text-white/40 rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-green-400"
            style={{ fontSize: '16px' }}
          />
          <button
            type="submit"
            disabled={manualCode.replace(/\D/g, '').length < 6}
            className="bg-green-500 disabled:bg-white/10 disabled:text-white/30 text-white px-5 rounded-xl font-semibold text-sm"
          >
            Ara
          </button>
        </form>
      </div>

      <style jsx global>{`
        .ucuzcu-reader {
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          background: #000 !important;
        }
        .ucuzcu-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border: none !important;
          border-radius: 0 !important;
        }
        .ucuzcu-reader img {
          display: none !important;
        }
        /* Kütüphanenin varsayılan QR gölgesi — kenarları yumuşat */
        #ucuzcu-barcode-reader__scan_region {
          min-height: 100% !important;
        }
        #ucuzcu-barcode-reader__scan_region > img {
          display: none !important;
        }
      `}</style>
    </div>
  )
}
