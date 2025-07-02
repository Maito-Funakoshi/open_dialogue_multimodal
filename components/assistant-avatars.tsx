"use client"

import type { Assistant } from "@/types/chat"

interface AssistantAvatarsProps {
  assistants: Assistant[]
}

export function AssistantAvatars({ assistants }: AssistantAvatarsProps) {
  return (
    <div className="flex gap-8 justify-center">
      {assistants.map((assistant) => (
        <div key={assistant.id} className="flex flex-col items-center">
          <div
            className={`w-24 h-24 rounded-full ${assistant.color} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}
          >
            {assistant.name.charAt(0)}
          </div>
          <div className="mt-3 text-gray-700 font-medium">{assistant.name}</div>
        </div>
      ))}
    </div>
  )
}
