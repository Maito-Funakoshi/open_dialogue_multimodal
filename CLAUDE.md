# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Open Dialogue multimodal chatbot application built with Next.js. It features text and voice input/output capabilities and implements an open dialogue therapy system with multiple AI assistants.

## Development Commands

- **Development**: `npm run dev` - Start development server
- **Build**: `npm run build` - Build for production
- **Lint**: `npm run lint` - Run linting (configured to ignore errors during builds)
- **Start**: `npm run start` - Start production server

## Core Architecture

### AI Integration
- Uses Azure OpenAI (gpt-4.1) for conversation generation via `/lib/openai.ts`
- Implements text-to-speech using Azure OpenAI TTS (gpt-4o-mini-tts)
- Voice API proxy at `/app/api/voice/route.ts` (currently using VOICEVOX API)

### Assistant System
- Three AI assistants configured in `/lib/config.ts`:
  - 後藤 (Goto): 45-year-old male psychiatrist, empathetic listener
  - 西村 (Nishimura): 33-year-old female clinical psychologist, creative problem solver
  - 山田 (Yamada): 28-year-old male nurse, mental health protector
- Each assistant has distinct personalities and speaking styles

### Key Components
- `/components/chat-view.tsx` - Main chat interface
- `/components/message-input.tsx` - Input handling with voice/text
- `/components/chat-messages.tsx` - Message display
- `/lib/voice-utils.ts` - Voice processing utilities
- `/lib/audio-manager.ts` - Audio playback management

### Type System
- `/types/chat.ts` - Core chat interfaces (Assistant, ConversationLog)
- Uses TypeScript with strict mode enabled
- Path aliases: `@/*` maps to root directory

### Styling
- Tailwind CSS with custom theme configuration
- Radix UI components for consistent design
- Dark mode support via `next-themes`
- Custom color scheme with sidebar-specific colors

## Key Features

### Open Dialogue System
- Multiple AI assistants engage in therapeutic conversations
- Reflecting mode where assistants discuss among themselves
- Dynamic conversation generation based on user input and context

### Voice Capabilities
- Text-to-speech using Azure OpenAI TTS
- Voice input processing (implementation in progress)
- Audio playback management with proper cleanup

### Environment Variables Required
- `NEXT_PUBLIC_AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint
- `NEXT_PUBLIC_AZURE_OPENAI_API_VERSION` - API version
- `NEXT_PUBLIC_AZURE_DEPLOYMENT_NAME` - Chat model deployment name
- `NEXT_PUBLIC_AZURE_OPENAI_TTS_*` - TTS-specific configurations
- `NEXT_PUBLIC_VOICEVOX_API_KEY` - VOICEVOX API key (for voice proxy)

## Configuration Notes

- TypeScript and ESLint errors are ignored during builds for faster development
- Images are unoptimized for better compatibility
- Browser compatibility enabled for Azure OpenAI client
- Conversation logs stored in localStorage with key `conversationLog`