// iOS向けのオーディオ管理クラス
export class AudioManager {
  private static instance: AudioManager
  private audioContext: AudioContext | null = null
  private isUnlocked = false
  private audioPool: HTMLAudioElement[] = []
  private audioPoolSize = 10 // 音声プールのサイズ
  private currentPoolIndex = 0
  private isAudioPermissionGranted = false
  
  private constructor() {}
  
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }
  
  // iOSのオーディオコンテキストを解除
  async unlockAudioContext(): Promise<void> {
    if (this.isUnlocked) return
    
    try {
      // Web Audio APIのコンテキストを作成
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      // iOS向けの無音再生でコンテキストを解除
      if (this.audioContext.state === 'suspended') {
        // サンプルレートを44100Hzに統一（音質向上）
        const buffer = this.audioContext.createBuffer(1, 1, 44100)
        const source = this.audioContext.createBufferSource()
        source.buffer = buffer
        
        // ゲインノードを追加して音量を明示的に制御
        const gainNode = this.audioContext.createGain()
        gainNode.gain.value = 1.0  // 音量を1.0に統一
        
        source.connect(gainNode)
        gainNode.connect(this.audioContext.destination)
        source.start(0)
        
        // コンテキストの再開を待つ
        await this.audioContext.resume()
        console.log('AudioContext resumed with gain:', gainNode.gain.value)
      }
      
      this.isUnlocked = true
      console.log('Audio context unlocked')
    } catch (error) {
      console.error('Failed to unlock audio context:', error)
    }
  }
  
  // 音声再生前にコンテキストが解除されているか確認
  isAudioUnlocked(): boolean {
    return this.isUnlocked
  }
  
  // ユーザーインタラクション時に呼び出す
  async handleUserInteraction(): Promise<void> {
    await this.unlockAudioContext()
  }

  // 音声プールを初期化（ユーザーインタラクション時に呼び出す）
  async initializeAudioPool(): Promise<boolean> {
    try {
      console.log('Initializing audio pool...')
      
      // 既存のプールをクリア
      this.clearAudioPool()
      
      // 複数のaudio要素を作成して準備
      for (let i = 0; i < this.audioPoolSize; i++) {
        const audio = new Audio()
        
        // iOS向けの属性設定
        audio.setAttribute('playsinline', 'true')
        audio.setAttribute('webkit-playsinline', 'true')
        audio.preload = 'auto'
        audio.volume = 1.0
        
        // 無音のデータURIを設定して「触る」
        const silentDataUri = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV'
        audio.src = silentDataUri
        
        // 音声を「触る」ためにplay()を呼び出し
        try {
          audio.muted = true // 最初はミュートで再生
          await audio.play()
          audio.pause()
          audio.currentTime = 0
          audio.muted = false // ミュート解除
        } catch (error) {
          console.warn(`Failed to initialize audio element ${i}:`, error)
        }
        
        this.audioPool.push(audio)
      }
      
      console.log(`Audio pool initialized with ${this.audioPool.length} elements`)
      this.isAudioPermissionGranted = true
      return true
    } catch (error) {
      console.error('Failed to initialize audio pool:', error)
      return false
    }
  }

  // 音声プールから次の利用可能なaudio要素を取得
  getPooledAudioElement(): HTMLAudioElement | null {
    if (this.audioPool.length === 0) {
      console.warn('Audio pool is empty')
      return null
    }
    
    const audio = this.audioPool[this.currentPoolIndex]
    this.currentPoolIndex = (this.currentPoolIndex + 1) % this.audioPool.length
    
    // 既存の音声をクリア
    audio.pause()
    audio.currentTime = 0
    audio.src = ''
    
    return audio
  }

  // 音声プールをクリア
  clearAudioPool(): void {
    this.audioPool.forEach(audio => {
      audio.pause()
      audio.src = ''
      audio.remove()
    })
    this.audioPool = []
    this.currentPoolIndex = 0
  }

  // 音声許可が付与されているかチェック
  checkAudioPermission(): boolean {
    if (typeof window === 'undefined') return false
    
    // Cookieから24時間有効な音声許可を取得
    const { getAudioPermission } = require('./cookie-utils')
    const permission = getAudioPermission()
    return permission === true && this.isAudioPermissionGranted
  }

  // 初期化メソッド（音声許可モーダルから呼び出される）
  async initializeAudioContext(): Promise<boolean> {
    try {
      // オーディオコンテキストを解除
      await this.unlockAudioContext()
      
      // 音声プールを初期化
      const poolInitialized = await this.initializeAudioPool()
      
      return this.isUnlocked && poolInitialized
    } catch (error) {
      console.error('Failed to initialize audio context:', error)
      return false
    }
  }

  // AudioContextを取得（他のモジュールと共有するため）
  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  // AudioContextの状態を確認
  isAudioContextActive(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'running'
  }
}