"use client"

import React from "react"

interface VoiceTranscriptProps {
  transcript: string
}

/**
 * Component for displaying the transcribed text from voice input
 */
export function VoiceTranscript({
  transcript
}: VoiceTranscriptProps) {
  if (!transcript) return null;
  
  return (
    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md mb-3">
      <p className="text-sm font-medium">Распознанный текст:</p>
      <p>{transcript}</p>
    </div>
  )
} 