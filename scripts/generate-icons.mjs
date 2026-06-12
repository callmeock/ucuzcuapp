/**
 * SVG → PWA ikonları üretir.
 * Kullanım: node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'public', 'icon.svg')
const outDir = join(root, 'public', 'icons')

mkdirSync(outDir, { recursive: true })

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512, pad: 0.15 },
]

// macOS sips ile SVG→PNG (qlmanage veya rsvg yoksa basit fallback)
function renderPng(size, pad = 0) {
  const out = join(outDir, `tmp-${size}.png`)
  try {
    // qlmanage macOS'ta SVG render eder
    execSync(`qlmanage -t -s ${size} -o "${outDir}" "${svgPath}" 2>/dev/null`, { stdio: 'pipe' })
    const generated = join(outDir, 'icon.svg.png')
    if (pad > 0) {
      // Maskable: içerik küçült (kenar boşluğu)
      const inner = Math.round(size * (1 - pad * 2))
      execSync(`sips -z ${inner} ${inner} "${generated}" --out "${out}" 2>/dev/null`, { stdio: 'pipe' })
      // Beyaz arka planlı kare oluştur
      execSync(
        `sips -z ${size} ${size} "${out}" --padColor e63946 --padToHeightWidth ${size} ${size} --out "${out}" 2>/dev/null`,
        { stdio: 'pipe' }
      )
    } else {
      execSync(`cp "${generated}" "${out}"`, { stdio: 'pipe' })
    }
    return out
  } catch {
    return null
  }
}

// Fallback: minimal PNG (düz kırmızı kare) — araç yoksa
function writeFallbackPng(filename, size) {
  // 1x1 kırmızı PNG base64, sips ile büyüt
  const tiny = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )
  const tmp = join(outDir, 'tiny.png')
  writeFileSync(tmp, tiny)
  const out = join(outDir, filename)
  try {
    execSync(`sips -z ${size} ${size} "${tmp}" --out "${out}" 2>/dev/null`, { stdio: 'pipe' })
  } catch {
    writeFileSync(out, tiny)
  }
}

for (const { name, size, pad = 0 } of sizes) {
  const rendered = renderPng(size, pad)
  const dest = join(outDir, name)
  if (rendered) {
    try {
      execSync(`cp "${rendered}" "${dest}"`, { stdio: 'pipe' })
    } catch {
      writeFallbackPng(name, size)
    }
  } else {
    writeFallbackPng(name, size)
  }
  console.log(`✓ ${name}`)
}

// Apple touch icon
try {
  execSync(`cp "${join(outDir, 'icon-192.png')}" "${join(root, 'public', 'apple-touch-icon.png')}"`, { stdio: 'pipe' })
  console.log('✓ apple-touch-icon.png')
} catch {}

console.log('İkonlar hazır:', outDir)
