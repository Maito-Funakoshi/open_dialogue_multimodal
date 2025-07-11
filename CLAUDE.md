# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview / プロジェクト概要

This is an **Open Dialogue Multimodal Chatbot Application** (オープンダイアローグチャットボットアプリver.2) built with Next.js. It implements a therapeutic conversation system where multiple AI assistants engage in open dialogue with users, featuring comprehensive text and voice input/output capabilities.

これはNext.jsで構築された**オープンダイアローグマルチモーダルチャットボットアプリケーション**です。複数のAIアシスタントがユーザーとオープンダイアローグ（開放的な対話）を行う治療的会話システムを実装しており、包括的なテキストおよび音声の入出力機能を備えています。

The application simulates open dialogue therapy sessions with three distinct AI assistants, each with unique personalities and therapeutic roles. Users can engage in both regular conversations and "reflecting" sessions where assistants discuss among themselves.

このアプリケーションは、それぞれ独自の性格と治療的役割を持つ3人の異なるAIアシスタントによるオープンダイアローグセラピーセッションをシミュレートします。ユーザーは通常の会話と、アシスタント同士が議論する「リフレクティング」セッションの両方に参加できます。

### 主な機能とコンセプト / Key Features and Concepts

**オープンダイアローグとは / What is Open Dialogue:**
- 従来の1対1の治療とは異なり、複数の専門家（アシスタント）が同時に関わる治療的アプローチ
- クライアント（ユーザー）の問題を多角的に捉え、より豊かな対話を通じて支援を行う
- リフレクティングという手法で、専門家同士がクライアントの前で議論し、新たな視点を提供

**マルチモーダル対話 / Multimodal Interaction:**
- テキスト入力：キーボードでの文字入力
- 音声入力：Web Speech APIを使った音声認識
- 音声出力：Azure OpenAI TTSによる各アシスタントの個別音声
- 視覚的表現：アシスタントのアバター表示と状態指示

**治療的支援システム / Therapeutic Support System:**
- 3人の専門家アシスタントによる多面的な支援
- ユーザーの悩みや相談に対する協力的なアプローチ
- 心理的安全性を重視した対話環境の提供

## Development Commands

- **Development**: `npm run dev` - Start development server
- **Build**: `npm run build` - Build for production
- **Lint**: `npm run lint` - Run linting (configured to ignore errors during builds)
- **Start**: `npm run start` - Start production server

## Application Architecture

### Core Application Structure / コアアプリケーション構造
- **Main Entry Point / メインエントリーポイント**: `/app/page.tsx` - Root component managing global state and view routing / グローバル状態とビューのルーティングを管理するルートコンポーネント
- **View System**: Three main views (Home, Chat, Settings) with dynamic navigation
- **State Management**: React hooks for conversation log, user settings, and audio playback state
- **Responsive Design**: Mobile-first responsive layout with sidebar navigation

### AI Integration & Conversation System
- **Azure OpenAI Integration**: Uses gpt-4.1 for conversation generation via `/lib/openai.ts`
- **Conversation Modes**:
  - **Regular Chat**: Normal dialogue with multiple assistants
  - **Reflecting Mode**: Assistants discuss among themselves while user observes
- **Dynamic Prompt System**: Context-aware prompts based on user profile and conversation history
- **Response Parsing**: Intelligent parsing of multi-assistant responses in `/lib/chat-utils.ts`

### AI Assistant System / AIアシスタントシステム
Three therapeutic AI assistants configured in `/lib/config.ts`:

**3人の治療的AIアシスタント（`/lib/config.ts`で設定）:**

1. **後藤 (Goto)** - 45歳男性精神科医 / 45-year-old male psychiatrist
   - 役割：共感的な聞き手・質問者 / Role: Empathetic listener and questioner
   - 性格：繊細で聞き上手、5W1H質問を活用 / Personality: Sensitive, good at listening, uses 5W1H questions
   - 話し方：共感的な口調 / Speaking style: Empathetic tone

2. **西村 (Nishimura)** - 33歳女性臨床心理士 / 33-year-old female clinical psychologist
   - 役割：創造的アイデア提供者・解決策提案者 / Role: Creative idea generator and solution provider
   - 性格：創造的でオープンマインド、ブレインストーミングが得意 / Personality: Creative, open-minded, good at brainstorming
   - 話し方：カジュアルで熱心な口調 / Speaking style: Casual, enthusiastic tone

3. **山田 (Yamada)** - 28歳男性看護師 / 28-year-old male nurse
   - 役割：メンタルヘルス保護者・ムードメーカー / Role: Mental health protector and mood maker
   - 性格：明るくエネルギッシュ、クライアントの心理状態を保護 / Personality: Bright, energetic, protective of client's mental state
   - 話し方：若々しく励ましの口調 / Speaking style: Youthful, encouraging tone

### Voice & Audio System
- **Text-to-Speech**: Azure OpenAI TTS (gpt-4o-mini-tts) with voice mapping per assistant
- **Voice Mapping**: Each assistant has a distinct voice (onyx, nova, alloy)
- **Audio History**: Persistent audio storage system with Base64 encoding in localStorage
- **Playback Features**:
  - Individual message playback controls in chat history
  - Automatic sequential playback of new responses
  - iOS-compatible audio handling with proper audio context management
- **Audio Components**:
  - `/lib/voice-utils.ts` - Core voice generation and playback logic
  - `/lib/audio-manager.ts` - Audio context management for iOS compatibility
  - `/app/api/voice/route.ts` - VOICEVOX API proxy (legacy system)

### User Interface Components

#### Core Views
- **HomeView** (`/components/home-view.tsx`): Welcome screen with assistant avatars and status indicators
- **ChatView** (`/components/chat-view.tsx`): Main conversation interface with message history
- **SettingsView** (`/components/settings-view.tsx`): User profile management and data controls

#### Chat Components
- **MessageInput** (`/components/message-input.tsx`): 
  - Multi-modal input (text/voice)
  - Response generation orchestration
  - Audio recording with Web Speech API
  - Reflecting mode trigger
- **ChatMessages** (`/components/chat-messages.tsx`):
  - Message history display with speaker avatars
  - Individual audio controls for each message
  - Responsive message bubbles with proper styling

#### UI Infrastructure
- **AppSidebar** (`/components/app-sidebar.tsx`): Navigation sidebar with assistant status
- **AssistantAvatars** (`/components/assistant-avatars.tsx`): Visual representation of assistants
- **Theme System**: Dark/light mode support via `next-themes`
- **Component Library**: Radix UI with Tailwind CSS styling

### Data Management & Persistence
- **Conversation Log**: Persistent storage in localStorage with `conversationLog` key
- **Audio Data**: Base64-encoded audio stored within conversation messages
- **User Settings**: Name and gender preferences stored in localStorage
- **Data Structure**: 
  ```typescript
  interface ConversationLog {
    role: "user" | "assistant" | "system"
    content: string
    speaker?: Assistant
    audioData?: string // Base64 encoded audio
  }
  ```

### Voice Processing Pipeline
1. **Response Generation**: AI generates text responses for multiple assistants
2. **Audio Generation**: Each assistant's response is converted to speech using Azure OpenAI TTS
3. **Storage**: Audio data is Base64-encoded and stored in conversation log
4. **Playback**: Automatic sequential playback of new responses
5. **History**: Individual audio controls available for all past messages

## Technical Implementation Details

### Environment Variables Required
- `NEXT_PUBLIC_AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint
- `NEXT_PUBLIC_AZURE_OPENAI_API_VERSION` - API version
- `NEXT_PUBLIC_AZURE_DEPLOYMENT_NAME` - Chat model deployment name
- `NEXT_PUBLIC_AZURE_OPENAI_TTS_*` - TTS-specific configurations
- `NEXT_PUBLIC_VOICEVOX_API_KEY` - VOICEVOX API key (legacy)

### Key Libraries & Technologies
- **Next.js 15.2.4** - React framework with App Router
- **TypeScript** - Type safety throughout the application
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Azure OpenAI SDK** - AI integration
- **Web Speech API** - Voice input functionality
- **localStorage** - Client-side data persistence

### Performance Optimizations
- **Audio Management**: Proper cleanup of audio resources and ObjectURL management
- **Error Handling**: Comprehensive error handling for audio playback and API calls
- **iOS Compatibility**: Special handling for iOS audio restrictions
- **Responsive Design**: Mobile-optimized interface with touch-friendly controls

### Development Patterns
- **Component Composition**: Modular React components with clear separation of concerns
- **State Management**: Centralized state in main App component with prop drilling
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures
- **Error Boundaries**: Graceful error handling throughout the application

### Configuration Notes
- **Build Configuration**: TypeScript and ESLint errors ignored during builds for faster development
- **Image Optimization**: Disabled for better compatibility
- **Audio Settings**: Browser-compatible audio with proper CORS handling
- **LocalStorage Keys**: Standardized keys for data persistence (`conversationLog`, `userName`, `gender`)

### Testing & Deployment
- **Platform**: Deployed on Vercel (https://open-dialogue-multimodal.vercel.app/)
- **Browser Support**: Modern browsers with Web Speech API support
- **Mobile Support**: iOS and Android compatibility with audio restrictions handling
- **PWA Features**: Configured for progressive web app capabilities

This application represents a sophisticated implementation of therapeutic AI conversation with comprehensive voice integration, making it suitable for open dialogue therapy sessions with persistent conversation history and multi-modal interaction capabilities.

## 日本語での詳細説明 / Detailed Description in Japanese

このアプリケーションは、**オープンダイアローグ**という治療的アプローチをAI技術で実現した革新的なチャットボットシステムです。

### アプリケーションの目的 / Application Purpose

**治療的対話の民主化:**
- 従来、専門的な治療施設でのみ提供されていたオープンダイアローグセッションを、誰でもアクセス可能なWebアプリケーションとして提供
- メンタルヘルスサポートの敷居を下げ、より多くの人が治療的対話を体験できる環境を構築

**多声的対話の実現:**
- 単一のAIとの対話ではなく、複数の専門家の視点を統合した豊かな対話体験
- ユーザーの問題を多角的に捉え、より包括的な支援を提供

### 技術的特徴 / Technical Features

**高度な音声処理:**
- 各アシスタントに固有の音声（Azure OpenAI TTS）を割り当て、リアルな対話体験を実現
- 並列TTS生成による高速音声合成とキャッシングシステムで応答性を向上
- iOS/Android対応の音声再生システム

**インテリジェントな会話解析:**
- GPT-4.1による自然な多人数会話の生成
- 発話者自動判定システムによる正確な会話ログ管理
- コンテキスト対応型プロンプトシステム

**リアルタイム状態管理:**
- 会話ログの永続化（localStorage）
- 音声データの効率的な管理とキャッシング
- レスポンシブデザインによるマルチデバイス対応

### 使用場面 / Use Cases

**個人的な悩み相談:**
- 日常的なストレスや人間関係の問題について、専門家チームからの多角的なアドバイスを受ける
- 一人で抱え込みがちな問題を、安全な環境で話し合える場を提供

**セルフケアとリフレクション:**
- リフレクティングモードで専門家同士の議論を聞くことで、新たな視点を発見
- 自分の状況を客観視し、問題解決の糸口を見つける支援

**学習・教育目的:**
- オープンダイアローグの手法を学習・体験したい専門家や学生向け
- 治療的対話のシミュレーション環境として活用

このアプリケーションは、AI技術を活用して従来の治療的アプローチを革新し、より多くの人がメンタルヘルスサポートにアクセスできる未来を目指しています。

## コードベース構造の概要 / Codebase Structure Overview

### ディレクトリ構成 / Directory Structure

```
open_dialogue_multimodal/
├── app/                    # Next.js App Router
│   ├── page.tsx           # メインエントリーポイント / Main entry point
│   ├── layout.tsx         # アプリケーションレイアウト / App layout
│   ├── globals.css        # グローバルスタイル / Global styles
│   └── api/               # API Routes
│       └── voice/         # 音声API（VOICEVOX、レガシー）/ Voice API (VOICEVOX, legacy)
│           └── route.ts
├── components/            # Reactコンポーネント / React Components
│   ├── app-sidebar.tsx    # サイドバーナビゲーション / Sidebar navigation
│   ├── assistant-avatars.tsx # アシスタントアバター表示 / Assistant avatars display
│   ├── audio-permission-modal.tsx # 音声許可モーダル / Audio permission modal
│   ├── chat-messages.tsx  # チャットメッセージ表示 / Chat messages display
│   ├── chat-view.tsx      # チャット画面 / Chat view
│   ├── home-view.tsx      # ホーム画面 / Home view
│   ├── message-input.tsx  # メッセージ入力 / Message input
│   ├── settings-view.tsx  # 設定画面 / Settings view
│   ├── theme-provider.tsx # テーマプロバイダー / Theme provider
│   └── ui/               # UI コンポーネントライブラリ（Radix UI + shadcn/ui）
├── lib/                  # コアライブラリ / Core Libraries
│   ├── audio-manager.ts  # 音声コンテキスト管理 / Audio context management
│   ├── chat-utils.ts     # チャット機能ユーティリティ / Chat utilities
│   ├── config.ts         # アプリケーション設定 / Application configuration
│   ├── cookie-utils.ts   # Cookie管理 / Cookie management
│   ├── openai.ts         # Azure OpenAI統合 / Azure OpenAI integration
│   ├── utils.ts          # 汎用ユーティリティ / General utilities
│   └── voice-utils.ts    # 音声処理・再生システム / Voice processing & playback
├── types/                # TypeScript型定義 / TypeScript type definitions
│   └── chat.ts           # チャット関連の型 / Chat-related types
├── hooks/                # カスタムReactフック / Custom React hooks
├── public/               # 静的アセット / Static assets
│   ├── *.png             # アシスタントアバター画像 / Assistant avatar images
│   └── ...               # PWA関連ファイル / PWA-related files
└── styles/               # スタイル設定 / Styling configuration
    └── globals.css
```

### 主要なコンポーネントとその役割 / Key Components and Their Roles

#### 1. アプリケーションコア / Application Core

**`app/page.tsx`** - **メインアプリケーション**
- アプリケーション全体の状態管理（会話ログ、ユーザー設定、音声状態）
- 3つのメインビュー（Home, Chat, Settings）のルーティング
- 音声許可モーダルの制御
- localStorage を使った永続化

**`lib/config.ts`** - **アプリケーション設定**
- 3人のAIアシスタントの詳細なキャラクター設定
- ユーザーデフォルト設定
- プロンプト設定
- 名前インデックス（OpenAI API制約対応）

#### 2. AI統合システム / AI Integration System

**`lib/openai.ts`** - **Azure OpenAI統合**
- GPT-4.1を使った会話生成
- TTS（Text-to-Speech）音声合成
- 並列TTS生成による高速化
- 発話者推定機能
- コンテキスト対応プロンプト生成

**`lib/chat-utils.ts`** - **会話解析ユーティリティ**
- 複数アシスタントの応答解析
- 発話者とメッセージ内容の分離
- 会話ログ管理（ユーザー・アシスタント・システムメッセージ）

#### 3. 音声処理システム / Voice Processing System

**`lib/voice-utils.ts`** - **高度な音声処理**
- `AdvancedVoicePlayer`クラス（シングルトンパターン）
- 音声キューイングシステム
- 音声キャッシング（効率的な再利用）
- 並列TTS生成とストリーミング再生
- Web Audio API統合

**`lib/audio-manager.ts`** - **音声コンテキスト管理**
- iOS/Android音声制限対応
- AudioContext の適切な初期化・管理
- ユーザーインタラクション対応

#### 4. ユーザーインターフェース / User Interface

**ビューコンポーネント / View Components:**
- `home-view.tsx` - ウェルカム画面とアシスタント紹介
- `chat-view.tsx` - メイン対話インターフェース
- `settings-view.tsx` - ユーザー設定管理

**対話コンポーネント / Interaction Components:**
- `message-input.tsx` - マルチモーダル入力（テキスト・音声・リフレクティング）
- `chat-messages.tsx` - メッセージ履歴と個別音声再生
- `assistant-avatars.tsx` - アシスタント視覚表現

#### 5. 状態管理とデータフロー / State Management and Data Flow

**データフロー:**
1. ユーザー入力 → `message-input.tsx`
2. OpenAI API呼び出し → `lib/openai.ts`
3. 応答解析 → `lib/chat-utils.ts`
4. 音声生成・再生 → `lib/voice-utils.ts`
5. 状態更新・永続化 → `app/page.tsx`

**永続化システム:**
- 会話ログ: localStorage（`conversationLog`キー）
- ユーザー設定: localStorage（`userName`, `gender`キー）
- 音声許可: Cookie（24時間有効）

### 技術的特徴 / Technical Highlights

#### アーキテクチャパターン / Architecture Patterns

**1. シングルトンパターン**
- `AdvancedVoicePlayer` - グローバル音声管理
- `AudioManager` - 音声コンテキスト管理

**2. コンポジションパターン**
- UIコンポーネントの段階的構成
- プロパティドリリングによる状態伝播

**3. プロバイダーパターン**
- `SidebarProvider` - サイドバー状態管理
- `ThemeProvider` - ダーク/ライトモード

#### パフォーマンス最適化 / Performance Optimizations

**音声処理最適化:**
- 並列TTS生成（Promise.all）
- 音声キャッシングシステム
- ストリーミング再生（最初の音声準備完了で即開始）
- プリロード機能（先読み音声生成）

**メモリ管理:**
- ObjectURL の適切なクリーンアップ
- 音声キャッシュサイズ制限
- 古いキャッシュの自動削除

#### 型安全性 / Type Safety

**TypeScript活用:**
- `types/chat.ts` - 厳密なインターフェース定義
- コンポーネント間の型安全なプロパティ受け渡し
- Azure OpenAI APIの型注釈

**データモデル:**
```typescript
interface ConversationLog {
  role: "user" | "assistant" | "system"
  content: string
  speaker?: Assistant
}

interface Assistant {
  id: string
  name: string
  character: string
}
```

### 開発パターンとベストプラクティス / Development Patterns and Best Practices

**1. 関心の分離 / Separation of Concerns**
- UI層：React コンポーネント
- ビジネスロジック層：lib/ ディレクトリ
- データ層：localStorage + API

**2. エラーハンドリング**
- 音声再生エラーの適切な処理
- API呼び出し失敗時のフォールバック
- ユーザーフレンドリーなエラーメッセージ

**3. アクセシビリティ**
- Radix UI の使用（アクセシブルなプリミティブ）
- 適切なARIA属性
- キーボードナビゲーション対応

**4. レスポンシブデザイン**
- モバイルファーストアプローチ
- Tailwind CSS によるユーティリティファーストスタイリング
- デスクトップ・モバイル両対応のUI

このコードベースは、現代的なWeb開発のベストプラクティスを取り入れながら、複雑な音声AI対話システムを実現する、よく構造化されたアプリケーションです。

## 認証・セキュリティシステム / Authentication & Security System

### 認証方式 / Authentication Approach

このアプリケーションは、**従来のユーザー認証システムを実装していません**。代わりに、治療的チャットボットとしての性質を考慮した**「認証なし」アーキテクチャ**を採用しています。

**「認証なし」設計の理由 / Why No-Auth Design:**
- **即座のアクセス性**: ユーザーが登録なしで即座に治療的対話を開始できる
- **プライバシー保護**: サーバーサイドにユーザーデータを保存せず、完全にクライアントサイドで管理
- **心理的障壁の除去**: メンタルヘルスサポートを求める際のアクセス障壁を最小化
- **匿名性の確保**: ユーザーの身元を特定する情報を収集しない

### 実装されている認証・セキュリティ機能 / Implemented Auth & Security Features

#### 1. **API認証 / API Authentication**
- **Azure OpenAI認証**: 環境変数による API キー管理
  - `NEXT_PUBLIC_AZURE_OPENAI_API_KEY` - チャット機能用
  - `NEXT_PUBLIC_AZURE_OPENAI_TTS_API_KEY` - 音声合成用
- **実装場所**: `/lib/openai.ts`
- **セキュリティ考慮**: `dangerouslyAllowBrowser: true` 設定でクライアントサイド実行を許可

#### 2. **音声許可管理 / Audio Permission Management**
- **Cookieベース許可管理**: 24時間の音声許可状態を保存
- **実装場所**: `/lib/cookie-utils.ts`
- **管理機能**:
  - `setAudioPermission(granted: boolean)` - 許可状態の保存
  - `getAudioPermission()` - 許可状態の取得
  - `clearAudioPermission()` - 許可データの削除

#### 3. **ユーザープロファイル管理 / User Profile Management**
- **localStorageベース**: サーバーを介さないユーザー設定管理
- **保存データ**:
  - `userName` - ユーザーの表示名
  - `gender` - 性別設定（男性/女性/未回答）
  - `conversationLog` - 完全な会話履歴（音声データ含む）
- **実装場所**: `/app/page.tsx` (39-46行, 67-68行, 74-86行)

### セキュリティ上の考慮事項 / Security Considerations

#### **クライアントサイドAPIキー露出の問題**
⚠️ **重要なセキュリティ課題**: 
- Azure OpenAI APIキーが `NEXT_PUBLIC_*` 環境変数としてクライアントサイドに露出
- ブラウザ開発者ツールでAPIキーが確認可能
- 本番環境では適切なAPIキーの保護メカニズムが必要

#### **データプライバシー保護**
✅ **プライバシー強化要素**:
- **サーバーサイドデータ保存なし**: 全データがクライアントサイドのみに保存
- **ユーザー制御可能なデータ削除**: 設定画面からの完全データ削除機能
- **匿名利用**: ユーザー識別情報の収集なし
- **セッション管理なし**: 従来の認証セッションによる追跡なし

### データ管理・アクセス制御 / Data Management & Access Control

#### **データの永続化方法 / Data Persistence Method**
- **会話ログ**: `localStorage['conversationLog']` - JSON形式
- **音声データ**: Base64エンコーディングで会話メッセージ内に埋め込み
- **ユーザー設定**: 個別localStorage項目として保存

#### **アクセス制御 / Access Control**
- **デバイス単位制御**: データは使用デバイスのlocalStorageに限定
- **ブラウザ単位分離**: 異なるブラウザ間でのデータ共有なし
- **ユーザー主導削除**: `/components/settings-view.tsx` でのデータ完全削除機能

### 認証関連ファイル構成 / Authentication-Related File Structure

```
/lib/
├── cookie-utils.ts          # 音声許可Cookie管理
├── openai.ts               # Azure OpenAI API認証
└── voice-utils.ts          # 音声機能の権限制御

/app/
└── page.tsx                # ユーザー状態初期化・管理

/components/
├── settings-view.tsx       # ユーザープロファイル・データ管理
└── audio-permission-modal.tsx # 音声許可ワークフロー
```

### 将来のセキュリティ強化案 / Future Security Enhancement Options

#### **API保護の改善**
- **プロキシAPI実装**: サーバーサイドでのAPIキー管理
- **レート制限**: 過度なAPI使用の制御
- **ドメイン制限**: 特定ドメインからのみのAPIアクセス許可

#### **データ暗号化**
- **localStorageデータ暗号化**: 機密性の高い会話データの保護
- **音声データ圧縮・暗号化**: Base64データの最適化と保護

#### **アクセス分析**
- **使用パターン分析**: 不審なアクセスの検出（個人特定しない範囲で）
- **セキュリティログ**: クライアントサイドセキュリティイベントの記録

### セキュリティ実装のベストプラクティス / Security Implementation Best Practices

**現在実装済み / Currently Implemented:**
- ✅ 機密データのサーバーサイド非保存
- ✅ ユーザー制御によるデータ削除機能
- ✅ 最小限の個人情報収集
- ✅ HTTPS通信（Vercelデプロイ）

**推奨改善項目 / Recommended Improvements:**
- 🔄 APIキーのサーバーサイド管理への移行
- 🔄 localStorageデータの暗号化実装
- 🔄 CSP（Content Security Policy）ヘッダーの設定
- 🔄 音声データの圧縮による効率化

このアプリケーションの認証・セキュリティアプローチは、治療的チャットボットという用途に特化して設計されており、従来のWebアプリケーションとは異なる「プライバシーファースト」の哲学に基づいて構築されています。

## データモデル / Data Models

このアプリケーションは治療的対話を実現するための包括的なデータモデルシステムを実装しており、TypeScript によって型安全性を確保しています。

### 1. 中核データモデル / Core Data Models

#### ConversationLog インターフェース
**定義場所**: `/types/chat.ts`
```typescript
interface ConversationLog {
  role: "user" | "assistant" | "system"
  content: string
  speaker?: Assistant
  audioData?: string // Base64エンコードされた音声データ
}
```
**役割**: アプリケーションの中心となる会話データ構造。ユーザーメッセージ、AIアシスタントの応答、システムメッセージを統一的に管理し、音声データの永続化もサポートします。

**使用場面**:
- localStorage での会話履歴の永続化
- チャット画面での会話表示
- 音声再生機能でのオーディオデータ管理
- AIへの会話コンテキスト提供

#### Assistant インターフェース
**定義場所**: `/types/chat.ts`
```typescript
interface Assistant {
  id: string      // 一意識別子（"0", "1", "2"）
  name: string    // アシスタント名（"後藤", "西村", "山田"）
  character: string // 性格・役割の詳細説明
}
```
**役割**: 3人の治療的AIアシスタントの基本情報を定義。各アシスタントの個性と専門性を管理します。

**設定詳細**:
- **後藤**: 45歳男性精神科医、共感的な聞き手・質問者
- **西村**: 33歳女性臨床心理士、創造的アイデア提供者
- **山田**: 28歳男性看護師、メンタルヘルス保護者・ムードメーカー

### 2. 音声・オーディオ管理モデル / Audio Management Models

#### AudioCache インターフェース
**定義場所**: `/lib/voice-utils.ts`
```typescript
interface AudioCache {
  blob: Blob        // 音声データのBlobオブジェクト
  url: string       // ObjectURLによる再生用URL
  timestamp: number // キャッシュ作成時刻（ガベージコレクション用）
}
```
**役割**: TTS生成済み音声のキャッシュ管理。メモリ効率化とパフォーマンス向上を実現します。

**管理機能**:
- 同一テキストの重複生成防止
- メモリリーク防止のためのURL自動解放
- 一定時間経過後の自動キャッシュ削除

#### QueueItem インターフェース
**定義場所**: `/lib/voice-utils.ts`
```typescript
interface QueueItem {
  text: string               // 音声化対象テキスト
  voiceId: string           // 使用する音声ID（onyx, nova, alloy）
  onStart?: () => void      // 再生開始時コールバック
  onEnd?: () => void        // 再生終了時コールバック
}
```
**役割**: 音声の順次再生キューを管理。複数アシスタントの応答を適切な順序で再生するために使用されます。

### 3. UIコンポーネントのProps型定義 / UI Component Props Models

#### MessageInputProps - メッセージ入力コンポーネント
**定義場所**: `/components/message-input.tsx`
```typescript
interface MessageInputProps {
  conversationLog: ConversationLog[]
  setConversationLog: (log: ConversationLog[]) => void
  setLatestResponse: (response: string) => void
  setIsReflecting: (reflecting: boolean) => void
  isReady: boolean
  setIsReady: (ready: boolean) => void
  assistants: Assistant[]
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  recognition: any
  setRecognition: (recognition: any) => void
  placeholder?: string
  userName: string
  userGender: string
  setCurrentSpeakingAssistant?: (assistantId: string | null) => void
}
```
**役割**: マルチモーダル入力（テキスト・音声）とリフレクティングモードの制御を統合管理。

#### ビューコンポーネントProps型
各主要ビュー（HomeView、ChatView、SettingsView）は、アプリケーション状態の特定の側面を管理する包括的なProps型を持ちます：

- **状態管理**: 会話ログ、音声状態、ユーザー設定
- **UI制御**: サイドバー表示、現在のビュー、録音状態
- **音声処理**: 現在話しているアシスタント、音声認識状態

### 4. ユーティリティとシステム型 / Utility and System Types

#### CookieOptions - Cookie管理設定
**定義場所**: `/lib/cookie-utils.ts`
```typescript
interface CookieOptions {
  expires?: number           // 有効期限（時間）
  path?: string             // パス設定
  secure?: boolean          // HTTPS必須フラグ
  sameSite?: 'strict' | 'lax' | 'none'  // SameSite ポリシー
}
```
**役割**: 音声許可状態の永続化など、セキュアなCookie管理を実現。

#### Toast通知システム型
**定義場所**: `/hooks/use-toast.ts`
- **ToasterToast**: トースト通知の基本構造
- **Action**: トースト状態変更アクション（追加、更新、削除、非表示）
- **State**: トースト管理状態

### 5. グローバル型拡張 / Global Type Extensions

#### Web Speech API型拡張
```typescript
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}
```
**役割**: ブラウザのWeb Speech API の型安全性を確保し、音声認識機能を実装。

### 6. 設定・マッピング型 / Configuration and Mapping Types

#### Voice Mapping - 音声マッピング設定
**定義場所**: `/lib/voice-utils.ts`
```typescript
const VOICE_MAP: Record<string, string> = {
  "後藤": "onyx",     // 深みのある男性音声
  "西村": "nova",     // 明るい女性音声  
  "山田": "alloy",    // 若々しい男性音声
  "default": "verse"  // デフォルト音声
}
```

#### Name Index Mapping - アシスタント識別子
**定義場所**: `/lib/config.ts`
```typescript
export const NAME_INDEX: { [key: string]: string } = {
  [ASSISTANTS[0].name]: "0",  // 後藤 → "0"
  [ASSISTANTS[1].name]: "1",  // 西村 → "1"  
  [ASSISTANTS[2].name]: "2"   // 山田 → "2"
}
```

### 7. API通信型 / API Communication Types

#### Azure OpenAI TTS Request/Response
**TTS要求型**:
```typescript
speechRequests: Array<{
  text: string;              // 音声化対象テキスト
  speaker: string;           // 発話者名
  instructions?: string;     // 追加指示（音調・スタイル）
}>
```

**TTS応答型**:
```typescript
Promise<Array<{ 
  blob: Blob;               // 生成された音声データ
  index: number;            // 元の要求配列でのインデックス
}>>
```

### 8. 状態管理型 / State Management Types

#### アプリケーション中央状態
**定義場所**: `/app/page.tsx`

```typescript
// ビュー制御
currentView: "home" | "chat" | "settings"

// 会話データ
conversationLog: ConversationLog[]
latestResponse: string

// 音声・録音状態
isRecording: boolean
isReflecting: boolean
currentSpeakingAssistant: string | null

// システム状態
isReady: boolean

// ユーザー設定
userName: string
userGender: string
```

### 9. データ永続化キー / Data Persistence Keys

#### localStorage キー管理
- `"conversationLog"` - 会話履歴データ（JSON形式）
- `"userName"` - ユーザー名設定
- `"gender"` - ユーザー性別設定
- `"audioPermissionGranted"` - 音声許可状態（Cookie、24時間有効）

### 10. 型安全性の特徴 / Type Safety Features

**包括的型カバレッジ**:
- 全てのコンポーネント間データ転送における型安全性
- API通信データの型チェック
- 状態更新時の型整合性検証

**エラー予防**:
- コンパイル時の型不整合検出
- 音声処理パイプラインでの型安全な状態遷移
- UIコンポーネントのProps型検証

**開発効率向上**:
- IDEでの自動補完とエラー検出
- リファクタリング時の安全性確保
- ドキュメント的役割による可読性向上

このデータモデルシステムにより、オープンダイアローグという複雑な治療的アプローチをAI技術で実現し、音声処理、状態管理、UI制御を型安全に統合した堅牢なアプリケーションを構築しています。