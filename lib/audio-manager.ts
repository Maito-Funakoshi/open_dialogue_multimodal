// iOS向けのオーディオ管理クラス
export class AudioManager {
  private static instance: AudioManager
  private audioContext: AudioContext | null = null
  private isUnlocked = false
  
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
}