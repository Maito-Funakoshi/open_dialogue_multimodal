import type { Assistant, ConversationLog } from "@/types/chat"

/**
 * アシスタントの応答を個別のメッセージに解析する関数
 */
export function parseAssistantResponse(response: string, assistants: Assistant[]): ConversationLog[] {
  console.log(`📋 [PARSE] Starting response parsing - Length: ${response.length} characters`)
  const parseStartTime = performance.now()

  const messages: ConversationLog[] = []
  
  const splitStart = performance.now()
  const names = assistants.map((assistant) => {return assistant.name})
  const lines = response.split("\n").filter((line) => line.trim())
  console.log(`📄 [PARSE] Split and filter: ${(performance.now() - splitStart).toFixed(2)}ms - ${lines.length} valid lines`)

  const regexStart = performance.now()
  const namePattern = names.join("|") // "後藤|西村|山田"
  const matcher = new RegExp(`^(${namePattern})：(.+)$`)
  console.log(`🔍 [PARSE] Regex creation: ${(performance.now() - regexStart).toFixed(2)}ms`)

  let matchedLines = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineStart = performance.now()
    
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
        matchedLines++
        console.log(`✅ [PARSE] Line ${i + 1} matched: ${speakerName} - "${content.substring(0, 30)}..." (${(performance.now() - lineStart).toFixed(2)}ms)`)
      } else {
        console.log(`⚠️ [PARSE] Line ${i + 1} - Speaker not found: ${speakerName}`)
      }
    } else {
      console.log(`❌ [PARSE] Line ${i + 1} - No match: "${line.substring(0, 30)}..."`)
    }
  }

  const totalParseTime = performance.now() - parseStartTime
  console.log(`✅ [PARSE] Response parsing completed: ${totalParseTime.toFixed(2)}ms`)
  console.log(`📊 [PARSE] Results - ${messages.length} messages from ${matchedLines}/${lines.length} matched lines`)

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
