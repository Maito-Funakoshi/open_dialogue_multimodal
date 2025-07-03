import type { Assistant, ConversationLog } from "@/types/chat"

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
 * リフレクティングモードかどうかを判定する関数
 */
export function shouldActivateReflecting(message: string): boolean {
  return message.includes("リフレクティングを開始して下さい")
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
