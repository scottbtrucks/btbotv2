import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { checkRequiredEnvVars } from "@/lib/env-check"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

// Run environment check during server-side rendering
checkRequiredEnvVars()

export const metadata: Metadata = {
  title: "Business Trucks - Полина (AI Assistant)",
  description: "AI assistant for Business Trucks commercial vehicle sales",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'