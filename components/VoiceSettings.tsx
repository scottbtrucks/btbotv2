"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { toast } from "sonner"

interface VoiceSettingsProps {
  voiceGender: 'Female' | 'Male'
  onToggleVoiceGender: () => void
  onReplayWelcome: () => void
  isPlaying: boolean
  isProcessing: boolean
}

/**
 * Component for voice settings controls like gender selection
 */
export function VoiceSettings({
  voiceGender,
  onToggleVoiceGender,
  onReplayWelcome,
  isPlaying,
  isProcessing
}: VoiceSettingsProps) {
  return (
    <div className="flex space-x-2">
      <Button 
        variant={voiceGender === 'Female' ? "default" : "outline"} 
        size="sm"
        onClick={onToggleVoiceGender}
        className="relative group"
      >
        <span>{voiceGender === 'Female' ? 'Женский голос' : 'Мужской голос'}</span>
        <span className="absolute -right-1 -top-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-80">
          {voiceGender === 'Female' ? 'Ж' : 'М'}
        </span>
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onReplayWelcome}
        disabled={isPlaying || isProcessing}
        title="Воспроизвести приветствие"
      >
        <Play className="h-4 w-4 mr-1" />
        Приветствие
      </Button>
    </div>
  )
} 