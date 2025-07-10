"use client"

import type React from "react"
import { useRef } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { Assistant, ConversationLog } from "@/types/chat"
import { AssistantAvatars } from "@/components/assistant-avatars"
import { Activity, Check, Loader } from "lucide-react"

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
      <div className="bg-white border-b border-gray-200 p-4 md:p-6 relative">
        <SidebarTrigger className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2" />
        <h1 className="text-md md:text-xl lg:text-2xl font-bold text-center text-gray-800 px-12 lg:px-0">
          オープンダイアローグチャットボット
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8">
        {/* Enhanced mobile display for assistants */}
        <div className="w-full flex justify-center">
          <AssistantAvatars
            assistants={assistants}
            currentSpeakingAssistant={currentSpeakingAssistant}
          />
        </div>

        {/* Enhanced status display for mobile */}
        <div className={`mt-8 md:mt-8 mb-8 md:mb-8 text-center text-xl md:text-2xl font-semibold ${isRecording ? "text-red-500" : isReady ? "text-green-500" : "text-blue-500"}`}>
          {isRecording ? (
            <div className="flex items-center justify-center gap-3">
              <Activity className="w-6 h-6 md:w-8 md:h-8 animate-pulse" />
              <div className="text-xl md:text-2xl">録音中...</div>
            </div>
          ) : isReady ? (
            <div className="flex items-center justify-center gap-3">
              <Check className="w-6 h-6 md:w-8 md:h-8" />
              <div className="text-xl md:text-2xl">準備完了！</div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Loader className="w-6 h-6 md:w-8 md:h-8 animate-spin" />
              <div className="text-xl md:text-2xl">処理中...</div>
            </div>
          )}
        </div>

        {/* Additional mobile enhancement hint */}
        {!conversationLog.length && (
          <div className="text-center text-gray-500 text-sm md:text-base max-w-md px-4">
            <p className="leading-relaxed">
              AIアシスタントと自然な対話を始めましょう。<br className="hidden sm:block" />
              下部の入力エリアからメッセージを送信できます。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
