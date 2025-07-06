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

// 現在再生中のBufferSourceを追跡
let currentBufferSource: AudioBufferSourceNode | null = null

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

// BlobをArrayBufferに変換する関数
const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read blob as ArrayBuffer'))
    reader.readAsArrayBuffer(blob)
  })
}

// AudioContextを使用して音声を再生する関数
export const playVoiceWithVOICEVOX = async (
  text: string,
  speaker: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> => {
  try {
    // iOS向けのオーディオコンテキスト確認
    const audioManager = AudioManager.getInstance()
    
    // iOSの場合、オーディオコンテキストが適切に初期化されているか確認
    if (isIOS()) {
      console.log('iOS detected, checking audio context status:', audioManager.getStatus())
      
      if (!audioManager.isAudioUnlocked()) {
        console.error('iOS: Audio context is not unlocked. Voice playback will fail.')
        throw new Error('Audio context not unlocked on iOS. User interaction required.')
      }
    }

    // 前のBufferSourceの状態をチェック（自然終了した場合は何もしない）
    if (currentBufferSource) {
      console.log('Previous BufferSource exists, but will be replaced after natural completion')
      // 前の音声が自然に終了するのを待つため、ここでは停止しない
    }

    // AudioManagerからAudioContextを取得
    const audioContext = audioManager.getAudioContext()
    
    // AudioContextの状態を確認し、必要に応じて再開
    if (audioContext.state === 'suspended') {
      console.log('AudioContext is suspended, attempting to resume...')
      try {
        await audioContext.resume()
        // 少し待ってから状態を再確認
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if (audioContext.state as string !== 'running') {
          throw new Error(`AudioContext failed to resume. State: ${audioContext.state}`)
        }
      } catch (resumeError: unknown) {
        console.error('Failed to resume AudioContext:', resumeError)
        const errorMessage = resumeError instanceof Error ? resumeError.message : 'Unknown error'
        throw new Error(`AudioContext resume failed: ${errorMessage}`)
      }
    }

    // デバッグ情報を出力
    console.log('Starting voice playback:', {
      text: text.substring(0, 50) + '...',
      speaker,
      isIOS: isIOS(),
      userAgent: navigator.userAgent.substring(0, 100) + '...',
      audioContextState: audioContext.state,
      audioManagerStatus: audioManager.getStatus()
    })

    // Azure OpenAI TTSを使用して音声を生成
    const blobData = await generateSpeechWithAzureOpenAI(text, speaker)

    return new Promise(async (resolve, reject) => {
      try {
        if (!blobData) {
          reject(new Error('Failed to create blob data'))
          return
        }

        // BlobをArrayBufferに変換
        const arrayBuffer = await blobToArrayBuffer(blobData)
        console.log('ArrayBuffer created:', {
          byteLength: arrayBuffer.byteLength,
          speaker: speaker
        })
        
        // ArrayBufferをAudioBufferにデコード
        let audioBuffer: AudioBuffer
        try {
          audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        } catch (decodeError) {
          console.error('Failed to decode audio data:', decodeError)
          reject(new Error('Audio decoding failed'))
          return
        }
        
        console.log('AudioBuffer created:', {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
          length: audioBuffer.length,
          speaker: speaker
        })
        
        // BufferSourceNodeを作成
        const bufferSource = audioContext.createBufferSource()
        bufferSource.buffer = audioBuffer
        
        // 各BufferSource専用のGainNodeを作成
        const localGainNode = audioContext.createGain()
        
        // iOS向けの音量調整（iOSでは音量が小さくなることがあるため）
        const volume = isIOS() ? 1.0 : 1.0
        localGainNode.gain.value = volume
        
        // 接続順序を明確にする
        bufferSource.connect(localGainNode)
        localGainNode.connect(audioContext.destination)
        
        console.log('BufferSource setup:', {
          speaker: speaker,
          gainValue: localGainNode.gain.value,
          contextState: audioContext.state,
          contextCurrentTime: audioContext.currentTime,
          bufferDuration: audioBuffer.duration,
          isIOS: isIOS()
        })
        
        currentBufferSource = bufferSource

        // 再生開始イベント（即座に呼び出し）
        const handleStart = () => {
          console.log(`Playing voice for speaker ${speaker} at volume:`, localGainNode.gain.value)
          onStart?.()
        }

        // 再生終了イベント
        const handleEnded = () => {
          console.log(`Audio playback ended for speaker: ${speaker}`)
          // BufferSourceとGainNodeをクリーンアップ
          try {
            bufferSource.disconnect()
            localGainNode.disconnect()
          } catch (disconnectError) {
            console.log('Disconnect error (already disconnected):', disconnectError)
          }
          if (currentBufferSource === bufferSource) {
            currentBufferSource = null
          }
          onEnd?.()
          resolve()
        }

        // エラーハンドリング
        const handleError = (error: any) => {
          console.error(`Audio playback error for speaker ${speaker}:`, error)
          // エラー時もクリーンアップ
          try {
            bufferSource.disconnect()
            localGainNode.disconnect()
          } catch (disconnectError) {
            console.log('Disconnect error (already disconnected):', disconnectError)
          }
          if (currentBufferSource === bufferSource) {
            currentBufferSource = null
          }
          onEnd?.()
          reject(new Error(`Audio playback failed: ${error.message || 'Unknown error'}`))
        }

        // イベントリスナーの設定
        bufferSource.onended = handleEnded

        try {
          // 最終的なAudioContext状態確認
          if (audioContext.state !== 'running') {
            throw new Error(`AudioContext is not running: ${audioContext.state}`)
          }
          
          // 再生開始
          bufferSource.start(0)
          handleStart() // 再生開始を即座に通知
          
          console.log('AudioContext playback started successfully', {
            audioContextState: audioContext.state,
            isUnlocked: audioManager.isAudioUnlocked(),
            isIOS: isIOS(),
            currentTime: audioContext.currentTime
          })
        } catch (startError) {
          console.error('BufferSource start failed:', {
            error: startError,
            audioContextState: audioContext.state,
            isUnlocked: audioManager.isAudioUnlocked(),
            isIOS: isIOS(),
            bufferDuration: audioBuffer.duration
          })
          handleError(startError)
        }

      } catch (error: unknown) {
        console.error('AudioBuffer creation failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        reject(new Error(`Failed to create AudioBuffer: ${errorMessage}`))
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
        const speaker = getSpeakerByAssistant(message.speaker.name)
        await playVoiceWithVOICEVOX(
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
