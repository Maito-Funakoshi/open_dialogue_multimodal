// iOS向けのオーディオ管理クラス
export class AudioManager {
  private static instance: AudioManager
  private audioContext: AudioContext | null = null
  private isUnlocked = false
  private userInteractionReceived = false
  
  private constructor() {}
  
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }
  
  // iOS/iPadOS検出ヘルパー関数
  private isIOS(): boolean {
    if (typeof window === 'undefined') return false
    
    const ua = navigator.userAgent
    const isIPad = ua.includes('iPad') || (ua.includes('Macintosh') && 'ontouchend' in document)
    const isIPhone = ua.includes('iPhone') || ua.includes('iPod')
    
    return isIPad || isIPhone || (
      navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
    )
  }
  
  // iOSのオーディオコンテキストを解除
  async unlockAudioContext(): Promise<void> {
    if (this.isUnlocked && this.audioContext?.state === 'running') {
      return
    }
    
    try {
      // ユーザーインタラクションが必要な場合の警告
      if (this.isIOS() && !this.userInteractionReceived) {
        console.warn('iOS: Audio unlock attempted without user interaction')
        return
      }
      
      // Web Audio APIのコンテキストを作成
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        console.log('AudioContext created:', {
          state: this.audioContext.state,
          sampleRate: this.audioContext.sampleRate,
          isIOS: this.isIOS()
        })
      }
      
      // iOS向けの無音再生でコンテキストを解除
      if (this.audioContext.state === 'suspended') {
        console.log('Attempting to resume suspended AudioContext...')
        
        // より確実な無音再生でアンロック
        const buffer = this.audioContext.createBuffer(1, 1, this.audioContext.sampleRate)
        const source = this.audioContext.createBufferSource()
        source.buffer = buffer
        
        // ゲインノードを追加して音量を明示的に制御
        const gainNode = this.audioContext.createGain()
        gainNode.gain.value = 0.01  // 極小音量で無音再生
        
        source.connect(gainNode)
        gainNode.connect(this.audioContext.destination)
        
        // 再生開始
        source.start(0)
        
        // コンテキストの再開を待つ（タイムアウト付き）
        const resumePromise = this.audioContext.resume()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AudioContext resume timeout')), 3000)
        )
        
        await Promise.race([resumePromise, timeoutPromise])
        
        // 少し待ってから状態を確認
        await new Promise(resolve => setTimeout(resolve, 100))
        
        console.log('AudioContext resume result:', {
          state: this.audioContext.state,
          currentTime: this.audioContext.currentTime
        })
      }
      
      // アンロック成功の確認
      if (this.audioContext.state === 'running') {
        this.isUnlocked = true
        console.log('Audio context successfully unlocked')
      } else {
        console.warn('AudioContext state is not running:', this.audioContext.state)
      }
      
    } catch (error) {
      console.error('Failed to unlock audio context:', error)
      // エラーが発生してもアプリケーションを継続
      this.isUnlocked = false
    }
  }
  
  // 音声再生前にコンテキストが解除されているか確認
  isAudioUnlocked(): boolean {
    return this.isUnlocked && this.audioContext?.state === 'running'
  }
  
  // ユーザーインタラクション時に呼び出す
  async handleUserInteraction(): Promise<void> {
    this.userInteractionReceived = true
    console.log('User interaction received, attempting to unlock audio...')
    await this.unlockAudioContext()
  }
  
  // AudioContextを取得（初期化されていない場合は作成）
  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      console.log('AudioContext created in getAudioContext:', {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate
      })
    }
    return this.audioContext
  }
  
  // AudioContextの状態をリセット（デバッグ用）
  resetAudioContext(): void {
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.audioContext = null
    this.isUnlocked = false
    this.userInteractionReceived = false
    console.log('AudioContext reset')
  }
  
  // 現在の状態を取得（デバッグ用）
  getStatus(): object {
    return {
      isUnlocked: this.isUnlocked,
      userInteractionReceived: this.userInteractionReceived,
      audioContextState: this.audioContext?.state || 'null',
      isIOS: this.isIOS()
    }
  }
}
