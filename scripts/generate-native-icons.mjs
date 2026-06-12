/**
 * Logo → iOS/Android native ikonları ve splash ekranları.
 * Kaynak: assets/logo.png
 * Kullanım: node scripts/generate-native-icons.mjs
 */
import { execSync } from 'child_process'
import { existsSync, mkdirSync, cpSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'assets', 'logo.png')
const icon1024 = join(root, 'assets', 'icon.png')
const BRAND_BG = '00B8D8'

if (!existsSync(src)) {
  console.error('assets/logo.png bulunamadı.')
  process.exit(1)
}

if (!existsSync(icon1024)) {
  execSync(`sips -z 1024 1024 "${src}" --out "${icon1024}"`, { stdio: 'pipe' })
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
    const s = name.includes('foreground') ? Math.round(size * 0.85) : size
    execSync(`sips -z ${s} ${s} "${src}" --out "${out}"`, { stdio: 'pipe' })
  }
  console.log(`✓ android/${folder}`)
}

// iOS App Icon
const iosIcon = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png')
cpSync(icon1024, iosIcon)
console.log('✓ ios AppIcon')

// iOS Splash
const iosSplashDir = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset')
const iosSplash = join(iosSplashDir, 'splash-2732x2732.png')
execSync(`sips -z 1200 1200 "${src}" --padColor ${BRAND_BG} --padToHeightWidth 2732 2732 --out "${iosSplash}"`, { stdio: 'pipe' })
cpSync(iosSplash, join(iosSplashDir, 'splash-2732x2732-1.png'))
cpSync(iosSplash, join(iosSplashDir, 'splash-2732x2732-2.png'))
console.log('✓ ios Splash')

// Android splash
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
  const logoSize = Math.round(size * 0.55)
  const tmp = join(root, 'assets', '_splash_logo.png')
  execSync(`sips -z ${logoSize} ${logoSize} "${src}" --out "${tmp}"`, { stdio: 'pipe' })
  execSync(
    `sips -z ${size} ${size} "${tmp}" --padColor ${BRAND_BG} --padToHeightWidth ${size} ${size} --out "${out}"`,
    { stdio: 'pipe' }
  )
  try { unlinkSync(tmp) } catch {}
}
console.log('✓ android splash screens')
console.log('Native ikonlar hazır.')
