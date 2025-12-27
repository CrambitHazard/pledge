
export enum ResolutionType {
  BINARY = 'BINARY',
  STREAK = 'STREAK',
  FREQUENCY = 'FREQUENCY',
}

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export enum ResolutionStatus {
  UNCHECKED = 'UNCHECKED',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  ARCHIVED = 'ARCHIVED', // New status for Graveyard
}

export type IdentityLabel = 
  | 'Relentless Maintainer' 
  | 'Consistent Starter' 
  | 'Strong Finisher' 
  | 'Late Bloomer' 
  | 'On-and-Off Grinder' 
  | 'Sleeping Giant'
  | 'Comeback Kid'
  | 'None';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarInitials: string;
  groupId?: string;
  score: number;        // Yearly / All Time
  monthlyScore: number; // Resets monthly (Step 2K)
  streak: number;
  rank: number;
  rankChange: 'up' | 'down' | 'same';
  
  // Social Validation
  honestyScore: number; // 0-100, starts at 100
  isDailyHero: boolean; // Is currently the daily hero
  
  // Narrative (Step 2K)
  seasonalLabel: IdentityLabel;
  
  // Badges (Step 2J)
  badges: string[]; 
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  memberIds: string[];
  creatorId: string;
  adminIds: string[]; // Array of admin user IDs (creator is always admin)
  
  // Hero Tracking
  dailyHeroId?: string;
  lastHeroSelectionDate?: string; // YYYY-MM-DD
  
  // Comeback Tracking (Step 2K)
  weeklyComebackHeroId?: string;
  lastComebackSelectionDate?: string; // YYYY-MM-DD (Start of week)
}

export interface Bet {
  id: string;
  resolutionId: string;
  userId: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  stake: string;
  status: 'ACTIVE' | 'WON' | 'LOST';
}

export interface CredibilityVote {
  believers: string[]; // User IDs
  doubters: string[]; // User IDs
}

export interface Resolution {
  id: string;
  createdUserId: string;
  createdAt: string;
  
  title: string;
  category: string;
  type: ResolutionType;
  difficulty: Difficulty; // Declared by user
  isPrivate: boolean;
  
  // Step 2J: Sub-goals
  subGoals?: string[];

  // Social Validation
  peerDifficultyVotes: Record<string, Difficulty>; // userId -> vote
  effectiveDifficulty: number; // Calculated
  credibility: Record<string, CredibilityVote>; // 'YYYY-MM-DD' -> votes

  // For Frequency type
  targetCount?: number;
  
  // Tracking State
  history: Record<string, ResolutionStatus>;
  currentCount?: number;
  currentStreak: number;
  todayStatus: ResolutionStatus;
  isBroken: boolean;
  bets: Bet[];
  
  // Step 2J: Archiving
  archivedAt?: string;
  archivedReason?: string;
}

export interface FeedEvent {
  id: string;
  type: 'check-in' | 'miss' | 'streak' | 'bet-won' | 'bet-lost' | 'system' | 'hero' | 'comeback';
  userId?: string;
  userName?: string;
  userAvatar?: string;
  message: string;
  timestamp: string;
}

export interface Confession {
  id: string;
  groupId: string;
  text: string;
  timestamp: string;
}

export interface PeriodicReport {
    type: 'WEEKLY' | 'MONTHLY';
    periodLabel: string; // "Week of Oct 21" or "October 2024"
    
    // User Stats
    daysCheckedIn: number;
    pointsGained: number;
    rankChange: number; // net change
    consistency: number; // percentage
    
    // Specifics
    bestResolution?: string;
    worstResolution?: string;
    trustTrend: 'up' | 'down' | 'stable';
    
    // Group Snapshot
    groupHero: string; // Name of person who was hero most often
    groupConsistency: number;
}
