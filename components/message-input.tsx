"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Mic, Users } from "lucide-react"
import type { Assistant, ConversationLog } from "@/types/chat"
import { generateOpenAIResponse } from "@/lib/openai"
import {
  parseAssistantResponse,
  addSystemMessage,
  addUserMessage
} from "@/lib/chat-utils"
import { safePlayAssistantMessages } from "@/lib/voice-utils"
import { AudioManager } from "@/lib/audio-manager"

interface MessageInputProps {
  conversationLog: ConversationLog[]
  setConversationLog: (log: ConversationLog[]) => void
  setLatestResponse: (response: string) => void
  setIsReflecting: (reflecting: boolean) => void
  isReady: boolean
  setIsReady: (ready: boolean) => void
  assistants: Assistant[]
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  recognition: any
  setRecognition: (recognition: any) => void
  placeholder?: string
  userName: string
  userGender: string
  setCurrentSpeakingAssistant?: (assistantId: string | null) => void
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function MessageInput({
  conversationLog,
  setConversationLog,
  setLatestResponse,
  setIsReflecting,
  isReady,
  setIsReady,
  assistants,
  isRecording,
  setIsRecording,
  recognition,
  setRecognition,
  placeholder = "メッセージを入力してください...",
  userName,
  userGender,
  setCurrentSpeakingAssistant
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

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
  }, [setIsRecording, setRecognition])

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return

    console.log(`🔄 [MESSAGE-INPUT] Starting handleSendMessage for: "${message.substring(0, 30)}..."`)
    const overallStartTime = performance.now()
    let responseGenTime = 0
    let parseTime = 0

    // iOS向けのオーディオコンテキスト解除
    const audioInitStart = performance.now()
    const audioManager = AudioManager.getInstance()
    await audioManager.handleUserInteraction()
    console.log(`🎵 [AUDIO] Audio context initialization: ${(performance.now() - audioInitStart).toFixed(2)}ms`)

    // Stop recording if active
    if (isRecording && recognition) {
      recognition.stop()
      setIsRecording(false)
    }

    setIsLoading(true)
    setIsReady(false)

    // Add user message to log
    const logUpdateStart = performance.now()
    let newLog = addUserMessage(conversationLog, message)
    setConversationLog(newLog)
    console.log(`💾 [STATE] User message log update: ${(performance.now() - logUpdateStart).toFixed(2)}ms`)

    try {
      // Call OpenAI API to generate assistant responses
      console.log(`🤖 [API] Starting OpenAI response generation...`)
      const responseGenStart = performance.now()
      const response = await generateOpenAIResponse(message, newLog, false, userName, userGender)
      responseGenTime = performance.now() - responseGenStart
      console.log(`🤖 [API] OpenAI response generation completed: ${responseGenTime.toFixed(2)}ms`)
      console.log(`📝 [API] Generated response length: ${response.length} characters`)

      // Parse and add assistant responses
      const parseStart = performance.now()
      const assistantMessages = parseAssistantResponse(response, assistants)
      parseTime = performance.now() - parseStart
      console.log(`📋 [PARSE] Response parsing completed: ${parseTime.toFixed(2)}ms`)
      console.log(`🗣️ [PARSE] Parsed ${assistantMessages.length} assistant messages`)

      const stateUpdateStart = performance.now()
      let updatedLog = [...newLog, ...assistantMessages]
      setConversationLog(updatedLog)
      setLatestResponse(response)
      console.log(`💾 [STATE] Assistant messages log update: ${(performance.now() - stateUpdateStart).toFixed(2)}ms`)

      // 音声再生を実行（リアルタイム生成）
      console.log(`🎵 [VOICE] Starting voice playback for ${assistantMessages.length} messages...`)
      const voicePlayStart = performance.now()
      safePlayAssistantMessages(
        assistantMessages,
        (assistantId) => setCurrentSpeakingAssistant?.(assistantId),
        (assistantId) => setCurrentSpeakingAssistant?.(null)
      )
      console.log(`🎵 [VOICE] Voice playback initiated: ${(performance.now() - voicePlayStart).toFixed(2)}ms`)
      
    } catch (error) {
      console.error("❌ [ERROR] Error generating response:", error)
    } finally {
      const overallTime = performance.now() - overallStartTime
      console.log(`✅ [COMPLETE] Total handleSendMessage time: ${overallTime.toFixed(2)}ms`)
      console.log(`📊 [SUMMARY] Breakdown - API: ${responseGenTime.toFixed(2)}ms, Parse: ${parseTime.toFixed(2)}ms, Total: ${overallTime.toFixed(2)}ms`)
      
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

  const toggleRecording = async () => {
    if (!recognition) {
      alert("音声認識がサポートされていません")
      return
    }

    // iOS向けのオーディオコンテキスト解除
    const audioManager = AudioManager.getInstance()
    await audioManager.handleUserInteraction()

    if (isRecording) {
      recognition.stop()
      setIsRecording(false)
      handleSendMessage()
    } else {
      setMessage("") // Clear previous message
      recognition.start()
      setIsRecording(true)
    }
  }

  const startReflecting = async () => {
    if (isLoading) return

    console.log(`🔄 [REFLECTING] Starting reflecting mode`)
    const reflectingStartTime = performance.now()
    let responseGenTime = 0
    let parseTime = 0

    // iOS向けのオーディオコンテキスト解除
    const audioInitStart = performance.now()
    const audioManager = AudioManager.getInstance()
    await audioManager.handleUserInteraction()
    console.log(`🎵 [REFLECTING] Audio context initialization: ${(performance.now() - audioInitStart).toFixed(2)}ms`)

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
    const logUpdateStart = performance.now()
    let newLog = addUserMessage(conversationLog, reflectingMessage)
    setConversationLog(newLog)
    console.log(`💾 [REFLECTING] User message log update: ${(performance.now() - logUpdateStart).toFixed(2)}ms`)

    try {
      setIsReflecting(true)

      // Add reflecting started message
      const systemMsgStart = performance.now()
      newLog = addSystemMessage(newLog, "----- Reflecting Started -----")
      setConversationLog(newLog)
      console.log(`💾 [REFLECTING] System message added: ${(performance.now() - systemMsgStart).toFixed(2)}ms`)

      // Call OpenAI API to generate assistant responses
      console.log(`🤖 [REFLECTING] Starting OpenAI reflecting response generation...`)
      const responseGenStart = performance.now()
      const response = await generateOpenAIResponse(reflectingMessage, newLog, true, userName, userGender)
      responseGenTime = performance.now() - responseGenStart
      console.log(`🤖 [REFLECTING] OpenAI reflecting response generation completed: ${responseGenTime.toFixed(2)}ms`)
      console.log(`📝 [REFLECTING] Generated reflecting response length: ${response.length} characters`)

      // Parse and add assistant responses
      const parseStart = performance.now()
      const assistantMessages = parseAssistantResponse(response, assistants)
      parseTime = performance.now() - parseStart
      console.log(`📋 [REFLECTING] Response parsing completed: ${parseTime.toFixed(2)}ms`)
      console.log(`🗣️ [REFLECTING] Parsed ${assistantMessages.length} reflecting messages`)

      const stateUpdateStart = performance.now()
      let updatedLog = [...newLog, ...assistantMessages]

      // Add reflecting ended message
      updatedLog = addSystemMessage(updatedLog, "----- Reflecting Ended -----")

      setConversationLog(updatedLog)
      setLatestResponse(response)
      console.log(`💾 [REFLECTING] Final log update: ${(performance.now() - stateUpdateStart).toFixed(2)}ms`)

      // 音声再生を実行（リアルタイム生成）
      console.log(`🎵 [REFLECTING] Starting reflecting voice playback for ${assistantMessages.length} messages...`)
      const voicePlayStart = performance.now()
      safePlayAssistantMessages(
        assistantMessages,
        (assistantId) => setCurrentSpeakingAssistant?.(assistantId),
        (assistantId) => setCurrentSpeakingAssistant?.(null)
      )
      console.log(`🎵 [REFLECTING] Reflecting voice playback initiated: ${(performance.now() - voicePlayStart).toFixed(2)}ms`)
      
    } catch (error) {
      console.error("❌ [REFLECTING] Error generating reflecting response:", error)
    } finally {
      const totalReflectingTime = performance.now() - reflectingStartTime
      console.log(`✅ [REFLECTING] Reflecting mode completed: ${totalReflectingTime.toFixed(2)}ms`)
      console.log(`📊 [REFLECTING] Summary - API: ${responseGenTime.toFixed(2)}ms, Parse: ${parseTime.toFixed(2)}ms, Total: ${totalReflectingTime.toFixed(2)}ms`)
      
      setIsLoading(false)
      setIsReady(true)
    }
  }

  const inputPlaceholder = isRecording ? "音声を認識中..." : placeholder

  return (
    <div className="bg-white border-t border-gray-200 p-3 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-2 md:gap-3">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={inputPlaceholder}
              className="h-16 md:h-24 text-gray-900 placeholder-gray-500 pr-4 text-sm md:text-base rounded-xl border-2 border-gray-200 focus:border-green-600 focus:ring-0 shadow-sm resize-none"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex flex-col gap-4 md:gap-4">
              <Button
                onClick={startReflecting}
                disabled={isLoading}
                className="h-8 w-8 md:h-10 md:w-10 bg-purple-500 hover:bg-purple-600 text-white rounded-lg md:rounded-xl shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50"
                title="リフレクティングを開始"
              >
                <Users className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <Button
                onClick={toggleRecording}
                className={`h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50 ${isRecording
                    ? "bg-red-600 hover:bg-red-700 animate-pulse"
                    : "bg-red-500 hover:bg-red-600"
                  } text-white`}
                disabled={isLoading}
                title={isRecording ? "録音を停止" : "音声入力を開始"}
              >
                <Mic className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
