"use client"

import type React from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { Assistant, ConversationLog } from "@/types/chat"
import { ChatMessages } from "@/components/chat-messages"

interface ChatViewProps {
  assistants: Assistant[]
  situation: string
  conversationLog: ConversationLog[]
  setConversationLog: (log: ConversationLog[]) => void
  latestResponse: string
  setLatestResponse: (response: string) => void
  isReflecting: boolean
  setIsReflecting: (reflecting: boolean) => void
  isReady: boolean
  setIsReady: (ready: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  recognition: any
  setRecognition: (recognition: any) => void
}

export function ChatView({
  assistants,
  situation,
  conversationLog,
  setConversationLog,
  latestResponse,
  setLatestResponse,
  isReflecting,
  setIsReflecting,
  isReady,
  setIsReady,
  sidebarOpen,
  setSidebarOpen,
  isRecording,
  setIsRecording,
  recognition,
  setRecognition
}: ChatViewProps) {

  return (
    <div className="flex flex-col h-[84vh] bg-gray-50">
      {/* Header with Hamburger Menu */}
      <div className="bg-white border-b border-gray-200 p-4 md:p-6 relative">
        <SidebarTrigger className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2" />
        <h1 className="text-lg md:text-2xl font-bold text-center text-gray-800 px-12 lg:px-0">会話履歴</h1>
      </div>

      {/* Situation Description */}
      <div className="bg-white border-b border-gray-100 p-2 md:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 md:p-3">
            <div className="text-green-800 font-medium text-center whitespace-pre-line text-xs md:text-sm">{situation}</div>
          </div>
        </div>
      </div>

      {/* Chat Messages - Fixed height with scroll */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto p-2 md:p-4">
          {conversationLog.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-base md:text-lg">会話を開始してください</div>
            </div>
          ) : (
            <ChatMessages conversationLog={conversationLog} assistants={assistants} isReflecting={isReflecting} />
          )}
        </div>
      </div>
    </div>
  )
}
