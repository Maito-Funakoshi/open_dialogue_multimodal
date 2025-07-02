export interface Assistant {
  id: string
  name: string
  displayName: string
  color: string
  character: string
}

export interface ConversationLog {
  role: "user" | "assistant" | "developer" | "system"
  content: string
  speaker?: Assistant
  timestamp: Date
}
