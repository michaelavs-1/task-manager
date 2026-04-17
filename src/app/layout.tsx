import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"

export const metadata: Metadata = {
  title: "אלגוריתם הפקות",
  description: "מערכת ניהול אלגוריתם הפקות",
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('error', function(e) {
            if (e.message && (e.message.includes('Loading chunk') || e.message.includes('ChunkLoadError') || e.message.includes('Failed to fetch dynamically imported module'))) {
              console.log('Chunk load error — reloading...');
              window.location.reload();
            }
          });
          window.addEventListener('unhandledrejection', function(e) {
            if (e.reason && e.reason.name === 'ChunkLoadError') {
              console.log('Chunk load rejection — reloading...');
              window.location.reload();
            }
          });
        `}} />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
