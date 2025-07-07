import type { Assistant, ConversationLog } from "@/types/chat"
import { generateSpeechWithAzureOpenAI } from "@/lib/openai"
import { getSpeakerByAssistant } from "@/lib/voice-utils"

/**
 * Blobをbase64文字列に変換する関数
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * アシスタントの応答を個別のメッセージに解析する関数
 */
export function parseAssistantResponse(response: string, assistants: Assistant[]): ConversationLog[] {
  const messages: ConversationLog[] = []
  const names = assistants.map((assistant) => {return assistant.name})
  const lines = response.split("\n").filter((line) => line.trim())

  const namePattern = names.join("|") // "後藤|西村|山田"
  const matcher = new RegExp(`^(${namePattern})：(.+)$`)

  for (const line of lines) {
    const match = line.match(matcher)
    if (match) {
      const [, speakerName, content] = match
      const assistant = assistants.find((a) => a.name === speakerName)

      if (assistant) {
        messages.push({
          role: "assistant",
          content: content.trim(),
          speaker: assistant
        })
      }
    }
  }

  return messages
}

/**
 * アシスタントの応答を個別のメッセージに解析し、音声データも生成する関数
 */
export async function parseAssistantResponseWithAudio(response: string, assistants: Assistant[]): Promise<ConversationLog[]> {
  const messages = parseAssistantResponse(response, assistants)
  
  // 各メッセージの音声を生成
  for (const message of messages) {
    if (message.speaker) {
      try {
        const speakerVoice = getSpeakerByAssistant(message.speaker.name)
        const audioBlob = await generateSpeechWithAzureOpenAI(message.content, speakerVoice)
        const audioBase64 = await blobToBase64(audioBlob)
        message.audioData = audioBase64
      } catch (error) {
        console.error(`Failed to generate audio for ${message.speaker.name}:`, error)
        // 音声生成に失敗してもメッセージ自体は保持
      }
    }
  }
  
  return messages
}

/**
 * 会話ログにシステムメッセージを追加する関数
 */
export function addSystemMessage(
  log: ConversationLog[],
  content: string
): ConversationLog[] {
  const systemMessage: ConversationLog = {
    role: "system",
    content,
  }
  return [...log, systemMessage]
}

/**
 * 会話ログにユーザーメッセージを追加する関数
 */
export function addUserMessage(
  log: ConversationLog[],
  content: string
): ConversationLog[] {
  const userMessage: ConversationLog = {
    role: "user",
    content,
  }
  return [...log, userMessage]
}
