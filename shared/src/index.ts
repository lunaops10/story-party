// ============================================
// STORY GRAPH TYPES
// ============================================

export interface StoryChoice {
  id: string;
  emoji: string;
  label: string;
  nextNodeId: string;
}

export interface StoryNode {
  id: string;
  type: "narrative" | "choice" | "ending";
  title?: string;
  narration: string;
  sceneDescription?: string; // For future AI image generation
  imageUrl?: string;
  choices?: StoryChoice[];
  endingType?: "good" | "bad" | "neutral" | "secret";
  endingTitle?: string;
}

export interface StoryGraph {
  id: string;
  title: string;
  genre: string;
  description: string;
  estimatedMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  startNodeId: string;
  nodes: Record<string, StoryNode>;
}

// ============================================
// GAME STATE TYPES
// ============================================

export type GamePhase =
  | "lobby"
  | "intro"
  | "narrative"
  | "voting"
  | "vote_result"
  | "ending"
  | "results";

export interface Player {
  sessionId: string;
  name: string;
  avatar: string; // emoji avatar
  isVIP: boolean;
  isConnected: boolean;
  currentVote?: string; // choice id
  hasVoted: boolean;
}

export interface VoteResult {
  choiceId: string;
  emoji: string;
  label: string;
  count: number;
  percentage: number;
  voters: string[]; // player names
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  storyId: string;
  storyTitle: string;
  storyGenre: string;

  // Players
  players: Record<string, Player>;
  playerCount: number;

  // Current story node
  currentNodeId: string;
  currentNarration: string;
  currentTitle?: string;
  currentImageUrl?: string;

  // Voting
  choices: StoryChoice[];
  voteTimer: number; // seconds remaining
  voteResults: VoteResult[];
  winningChoiceId?: string;

  // Ending
  endingType?: string;
  endingTitle?: string;

  // Progress
  decisionsMade: number;
  totalDecisions: number;
  pathHistory: string[]; // node ids visited
}

// ============================================
// MESSAGE TYPES (Client → Server)
// ============================================

export interface JoinMessage {
  name: string;
  avatar: string;
}

export interface VoteMessage {
  choiceId: string;
}

export interface StartGameMessage {
  storyId: string;
}

// ============================================
// MESSAGE TYPES (Server → Client)
// ============================================

export interface TimerTickMessage {
  secondsRemaining: number;
}

export interface ErrorMessage {
  message: string;
}

// ============================================
// CONSTANTS
// ============================================

export const VOTE_DURATION = 12; // seconds
export const NARRATIVE_MIN_DISPLAY = 3; // seconds before skip allowed
export const RESULT_DISPLAY_DURATION = 4; // seconds to show vote results
export const MAX_PLAYERS = 16;
export const MIN_PLAYERS = 2;
export const ROOM_CODE_LENGTH = 4;
export const AVATARS = [
  "🕵️", "🔍", "🗡️", "💀", "🎭", "🕯️", "🔮", "🐍",
  "🦊", "🎩", "👻", "🌙", "⚡", "🔥", "💎", "🃏",
];
