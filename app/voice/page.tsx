"use client"

import { VoiceRecorder } from "@/components/VoiceRecorder"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function VoiceChatPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">Business Trucks</h1>
            <span className="ml-4 text-lg hidden sm:inline">Голосовой чат с Полиной</span>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Голосовой помощник</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Запишите ваш вопрос о коммерческом транспорте и получите ответ от нашего AI-ассистента Полины
            </p>
          </div>
          
          <VoiceRecorder />
          
          <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
            <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2">Подсказка</h3>
            <p className="text-sm">
              Вы можете задать вопросы о моделях коммерческого транспорта, технических характеристиках, 
              ценах и доступности, а также записаться на тест-драйв или консультацию.
            </p>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/chat">
              <Button variant="outline">
                Перейти к текстовому чату
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 