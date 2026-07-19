'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { decodeBarcodeFromCanvas } from '@/lib/barcodeDecode'

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
  fps: 8,
  qrbox: (w: number, h: number) => ({
    width: Math.floor(Math.min(w * 0.9, 360)),
    height: Math.floor(Math.min(h * 0.32, 150)),
  }),
  aspectRatio: 1.777778,
  disableFlip: false,
}

async function resolveBackCamera(): Promise<string | MediaTrackConstraints> {
  for (const video of [
    { facingMode: { exact: 'environment' } } as MediaTrackConstraints,
    { facingMode: 'environment' } as MediaTrackConstraints,
  ]) {
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video })
      const settings = stream.getVideoTracks()[0].getSettings()
      const id = settings.deviceId
      const facing = settings.facingMode
      stream.getTracks().forEach((t) => t.stop())
      if (facing === 'environment' && id) return id
      if (id && facing !== 'user') return id
    } catch {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }
  try {
    const videos = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
    const back = videos.find((d) => /back|rear|environment|arka|world/i.test(d.label))
    if (back?.deviceId) return back.deviceId
    const notFront = videos.find((d) => d.label && !/front|user|ön|face|selfie/i.test(d.label))
    if (notFront?.deviceId && videos.length > 1) return notFront.deviceId
  } catch { /* ignore */ }
  return { facingMode: { exact: 'environment' } }
}

function findScannerVideo(): HTMLVideoElement | null {
  return document.querySelector(`#${READER_ID} video`)
}

function snapshotToCanvas(video: HTMLVideoElement): HTMLCanvasElement | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh || video.readyState < 2) return null
  const canvas = document.createElement('canvas')
  canvas.width = vw
  canvas.height = vh
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, vw, vh)
  return canvas
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const doneRef = useRef(false)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'starting' | 'ready' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('')

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

      const startWith = (cam: string | MediaTrackConstraints) =>
        scanner.start(cam, SCAN_CONFIG, (text) => { void finish(text) }, () => {})

      try {
        await startWith(camera)
        if (cancelled) { await stop(); return }
        try {
          if (scanner.getRunningTrackSettings()?.facingMode === 'user') {
            await scanner.stop()
            await startWith({ facingMode: { exact: 'environment' } })
          }
        } catch { /* ignore */ }
        if (cancelled) { await stop(); return }
        setStatus('ready')
        try {
          setHasTorch(!!scanner.getRunningTrackCameraCapabilities().torchFeature()?.isSupported?.())
        } catch { setHasTorch(false) }
      } catch (err: unknown) {
        let started = false
        for (const fb of [{ facingMode: { exact: 'environment' } }, { facingMode: 'environment' }] as MediaTrackConstraints[]) {
          try {
            if (scanner.isScanning) await scanner.stop()
            await startWith(fb)
            started = true
            break
          } catch { /* next */ }
        }
        if (!cancelled) {
          if (started) setStatus('ready')
          else {
            setErrorMsg((err as { message?: string }).message || 'Kamera açılamadı')
            setStatus('error')
          }
        }
      }
    }

    start()
    return () => { cancelled = true; void stop() }
  }, [finish, stop])

  const toggleTorch = async () => {
    try {
      const torch = scannerRef.current?.getRunningTrackCameraCapabilities().torchFeature()
      if (!torch?.isSupported()) return
      await torch.apply(!torchOn)
      setTorchOn(!torchOn)
    } catch { /* ignore */ }
  }

  const takePhotoAndDecode = async () => {
    if (busy || doneRef.current) return
    setBusy(true)
    setStatusText('')
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })

    try {
      const video = findScannerVideo()
      if (!video) {
        setStatusText('Kamera henüz hazır değil')
        return
      }

      setFlash(true)
      setTimeout(() => setFlash(false), 120)

      const canvas = snapshotToCanvas(video)
      if (!canvas) {
        setStatusText('Kare alınamadı')
        return
      }

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.95))
      if (blob) setPreviewUrl(URL.createObjectURL(blob))

      setStatusText('Okunuyor…')
      const code = await decodeBarcodeFromCanvas(canvas)

      if (code) {
        setStatusText(`Bulundu: ${code}`)
        await finish(code)
        return
      }
      setStatusText('Okuyamadım — yaklaştırıp tekrar çek')
    } finally {
      setBusy(false)
    }
  }

  const onGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || busy) return
    setBusy(true)
    setPreviewUrl(URL.createObjectURL(file))
    setStatusText('Okunuyor…')
    try {
      const bmp = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bmp.width
      canvas.height = bmp.height
      canvas.getContext('2d')!.drawImage(bmp, 0, 0)
      bmp.close()
      const code = await decodeBarcodeFromCanvas(canvas)
      if (code) {
        setStatusText(`Bulundu: ${code}`)
        await finish(code)
      } else {
        setStatusText('Okuyamadım — daha net fotoğraf dene')
      }
    } catch {
      setStatusText('Fotoğraf okunamadı')
    } finally {
      setBusy(false)
    }
  }

  const handleClose = async () => {
    doneRef.current = true
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    await stop()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative z-20 flex items-center justify-between px-3 py-3 safe-top">
        <button type="button" onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <p className="text-white font-semibold text-sm">Barkod Tara</p>
        {hasTorch ? (
          <button type="button" onClick={toggleTorch} className={`w-10 h-10 rounded-full flex items-center justify-center ${torchOn ? 'bg-yellow-400 text-black' : 'bg-black/40 text-white'}`}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </button>
        ) : <div className="w-10" />}
      </div>

      <div className="relative flex-1 min-h-0 bg-black">
        <div id={READER_ID} className="ucuzcu-reader absolute inset-0" />

        {previewUrl && (
          <div className="absolute inset-0 z-20 bg-black flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Çekilen" className="max-w-full max-h-full object-contain" />
          </div>
        )}

        {flash && <div className="absolute inset-0 z-30 bg-white/80 pointer-events-none" />}

        {status === 'starting' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black px-6 text-center">
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </div>
        )}
      </div>

      <div className="relative z-40 bg-gray-950 px-4 pt-3 pb-4 safe-bottom space-y-3 border-t border-white/10">
        {statusText && (
          <p className={`text-center text-sm font-medium ${
            statusText.startsWith('Bulundu') ? 'text-green-400' : statusText === 'Okunuyor…' ? 'text-white/70' : 'text-amber-300'
          }`}>
            {statusText}
          </p>
        )}

        {previewUrl ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (previewUrl) URL.revokeObjectURL(previewUrl)
              setPreviewUrl(null)
              setStatusText('')
            }}
            className="w-full bg-white/15 text-white rounded-2xl py-4 font-bold"
          >
            Tekrar çek
          </button>
        ) : (
          <button
            type="button"
            disabled={status !== 'ready' || busy}
            onClick={() => void takePhotoAndDecode()}
            className="w-full bg-green-500 disabled:bg-white/10 disabled:text-white/40 text-white rounded-2xl py-5 font-bold text-lg active:scale-[0.98]"
          >
            {busy ? 'Çekiliyor…' : '📷 Fotoğraf çek'}
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onGallery} />
          <button type="button" disabled={busy} onClick={() => galleryRef.current?.click()} className="bg-white/10 text-white rounded-xl py-3 text-sm font-semibold">
            Galeri
          </button>
          <button type="button" disabled={busy} onClick={() => void finish(DEMO_BARCODE)} className="bg-red-600 text-white rounded-xl py-3 text-sm font-semibold">
            Demo kola
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void finish(manualCode) }} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Elle yaz"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 bg-white/10 text-white rounded-xl px-4 py-3 outline-none border border-white/10"
            style={{ fontSize: '16px' }}
          />
          <button type="submit" disabled={manualCode.replace(/\D/g, '').length < 6} className="bg-white/15 text-white px-4 rounded-xl text-sm font-semibold disabled:opacity-30">
            Ara
          </button>
        </form>
      </div>

      <style jsx global>{`
        .ucuzcu-reader { width:100%!important; height:100%!important; overflow:hidden!important; background:#000!important; }
        .ucuzcu-reader video { width:100%!important; height:100%!important; object-fit:cover!important; border:none!important; }
        .ucuzcu-reader img { display:none!important; }
        #ucuzcu-barcode-reader__scan_region { min-height:100%!important; }
        #ucuzcu-barcode-reader__scan_region > img { display:none!important; }
      `}</style>
    </div>
  )
}
