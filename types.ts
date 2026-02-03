export interface Ambiguity {
  id: number;
  quote: string;
  question: string;
  userAnswer?: string;
  resolved: boolean;
}

export type IntentTag = 'analysis_situation' | 'analysis_intent' | 'recommendation' | 'draft_reply';
export type UserEmotion = 'neutral' | 'anger' | 'despair' | 'fatigue' | 'anxiety';

// New Type for Legal Assets
export interface LegalAsset {
  id: string;
  code: string; // e.g. "CA Civil Code 1941.1"
  summary: string; // Brief explanation of the legal point
  question: string; // The question AI asks to verify applicability
  userAnswer?: string; // User's input
  status: 'verified' | 'pending' | 'inactive'; // The 3 states
  reasoning?: string; // Why is it pending or verified?
  actionItem?: string; // What needs to be done if pending
}

export interface ContextItem {
  id: string;
  type: 'background' | 'interaction';
  title: string; // Short 10-15 word summary
  detailedSummary: string; // The "Pen" content (analysis)
  language: string; // Language of the summary (e.g., 'English', 'Chinese', 'Spanish')
  fullContent?: string; // The "I sent..." text
  timestamp: number;
  chatHistory: ChatMessage[]; // Restore the chat state for this item
  isSelected: boolean; // For 3a: Checkbox state
}

export interface Project {
  id: string;
  name: string;
  status: 'drafting_context' | 'active';
  activeContextId: 'current' | string; // 'current' or a ContextItem.id
  rawContext: string;
  finalizedContext: string;
  ambiguities: Ambiguity[];
  legalAssets: LegalAsset[]; // New Field
  gameTheory: {
    platform: string;
    // Removed single 'language' field, replaced with dual variables
    interactionLanguage: string; // For UI/Analysis (e.g. Chinese)
    draftingLanguage: string;    // For Drafts (e.g. English)
    replyTimeMinutes: number;
    userGoal: string;
    userGoalSelected: boolean; // For 3a
    files: string[];
    userJurisdiction: string;
    counterpartJurisdiction: string;
  };
  contextHistory: ContextItem[];
  chatDraft: {
    theirLastMessage: string;
    chatHistory: ChatMessage[];
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export enum PlatformType {
  EMAIL = 'Email',
  INSTANT_MESSAGING = 'Instant Messaging (iMessage, WhatsApp, WeChat, etc.)'
}

export const LANGUAGES = [
  'Native English',
  'Chinese (中文)',
  'Spanish (Español)',
  'French (Français)',
  'German (Deutsch)',
  'Japanese (日本語)'
];