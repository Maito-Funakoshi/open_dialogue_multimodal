"use client"

import type { Assistant } from "@/types/chat"
import Image from "next/image";

interface AssistantAvatarsProps {
  assistants: Assistant[]
  currentSpeakingAssistant?: string | null
}

export function AssistantAvatars({ assistants, currentSpeakingAssistant }: AssistantAvatarsProps) {
  const iconPaths: string[] = assistants.map((assistant) => {
    return `./${assistant.id}.png`
  })

  return (
    <div className="flex gap-24 justify-center">
      {assistants.map((assistant) => (
        <div key={assistant.id} className="flex flex-col items-center">
          <div className="relative">
            {/* 波打つアニメーション */}
            {currentSpeakingAssistant === assistant.id && (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-75"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-300 animate-pulse opacity-50" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping opacity-25" style={{ animationDelay: '1s' }}></div>
              </>
            )}
            <Image 
              src={iconPaths[Number(assistant.id)]} 
              width={180} 
              height={180} 
              alt={assistant.id}
              className="relative z-10 rounded-full"
            />
          </div>
          <div className="mt-3 text-gray-700 text-2xl font-medium">{assistant.name}</div>
        </div>
      ))}
    </div>
  )
}
