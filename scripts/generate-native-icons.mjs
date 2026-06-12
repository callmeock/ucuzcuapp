/**
 * macOS sips ile iOS/Android native ikonları üretir.
 * Kullanım: node scripts/generate-native-icons.mjs
 */
import { execSync } from 'child_process'
import { existsSync, mkdirSync, cpSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'assets', 'icon.png')
if (!existsSync(src)) {
  console.error('assets/icon.png bulunamadı. Önce: pnpm icons')
  process.exit(1)
}

const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
}

for (const [folder, size] of Object.entries(androidSizes)) {
  const dir = join(root, 'android', 'app', 'src', 'main', 'res', folder)
  mkdirSync(dir, { recursive: true })
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
    const out = join(dir, name)
    const fgSize = name.includes('foreground') ? Math.round(size * 0.65) : size
    execSync(`sips -z ${fgSize} ${fgSize} "${src}" --out "${out}"`, { stdio: 'pipe' })
  }
  console.log(`✓ android/${folder}`)
}

// iOS App Icon (1024)
const iosIcon = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png')
cpSync(src, iosIcon)
console.log('✓ ios AppIcon')

// Splash: kırmızı arka plan + ortada logo
const splashSizes = [
  ['drawable/splash.png', 480],
  ['drawable-port-mdpi/splash.png', 320],
  ['drawable-port-hdpi/splash.png', 480],
  ['drawable-port-xhdpi/splash.png', 720],
  ['drawable-port-xxhdpi/splash.png', 1080],
  ['drawable-port-xxxhdpi/splash.png', 1440],
]

for (const [rel, size] of splashSizes) {
  const dir = join(root, 'android', 'app', 'src', 'main', 'res', dirname(rel))
  const out = join(root, 'android', 'app', 'src', 'main', 'res', rel)
  mkdirSync(dir, { recursive: true })
  // Düz kırmızı splash
  const tmp = join(root, 'assets', '_splash_tmp.png')
  execSync(`sips -z ${size} ${size} "${src}" --padColor e63946 --padToHeightWidth ${size} ${size} --out "${tmp}"`, { stdio: 'pipe' })
  cpSync(tmp, out)
}
console.log('✓ android splash screens')

console.log('Native ikonlar hazır.')
