"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Save, User, Users, Trash2, Database, UserPen, Volume2, VolumeX } from "lucide-react"
import { CONVERSATION_LOG_KEY } from "@/lib/config"
import { AudioManager } from "@/lib/audio-manager"
import { getAudioPermission, setAudioPermission } from "@/lib/cookie-utils"


interface SettingsViewProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  userName: string
  setUserName: (name: string) => void
  userGender: string
  setUserGender: (gender: string) => void
}

export function SettingsView({
  sidebarOpen,
  setSidebarOpen,
  userName,
  setUserName,
  userGender,
  setUserGender
}: SettingsViewProps) {
  const [tempUserName, setTempUserName] = useState(userName)
  const [tempUserGender, setTempUserGender] = useState(userGender)
  const [hasChanges, setHasChanges] = useState(false)
  const [audioPermissionFlag, setAudioPermissionFlag] = useState<boolean>(false)
  const [isInitializingAudio, setIsInitializingAudio] = useState(false)
  const router = useRouter()


  useEffect(() => {
    setTempUserName(userName)
    setTempUserGender(userGender)
  }, [userName, userGender])

  useEffect(() => {
    const nameChanged = tempUserName !== userName
    const genderChanged = tempUserGender !== userGender
    setHasChanges(nameChanged || genderChanged)
  }, [tempUserName, tempUserGender, userName, userGender])

  // 音声許可状態を読み込む（Cookie、24時間有効）
  useEffect(() => {
    const permission = getAudioPermission()
    setAudioPermission(permission === true)
    setAudioPermissionFlag(permission == true)
  }, [])

  const handleSave = () => {
    if (!tempUserName.trim()) {
      alert("名前を入力してください")
      return
    }

    setUserName(tempUserName.trim())
    setUserGender(tempUserGender)

    localStorage.setItem("userName", tempUserName.trim())
    localStorage.setItem("gender", tempUserGender)


    alert("設定を保存しました")
  }

  const handleReset = () => {
    setTempUserName(userName)
    setTempUserGender(userGender)
  }

  const handleClearConversationHistory = () => {
    if (confirm("対話履歴を削除しますか？この操作は元に戻せません。")) {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(CONVERSATION_LOG_KEY)
          alert("対話履歴を削除しました")
          // 削除を即座に反映させるためにリロードさせている
          window.location.reload()
        } catch (error) {
          console.error("Failed to clear conversation history:", error)
          alert("対話履歴の削除に失敗しました")
        }
      }
    }
  }

  const handleToggleAudioPermission = async () => {
    setIsInitializingAudio(true)

    try {
      if (!audioPermissionFlag) {
        // 音声を有効にする
        const audioManager = AudioManager.getInstance()
        const success = await audioManager.initializeAudioContext()

        if (success) {
          setAudioPermission(true)
          setAudioPermissionFlag(true)
          alert("音声が有効になりました")
        } else {
          alert("音声の初期化に失敗しました。もう一度お試しください。")
        }
      } else {
        // 音声を無効にする
        setAudioPermission(false)
        setAudioPermissionFlag(false)
      }
      // ページをリロードして音声設定をリセット
      window.location.reload()
    } catch (error) {
      console.error("Failed to toggle audio permission:", error)
      alert("設定の変更に失敗しました")
    } finally {
      setIsInitializingAudio(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 relative">
        <SidebarTrigger className="absolute left-2 top-1/2 transform -translate-y-1/2" />
        <h1 className="text-xl font-bold text-center text-gray-800 px-12">設定</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {/* Current Settings - Compact View */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm h-fit">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-green-500" />
                <h2 className="text-sm font-semibold text-gray-800">現在の設定</h2>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">お名前:</span>
                  <span className="text-xs font-medium text-gray-800">{userName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">性別:</span>
                  <span className="text-xs font-medium text-gray-800">{userGender}</span>
                </div>
              </div>
            </div>

            {/* User Profile - Compact */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <UserPen className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-800">ユーザープロフィール</h2>
              </div>

              <div className="space-y-3">
                {/* Name Input */}
                <div>
                  <label htmlFor="userName" className="block text-xs font-medium text-gray-700 mb-1">
                    お名前
                  </label>
                  <Input
                    id="userName"
                    value={tempUserName}
                    onChange={(e) => setTempUserName(e.target.value)}
                    placeholder="お名前を入力"
                    className="w-full h-8 text-sm"
                  />
                </div>

                {/* Gender Selection - Inline */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">性別</label>
                  <div className="flex gap-3">
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="男性"
                        checked={tempUserGender === "男性"}
                        onChange={(e) => setTempUserGender(e.target.value)}
                        className="w-3 h-3"
                      />
                      <span className="text-xs">男性</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="女性"
                        checked={tempUserGender === "女性"}
                        onChange={(e) => setTempUserGender(e.target.value)}
                        className="w-3 h-3"
                      />
                      <span className="text-xs">女性</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="未回答"
                        checked={tempUserGender === "未回答"}
                        onChange={(e) => setTempUserGender(e.target.value)}
                        className="w-3 h-3"
                      />
                      <span className="text-xs">未回答</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Compact */}
              {hasChanges && (
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                  >
                    リセット
                  </Button>
                  <Button
                    onClick={handleSave}
                    size="sm"
                    className="flex-1 h-7 text-xs bg-blue-500 hover:bg-blue-600"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    保存
                  </Button>
                </div>
              )}
            </div>

            {/* Audio Settings - Compact */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm h-fit">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-purple-500" />
                <h2 className="text-sm font-semibold text-gray-800">音声設定</h2>
              </div>

              <div className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded">
                <div>
                  <h3 className="text-xs font-medium text-gray-800">音声自動再生</h3>
                  <p className="text-xs text-gray-600">
                    {audioPermissionFlag ? "有効" : "無効"}
                  </p>
                </div>
                <Button
                  variant={audioPermissionFlag ? "outline" : "default"}
                  onClick={handleToggleAudioPermission}
                  disabled={isInitializingAudio}
                  size="sm"
                  className="h-7 text-xs px-3"
                >
                  {isInitializingAudio ? (
                    "処理中..."
                  ) : audioPermissionFlag ? (
                    <>
                      <VolumeX className="w-3 h-3 mr-1" />
                      無効にする
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3 mr-1" />
                      有効にする
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Data Management - Compact */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm h-fit">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-semibold text-gray-800">データ管理</h2>
              </div>

              <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                <div>
                  <h3 className="text-xs font-medium text-gray-800">対話履歴の削除</h3>
                  <p className="text-xs text-gray-600">
                    全履歴を削除します
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleClearConversationHistory}
                  size="sm"
                  className="h-7 text-xs px-3"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  削除
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
