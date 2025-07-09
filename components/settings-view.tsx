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
  const [audioPermission, setAudioPermission] = useState<boolean>(false)
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
  }, [])

  const handleSave = () => {
    if (!tempUserName.trim()) {
      alert("名前を入力してください")
      return
    }

    setUserName(tempUserName.trim())
    setUserGender(tempUserGender)

    localStorage.setItem("userName", tempUserName.trim())
    localStorage.setItem("gender",tempUserGender)


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
      if (!audioPermission) {
        // 音声を有効にする
        const audioManager = AudioManager.getInstance()
        const success = await audioManager.initializeAudioContext()
        
        if (success) {
          setAudioPermission(true)
          alert("音声が有効になりました")
        } else {
          alert("音声の初期化に失敗しました。もう一度お試しください。")
        }
      } else {
        // 音声を無効にする
        setAudioPermission(false)
        // ページをリロードして音声設定をリセット
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to toggle audio permission:", error)
      alert("設定の変更に失敗しました")
    } finally {
      setIsInitializingAudio(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with Hamburger Menu */}
      <div className="bg-white border-b border-gray-200 p-4 md:p-6 relative">
        <SidebarTrigger className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2" />
        <h1 className="text-lg md:text-2xl font-bold text-center text-gray-800 px-12 lg:px-0">設定</h1>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto p-3 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-8">
          {/* Current Settings Display */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-green-500" />
              <h2 className="text-base md:text-lg font-semibold text-gray-800">現在の設定</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">お名前:</span>
                <span className="text-sm font-medium text-gray-800">{userName}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">性別:</span>
                <span className="text-sm font-medium text-gray-800">{userGender}</span>
              </div>
            </div>
          </div>

          {/* User Profile Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UserPen className="w-5 h-5 text-blue-500" />
              <h2 className="text-base md:text-lg font-semibold text-gray-800">ユーザープロフィール</h2>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
              あなたの基本情報を設定してください。この情報はアシスタントとの会話で使用されます。
            </p>

            <div className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700">
                  お名前
                </label>
                <Input
                  id="userName"
                  value={tempUserName}
                  onChange={(e) => setTempUserName(e.target.value)}
                  placeholder="お名前を入力してください"
                  className="w-full"
                />
              </div>

              {/* Gender Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">性別</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="男性"
                      checked={tempUserGender === "男性"}
                      onChange={(e) => setTempUserGender(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">男性</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="女性"
                      checked={tempUserGender === "女性"}
                      onChange={(e) => setTempUserGender(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">女性</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="未回答"
                      checked={tempUserGender === "未回答"}
                      onChange={(e) => setTempUserGender(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">未回答</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {hasChanges && (
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleReset}
                className="px-4 md:px-6 w-full sm:w-auto"
              >
                リセット
              </Button>
              <Button
                onClick={handleSave}
                className="px-4 md:px-6 bg-blue-500 hover:bg-blue-600 w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          )}

          {/* Audio Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Volume2 className="w-5 h-5 text-purple-500" />
              <h2 className="text-base md:text-lg font-semibold text-gray-800">音声設定</h2>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
              AIアシスタントの音声読み上げ機能を管理できます。
            </p>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-800">音声自動再生</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    現在の状態: {audioPermission ? "有効" : "無効"}
                  </p>
                </div>
                <Button
                  variant={audioPermission ? "outline" : "default"}
                  onClick={handleToggleAudioPermission}
                  disabled={isInitializingAudio}
                  className="px-4 md:px-6 w-full sm:w-auto"
                >
                  {isInitializingAudio ? (
                    <>処理中...</>
                  ) : audioPermission ? (
                    <>
                      <VolumeX className="w-4 h-4 mr-2" />
                      音声を無効にする
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 mr-2" />
                      音声を有効にする
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-red-500" />
              <h2 className="text-base md:text-lg font-semibold text-gray-800">データ管理</h2>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
              保存されたデータを管理できます。削除したデータは復元できませんのでご注意ください。
            </p>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-800">対話履歴の削除</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    これまでの全ての対話履歴を削除します
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleClearConversationHistory}
                  className="px-4 md:px-6 w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  履歴を削除
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
