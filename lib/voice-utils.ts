import type { ConversationLog } from "@/types/chat"
import { AudioManager } from "./audio-manager"
import { IOSAudioHelper } from "./ios-audio-helper"

// VOICEVOX API設定
const VOICEVOX_API_KEY = process.env.NEXT_PUBLIC_VOICEVOX_API_KEY || "your_api_key_here"

// iOS/iPadOS検出ヘルパー関数（iPadOS 13以降対応）
const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const ua = navigator.userAgent
  const isIPad = ua.includes('iPad') || (ua.includes('Macintosh') && 'ontouchend' in document)
  const isIPhone = ua.includes('iPhone') || ua.includes('iPod')
  
  // iOS Safari、Chrome、その他のブラウザでも検出
  return isIPad || isIPhone || (
    // iPad Pro on iOS 13+ detection
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  )
}

// 現在再生中のオーディオインスタンスを追跡
let currentAudio: HTMLAudioElement | null = null

// アシスタント名とspeaker IDのマッピング
export const getSpeakerIdByAssistant = (assistantName: string): number => {
  switch (assistantName) {
    case "後藤":
      return 13  // 女性の声
    case "西村":
      return 20 // 男性の声
    case "山田":
      return 21  // 別の声
    default:
      return 8
  }
}

// VOICEVOX APIを使用して音声を再生する関数
export const playVoiceWithVOICEVOX = async (
  text: string, 
  speakerId: number, 
  onStart?: () => void, 
  onEnd?: () => void
): Promise<void> => {
  try {
    // iOS向けのオーディオコンテキスト確認
    const audioManager = AudioManager.getInstance()
    console.log("isIOS(): ", isIOS())
    if (isIOS() && !audioManager.isAudioUnlocked()) {
      console.warn('iOS: Audio context is not unlocked. Voice playback may fail.')
      // ユーザーに通知する場合はここで処理
    }
    // 前のオーディオインスタンスをクリーンアップ
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.src = ''
      // 既存のaudio要素を削除
      const existingAudio = document.getElementById("voicevox-audio")
      if (existingAudio) {
        existingAudio.remove()
      }
      currentAudio = null
    }

    // デバッグ情報を出力
    console.log('Starting voice playback:', {
      text: text.substring(0, 50) + '...',
      speakerId,
      isIOS: isIOS(),
      userAgent: navigator.userAgent
    })

    // iOSの場合はプロキシ経由、それ以外は直接アクセス
    let audioUrl: string
    
    if (isIOS()) {
      // iOSの場合はNext.js APIプロキシを使用
      const encodedText = encodeURIComponent(text)
      audioUrl = `/api/voice?text=${encodedText}&speaker=${speakerId}`
      console.log('Using proxy for iOS:', audioUrl)
    } else {
      // その他のプラットフォームは直接アクセス
      const encodedText = encodeURIComponent(text).replace(/'/g, '%27')
      audioUrl = `https://deprecatedapis.tts.quest/v2/voicevox/audio/?key=${VOICEVOX_API_KEY}&speaker=${speakerId}&pitch=0&intonationScale=1&speed=1.25&text=${encodedText}`
      console.log('Using direct URL:', audioUrl)
    }
    
    // Fetch APIを使用してblobデータを取得
    const response = await fetch(audioUrl)
    if (!response.ok) {
      throw new Error(`Fetch Error: ${response.status}`)
    }
    
    // Blobデータとして取得
    const blobData = await response.blob()
    
    return new Promise((resolve, reject) => {
      if (blobData) {
        // BlobからObjectURLを作成
        const blobUrl = URL.createObjectURL(blobData)
        
        // Audio要素の生成
        const audioElement = document.createElement("audio")
        audioElement.id = "voicevox-audio"
        audioElement.src = blobUrl
        audioElement.controls = false
        audioElement.muted = false
        audioElement.autoplay = true
        audioElement.volume = 1.0
        
        // iOS向けの追加属性
        if (isIOS()) {
          audioElement.setAttribute('playsinline', 'true')
          audioElement.setAttribute('webkit-playsinline', 'true')
        }
        
        // 既に同名の要素が存在する場合は、削除
        const existingElement = document.getElementById("voicevox-audio")
        if (existingElement) {
          existingElement.remove()
        }
        
        // currentAudioに設定
        currentAudio = audioElement
        
        // イベントリスナーの設定
        const handlePlay = () => {
          console.log(`Playing voice for speaker ${speakerId} at volume:`, audioElement.volume)
          onStart?.()
        }
        
        const handleEnded = () => {
          console.log('Audio playback ended')
          // ObjectURLのクリーンアップ
          URL.revokeObjectURL(blobUrl)
          audioElement.removeEventListener('play', handlePlay)
          audioElement.removeEventListener('ended', handleEnded)
          audioElement.removeEventListener('error', handleError)
          onEnd?.()
          resolve()
        }
        
        const handleError = (error: any) => {
          console.error('Audio playback error:', error)
          // ObjectURLのクリーンアップ
          URL.revokeObjectURL(blobUrl)
          audioElement.removeEventListener('play', handlePlay)
          audioElement.removeEventListener('ended', handleEnded)
          audioElement.removeEventListener('error', handleError)
          onEnd?.()
          reject(new Error(`Audio playback failed: ${error.message || 'Unknown error'}`))
        }
        
        audioElement.addEventListener('play', handlePlay)
        audioElement.addEventListener('ended', handleEnded)
        audioElement.addEventListener('error', handleError)
        
        // 要素追加
        document.body.appendChild(audioElement)
        
        // 自動再生が失敗した場合の手動再生
        audioElement.play().catch((error) => {
          console.error('自動再生に失敗しました:', error)
          if (error.name === 'NotAllowedError') {
            console.warn('自動再生制限: ユーザーインタラクションが必要です')
          }
          handleError(error)
        })
      } else {
        reject(new Error('Failed to create blob data'))
      }
    })
  } catch (error) {
    console.error('Voice playback error:', error)
    throw error
  }
}

// 複数のメッセージを順次音声再生する関数
export const playAssistantMessages = async (
  messages: ConversationLog[], 
  onSpeakerStart?: (assistantId: string) => void,
  onSpeakerEnd?: (assistantId: string) => void
): Promise<void> => {
  for (const message of messages) {
    if (message.role === 'assistant' && message.speaker && message.content) {
      try {
        const speakerId = getSpeakerIdByAssistant(message.speaker.name)
        await playVoiceWithVOICEVOX(
          message.content, 
          speakerId,
          () => onSpeakerStart?.(message.speaker!.id),
          () => onSpeakerEnd?.(message.speaker!.id)
        )
      } catch (error) {
        console.error(`Failed to play voice for ${message.speaker.name}:`, error)
        // Continue with next message even if one fails
        onSpeakerEnd?.(message.speaker.id)
      }
    }
  }
}

// 音声再生を安全に実行する関数（エラーハンドリング付き）
export const safePlayAssistantMessages = (
  messages: ConversationLog[],
  onSpeakerStart?: (assistantId: string) => void,
  onSpeakerEnd?: (assistantId: string) => void
): void => {
  if (messages.length > 0) {
    playAssistantMessages(messages, onSpeakerStart, onSpeakerEnd).catch((error) => {
      console.error("Voice playback failed:", error)
    })
  }
}
