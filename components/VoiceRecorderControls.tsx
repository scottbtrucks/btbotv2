"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Mic, Send, StopCircle } from "lucide-react"

interface VoiceRecorderControlsProps {
  isRecording: boolean
  isProcessing: boolean
  isLoading: boolean
  hasTranscript: boolean
  startRecording: () => void
  stopRecording: () => void
  processVoice: () => void
  isSpeechRecognitionSupported: boolean
}

/**
 * Component for voice recording controls (start/stop recording and send)
 */
export function VoiceRecorderControls({
  isRecording,
  isProcessing,
  isLoading,
  hasTranscript,
  startRecording,
  stopRecording,
  processVoice,
  isSpeechRecognitionSupported
}: VoiceRecorderControlsProps) {
  return (
    <div className="flex space-x-2 mt-4">
      {!isRecording ? (
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={startRecording} 
          disabled={!isSpeechRecognitionSupported || isProcessing}
        >
          <Mic className="h-5 w-5 mr-2" />
          Записать голос
        </Button>
      ) : (
        <Button 
          variant="destructive" 
          className="flex-1"
          onClick={stopRecording}
        >
          <StopCircle className="h-5 w-5 mr-2" />
          Остановить запись
        </Button>
      )}
      
      <Button 
        className="flex-1"
        onClick={processVoice} 
        disabled={!hasTranscript || isProcessing || isLoading}
      >
        {isProcessing || isLoading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            Обработка...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Отправить
          </>
        )}
      </Button>
    </div>
  )
} 