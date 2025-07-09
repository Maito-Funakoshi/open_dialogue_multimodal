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
        <div className="space-y-3 md:space-y-4 p-1 md:p-2">
          {conversationLog.map((log, index) => (
            <div key={index} className="flex gap-2 md:gap-3">
              {log.role === "user" ? (
                <div className="flex gap-2 md:gap-3 w-full">
                  <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0">
                    <Image src="user.png" width={100} height={100} alt="user" className="rounded-full"></Image>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs md:text-sm text-gray-600 mb-1">あなた</div>
                    <div className="bg-blue-100 rounded-lg p-2 md:p-3 text-gray-800 text-sm md:text-base break-words whitespace-pre-wrap">{log.content}</div>
                  </div>
                </div>
              ) : log.role === "system" ? (
                <div className="w-full flex justify-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 md:p-3 my-1 md:my-2 max-w-full">
                    <div className="text-blue-800 font-medium text-center text-xs md:text-sm break-words whitespace-pre-wrap">{log.content}</div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 md:gap-3 w-full">
                  <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0">
                    <Image src={"./" + log.speaker?.id + ".png"} width={100} height={100} alt={String(index)} className="rounded-full"></Image>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs md:text-sm text-gray-600">{log.speaker?.name || "アシスタント"}</div>
                      {log.audioData && (
                        <audio 
                          controls 
                          className="h-6 md:h-8"
                          preload="metadata"
                        >
                          <source src={log.audioData} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      )}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-2 md:p-3 text-gray-800 text-sm md:text-base break-words whitespace-pre-wrap">{log.content}</div>
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
