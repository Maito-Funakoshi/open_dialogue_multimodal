import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const text = searchParams.get('text')
    const speaker = searchParams.get('speaker') || '8'
    
    if (!text) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 })
    }

    const VOICEVOX_API_KEY = process.env.NEXT_PUBLIC_VOICEVOX_API_KEY || 'your_api_key_here'
    
    // VOICEVOX APIにリクエスト
    const voicevoxUrl = `https://deprecatedapis.tts.quest/v2/voicevox/audio/?key=${VOICEVOX_API_KEY}&speaker=${speaker}&pitch=0&intonationScale=1&speed=1.25&text=${encodeURIComponent(text)}`
    
    console.log('Proxying request to VOICEVOX:', voicevoxUrl)
    
    const response = await fetch(voicevoxUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Next.js Voice Proxy)',
      },
    })

    if (!response.ok) {
      console.error('VOICEVOX API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to generate voice' }, 
        { status: response.status }
      )
    }

    // 音声データを取得
    const audioBuffer = await response.arrayBuffer()
    
    // 適切なヘッダーを設定して音声データを返す
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Voice proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}