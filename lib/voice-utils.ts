import type { ConversationLog } from "@/types/chat"
import { AudioManager } from "./audio-manager"
import { generateSpeechWithAzureOpenAI, generateMultipleSpeechWithAzureOpenAI } from "./openai"
import { getAudioPermission } from "./cookie-utils"

// アシスタント名と音声IDのマッピング
const VOICE_MAP: Record<string, string> = {
  "後藤": "onyx",
  "西村": "nova", 
  "山田": "alloy",
  "default": "verse"
}

// 音声データのキャッシュ管理
interface AudioCache {
  blob: Blob
  url: string
  timestamp: number
}

// 音声再生キューのアイテム
interface QueueItem {
  text: string
  voiceId: string
  onStart?: () => void
  onEnd?: () => void
}

// 高度な音声再生管理クラス
class AdvancedVoicePlayer {
  private static instance: AdvancedVoicePlayer | null = null
  private audioContext: AudioContext | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private audioCache = new Map<string, AudioCache>()
  private playbackQueue: QueueItem[] = []
  private isPlaying = false
  private preloadPromises = new Map<string, Promise<Blob>>()

  private constructor() {}

  static getInstance(): AdvancedVoicePlayer {
    if (!this.instance) {
      this.instance = new AdvancedVoicePlayer()
    }
    return this.instance
  }

  // AudioContextの初期化（AudioManagerと共有）
  async initialize(): Promise<boolean> {
    if (this.audioContext && this.gainNode) return true

    try {
      const audioManager = AudioManager.getInstance()
      
      // AudioManagerの初期化状態を確認
      if (!audioManager.isAudioUnlocked()) {
        console.warn("AudioManager is not unlocked. Initialize AudioManager first.")
        return false
      }

      // AudioManagerのAudioContextを使用
      this.audioContext = audioManager.getAudioContext()
      
      if (!this.audioContext) {
        console.error("Failed to get AudioContext from AudioManager")
        return false
      }

      // GainNodeを作成
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = getAudioPermission() ? 1.0 : 0.0
      this.gainNode.connect(this.audioContext.destination)

      console.log("AdvancedVoicePlayer initialized with shared AudioContext")
      return true
    } catch (error) {
      console.error("Failed to initialize AdvancedVoicePlayer:", error)
      return false
    }
  }

  // 音声のプリロード（バックグラウンドで実行）
  preloadVoice(text: string, voiceId: string): void {
    const cacheKey = this.getCacheKey(text, voiceId)
    
    // すでにキャッシュまたはプリロード中の場合はスキップ
    if (this.audioCache.has(cacheKey) || this.preloadPromises.has(cacheKey)) {
      return
    }

    // バックグラウンドでプリロード開始
    const preloadPromise = generateSpeechWithAzureOpenAI(text, voiceId)
      .then(blob => {
        const url = URL.createObjectURL(blob)
        this.audioCache.set(cacheKey, {
          blob,
          url,
          timestamp: Date.now()
        })
        this.preloadPromises.delete(cacheKey)
        return blob
      })
      .catch(error => {
        console.error("Preload failed:", error)
        this.preloadPromises.delete(cacheKey)
        throw error
      })

    this.preloadPromises.set(cacheKey, preloadPromise)
  }

  // キューに音声を追加
  async addToQueue(item: QueueItem): Promise<void> {
    this.playbackQueue.push(item)
    
    // 次の音声をプリロード（先読み）
    const nextIndex = this.playbackQueue.length
    if (nextIndex < this.playbackQueue.length + 3) { // 最大3つ先まで先読み
      const futureItems = this.playbackQueue.slice(nextIndex, nextIndex + 3)
      futureItems.forEach(futureItem => {
        this.preloadVoice(futureItem.text, futureItem.voiceId)
      })
    }

    // 再生中でなければ開始
    if (!this.isPlaying) {
      this.processQueue()
    }
  }

  // キューの処理
  private async processQueue(): Promise<void> {
    if (this.isPlaying || this.playbackQueue.length === 0) {
      return
    }

    this.isPlaying = true

    while (this.playbackQueue.length > 0) {
      const item = this.playbackQueue.shift()!
      
      try {
        await this.playWithWebAudioAPI(item)
      } catch (error) {
        console.error("Playback error:", error)
        item.onEnd?.()
      }
    }

    this.isPlaying = false
  }

  // Web Audio APIを使用した再生
  private async playWithWebAudioAPI(item: QueueItem): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      throw new Error("AudioContext not initialized")
    }

    const cacheKey = this.getCacheKey(item.text, item.voiceId)
    let audioCache = this.audioCache.get(cacheKey)

    // キャッシュがない場合は生成
    if (!audioCache) {
      // プリロード中の場合は待機
      const preloadPromise = this.preloadPromises.get(cacheKey)
      if (preloadPromise) {
        await preloadPromise
        audioCache = this.audioCache.get(cacheKey)
      } else {
        // 新規生成
        const blob = await generateSpeechWithAzureOpenAI(item.text, item.voiceId)
        const url = URL.createObjectURL(blob)
        audioCache = { blob, url, timestamp: Date.now() }
        this.audioCache.set(cacheKey, audioCache)
      }
    }

    if (!audioCache) throw new Error("Failed to get audio data")

    // ArrayBufferに変換
    const arrayBuffer = await audioCache.blob.arrayBuffer()
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

    // 前の音声を停止
    if (this.currentSource) {
      try {
        this.currentSource.stop()
        this.currentSource.disconnect()
      } catch (e) {
        // 既に停止している場合は無視
      }
    }

    // 新しいソースノードを作成
    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.gainNode)

    return new Promise<void>((resolve) => {
      source.onended = () => {
        this.currentSource = null
        item.onEnd?.()
        resolve()
      }

      item.onStart?.()
      source.start(0)
      this.currentSource = source
    })
  }

  // キャッシュキーの生成
  private getCacheKey(text: string, voiceId: string): string {
    return `${voiceId}:${text.substring(0, 50)}`
  }

  // キャッシュの存在確認（外部からアクセス可能）
  hasCache(cacheKey: string): boolean {
    return this.audioCache.has(cacheKey)
  }

  // キャッシュデータの設定（外部からアクセス可能）
  setCacheData(cacheKey: string, data: AudioCache): void {
    this.audioCache.set(cacheKey, data)
    this.manageCacheSize()
  }

  // キャッシュキーの生成（外部からアクセス可能）
  generateCacheKey(text: string, voiceId: string): string {
    return this.getCacheKey(text, voiceId)
  }

  // クリーンアップ
  cleanup(): void {
    // 現在の再生を停止
    if (this.currentSource) {
      try {
        this.currentSource.stop()
        this.currentSource.disconnect()
      } catch (e) {
        // エラーは無視
      }
    }

    // キャッシュのクリーンアップ
    this.audioCache.forEach(cache => {
      URL.revokeObjectURL(cache.url)
    })
    this.audioCache.clear()
    this.preloadPromises.clear()
    this.playbackQueue = []
    this.isPlaying = false

    // AudioContextのクローズ
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
      this.gainNode = null
    }
  }

  // キャッシュサイズの管理（古いものから削除）
  private manageCacheSize(maxSize: number = 20): void {
    if (this.audioCache.size <= maxSize) return

    const entries = Array.from(this.audioCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toRemove = entries.slice(0, entries.length - maxSize)
    toRemove.forEach(([key, cache]) => {
      URL.revokeObjectURL(cache.url)
      this.audioCache.delete(key)
    })
  }
}

// シングルトンインスタンス
const voicePlayer = AdvancedVoicePlayer.getInstance()

// アシスタント名から音声IDを取得
export const getVoiceIdByAssistant = (assistantName: string): string => {
  return VOICE_MAP[assistantName] || VOICE_MAP.default
}

// 初期化関数
export const initializeVoicePlayer = async (): Promise<boolean> => {
  const audioManager = AudioManager.getInstance()
  
  // AudioManagerが初期化されていない場合は初期化を待つ
  if (!audioManager.isAudioUnlocked()) {
    console.warn('AudioManager is not unlocked. VoicePlayer initialization will be skipped.')
    return false
  }

  return await voicePlayer.initialize()
}

// AudioManager初期化後に呼び出される関数
export const initializeVoicePlayerAfterAudioPermission = async (): Promise<boolean> => {
  const audioManager = AudioManager.getInstance()
  
  // AudioManagerが確実に初期化されていることを確認
  if (!audioManager.isAudioUnlocked()) {
    console.error('AudioManager is still not unlocked')
    return false
  }

  const success = await voicePlayer.initialize()
  if (success) {
    console.log('AdvancedVoicePlayer successfully initialized after audio permission')
  }
  
  return success
}

// 複数メッセージの一括再生（並列TTS生成で大幅高速化）
export const playAssistantMessages = async (
  messages: ConversationLog[],
  onSpeakerStart?: (assistantId: string) => void,
  onSpeakerEnd?: (assistantId: string) => void
): Promise<void> => {
  // 初期化確認
  const audioManager = AudioManager.getInstance()
  if (!audioManager.isAudioUnlocked()) {
    console.error('AudioManager is not unlocked. Cannot play audio. Please grant audio permission first.')
    return
  }

  // VoicePlayerの初期化確認
  const initialized = await initializeVoicePlayer()
  if (!initialized) {
    console.error('Failed to initialize VoicePlayer')
    return
  }

  // 全メッセージをキューに追加
  const validMessages = messages.filter(
    msg => msg.role === 'assistant' && msg.speaker && msg.content
  )

  if (validMessages.length === 0) {
    return
  }

  // キャッシュチェックと並列TTS生成の準備
  const messagesToGenerate: Array<{ message: ConversationLog; index: number }> = []
  const cachedMessages: Array<{ message: ConversationLog; index: number }> = []

  // 各メッセージのキャッシュ状態を確認
  validMessages.forEach((message, index) => {
    const voiceId = getVoiceIdByAssistant(message.speaker!.name)
    const cacheKey = voicePlayer.generateCacheKey(message.content, voiceId)
    
    if (voicePlayer.hasCache(cacheKey)) {
      cachedMessages.push({ message, index })
    } else {
      messagesToGenerate.push({ message, index })
    }
  })

  // 並列TTS生成（キャッシュミスのメッセージのみ）
  if (messagesToGenerate.length > 0) {
    const speechRequests = messagesToGenerate.map(({ message }) => ({
      text: message.content,
      speaker: getVoiceIdByAssistant(message.speaker!.name),
      instructions: "日本人らしい発声を心がけてください。"
    }))

    try {
      // 並列でTTS生成を実行
      const speechResults = await generateMultipleSpeechWithAzureOpenAI(speechRequests)

      // 生成された音声をキャッシュに保存
      speechResults.forEach(result => {
        const { message } = messagesToGenerate[result.index]
        const voiceId = getVoiceIdByAssistant(message.speaker!.name)
        const cacheKey = voicePlayer.generateCacheKey(message.content, voiceId)
        
        // キャッシュに保存
        const url = URL.createObjectURL(result.blob)
        voicePlayer.setCacheData(cacheKey, {
          blob: result.blob,
          url,
          timestamp: Date.now()
        })
      })

    } catch (error) {
      console.error('Parallel TTS generation failed:', error)
      // フォールバック処理はキューで自動的に行われる
    }
  }

  // 全メッセージを元の順序でキューに追加して再生
  for (let i = 0; i < validMessages.length; i++) {
    const message = validMessages[i]
    const voiceId = getVoiceIdByAssistant(message.speaker!.name)
    const assistantId = message.speaker!.id

    await voicePlayer.addToQueue({
      text: message.content,
      voiceId,
      onStart: () => {
        onSpeakerStart?.(assistantId)
      },
      onEnd: () => {
        onSpeakerEnd?.(assistantId)
      }
    })
  }
}

// エラーハンドリング付きの安全な再生関数
export const safePlayAssistantMessages = (
  messages: ConversationLog[],
  onSpeakerStart?: (assistantId: string) => void,
  onSpeakerEnd?: (assistantId: string) => void
): void => {
  if (messages.length === 0) {
    return
  }

  playAssistantMessages(messages, onSpeakerStart, onSpeakerEnd)
    .catch(error => {
      console.error('Voice playback failed:', error)
    })
}

// クリーンアップ（アプリ終了時に呼び出す）
export const cleanupVoicePlayer = (): void => {
  voicePlayer.cleanup()
}