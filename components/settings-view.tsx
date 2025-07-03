"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Save, User, Users } from "lucide-react"

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

  useEffect(() => {
    setTempUserName(userName)
    setTempUserGender(userGender)
  }, [userName, userGender])

  useEffect(() => {
    const nameChanged = tempUserName !== userName
    const genderChanged = tempUserGender !== userGender
    setHasChanges(nameChanged || genderChanged)
  }, [tempUserName, tempUserGender, userName, userGender])

  const handleSave = () => {
    if (!tempUserName.trim()) {
      alert("名前を入力してください")
      return
    }

    setUserName(tempUserName.trim())
    setUserGender(tempUserGender)
    
    alert("設定を保存しました")
  }

  const handleReset = () => {
    setTempUserName(userName)
    setTempUserGender(userGender)
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
          {/* User Profile Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-500" />
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

          {/* Current Settings Display */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-green-500" />
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
        </div>
      </div>
    </div>
  )
}
