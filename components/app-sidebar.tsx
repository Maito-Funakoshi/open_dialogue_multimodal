"use client"

import { Home, MessageSquare, Settings, User } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import type { Assistant } from "@/types/chat"

interface AppSidebarProps {
  assistants: Assistant[]
  currentView: "home" | "chat" | "settings"
  setCurrentView: (view: "home" | "chat" | "settings") => void
}

const menuItems = [
  {
    title: "ホーム",
    view: "home" as const,
    icon: Home,
  },
  {
    title: "会話履歴",
    view: "chat" as const,
    icon: MessageSquare,
  },
  {
    title: "設定",
    view: "settings" as const,
    icon: Settings,
  },
]

export function AppSidebar({ assistants, currentView, setCurrentView }: AppSidebarProps) {
  return (
    <Sidebar className="border-r border-gray-200 w-64">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded flex items-center justify-center text-white font-bold">ODC</div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => setCurrentView(item.view)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md w-full text-left ${
                        currentView === item.view
                          ? "bg-gray-700 text-white"
                          : "text-gray-300 hover:text-white hover:bg-gray-700"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-sm font-medium px-3 py-2">
            キャラクター設定
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-1">
              {assistants.map((assistant) => (
                <div key={assistant.id} className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-medium">{assistant.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
                    {assistant.character.trim().split("\n").slice(0, 4).join("\n")}
                    {assistant.character.trim().split("\n").length > 4 && "..."}
                  </div>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
