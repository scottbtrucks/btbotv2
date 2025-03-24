"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Play, VolumeX } from "lucide-react"

interface VoicePlaybackProps {
  lastResponse: string
  isPlaying: boolean
  onPlay: () => void
  onStop: () => void
}

/**
 * Component for displaying the last response with playback controls
 */
export function VoicePlayback({
  lastResponse,
  isPlaying,
  onPlay,
  onStop
}: VoicePlaybackProps) {
  if (!lastResponse) return null;
  
  return (
    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md mb-3">
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium">Последний ответ:</p>
        <div>
          {isPlaying ? (
            <Button variant="ghost" size="sm" onClick={onStop} className="h-8 w-8 p-0">
              <VolumeX className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onPlay} className="h-8 w-8 p-0">
              <Play className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <p>{lastResponse}</p>
    </div>
  )
} 