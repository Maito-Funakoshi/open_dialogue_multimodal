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
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { Assistant } from "@/types/chat"

interface AppSidebarProps {
  assistants: Assistant[]
  currentView: "home" | "chat" | "settings"
  setCurrentView: (view: "home" | "chat" | "settings") => void
  sidebarOpen: boolean
  setSidebarOpen: (sidebar: boolean) => void
  onMenuClick?: () => void
}

const menuItems = [
  {
    title: "ホーム",
    view: "home" as const,
    icon: Home,
  },
  {
    title: "対話履歴",
    view: "chat" as const,
    icon: MessageSquare,
  },
  {
    title: "設定",
    view: "settings" as const,
    icon: Settings,
  },
]

export function AppSidebar({ assistants, currentView, setCurrentView, sidebarOpen, setSidebarOpen, onMenuClick }: AppSidebarProps) {
  const { toggleSidebar, isMobile } = useSidebar()

  const handleCloseClick = () => {
    if (isMobile) {
      toggleSidebar()
    } else {
      setSidebarOpen(!sidebarOpen)
    }
  }

  return (
    // ベースカラーは白 (bg-white)
    <Sidebar className="w-64 bg-white text-gray-800 border-r border-gray-200" collapsible="offcanvas">
      {/* ヘッダーも白基調、下線で区切る */}
      <SidebarHeader className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          {/* ロゴはアクセントカラーの緑 (text-green-700) */}
          <div className="w-10 h-10 flex items-center justify-center text-green-700 font-bold text-lg">
            ODC
          </div>
          {/* クローズボタンはアイコンの色とホバー効果で表現 */}
          <Button
            onClick={handleCloseClick}
            className="bg-transparent hover:bg-gray-100 p-2 rounded-full transition-colors duration-200"
          >
            <X className="w-6 h-6 text-gray-500 hover:text-gray-700" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4 bg-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => {
                        setCurrentView(item.view)
                        onMenuClick?.()
                      }}
                      // アクティブ時はアクセントカラーの緑、非アクティブ時はモノトーンにホバー効果
                      className={`flex items-center gap-3 px-4 py-2 rounded-md w-full text-left transition-colors duration-200 active:bg-green-600 
                        ${currentView === item.view
                          ? "bg-green-600 text-white shadow-md shadow-green-700/20 hover:bg-green-600" // アクティブ項目は緑の背景と白い文字
                          : "text-gray-700 hover:text-gray-900 hover:bg-gray-100" // ホバー時に背景色変化とテキスト強調
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

        {/* 区切り線は薄いグレー */}
        <SidebarSeparator className="my-6 border-gray-200" />

        <SidebarGroup>
          {/* ラベルは少し薄いグレー */}
          <SidebarGroupLabel className="text-gray-500 text-sm font-semibold px-4 py-2">
            キャラクター設定
          </SidebarGroupLabel>
          <SidebarGroupContent className="p-0">
            <div className="px-1 py-1">
              {assistants.map((assistant) => (
                <div key={assistant.id} className="mb-4 p-1 rounded-md cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-800 font-medium text-sm md:text-base">{assistant.name}</span>
                  </div>
                  <div className="text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-line">
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
