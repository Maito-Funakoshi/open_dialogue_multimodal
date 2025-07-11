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
  const [finalTranscript, setFinalTranscript] = useState("") // 確定した文字起こしを保持

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
          let interimTranscript = ""
          let newFinalTranscript = ""
          
          // 結果を処理して、finalな結果とinterimな結果を分離
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              newFinalTranscript += result[0].transcript
            } else {
              interimTranscript += result[0].transcript
            }
          }
          
          // finalな結果があれば、既存のfinalTranscriptに追加し、同時にメッセージも更新
          if (newFinalTranscript) {
            setFinalTranscript(prev => {
              const updated = prev + newFinalTranscript
              setMessage(updated + interimTranscript)
              return updated
            })
          } else {
            // interimな結果のみの場合は、現在のfinalTranscriptにinterimを追加して表示
            setFinalTranscript(prev => {
              setMessage(prev + interimTranscript)
              return prev
            })
          }
        }

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
          setIsRecording(false)
        }

        recognitionInstance.onend = () => {
          setIsRecording(false)
          // 音声認識が終了した時、finalTranscriptの内容をmessageに設定
          // これにより、無音で自動終了した場合でも内容が保持される
          setFinalTranscript(prev => {
            setMessage(prev)
            return prev
          })
        }

        setRecognition(recognitionInstance)
      }
    }
  }, [setIsRecording, setRecognition])

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return

    // iOS向けのオーディオコンテキスト解除
    const audioManager = AudioManager.getInstance()
    await audioManager.handleUserInteraction()

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
      // Call OpenAI API to generate assistant responses
      const response = await generateOpenAIResponse(message, newLog, false, userName, userGender)

      // Parse and add assistant responses
      const assistantMessages = parseAssistantResponse(response, assistants)

      let updatedLog = [...newLog, ...assistantMessages]
      setConversationLog(updatedLog)
      setLatestResponse(response)

      // 音声再生を実行（リアルタイム生成）
      safePlayAssistantMessages(
        assistantMessages,
        (assistantId) => setCurrentSpeakingAssistant?.(assistantId),
        (assistantId) => setCurrentSpeakingAssistant?.(null)
      )
      
    } catch (error) {
      console.error("Error generating response:", error)
    } finally {
      setIsLoading(false)
      setIsReady(true)
      setMessage("")
      setFinalTranscript("") // 送信後はfinalTranscriptもクリア
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
      // 録音終了時は、finalTranscriptの内容をmessageに設定（中間結果を除去）
      setMessage(finalTranscript)
      handleSendMessage()
    } else {
      // 録音開始時の処理
      // 既存のメッセージがある場合は、それをfinalTranscriptに設定して継続
      if (message.trim()) {
        setFinalTranscript(message)
      }
      // 録音を開始（メッセージはクリアしない）
      recognition.start()
      setIsRecording(true)
    }
  }

  const startReflecting = async () => {
    if (isLoading) return

    // iOS向けのオーディオコンテキスト解除
    const audioManager = AudioManager.getInstance()
    await audioManager.handleUserInteraction()

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
      const response = await generateOpenAIResponse(reflectingMessage, newLog, true, userName, userGender)

      // Parse and add assistant responses
      const assistantMessages = parseAssistantResponse(response, assistants)

      let updatedLog = [...newLog, ...assistantMessages]

      // Add reflecting ended message
      updatedLog = addSystemMessage(updatedLog, "----- Reflecting Ended -----")

      setConversationLog(updatedLog)
      setLatestResponse(response)

      // 音声再生を実行（リアルタイム生成）
      safePlayAssistantMessages(
        assistantMessages,
        (assistantId) => setCurrentSpeakingAssistant?.(assistantId),
        (assistantId) => setCurrentSpeakingAssistant?.(null)
      )
      
    } catch (error) {
      console.error("Error generating reflecting response:", error)
    } finally {
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
