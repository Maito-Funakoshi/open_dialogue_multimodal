# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Open Dialogue Multimodal Chatbot Application** (オープンダイアローグチャットボットアプリver.2) built with Next.js. It implements a therapeutic conversation system where multiple AI assistants engage in open dialogue with users, featuring comprehensive text and voice input/output capabilities.

The application simulates open dialogue therapy sessions with three distinct AI assistants, each with unique personalities and therapeutic roles. Users can engage in both regular conversations and "reflecting" sessions where assistants discuss among themselves.

## Development Commands

- **Development**: `npm run dev` - Start development server
- **Build**: `npm run build` - Build for production
- **Lint**: `npm run lint` - Run linting (configured to ignore errors during builds)
- **Start**: `npm run start` - Start production server

## Application Architecture

### Core Application Structure
- **Main Entry Point**: `/app/page.tsx` - Root component managing global state and view routing
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

### AI Assistant System
Three therapeutic AI assistants configured in `/lib/config.ts`:

1. **後藤 (Goto)** - 45-year-old male psychiatrist
   - Role: Empathetic listener and questioner
   - Personality: Sensitive, good at listening, uses 5W1H questions
   - Speaking style: Empathetic tone

2. **西村 (Nishimura)** - 33-year-old female clinical psychologist  
   - Role: Creative idea generator and solution provider
   - Personality: Creative, open-minded, good at brainstorming
   - Speaking style: Casual, enthusiastic tone

3. **山田 (Yamada)** - 28-year-old male nurse
   - Role: Mental health protector and mood maker
   - Personality: Bright, energetic, protective of client's mental state
   - Speaking style: Youthful, encouraging tone

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