"use client"

import { useState, useMemo, useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { HomeView } from "@/components/home-view"
import { ChatView } from "@/components/chat-view"
import { SettingsView } from "@/components/settings-view"
import type { ConversationLog } from "@/types/chat"
import { ASSISTANTS, USER, GENDER, CONVERSATION_LOG_KEY } from "@/lib/config"
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
  const [currentSpeakingAssistant, setCurrentSpeakingAssistant] = useState<string | null>(null)
  
  // User settings state
  const [userName, setUserName] = useState<string>(USER)
  const [userGender, setUserGender] = useState<string>(GENDER)

  const genderscript = userGender != "未回答" ? `${userGender}の` : ""

    // Load user settings from localStorage on component mount
  // このuseEffectがクライアントサイドでのみ実行される
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUserName = localStorage.getItem("userName")
      const savedUserGender = localStorage.getItem("gender")
      if (savedUserName) {
        setUserName(savedUserName)
      }
      if (savedUserGender) {
        setUserGender(savedUserGender)
      }
    }
  }, [])

  // Dynamic situation based on user settings
  const situation = useMemo(() => {
    return `オープンダイアローグが行われる場所
${userName}さんは${genderscript}クライアントで${ASSISTANTS[0].name}、${ASSISTANTS[1].name}、${ASSISTANTS[2].name}はアシスタント`
  }, [userName, userGender])


  // Load conversation log from localStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedLog = localStorage.getItem(CONVERSATION_LOG_KEY)
        if (savedLog) {
          const parsedLog = JSON.parse(savedLog) as ConversationLog[]
          setConversationLog(parsedLog)
        }
      } catch (error) {
        console.error("Failed to load conversation log from localStorage:", error)
      }
    }
  }, [])

  // Custom setConversationLog function that also saves to localStorage
  const updateConversationLog = (newLog: ConversationLog[]) => {
    console.log("newLog: ", newLog)
    setConversationLog(newLog)
    
    // Save to localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(CONVERSATION_LOG_KEY, JSON.stringify(newLog))
      } catch (error) {
        console.error("Failed to save conversation log to localStorage:", error)
      }
    }
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex min-h-screen w-full relative">
        {/* Desktop sidebar - always visible on desktop */}
        <div className="hidden md:block">
          <AppSidebar 
            assistants={ASSISTANTS} 
            currentView={currentView} 
            setCurrentView={setCurrentView}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </div>
        <main className="flex-1 flex flex-col w-full lg:ml-0">
          {currentView === "home" && (
            <HomeView
              assistants={ASSISTANTS}
              situation={situation}
              isReady={isReady}
              setIsReady={setIsReady}
              conversationLog={conversationLog}
              setConversationLog={updateConversationLog}
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
              currentSpeakingAssistant={currentSpeakingAssistant}
              setCurrentSpeakingAssistant={setCurrentSpeakingAssistant}
            />
          )}
          {currentView === "chat" && (
            <ChatView
              assistants={ASSISTANTS}
              situation={situation}
              conversationLog={conversationLog}
              setConversationLog={updateConversationLog}
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
              setConversationLog={updateConversationLog}
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
              setCurrentSpeakingAssistant={setCurrentSpeakingAssistant}
            />
          )}
        </main>
      </div>
    </SidebarProvider>
  )
}
