"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Users, Menu } from "lucide-react"
import type { Assistant, ConversationLog } from "@/types/chat"
import { ChatMessages } from "@/components/chat-messages"
import { generateOpenAIResponse } from "@/lib/openai"
import { 
  parseAssistantResponse, 
  shouldActivateReflecting, 
  addSystemMessage, 
  addUserMessage 
} from "@/lib/chat-utils"

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
}: ChatViewProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return

    setIsLoading(true)
    setIsReady(false)

    // Add user message to log
    let newLog = addUserMessage(conversationLog, message)
    setConversationLog(newLog)

    try {
      // Check if reflecting mode should be activated
      const shouldReflect = shouldActivateReflecting(message)
      setIsReflecting(shouldReflect)

      // Add reflecting started message if reflecting
      if (shouldReflect) {
        newLog = addSystemMessage(newLog, "----- Reflecting Started -----")
        setConversationLog(newLog)
      }

      // Call OpenAI API to generate assistant responses
      const response = await generateOpenAIResponse(message, newLog, shouldReflect)

      // Parse and add assistant responses
      const assistantMessages = parseAssistantResponse(response, assistants)
      let updatedLog = [...newLog, ...assistantMessages]

      // Add reflecting ended message if reflecting
      if (shouldReflect) {
        updatedLog = addSystemMessage(updatedLog, "----- Reflecting Ended -----")
      }

      setConversationLog(updatedLog)
      setLatestResponse(response)
    } catch (error) {
      console.error("Error generating response:", error)
    } finally {
      setIsLoading(false)
      setIsReady(true)
      setMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startReflecting = async () => {
    if (isLoading) return

    // Set the message and immediately send it
    const reflectingMessage = "リフレクティングを開始して下さい"

    setIsLoading(true)
    setIsReady(false)

    // Add user message to log
    let newLog = addUserMessage(conversationLog, reflectingMessage)
    setConversationLog(newLog)

    try {
      setIsReflecting(true)

      // Add reflecting started message
      newLog = addSystemMessage(newLog, "----- Reflecting Started -----")
      setConversationLog(newLog)

      // Call OpenAI API to generate assistant responses
      const response = await generateOpenAIResponse(reflectingMessage, newLog, true)

      // Parse and add assistant responses
      const assistantMessages = parseAssistantResponse(response, assistants)
      let updatedLog = [...newLog, ...assistantMessages]

      // Add reflecting ended message
      updatedLog = addSystemMessage(updatedLog, "----- Reflecting Ended -----")

      setConversationLog(updatedLog)
      setLatestResponse(response)
    } catch (error) {
      console.error("Error generating response:", error)
    } finally {
      setIsLoading(false)
      setIsReady(true)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with Hamburger Menu */}
      <div className="bg-white border-b border-gray-200 p-6 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-4 top-1/2 transform -translate-y-1/2"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-center text-gray-800">会話履歴</h1>
      </div>

      {/* Situation Description */}
      <div className="bg-white border-b border-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-green-800 font-medium text-center whitespace-pre-line">{situation}</div>
          </div>
        </div>
      </div>

      {/* Chat Messages - Fixed height with scroll */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto p-4">
          {conversationLog.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-lg">会話を開始してください</div>
            </div>
          ) : (
            <ChatMessages conversationLog={conversationLog} assistants={assistants} isReflecting={isReflecting} />
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力してください..."
            className="flex-1 text-gray-900 placeholder-gray-500"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !message.trim()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Send className="w-4 h-4" />
            送信
          </Button>
          <Button
            variant="outline"
            onClick={startReflecting}
            disabled={isLoading}
            className="bg-purple-500 hover:bg-purple-600 text-white border-0"
            title="リフレクティングを開始"
          >
            <Users className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
