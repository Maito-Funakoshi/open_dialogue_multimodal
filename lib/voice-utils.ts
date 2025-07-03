import type { ConversationLog } from "@/types/chat"

// VOICEVOX API設定
const VOICEVOX_API_KEY = process.env.NEXT_PUBLIC_VOICEVOX_API_KEY || "your_api_key_here"

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
export const playVoiceWithVOICEVOX = (
  text: string, 
  speakerId: number, 
  onStart?: () => void, 
  onEnd?: () => void
): string => {
  try {
    // 成功例に基づいたURL構築
    const audioUrl = `https://deprecatedapis.tts.quest/v2/voicevox/audio/?key=${VOICEVOX_API_KEY}&speaker=${speakerId}&pitch=0&intonationScale=1&speed=1.25&text=${encodeURIComponent(text)}`
    
    return audioUrl
    // return new Promise((resolve, reject) => {
    //   const audio = new Audio()
      
    //   const handleCanPlayThrough = () => {
    //     audio.play()
    //       .then(() => {
    //         console.log(`Playing voice for speaker ${speakerId}: ${text}`)
    //         onStart?.() // コールバック実行
    //       })
    //       .catch((error) => {
    //         console.error('音声の再生に失敗しました:', error)
    //         reject(error)
    //       })
    //   }

    //   const handleEnded = () => {
    //     audio.removeEventListener('canplaythrough', handleCanPlayThrough)
    //     audio.removeEventListener('ended', handleEnded)
    //     audio.removeEventListener('error', handleError)
    //     onEnd?.() // コールバック実行
    //     resolve()
    //   }

    //   const handleError = (error: any) => {
    //     audio.removeEventListener('canplaythrough', handleCanPlayThrough)
    //     audio.removeEventListener('ended', handleEnded)
    //     audio.removeEventListener('error', handleError)
    //     console.error('Audio error:', error)
    //     onEnd?.() // エラー時もコールバック実行
    //     reject(new Error('Audio playback failed'))
    //   }

    //   audio.addEventListener('canplaythrough', handleCanPlayThrough)
    //   audio.addEventListener('ended', handleEnded)
    //   audio.addEventListener('error', handleError)
      
    //   // 音声URLを設定
    //   audio.src = audioUrl
    // })
  } catch (error) {
    console.error('Voice playback error:', error)
    throw error
  }
}

// 複数のメッセージを順次音声再生する関数
export const playAssistantMessages = (
  messages: ConversationLog[], 
  onSpeakerStart?: (assistantId: string) => void,
  onSpeakerEnd?: (assistantId: string) => void
): string[] => {
  const results: string[] = []
  for (const message of messages) {
    if (message.role === 'assistant' && message.speaker && message.content) {
      try {
        const speakerId = getSpeakerIdByAssistant(message.speaker.name)
        // await playVoiceWithVOICEVOX(
        //   message.content, 
        //   speakerId,
        //   () => onSpeakerStart?.(message.speaker!.id),
        //   () => onSpeakerEnd?.(message.speaker!.id)
        // )
        results.push(playVoiceWithVOICEVOX(
            message.content, 
            speakerId,
            () => onSpeakerStart?.(message.speaker!.id),
            () => onSpeakerEnd?.(message.speaker!.id)
        ))
      } catch (error) {
        // console.error(`Failed to play voice for ${message.speaker.name}:`, error)
        // // Continue with next message even if one fails
        // onSpeakerEnd?.(message.speaker.id)
      }
    }
  }
  return results
}

// 音声再生を安全に実行する関数（エラーハンドリング付き）
export const safePlayAssistantMessages = (
  messages: ConversationLog[],
  onSpeakerStart?: (assistantId: string) => void,
  onSpeakerEnd?: (assistantId: string) => void
): string[] => {
  if (messages.length > 0) {
    return playAssistantMessages(messages, onSpeakerStart, onSpeakerEnd) || ["失敗しました。"]
    // playAssistantMessages(messages, onSpeakerStart, onSpeakerEnd).catch((error) => {
    //   console.error("Voice playback failed:", error)
    // })
  }
  return ["messages配列に要素がありません。"]
}
