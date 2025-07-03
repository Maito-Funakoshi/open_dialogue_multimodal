"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Mic, Users } from "lucide-react"
import type { Assistant, ConversationLog } from "@/types/chat"
import { generateOpenAIResponse } from "@/lib/openai"
import {
  parseAssistantResponse,
  shouldActivateReflecting,
  addSystemMessage,
  addUserMessage
} from "@/lib/chat-utils"
import { safePlayAssistantMessages } from "@/lib/voice-utils"

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
  const [audioUrlsToPlay, setAudioUrlsToPlay] = useState<string[]>([]) // 再生待ちのURLを保持
  const [currentPlayingAudioIndex, setCurrentPlayingAudioIndex] = useState(-1) // 現在再生中の音声のインデックス
  const audioRef = useRef<HTMLAudioElement>(null)

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

  // 音声再生ロジック
  useEffect(() => {
    if (audioUrlsToPlay.length > 0 && currentPlayingAudioIndex === -1) {
      // 再生待ちの音声があり、まだ何も再生されていない場合、最初の音声を再生開始
      setCurrentPlayingAudioIndex(0)
    }
  }, [audioUrlsToPlay, currentPlayingAudioIndex])

  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) return

    if (currentPlayingAudioIndex !== -1 && currentPlayingAudioIndex < audioUrlsToPlay.length) {
      // 新しい音声をロードして再生
      audioElement.src = audioUrlsToPlay[currentPlayingAudioIndex]
      audioElement.load() // 新しいソースをロード

      const playAudio = () => {
        audioElement.play().catch((error) => {
          console.error("音声の再生に失敗しました:", error)
        })
      }

      const handleCanPlayThrough = () => {
        playAudio()
      }

      const handleEnded = () => {
        // 現在の音声が終了したら次の音声を再生
        setCurrentPlayingAudioIndex((prevIndex) => prevIndex + 1)
      }

      audioElement.addEventListener("canplaythrough", handleCanPlayThrough)
      audioElement.addEventListener("ended", handleEnded)

      return () => {
        audioElement.removeEventListener("canplaythrough", handleCanPlayThrough)
        audioElement.removeEventListener("ended", handleEnded)
      }
    } else if (currentPlayingAudioIndex >= audioUrlsToPlay.length && audioUrlsToPlay.length > 0) {
      // すべての音声の再生が終了したら状態をリセット
      setAudioUrlsToPlay([])
      setCurrentPlayingAudioIndex(-1)
      if (setCurrentSpeakingAssistant) {
        setCurrentSpeakingAssistant(null) // 話しているアシスタントをリセット
      }
    }
  }, [currentPlayingAudioIndex, audioUrlsToPlay, setCurrentSpeakingAssistant])


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
      const response = await generateOpenAIResponse(message, newLog, shouldReflect, userName, userGender)

      // Parse and add assistant responses
      const assistantMessages = parseAssistantResponse(response, assistants)
      let updatedLog = [...newLog, ...assistantMessages]

      // Add reflecting ended message if reflecting
      if (shouldReflect) {
        updatedLog = addSystemMessage(updatedLog, "----- Reflecting Ended -----")
      }

      setConversationLog(updatedLog)
      setLatestResponse(response)

      // 音声再生を実行（非同期で実行し、エラーがあっても処理を継続）
      const newUrls = safePlayAssistantMessages(
        assistantMessages,
        (assistantId) => setCurrentSpeakingAssistant?.(assistantId),
        (assistantId) => setCurrentSpeakingAssistant?.(null)
      )
      setAudioUrlsToPlay(newUrls) // ここを修正
      setCurrentPlayingAudioIndex(-1) // 再生を最初から開始するためにリセット
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

  const toggleRecording = () => {
    if (!recognition) {
      alert("音声認識がサポートされていません")
      return
    }

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

      // 音声再生を実行（非同期で実行し、エラーがあっても処理を継続）
      const newUrls = safePlayAssistantMessages(
        assistantMessages,
        (assistantId) => setCurrentSpeakingAssistant?.(assistantId),
        (assistantId) => setCurrentSpeakingAssistant?.(null)
      )
      setAudioUrlsToPlay(newUrls) // ここを修正
      setCurrentPlayingAudioIndex(-1) // 再生を最初から開始するためにリセット
    } catch (error) {
      console.error("Error generating response:", error)
    } finally {
      setIsLoading(false)
      setIsReady(true)
    }
  }

  const inputPlaceholder = isRecording ? "音声を認識中..." : placeholder

  return (
    <div className="bg-white border-t border-gray-200 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={inputPlaceholder}
              className="h-24 text-gray-900 placeholder-gray-500 pr-4 text-base rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:ring-0 shadow-sm"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-4">
              <Button
                onClick={startReflecting}
                disabled={isLoading}
                className="h-10 w-10 bg-purple-500 hover:bg-purple-600 text-white rounded-xl shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50"
                title="リフレクティングを開始"
              >
                <Users className="w-5 h-5" />
              </Button>
              <Button
                onClick={toggleRecording}
                className={`h-10 w-10 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50 ${isRecording
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-red-500 hover:bg-red-600"
                  } text-white`}
                disabled={isLoading}
                title={isRecording ? "録音を停止" : "音声入力を開始"}
              >
                <Mic className="w-5 h-5" />
              </Button>
            </div>
          </div>
          {/* audioUrls.map を削除し、単一の audio タグを使用 */}
          <div className="mt-4">
            <audio ref={audioRef} controls className="hidden"></audio>
          </div>
        </div>
      </div>
    </div>
  )
}
