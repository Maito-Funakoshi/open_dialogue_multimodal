"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Send, Users, Menu } from "lucide-react"
import type { Assistant, ConversationLog } from "@/types/chat"
import { AssistantAvatars } from "@/components/assistant-avatars"
import { generateOpenAIResponse } from "@/lib/openai"
import { 
  parseAssistantResponse, 
  shouldActivateReflecting, 
  addSystemMessage, 
  addUserMessage 
} from "@/lib/chat-utils"

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
}: HomeViewProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // 音声入力の初期化
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition()
        recognitionInstance.continuous = true
        recognitionInstance.interimResults = true
        recognitionInstance.lang = "ja-JP"

        recognitionInstance.onresult = (event: any) => {
          let transcript = ""
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript
          }
          setMessage(transcript)
        }

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
          setIsRecording(false)
        }

        recognitionInstance.onend = () => {
          setIsRecording(false)
        }

        setRecognition(recognitionInstance)
      }
    }
  }, [])

  const toggleRecording = () => {
    if (!recognition) {
      alert("音声認識がサポートされていません")
      return
    }

    if (isRecording) {
      recognition.stop()
      setIsRecording(false)
    } else {
      setMessage("") // Clear previous message
      recognition.start()
      setIsRecording(true)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return

    // Stop recording if active
    if (isRecording && recognition) {
      recognition.stop()
      setIsRecording(false)
    }

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

    // Stop recording if active
    if (isRecording && recognition) {
      recognition.stop()
      setIsRecording(false)
    }

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
          data-sidebar="trigger"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-center text-gray-800">オープンダイアローグチャットボット</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <AssistantAvatars assistants={assistants} />

        <div className="mt-8 mb-8">
          <div className="text-center text-gray-600 mb-6">
            {isRecording ? "録音中..." : isReady ? "準備完了" : "処理中..."}
          </div>

          {/* Voice Input Button - Prominently centered */}
          <div className="flex justify-center mb-8">
            <Button
              variant="outline"
              size="lg"
              onClick={toggleRecording}
              className={`rounded-full w-20 h-20 border-0 shadow-lg transition-all duration-200 ${isRecording ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-red-500 hover:bg-red-600"
                } text-white`}
              disabled={isLoading}
            >
              <Mic className="w-8 h-8" />
            </Button>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isRecording ? "音声を認識中..." : "メッセージを入力してください..."}
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
