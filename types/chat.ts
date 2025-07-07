export interface Assistant {
  id: string
  name: string
  character: string
}

export interface ConversationLog {
  role: "user" | "assistant" | "system"
  content: string
  speaker?: Assistant
  audioData?: string // Base64 encoded audio data
}
