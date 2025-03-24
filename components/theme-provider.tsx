'use client'

import * as React from 'react'

type ThemeProviderProps = {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

// Simplified theme provider that doesn't depend on next-themes
export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>
}
