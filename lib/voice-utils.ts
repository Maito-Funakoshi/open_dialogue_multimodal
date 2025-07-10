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
    console.log(`📤 [VOICE-QUEUE] Adding item to queue: "${item.text.substring(0, 30)}..." (Voice: ${item.voiceId})`)
    const addStart = performance.now()
    
    this.playbackQueue.push(item)
    console.log(`📊 [VOICE-QUEUE] Queue length: ${this.playbackQueue.length}`)
    
    // 次の音声をプリロード（先読み）
    const preloadStart = performance.now()
    const nextIndex = this.playbackQueue.length
    if (nextIndex < this.playbackQueue.length + 3) { // 最大3つ先まで先読み
      const futureItems = this.playbackQueue.slice(nextIndex, nextIndex + 3)
      futureItems.forEach(futureItem => {
        console.log(`🔄 [VOICE-QUEUE] Preloading future item: "${futureItem.text.substring(0, 20)}..."`)
        this.preloadVoice(futureItem.text, futureItem.voiceId)
      })
    }
    const preloadTime = performance.now() - preloadStart
    console.log(`🔄 [VOICE-QUEUE] Preload setup: ${preloadTime.toFixed(2)}ms`)

    // 再生中でなければ開始
    if (!this.isPlaying) {
      console.log(`▶️ [VOICE-QUEUE] Starting queue processing`)
      this.processQueue()
    } else {
      console.log(`⏳ [VOICE-QUEUE] Queue is already playing, item will be processed in order`)
    }
    
    const addTime = performance.now() - addStart
    console.log(`✅ [VOICE-QUEUE] Item added to queue: ${addTime.toFixed(2)}ms`)
  }

  // キューの処理
  private async processQueue(): Promise<void> {
    if (this.isPlaying || this.playbackQueue.length === 0) {
      console.log(`⚠️ [VOICE-PROCESS] Queue processing skipped - Playing: ${this.isPlaying}, Queue length: ${this.playbackQueue.length}`)
      return
    }

    console.log(`🎵 [VOICE-PROCESS] Starting queue processing with ${this.playbackQueue.length} items`)
    const processStart = performance.now()

    this.isPlaying = true
    let itemsProcessed = 0

    while (this.playbackQueue.length > 0) {
      const item = this.playbackQueue.shift()!
      itemsProcessed++
      
      console.log(`🎵 [VOICE-PROCESS] Processing item ${itemsProcessed}: "${item.text.substring(0, 30)}..."`)
      const itemStart = performance.now()
      
      try {
        await this.playWithWebAudioAPI(item)
        const itemTime = performance.now() - itemStart
        console.log(`✅ [VOICE-PROCESS] Item ${itemsProcessed} completed: ${itemTime.toFixed(2)}ms`)
      } catch (error) {
        const itemTime = performance.now() - itemStart
        console.error(`❌ [VOICE-PROCESS] Playback error for item ${itemsProcessed} (${itemTime.toFixed(2)}ms):`, error)
        item.onEnd?.()
      }
    }

    this.isPlaying = false
    const totalProcessTime = performance.now() - processStart
    console.log(`✅ [VOICE-PROCESS] Queue processing completed - ${itemsProcessed} items in ${totalProcessTime.toFixed(2)}ms`)
  }

  // Web Audio APIを使用した再生
  private async playWithWebAudioAPI(item: QueueItem): Promise<void> {
    console.log(`🎧 [WEB-AUDIO] Starting Web Audio API playback: "${item.text.substring(0, 30)}..."`)
    const webAudioStart = performance.now()
    
    if (!this.audioContext || !this.gainNode) {
      throw new Error("AudioContext not initialized")
    }

    const cacheKey = this.getCacheKey(item.text, item.voiceId)
    let audioCache = this.audioCache.get(cacheKey)

    // キャッシュがない場合は生成
    const cacheCheckStart = performance.now()
    if (!audioCache) {
      console.log(`🔍 [WEB-AUDIO] Cache miss for: ${cacheKey}`)
      
      // プリロード中の場合は待機
      const preloadPromise = this.preloadPromises.get(cacheKey)
      if (preloadPromise) {
        console.log(`⏳ [WEB-AUDIO] Waiting for preload promise`)
        const preloadWaitStart = performance.now()
        await preloadPromise
        audioCache = this.audioCache.get(cacheKey)
        console.log(`✅ [WEB-AUDIO] Preload wait completed: ${(performance.now() - preloadWaitStart).toFixed(2)}ms`)
      } else {
        // 新規生成
        console.log(`🎵 [WEB-AUDIO] Generating new speech`)
        const ttsStart = performance.now()
        const blob = await generateSpeechWithAzureOpenAI(item.text, item.voiceId)
        const ttsTime = performance.now() - ttsStart
        console.log(`🎵 [WEB-AUDIO] Speech generation: ${ttsTime.toFixed(2)}ms`)
        
        const url = URL.createObjectURL(blob)
        audioCache = { blob, url, timestamp: Date.now() }
        this.audioCache.set(cacheKey, audioCache)
        console.log(`💾 [WEB-AUDIO] Audio cached with key: ${cacheKey}`)
      }
    } else {
      console.log(`✅ [WEB-AUDIO] Cache hit for: ${cacheKey}`)
    }
    console.log(`🔍 [WEB-AUDIO] Cache operations: ${(performance.now() - cacheCheckStart).toFixed(2)}ms`)

    if (!audioCache) throw new Error("Failed to get audio data")

    // ArrayBufferに変換
    const bufferStart = performance.now()
    const arrayBuffer = await audioCache.blob.arrayBuffer()
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
    const bufferTime = performance.now() - bufferStart
    console.log(`🔄 [WEB-AUDIO] Buffer conversion: ${bufferTime.toFixed(2)}ms`)

    // 前の音声を停止
    const stopStart = performance.now()
    if (this.currentSource) {
      try {
        this.currentSource.stop()
        this.currentSource.disconnect()
        console.log(`⏹️ [WEB-AUDIO] Previous source stopped`)
      } catch (e) {
        // 既に停止している場合は無視
        console.log(`ℹ️ [WEB-AUDIO] Previous source already stopped`)
      }
    }
    const stopTime = performance.now() - stopStart
    console.log(`⏹️ [WEB-AUDIO] Source cleanup: ${stopTime.toFixed(2)}ms`)

    // 新しいソースノードを作成
    const sourceCreateStart = performance.now()
    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.gainNode)
    const sourceCreateTime = performance.now() - sourceCreateStart
    console.log(`🔗 [WEB-AUDIO] Source node creation: ${sourceCreateTime.toFixed(2)}ms`)

    const setupTime = performance.now() - webAudioStart
    console.log(`⚙️ [WEB-AUDIO] Total setup time: ${setupTime.toFixed(2)}ms`)

    return new Promise<void>((resolve) => {
      const playbackStart = performance.now()
      
      source.onended = () => {
        const playbackTime = performance.now() - playbackStart
        const totalTime = performance.now() - webAudioStart
        console.log(`🏁 [WEB-AUDIO] Playback ended - Duration: ${playbackTime.toFixed(2)}ms, Total: ${totalTime.toFixed(2)}ms`)
        
        this.currentSource = null
        item.onEnd?.()
        resolve()
      }

      console.log(`▶️ [WEB-AUDIO] Starting audio playback`)
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
  console.log(`🎵 [VOICE-PLAY] Starting playback for ${messages.length} messages`)
  const playbackStartTime = performance.now()

  // 初期化確認
  const initCheckStart = performance.now()
  const audioManager = AudioManager.getInstance()
  if (!audioManager.isAudioUnlocked()) {
    console.error('❌ [VOICE-PLAY] AudioManager is not unlocked. Cannot play audio. Please grant audio permission first.')
    return
  }
  console.log(`✅ [VOICE-PLAY] Audio manager check: ${(performance.now() - initCheckStart).toFixed(2)}ms`)

  // VoicePlayerの初期化確認
  const voiceInitStart = performance.now()
  const initialized = await initializeVoicePlayer()
  if (!initialized) {
    console.error('❌ [VOICE-PLAY] Failed to initialize VoicePlayer')
    return
  }
  console.log(`⚙️ [VOICE-PLAY] Voice player initialization: ${(performance.now() - voiceInitStart).toFixed(2)}ms`)

  // 全メッセージをキューに追加
  const filterStart = performance.now()
  const validMessages = messages.filter(
    msg => msg.role === 'assistant' && msg.speaker && msg.content
  )
  console.log(`🔍 [VOICE-PLAY] Message filtering: ${(performance.now() - filterStart).toFixed(2)}ms - ${validMessages.length}/${messages.length} valid`)

  if (validMessages.length === 0) {
    console.log('⚠️ [VOICE-PLAY] No valid messages to play')
    return
  }

  console.log(`🚀 [VOICE-PLAY] Starting parallel TTS generation for ${validMessages.length} messages...`)

  // キャッシュチェックと並列TTS生成の準備
  const cacheCheckStart = performance.now()
  const messagesToGenerate: Array<{ message: ConversationLog; index: number }> = []
  const cachedMessages: Array<{ message: ConversationLog; index: number }> = []

  // 各メッセージのキャッシュ状態を確認
  validMessages.forEach((message, index) => {
    const voiceId = getVoiceIdByAssistant(message.speaker!.name)
    const cacheKey = voicePlayer.generateCacheKey(message.content, voiceId)
    
    if (voicePlayer.hasCache(cacheKey)) {
      console.log(`✅ [VOICE-PLAY] Cache hit for message ${index + 1}: ${message.speaker!.name}`)
      cachedMessages.push({ message, index })
    } else {
      console.log(`🔄 [VOICE-PLAY] Cache miss for message ${index + 1}: ${message.speaker!.name} - will generate`)
      messagesToGenerate.push({ message, index })
    }
  })
  console.log(`🔍 [VOICE-PLAY] Cache check completed: ${(performance.now() - cacheCheckStart).toFixed(2)}ms`)
  console.log(`📊 [VOICE-PLAY] Cache status - Hit: ${cachedMessages.length}, Miss: ${messagesToGenerate.length}`)

  // 並列TTS生成（キャッシュミスのメッセージのみ）
  if (messagesToGenerate.length > 0) {
    const speechRequests = messagesToGenerate.map(({ message }) => ({
      text: message.content,
      speaker: getVoiceIdByAssistant(message.speaker!.name),
      instructions: "日本人らしい発声を心がけてください。"
    }))

    try {
      // 並列でTTS生成を実行
      const ttsStart = performance.now()
      console.log(`🎯 [VOICE-PLAY] Generating ${messagesToGenerate.length} audio files in parallel...`)
      const speechResults = await generateMultipleSpeechWithAzureOpenAI(speechRequests)
      const ttsTime = performance.now() - ttsStart
      console.log(`✅ [VOICE-PLAY] Parallel TTS generation completed: ${ttsTime.toFixed(2)}ms for ${messagesToGenerate.length} messages`)
      console.log(`⚡ [VOICE-PLAY] Average TTS time per message: ${(ttsTime / messagesToGenerate.length).toFixed(2)}ms`)

      // 生成された音声をキャッシュに保存
      const cacheStoreStart = performance.now()
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
        console.log(`💾 [VOICE-PLAY] Cached audio for message ${messagesToGenerate[result.index].index + 1}`)
      })
      console.log(`💾 [VOICE-PLAY] Cache storage completed: ${(performance.now() - cacheStoreStart).toFixed(2)}ms`)

    } catch (error) {
      console.error('❌ [VOICE-PLAY] Parallel TTS generation failed:', error)
      console.log('⚠️ [VOICE-PLAY] Falling back to sequential TTS generation...')
      // フォールバック処理はキューで自動的に行われる
    }
  }

  // 全メッセージを元の順序でキューに追加して再生
  const queueStart = performance.now()
  console.log(`📤 [VOICE-PLAY] Adding all messages to playback queue...`)
  
  for (let i = 0; i < validMessages.length; i++) {
    const message = validMessages[i]
    const voiceId = getVoiceIdByAssistant(message.speaker!.name)
    const assistantId = message.speaker!.id

    const addStart = performance.now()
    await voicePlayer.addToQueue({
      text: message.content,
      voiceId,
      onStart: () => {
        console.log(`▶️ [VOICE-PLAY] Started playing: ${message.speaker!.name} (${i + 1}/${validMessages.length})`)
        onSpeakerStart?.(assistantId)
      },
      onEnd: () => {
        console.log(`⏹️ [VOICE-PLAY] Finished playing: ${message.speaker!.name} (${i + 1}/${validMessages.length})`)
        onSpeakerEnd?.(assistantId)
      }
    })
    
    const addTime = performance.now() - addStart
    console.log(`📤 [VOICE-PLAY] Queue add ${i + 1}: ${addTime.toFixed(2)}ms`)
  }
  
  const totalQueueTime = performance.now() - queueStart
  const totalPlaybackTime = performance.now() - playbackStartTime
  console.log(`✅ [VOICE-PLAY] All messages queued: ${totalQueueTime.toFixed(2)}ms`)
  console.log(`📊 [VOICE-PLAY] Total playback setup time: ${totalPlaybackTime.toFixed(2)}ms`)
  console.log(`🎵 [VOICE-PLAY] Playback started for ${validMessages.length} messages`)
  
  // パフォーマンスサマリー
  console.log(`\n📈 [VOICE-PLAY] === PERFORMANCE SUMMARY ===`)
  console.log(`📊 [VOICE-PLAY] Total setup time: ${totalPlaybackTime.toFixed(2)}ms`)
  console.log(`📊 [VOICE-PLAY] Cache hits: ${cachedMessages.length}/${validMessages.length}`)
  console.log(`📊 [VOICE-PLAY] TTS generations: ${messagesToGenerate.length}`)
  if (messagesToGenerate.length > 0) {
    console.log(`📊 [VOICE-PLAY] Parallel TTS speedup: ~${messagesToGenerate.length}x faster than sequential`)
  }
  console.log(`📈 [VOICE-PLAY] ========================\n`)
}

// エラーハンドリング付きの安全な再生関数
export const safePlayAssistantMessages = (
  messages: ConversationLog[],
  onSpeakerStart?: (assistantId: string) => void,
  onSpeakerEnd?: (assistantId: string) => void
): void => {
  console.log(`🛡️ [SAFE-VOICE] Starting safe voice playback wrapper for ${messages.length} messages`)
  const safePlayStart = performance.now()
  
  if (messages.length === 0) {
    console.log('⚠️ [SAFE-VOICE] No messages provided, skipping playback')
    return
  }

  playAssistantMessages(messages, onSpeakerStart, onSpeakerEnd)
    .then(() => {
      const safePlayTime = performance.now() - safePlayStart
      console.log(`✅ [SAFE-VOICE] Safe voice playback wrapper completed: ${safePlayTime.toFixed(2)}ms`)
    })
    .catch(error => {
      const safePlayTime = performance.now() - safePlayStart
      console.error(`❌ [SAFE-VOICE] Voice playback failed (${safePlayTime.toFixed(2)}ms):`, error)
    })
}

// クリーンアップ（アプリ終了時に呼び出す）
export const cleanupVoicePlayer = (): void => {
  voicePlayer.cleanup()
}