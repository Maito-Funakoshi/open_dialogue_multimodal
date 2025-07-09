/**
 * Cookie管理ユーティリティ
 * 音声許可状態を24時間だけ保持するために使用
 */

// Cookieの設定オプション
interface CookieOptions {
  expires?: number // 有効期限（時間）
  path?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

// デフォルトのCookieオプション
const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  expires: 24, // 24時間
  path: '/',
  secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  sameSite: 'lax'
}

/**
 * Cookieを設定する
 * @param name Cookie名
 * @param value 値
 * @param options オプション
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof window === 'undefined') return

  const opts = { ...DEFAULT_COOKIE_OPTIONS, ...options }
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

  // 有効期限を設定
  if (opts.expires) {
    const date = new Date()
    date.setTime(date.getTime() + (opts.expires * 60 * 60 * 1000)) // 時間をミリ秒に変換
    cookieString += `; expires=${date.toUTCString()}`
  }

  // パスを設定
  if (opts.path) {
    cookieString += `; path=${opts.path}`
  }

  // Secure属性を設定
  if (opts.secure) {
    cookieString += '; secure'
  }

  // SameSite属性を設定
  if (opts.sameSite) {
    cookieString += `; samesite=${opts.sameSite}`
  }

  try {
    document.cookie = cookieString
  } catch (error) {
    console.error('Failed to set cookie:', error)
  }
}

/**
 * Cookieを取得する
 * @param name Cookie名
 * @returns Cookie値またはnull
 */
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null

  try {
    const nameEQ = encodeURIComponent(name) + '='
    const cookies = document.cookie.split(';')
    
    for (let cookie of cookies) {
      cookie = cookie.trim()
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length))
      }
    }
    return null
  } catch (error) {
    console.error('Failed to get cookie:', error)
    return null
  }
}

/**
 * Cookieを削除する
 * @param name Cookie名
 */
export function deleteCookie(name: string): void {
  if (typeof window === 'undefined') return

  try {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  } catch (error) {
    console.error('Failed to delete cookie:', error)
  }
}

/**
 * 音声許可状態を設定する
 * @param granted 許可状態
 */
export function setAudioPermission(granted: boolean): void {
  setCookie('audioPermissionGranted', granted ? 'true' : 'false', {
    expires: 24 // 24時間
  })
}

/**
 * 音声許可状態を取得する
 * @returns 許可状態（true/false）またはnull（未設定）
 */
export function getAudioPermission(): boolean | null {
  const value = getCookie('audioPermissionGranted')
  if (value === null) return null
  return value === 'true'
}

/**
 * 音声許可状態を削除する
 */
export function clearAudioPermission(): void {
  deleteCookie('audioPermissionGranted')
}