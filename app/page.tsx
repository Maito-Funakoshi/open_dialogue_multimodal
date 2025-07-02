"use client"

import { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { HomeView } from "@/components/home-view"
import { ChatView } from "@/components/chat-view"
import type { ConversationLog } from "@/types/chat"
import { ASSISTANTS, SITUATION } from "@/lib/config"
import { MessageInput } from "@/components/message-input"

export default function Home() {
  const [currentView, setCurrentView] = useState<"home" | "chat" | "settings">("home")
  const [conversationLog, setConversationLog] = useState<ConversationLog[]>([])
  const [latestResponse, setLatestResponse] = useState<string>("")
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [isReflecting, setIsReflecting] = useState(false)
  const [isReady, setIsReady] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex min-h-screen w-full relative">
        <AppSidebar assistants={ASSISTANTS} currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-1 flex flex-col space-evenly">
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
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              recognition={recognition}
              setRecognition={setRecognition}
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
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              recognition={recognition}
              setRecognition={setRecognition}
            />
          )}
          {currentView === "settings" && (
            <div className="flex flex-col items-center justify-center h-[84vh]">
              <div className="text-gray-500 text-lg">設定画面（準備中）</div>
            </div>
          )}
          {/* Input Area */}
          <MessageInput
            conversationLog={conversationLog}
            setConversationLog={setConversationLog}
            setLatestResponse={setLatestResponse}
            setIsReflecting={setIsReflecting}
            isReady={isReady}
            setIsReady={setIsReady}
            assistants={ASSISTANTS}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            recognition={recognition}
            setRecognition={setRecognition}
            placeholder={isRecording ? "音声を認識中..." : "メッセージを入力してください..."}
          />
        </main>
      </div>
    </SidebarProvider>
  )
}
