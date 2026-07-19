'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
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

function createZxingReader() {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  const reader = new MultiFormatReader()
  reader.setHints(hints)
  return reader
}

function toLum(data: Uint8ClampedArray, w: number, h: number) {
  const lum = new Uint8ClampedArray(w * h)
  for (let i = 0; i < w * h; i++) {
    const o = i * 4
    lum[i] = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) | 0
  }
  return lum
}

function rotate90(lum: Uint8ClampedArray, w: number, h: number) {
  const out = new Uint8ClampedArray(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[x * h + (h - 1 - y)] = lum[y * w + x]
    }
  }
  return { lum: out, w: h, h: w }
}

function decodeCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const reader = createZxingReader()
  const { width: w, height: h } = canvas
  let cur = { lum: toLum(ctx.getImageData(0, 0, w, h).data, w, h), w, h }

  for (let r = 0; r < 4; r++) {
    try {
      const source = new RGBLuminanceSource(cur.lum, cur.w, cur.h)
      const bitmap = new BinaryBitmap(new HybridBinarizer(source))
      const result = reader.decode(bitmap)
      reader.reset()
      const text = result.getText().replace(/\D/g, '')
      if (text.length >= 6) return text
    } catch {
      try { reader.reset() } catch { /* ignore */ }
    }
    cur = rotate90(cur.lum, cur.w, cur.h)
  }
  return null
}

/** Reader içindeki video elementini bul */
function findScannerVideo(): HTMLVideoElement | null {
  const root = document.getElementById(READER_ID)
  if (!root) return null
  return root.querySelector('video')
}

/** Videodan tam çözünürlük kare çiz */
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

  /**
   * 1) Videodan fotoğraf çek
   * 2) Önizleme göster
   * 3) Barkodu oku
   */
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

      // Shutter flash
      setFlash(true)
      setTimeout(() => setFlash(false), 120)

      const canvas = snapshotToCanvas(video)
      if (!canvas) {
        setStatusText('Kare alınamadı — bir saniye bekle')
        return
      }

      // Kullanıcıya çekilen fotoğrafı göster
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
      if (blob) setPreviewUrl(URL.createObjectURL(blob))

      setStatusText('Okunuyor…')

      // 1) ZXing tam kare + rotasyon
      let code = decodeCanvas(canvas)

      // 2) Küçültülmüş kopya (bazen daha iyi)
      if (!code && canvas.width > 1000) {
        const small = document.createElement('canvas')
        const scale = 1000 / canvas.width
        small.width = Math.floor(canvas.width * scale)
        small.height = Math.floor(canvas.height * scale)
        small.getContext('2d')!.drawImage(canvas, 0, 0, small.width, small.height)
        code = decodeCanvas(small)
      }

      // 3) html5-qrcode scanFile yedek
      if (!code && blob) {
        try {
          const file = new File([blob], 'shot.jpg', { type: 'image/jpeg' })
          const tmpId = 'ucuzcu-shot-decode'
          let el = document.getElementById(tmpId)
          if (!el) {
            el = document.createElement('div')
            el.id = tmpId
            el.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px'
            document.body.appendChild(el)
          }
          const s = new Html5Qrcode(tmpId, { verbose: false, formatsToSupport: FORMATS })
          const text = await s.scanFile(file, false)
          try { s.clear() } catch { /* ignore */ }
          code = text.replace(/\D/g, '')
        } catch { /* ignore */ }
      }

      if (code && code.length >= 6) {
        setStatusText(`Bulundu: ${code}`)
        await finish(code)
        return
      }

      setStatusText('Bu karede barkod yok — yaklaş, netle, tekrar çek')
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
      let code = decodeCanvas(canvas)
      if (!code) {
        let el = document.getElementById('ucuzcu-shot-decode')
        if (!el) {
          el = document.createElement('div')
          el.id = 'ucuzcu-shot-decode'
          el.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px'
          document.body.appendChild(el)
        }
        const s = new Html5Qrcode('ucuzcu-shot-decode', { verbose: false, formatsToSupport: FORMATS })
        try {
          const text = await s.scanFile(file, false)
          code = text.replace(/\D/g, '')
        } finally {
          try { s.clear() } catch { /* ignore */ }
        }
      }
      if (code && code.length >= 6) {
        setStatusText(`Bulundu: ${code}`)
        await finish(code)
      } else {
        setStatusText('Fotoğrafta barkod bulunamadı')
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

        {/* Çekilen fotoğraf önizlemesi */}
        {previewUrl && (
          <div className="absolute inset-0 z-20 bg-black flex flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Çekilen kare" className="flex-1 object-contain w-full" />
            {statusText && (
              <p className="absolute bottom-4 inset-x-0 text-center text-white text-sm bg-black/60 py-2">{statusText}</p>
            )}
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
        {!previewUrl && statusText && (
          <p className="text-center text-xs text-amber-300">{statusText}</p>
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
