import type { ConversationLog } from "@/types/chat"
import { AudioManager } from "./audio-manager"
import { generateSpeechWithAzureOpenAI } from "./openai"

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
export const getSpeakerByAssistant = (assistantName: string): string => {
  // alloy: 青年, ash: 中年男性, ballad: 青年, coral: Ririko, echo: 青年, able: 陣内のダニエル, onyx: 落ち着いた男性, nova: 30歳くらいの女性, sage: 語り手の女性, shimmer: 中性？, verse: 青年
  switch (assistantName) {
    case "後藤":
      return "onyx"
    case "西村":
      return "nova"
    case "山田":
      return "alloy"
    default:
      return "verse"
  }
}

// 音声プールシステムを使用してリアルタイム音声再生する関数
export const playVoiceWithAudioPool = async (
  text: string,
  speaker: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> => {
  try {
    const audioManager = AudioManager.getInstance()

    // Azure OpenAI TTSを使用して音声を生成
    const blobData = await generateSpeechWithAzureOpenAI(text, speaker)
    const blobUrl = URL.createObjectURL(blobData)

    // プールからaudio要素を取得
    const audio = audioManager.getPooledAudioElement()
    
    if (!audio) {
      // プールが空の場合は従来の方法を使用
      console.warn('Audio pool is empty, falling back to regular method')
      URL.revokeObjectURL(blobUrl)
      return 
    }

    return new Promise((resolve, reject) => {
      // プールされたaudio要素を使用
      audio.src = blobUrl
      audio.volume = 1.0
      audio.muted = false

      const handlePlay = () => {
        onStart?.()
      }

      const handleEnded = () => {
        audio.removeEventListener('play', handlePlay)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        // ObjectURLのクリーンアップ
        URL.revokeObjectURL(blobUrl)
        // audio要素は再利用のためプールに残す
        audio.src = ''
        onEnd?.()
        resolve()
      }

      const handleError = (error: any) => {
        console.error('Pooled audio playback error:', error)
        audio.removeEventListener('play', handlePlay)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        URL.revokeObjectURL(blobUrl)
        audio.src = ''
        onEnd?.()
        reject(error)
      }

      audio.addEventListener('play', handlePlay, { once: true })
      audio.addEventListener('ended', handleEnded, { once: true })
      audio.addEventListener('error', handleError, { once: true })

      audio.play().catch(handleError)
    })
  } catch (error) {
    console.error('Voice playback error:', error)
    throw error
  }
}

// 複数のメッセージを順次音声再生する関数（音声プール対応）
export const playAssistantMessages = async (
  messages: ConversationLog[],
  onSpeakerStart?: (assistantId: string) => void,
  onSpeakerEnd?: (assistantId: string) => void
): Promise<void> => {
  for (const message of messages) {
    if (message.role === 'assistant' && message.speaker && message.content) {
      try {
        const speaker = getSpeakerByAssistant(message.speaker.name)
        await playVoiceWithAudioPool(
          message.content,
          speaker,
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
