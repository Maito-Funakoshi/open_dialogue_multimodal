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
    <div className="flex gap-6 sm:gap-8 md:gap-12 lg:gap-24 justify-center flex-wrap">
      {assistants.map((assistant) => (
        <div key={assistant.id} className="flex flex-col items-center">
          <div className="relative">
            {/* 波打つアニメーション */}
            {currentSpeakingAssistant === assistant.id && (
              <>
                <div className="absolute inset-0 rounded-full border-2 md:border-4 border-blue-400 animate-ping opacity-75"></div>
                <div className="absolute inset-0 rounded-full border-2 md:border-4 border-blue-300 animate-pulse opacity-50" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute inset-0 rounded-full border-1 md:border-2 border-blue-200 animate-ping opacity-25" style={{ animationDelay: '1s' }}></div>
              </>
            )}
            <Image 
              src={iconPaths[Number(assistant.id)]} 
              width={120} 
              height={120} 
              alt={assistant.id}
              priority={false}
              className="relative z-10 rounded-full w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 xl:w-44 xl:h-44"
            />
          </div>
          <div className="mt-3 md:mt-3 text-gray-700 text-lg sm:text-xl md:text-lg lg:text-xl xl:text-2xl font-semibold text-center">
            {assistant.name}
          </div>
        </div>
      ))}
    </div>
  )
}
