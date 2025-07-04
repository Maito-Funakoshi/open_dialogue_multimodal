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
    
    return new Promise((resolve, reject) => {
      // iOSの場合はキャッシュされたAudioを使用
      const audio = isIOS() ? IOSAudioHelper.getOrCreateAudio(audioUrl) : new Audio()
      currentAudio = audio
      
      // iOSの場合は追加の設定
      if (isIOS()) {
        // プロキシ経由なのでCORS設定は不要
        audio.preload = 'auto'
        
        // iOS向けの追加属性
        audio.setAttribute('playsinline', 'true')
        audio.setAttribute('webkit-playsinline', 'true')
        
        // ボリューム設定（iOSでは重要）
        audio.volume = 1.0
      } else {
        // その他のプラットフォームではCORS設定
        audio.crossOrigin = 'anonymous'
      }
      
      const handleCanPlayThrough = async () => {
        try {
          // iOSの場合は少し遅延を入れる
          if (isIOS()) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          
          // iOSの場合は事前に無音再生で初期化
          if (isIOS() && audioManager.isAudioUnlocked()) {
            await IOSAudioHelper.initializeAudioForIOS()
          }
          
          await audio.play()
          console.log(`Playing voice for speaker ${speakerId}`)
          onStart?.()
        } catch (error: any) {
          console.error('音声の再生に失敗しました:', {
            error: error.message,
            name: error.name,
            code: error.code,
            isIOS: isIOS()
          })
          
          // iOSでの自動再生エラーの場合、ユーザーインタラクションを促す
          if (error.name === 'NotAllowedError' && isIOS()) {
            console.warn('iOS自動再生制限: ユーザーインタラクションが必要です')
          }
          
          reject(error)
        }
      }

      const handleEnded = () => {
        audio.removeEventListener('canplaythrough', handleCanPlayThrough)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        onEnd?.() // コールバック実行
        resolve()
      }

      const handleError = (error: any) => {
        audio.removeEventListener('canplaythrough', handleCanPlayThrough)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        
        const errorDetails = {
          type: error.type,
          target: error.target,
          currentSrc: audio.currentSrc,
          networkState: audio.networkState,
          readyState: audio.readyState,
          error: audio.error ? {
            code: audio.error.code,
            message: audio.error.message,
            MEDIA_ERR_ABORTED: audio.error.code === 1,
            MEDIA_ERR_NETWORK: audio.error.code === 2,
            MEDIA_ERR_DECODE: audio.error.code === 3,
            MEDIA_ERR_SRC_NOT_SUPPORTED: audio.error.code === 4
          } : null,
          isIOS: isIOS(),
          userAgent: navigator.userAgent,
          platform: navigator.platform
        }
        
        console.error('Audio error:', errorDetails)
        onEnd?.()
        reject(new Error(`Audio playback failed: ${JSON.stringify(errorDetails)}`))
      }

      // iOS向けの追加イベントリスナー
      if (isIOS()) {
        // ネットワーク状態の監視
        audio.addEventListener('loadstart', () => {
          console.log('Load started, network state:', audio.networkState)
        })
        
        audio.addEventListener('loadeddata', () => {
          console.log('Audio data loaded, duration:', audio.duration)
        })
        
        audio.addEventListener('loadedmetadata', () => {
          console.log('Metadata loaded, can play:', audio.canPlayType('audio/mpeg'))
        })
        
        // プログレスイベントの監視
        audio.addEventListener('progress', () => {
          console.log('Loading progress, buffered:', audio.buffered.length)
        })
        
        // ストールの検出
        audio.addEventListener('stalled', () => {
          console.warn('Audio loading stalled')
        })
      }
      
      audio.addEventListener('canplaythrough', handleCanPlayThrough)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('error', handleError)
      
      // 音声URLを設定
      audio.src = audioUrl
      
      // iOSの場合は特別な処理
      if (isIOS()) {
        // 即座にloadを呼ぶ
        audio.load()
        console.log('Audio load triggered for iOS')
        
        // プリロード後に再生を試みる
        audio.addEventListener('loadedmetadata', () => {
          console.log('iOS: Metadata loaded, ready to play')
        }, { once: true })
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
