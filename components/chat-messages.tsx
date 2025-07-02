"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { Assistant, ConversationLog } from "@/types/chat"
import Image from "next/image"

interface ChatMessagesProps {
  conversationLog: ConversationLog[]
  assistants: Assistant[]
  isReflecting: boolean
}

export function ChatMessages({ conversationLog, assistants, isReflecting }: ChatMessagesProps) {
  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-2">
          {conversationLog.map((log, index) => (
            <div key={index} className="flex gap-3">
              {log.role === "user" ? (
                <div className="flex gap-3 w-full">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <Image src="user.png" width={100} height={100} alt="user"></Image>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">あなた</div>
                    <div className="bg-blue-100 rounded-lg p-3 text-gray-800">{log.content}</div>
                  </div>
                </div>
              ) : log.role === "system" ? (
                <div className="w-full flex justify-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
                    <div className="text-blue-800 font-medium text-center">{log.content}</div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 w-full">
                  <div
                    className="w-8 h-8 flex items-center justify-center"
                  >
                    <Image src={"./" + log.speaker?.id + ".png"} width={100} height={100} alt={String(index)}></Image>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">{log.speaker?.name || "アシスタント"}</div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-gray-800">{log.content}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
