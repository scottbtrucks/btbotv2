import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, MessageSquare, Info, Mic } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-primary text-primary-foreground py-6 px-6 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Business Trucks</h1>
          <p className="text-lg opacity-90">Система поддержки продаж коммерческого транспорта</p>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl w-full">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                <span>Текстовый чат</span>
              </CardTitle>
              <CardDescription>
                Чат с AI-ассистентом для помощи клиентам в выборе коммерческого транспорта
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Общайтесь с Полиной в текстовом формате. Она ответит на вопросы клиентов о моделях
                транспорта, характеристиках и ценах.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/chat" className="w-full">
                <Button className="w-full">Перейти к чату</Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="mr-2 h-5 w-5" />
                <span>Голосовой помощник</span>
              </CardTitle>
              <CardDescription>
                Общайтесь с AI-ассистентом голосом и получайте голосовые ответы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Задавайте вопросы с помощью голоса и получайте синтезированные голосовые ответы от 
                Полины. Удобно, когда нет возможности печатать.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/voice" className="w-full">
                <Button variant="outline" className="w-full">Голосовой чат</Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                <span>Управление и диагностика</span>
              </CardTitle>
              <CardDescription>
                Инструменты для проверки и настройки системы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Проверьте состояние API-ключей, настройте параметры работы системы
                и протестируйте интеграции с сервисами искусственного интеллекта.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/debug" className="w-full">
                <Button variant="outline" className="w-full">Диагностика</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
        
        <div className="mt-12 text-center text-gray-500 dark:text-gray-400">
          <p className="flex items-center justify-center">
            <Info className="h-4 w-4 mr-2" />
            Версия 1.2.0 - Обновлено: {new Date().toLocaleDateString()}
          </p>
        </div>
      </main>
    </div>
  )
}

