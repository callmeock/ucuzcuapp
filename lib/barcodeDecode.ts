/**
 * Barkod decode — ZBar (güçlü 1D) + ZXing yedek
 */
import {
  MultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library'

let zbarReady = false

async function getZbar() {
  const zbar = await import('@undecaf/zbar-wasm')
  if (!zbarReady) {
    zbar.setModuleArgs({
      locateFile: (file: string) => `/${file}`,
    })
    zbarReady = true
  }
  return zbar
}

function rotateImageData90(src: ImageData): ImageData {
  const { width: w, height: h, data } = src
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4
      const dx = h - 1 - y
      const dy = x
      const di = (dy * h + dx) * 4
      out[di] = data[si]
      out[di + 1] = data[si + 1]
      out[di + 2] = data[si + 2]
      out[di + 3] = 255
    }
  }
  return new ImageData(out, h, w)
}

function cleanCode(raw: string): string | null {
  const code = String(raw).replace(/\D/g, '')
  return code.length >= 6 ? code : null
}

/** ZBar — bu kola kutusunu ZXing'in okuyamadığı yerde okuyor */
async function decodeWithZbar(imageData: ImageData): Promise<string | null> {
  try {
    const { scanImageData } = await getZbar()
    let cur = imageData
    for (let i = 0; i < 4; i++) {
      const symbols = await scanImageData(cur)
      if (symbols.length > 0) {
        const hit = cleanCode(symbols[0].decode())
        if (hit) return hit
      }
      cur = rotateImageData90(cur)
    }
  } catch (e) {
    console.warn('zbar decode error', e)
  }
  return null
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

function decodeWithZxing(imageData: ImageData): string | null {
  const reader = createZxingReader()
  const { width: w, height: h, data } = imageData
  let lum = toLum(data, w, h)
  let cw = w
  let ch = h
  for (let r = 0; r < 4; r++) {
    try {
      const source = new RGBLuminanceSource(lum, cw, ch)
      const bitmap = new BinaryBitmap(new HybridBinarizer(source))
      const result = reader.decode(bitmap)
      reader.reset()
      const hit = cleanCode(result.getText())
      if (hit) return hit
    } catch {
      try { reader.reset() } catch { /* ignore */ }
    }
    // rotate lum 90
    const out = new Uint8ClampedArray(cw * ch)
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        out[x * ch + (ch - 1 - y)] = lum[y * cw + x]
      }
    }
    lum = out
    const tmp = cw
    cw = ch
    ch = tmp
  }
  return null
}

function scaleImageData(src: ImageData, maxSide: number): ImageData {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height))
  if (scale >= 0.99) return src
  const tw = Math.max(1, Math.floor(src.width * scale))
  const th = Math.max(1, Math.floor(src.height * scale))
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  c.getContext('2d')!.putImageData(src, 0, 0)
  const out = document.createElement('canvas')
  out.width = tw
  out.height = th
  out.getContext('2d')!.drawImage(c, 0, 0, tw, th)
  return out.getContext('2d')!.getImageData(0, 0, tw, th)
}

/**
 * Canvas'tan barkod oku. Önce ZBar (güçlü), sonra ZXing.
 */
export async function decodeBarcodeFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const full = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // 1) ZBar tam kare — screenshot testinde bu çalıştı
  let hit = await decodeWithZbar(full)
  if (hit) return hit

  // 2) ZBar ölçeklenmiş
  hit = await decodeWithZbar(scaleImageData(full, 1280))
  if (hit) return hit
  hit = await decodeWithZbar(scaleImageData(full, 800))
  if (hit) return hit

  // 3) ZXing yedek
  hit = decodeWithZxing(full)
  if (hit) return hit
  hit = decodeWithZxing(scaleImageData(full, 1000))
  if (hit) return hit

  return null
}
