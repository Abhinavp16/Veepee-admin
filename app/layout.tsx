import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Veepee Admin",
  description: "Veepee administration dashboard for operations and staff workflows",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true, "max-video-preview": -1, "max-image-preview": "none", "max-snippet": -1 } },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body className={`${spaceGrotesk.className} antialiased`}>{children}<Toaster richColors position="top-right" /><Analytics /></body></html>
}
