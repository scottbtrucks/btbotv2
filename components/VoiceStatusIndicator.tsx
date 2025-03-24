"use client"

import React from "react"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface VoiceStatusIndicatorProps {
  isLoading: boolean
  error: string | null
}

/**
 * Component for displaying loading states and errors for the voice recorder
 */
export function VoiceStatusIndicator({
  isLoading,
  error
}: VoiceStatusIndicatorProps) {
  return (
    <>
      {isLoading && (
        <div className="flex justify-center items-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Загрузка...</span>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  )
} 