// iOS専用の音声再生ヘルパー
export class IOSAudioHelper {
  private static audioCache: Map<string, HTMLAudioElement> = new Map()
  private static maxCacheSize = 5
  
  // Base64エンコードされた無音のMP3データ
  private static silentMP3 = 'data:audio/mp3;base64,SUQzAwAAAAAAJlRQRTEAAAAcAAAAU291bmRKYXkuY29tIFNvdW5kIEVmZmVjdHMA//uSwAAAAAABLBQAAAMoQ7sqgBABJEUlURXK3IzcjMyMjMjMyM3IzIiIiMiIiM3IzIzd3IiIjd3cu7u7u5ERERERERERERERERERERERERH/////////////'
  
  // iOSでの音声初期化（ユーザーインタラクション時に呼ぶ）
  static async initializeAudioForIOS(): Promise<void> {
    try {
      // 無音を再生してオーディオコンテキストを初期化
      const silentAudio = new Audio(this.silentMP3)
      silentAudio.volume = 1.0  // 音量を統一（1.0に）
      await silentAudio.play()
      console.log('iOS audio initialized with silent playback at volume 1.0')
    } catch (error) {
      console.error('Failed to initialize iOS audio:', error)
    }
  }
  
  // キャッシュされた音声要素を取得または作成
  static getOrCreateAudio(url: string): HTMLAudioElement {
    // キャッシュから取得
    if (this.audioCache.has(url)) {
      const cached = this.audioCache.get(url)!
      // 音量を含むすべての属性を確実にリセット
      cached.currentTime = 0
      cached.volume = 1.0  // 音量を明示的に1.0にリセット
      cached.playbackRate = 1.0  // 再生速度もリセット
      console.log('Reusing cached audio with volume reset to 1.0')
      return cached
    }
    
    // キャッシュサイズ制限
    if (this.audioCache.size >= this.maxCacheSize) {
      const firstKey = this.audioCache.keys().next().value
      const firstAudio = this.audioCache.get(firstKey)
      if (firstAudio) {
        firstAudio.pause()
        firstAudio.src = ''
      }
      this.audioCache.delete(firstKey)
    }
    
    // 新しいAudioを作成してキャッシュ
    const audio = new Audio()
    audio.preload = 'auto'
    audio.volume = 1.0  // 新規作成時も音量を1.0に設定
    console.log('Created new audio with volume 1.0')
    this.audioCache.set(url, audio)
    return audio
  }
  
  // すべてのキャッシュをクリア
  static clearCache(): void {
    this.audioCache.forEach(audio => {
      audio.pause()
      audio.src = ''
    })
    this.audioCache.clear()
  }
}