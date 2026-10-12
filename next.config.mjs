const isDev = process.env.NODE_ENV !== 'production'

// Origin of the backend API, so the browser may call it (and nothing else).
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL || 'https://veepee-impex.vercel.app/api/v1').origin
  } catch {
    return ''
  }
})()

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js inlines its bootstrap scripts, so inline scripts stay allowed.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Firebase endpoints are needed for browser push notifications.
  `connect-src 'self' ${apiOrigin} https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://fcm.googleapis.com${isDev ? ' ws: http://localhost:* http://127.0.0.1:*' : ''}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

// The push service worker loads Firebase's own scripts, so it gets its own
// (still tight) policy instead of the page policy.
const serviceWorkerPolicy = [
  "default-src 'self'",
  "script-src 'self' https://www.gstatic.com",
  "connect-src 'self' https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://fcm.googleapis.com https://www.googleapis.com",
  "object-src 'none'",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      { source: '/((?!firebase-messaging-sw\\.js).*)', headers: securityHeaders },
      {
        source: '/firebase-messaging-sw.js',
        headers: [
          { key: 'Content-Security-Policy', value: serviceWorkerPolicy },
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig
