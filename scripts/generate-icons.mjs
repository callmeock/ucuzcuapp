/**
 * Logo PNG → PWA ikonları üretir.
 * Kaynak: assets/logo.png
 * Kullanım: node scripts/generate-icons.mjs
 */
import { execSync } from 'child_process'
import { existsSync, mkdirSync, cpSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'assets', 'logo.png')
const outDir = join(root, 'public', 'icons')
const BRAND_BG = '09DEFF' // logo turkuaz arka plan

if (!existsSync(src)) {
  console.error('assets/logo.png bulunamadı.')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

function resize(size, out, pad = 0) {
  if (pad > 0) {
    const inner = Math.round(size * (1 - pad * 2))
    const tmp = join(outDir, `_tmp-${size}.png`)
    execSync(`sips -z ${inner} ${inner} "${src}" --out "${tmp}"`, { stdio: 'pipe' })
    execSync(
      `sips -z ${size} ${size} "${tmp}" --padColor ${BRAND_BG} --padToHeightWidth ${size} ${size} --out "${out}"`,
      { stdio: 'pipe' }
    )
  } else {
    execSync(`sips -z ${size} ${size} "${src}" --out "${out}"`, { stdio: 'pipe' })
  }
}

resize(192, join(outDir, 'icon-192.png'))
resize(512, join(outDir, 'icon-512.png'))
resize(512, join(outDir, 'icon-maskable-512.png'), 0.08)

cpSync(join(outDir, 'icon-192.png'), join(root, 'public', 'apple-touch-icon.png'))

// App Store / native kaynak (1024)
execSync(`sips -z 1024 1024 "${src}" --out "${join(root, 'assets', 'icon.png')}"`, { stdio: 'pipe' })

console.log('✓ icon-192.png')
console.log('✓ icon-512.png')
console.log('✓ icon-maskable-512.png')
console.log('✓ apple-touch-icon.png')
console.log('✓ assets/icon.png (1024)')
