"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Volume2, VolumeX } from "lucide-react"
import { AudioManager } from "@/lib/audio-manager"
import { initializeVoicePlayerAfterAudioPermission } from "@/lib/voice-utils"

interface AudioPermissionModalProps {
  isOpen: boolean
  onPermissionGranted: () => void
  onPermissionDenied: () => void
}

export function AudioPermissionModal({ 
  isOpen, 
  onPermissionGranted, 
  onPermissionDenied 
}: AudioPermissionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAllowAudio = async () => {
    setIsProcessing(true)
    
    try {
      // AudioManagerを使って音声コンテキストを完全に解除
      const audioManager = AudioManager.getInstance()
      const audioManagerSuccess = await audioManager.initializeAudioContext()
      
      if (audioManagerSuccess) {
        // AdvancedVoicePlayerも初期化
        const voicePlayerSuccess = await initializeVoicePlayerAfterAudioPermission()
        
        if (voicePlayerSuccess) {
          // 音声許可をlocalStorageに保存
          localStorage.setItem("audioPermissionGranted", "true")
          localStorage.setItem("audioPermissionTimestamp", Date.now().toString())
          console.log("Audio permission granted and both audio systems initialized")
          onPermissionGranted()
        } else {
          console.error("Failed to initialize voice player")
          onPermissionDenied()
        }
      } else {
        console.error("Failed to initialize audio context")
        onPermissionDenied()
      }
    } catch (error) {
      console.error("Error during audio permission:", error)
      onPermissionDenied()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDenyAudio = () => {
    localStorage.setItem("audioPermissionGranted", "false")
    localStorage.setItem("audioPermissionTimestamp", Date.now().toString())
    onPermissionDenied()
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="w-[80vw] sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            音声出力の許可
          </DialogTitle>
          <DialogDescription className="pt-3">
            このアプリでは、AIアシスタントの返答を音声で読み上げます。
            より良い体験のために、音声の自動再生を許可してください。
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-4">
          <p className="text-sm text-blue-800">
            <strong>プライバシーについて：</strong><br />
            音声はお使いのデバイスで再生されるだけで、録音や外部への送信は行いません。
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={handleAllowAudio} 
            disabled={isProcessing}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>処理中...</>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                音声を許可する
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleDenyAudio}
            disabled={isProcessing}
            className="w-full"
          >
            <VolumeX className="mr-2 h-4 w-4" />
            今は許可しない
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center">
          この設定は後から「設定」画面で変更できます
        </p>
      </DialogContent>
    </Dialog>
  )
}