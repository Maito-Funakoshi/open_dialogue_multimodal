"use client"

import { useState, useMemo } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { HomeView } from "@/components/home-view"
import { ChatView } from "@/components/chat-view"
import { SettingsView } from "@/components/settings-view"
import type { ConversationLog } from "@/types/chat"
import { ASSISTANTS, USER, GENDER } from "@/lib/config"
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
  
  // User settings state
  const [userName, setUserName] = useState<string>(USER)
  const [userGender, setUserGender] = useState<string>(GENDER)

  const genderscript = userGender != "未回答" ? `${userGender}の` : ""

  // Dynamic situation based on user settings
  const situation = useMemo(() => {
    return `オープンダイアローグが行われる場所
${userName}さんは${genderscript}クライアントで${ASSISTANTS[0].name}、${ASSISTANTS[1].name}、${ASSISTANTS[2].name}はアシスタント`
  }, [userName, userGender])

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex min-h-screen w-full relative">
        <AppSidebar assistants={ASSISTANTS} currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-1 flex flex-col space-evenly">
          {currentView === "home" && (
            <HomeView
              assistants={ASSISTANTS}
              situation={situation}
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
              situation={situation}
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
            <SettingsView
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              userName={userName}
              setUserName={setUserName}
              userGender={userGender}
              setUserGender={setUserGender}
            />
          )}
          {/* Input Area - Hide on settings page */}
          {currentView !== "settings" && (
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
              userName={userName}
              userGender={userGender}
            />
          )}
        </main>
      </div>
    </SidebarProvider>
  )
}
