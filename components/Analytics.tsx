import { GoogleAnalytics } from '@next/third-parties/google'

const GA_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

export default function Analytics() {
  if (!GA_ID) return null
  return <GoogleAnalytics gaId={GA_ID} />
}
