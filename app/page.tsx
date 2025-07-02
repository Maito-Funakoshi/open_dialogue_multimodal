"use client"

import { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { HomeView } from "@/components/home-view"
import { ChatView } from "@/components/chat-view"
import type { ConversationLog } from "@/types/chat"
import { ASSISTANTS, SITUATION } from "@/lib/config"

export default function Home() {
  const [currentView, setCurrentView] = useState<"home" | "chat" | "settings">("home")
  const [conversationLog, setConversationLog] = useState<ConversationLog[]>([])
  const [latestResponse, setLatestResponse] = useState<string>("")
  const [isReflecting, setIsReflecting] = useState(false)
  const [isReady, setIsReady] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex min-h-screen w-full relative">
        <AppSidebar assistants={ASSISTANTS} currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-1 flex flex-col">
          {currentView === "home" && (
            <HomeView
              assistants={ASSISTANTS}
              situation={SITUATION}
              isReady={isReady}
              setIsReady={setIsReady}
              conversationLog={conversationLog}
              setConversationLog={setConversationLog}
              latestResponse={latestResponse}
              setLatestResponse={setLatestResponse}
              isReflecting={isReflecting}
              setIsReflecting={setIsReflecting}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
          )}
          {currentView === "chat" && (
            <ChatView
              assistants={ASSISTANTS}
              situation={SITUATION}
              conversationLog={conversationLog}
              setConversationLog={setConversationLog}
              latestResponse={latestResponse}
              setLatestResponse={setLatestResponse}
              isReflecting={isReflecting}
              setIsReflecting={setIsReflecting}
              isReady={isReady}
              setIsReady={setIsReady}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
          )}
          {currentView === "settings" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500 text-lg">設定画面（準備中）</div>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  )
}
