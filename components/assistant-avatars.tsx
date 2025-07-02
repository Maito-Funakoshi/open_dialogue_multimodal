"use client"

import type { Assistant } from "@/types/chat"
import Image from "next/image";

interface AssistantAvatarsProps {
  assistants: Assistant[]
}

export function AssistantAvatars({ assistants }: AssistantAvatarsProps) {
  const iconPaths: string[] = assistants.map((assistant) => {
    return `./${assistant.id}.png`
  })

  return (
    <div className="flex gap-24 justify-center">
      {assistants.map((assistant) => (
        <div key={assistant.id} className="flex flex-col items-center">
          <Image src={iconPaths[Number(assistant.id)]} width={180} height={180} alt={assistant.id}></Image>
          <div className="mt-3 text-gray-700 text-2xl font-medium">{assistant.name}</div>
        </div>
      ))}
    </div>
  )
}
