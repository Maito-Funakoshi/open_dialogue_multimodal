"use client"

import type React from "react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import type { Assistant, ConversationLog } from "@/types/chat"
import { AssistantAvatars } from "@/components/assistant-avatars"

interface HomeViewProps {
  assistants: Assistant[]
  situation: string
  isReady: boolean
  setIsReady: (ready: boolean) => void
  conversationLog: ConversationLog[]
  setConversationLog: (log: ConversationLog[]) => void
  latestResponse: string
  setLatestResponse: (response: string) => void
  isReflecting: boolean
  setIsReflecting: (reflecting: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  recognition: any
  setRecognition: (recognition: any) => void
  currentSpeakingAssistant?: string | null
  setCurrentSpeakingAssistant?: (assistantId: string | null) => void
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}


export function HomeView({
  assistants,
  situation,
  isReady,
  setIsReady,
  conversationLog,
  setConversationLog,
  latestResponse,
  setLatestResponse,
  isReflecting,
  setIsReflecting,
  sidebarOpen,
  setSidebarOpen,
  isRecording,
  setIsRecording,
  recognition,
  setRecognition,
  currentSpeakingAssistant,
  setCurrentSpeakingAssistant
}: HomeViewProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex flex-col h-[84vh] bg-gray-50">
      {/* Header with Hamburger Menu */}
      <div className="bg-white border-b border-gray-200 p-6 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-4 top-1/2 transform -translate-y-1/2"
          data-sidebar="trigger"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-center text-gray-800">オープンダイアローグチャットボット</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <AssistantAvatars 
          assistants={assistants} 
          currentSpeakingAssistant={currentSpeakingAssistant}
        />

        <div className="mt-8 mb-8 text-center text-gray-600 mb-6">
          {isRecording ? "録音中..." : isReady ? "準備完了" : "処理中..."}
        </div>
      </div>
    </div>
  )
}
