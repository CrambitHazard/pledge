/**
 * Supabase Service
 * 
 * Backend service using Supabase for authentication and data storage.
 * Data syncs across all devices automatically.
 * 
 * Uses simplified model: group_id is stored directly in profiles table,
 * avoiding junction table complexity.
 */

import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import {
    Resolution,
    ResolutionType,
    Difficulty,
    ResolutionStatus,
    User,
    FeedEvent,
    Confession,
    Group,
    Bet,
    PeriodicReport,
    IdentityLabel,
} from '../types';

// Supabase client configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Date Helpers ---

const getTodayKey = () => new Date().toISOString().split('T')[0];

const getDatesInRange = (startDate: Date, endDate: Date): string[] => {
    const dates = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

const getDaysSince = (dateStr: string): number => {
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
};

const getStartOfMonth = (): Date => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getStartOfQuarter = (): Date => {
    const date = new Date();
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1);
};

const calculateStreak = (history: Record<string, ResolutionStatus>, todayStatus: ResolutionStatus): number => {
    let streak = 0;
    const today = new Date();
    if (todayStatus === ResolutionStatus.COMPLETED) streak = 1;
    const current = new Date(today);
    current.setDate(current.getDate() - 1);
    while (true) {
        const dateKey = current.toISOString().split('T')[0];
        if (history[dateKey] === ResolutionStatus.COMPLETED) {
            streak++;
            current.setDate(current.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
};

// --- Type Definitions ---

interface DBProfile {
    id: string;
    name: string;
    email: string;
    avatar_initials: string;
    group_id: string | null;  // Direct group reference
    score: number;
    monthly_score: number;
    streak: number;
    rank: number;
    rank_change: string;
    honesty_score: number;
    is_daily_hero: boolean;
    seasonal_label: string;
    badges: string[];
}

interface DBGroup {
    id: string;
    name: string;
    invite_code: string;
    creator_id: string;
    admin_ids: string[];
    daily_hero_id: string | null;
    last_hero_selection_date: string | null;
    weekly_comeback_hero_id: string | null;
    last_comeback_selection_date: string | null;
    created_at: string;
}

interface DBResolution {
    id: string;
    user_id: string;
    title: string;
    category: string | null;
    type: string;
    difficulty: number;
    is_private: boolean;
    sub_goals: string[];
    peer_difficulty_votes: Record<string, number>;
    effective_difficulty: number;
    credibility: Record<string, { believers: string[]; doubters: string[] }>;
    target_count: number | null;
    history: Record<string, string>;
    current_count: number;
    current_streak: number;
    today_status: string;
    is_broken: boolean;
    archived_at: string | null;
    archived_reason: string | null;
    created_at: string;
}

interface DBFeedEvent {
    id: string;
    type: string;
    user_id: string | null;
    group_id: string | null;
    message: string;
    created_at: string;
    profiles?: DBProfile;
}

interface DBBet {
    id: string;
    resolution_id: string;
    user_id: string;
    created_at: string;
    start_date: string;
    end_date: string;
    stake: string;
    status: 'ACTIVE' | 'WON' | 'LOST';
}

// --- Type Conversions ---

const dbProfileToUser = (p: DBProfile): User => ({
    id: p.id,
    name: p.name,
    email: p.email,
    avatarInitials: p.avatar_initials,
    groupId: p.group_id || undefined,
    score: p.score,
    monthlyScore: p.monthly_score,
    streak: p.streak,
    rank: p.rank,
    rankChange: p.rank_change as 'up' | 'down' | 'same',
    honestyScore: p.honesty_score,
    isDailyHero: p.is_daily_hero,
    seasonalLabel: p.seasonal_label as IdentityLabel,
    badges: p.badges || [],
});

const dbGroupToGroup = (g: DBGroup, memberIds: string[]): Group => ({
    id: g.id,
    name: g.name,
    inviteCode: g.invite_code,
    creatorId: g.creator_id,
    adminIds: g.admin_ids || [g.creator_id],
    memberIds,
    dailyHeroId: g.daily_hero_id || undefined,
    lastHeroSelectionDate: g.last_hero_selection_date || undefined,
    weeklyComebackHeroId: g.weekly_comeback_hero_id || undefined,
    lastComebackSelectionDate: g.last_comeback_selection_date || undefined,
});

const dbResolutionToResolution = (r: DBResolution): Resolution => ({
    id: r.id,
    createdUserId: r.user_id,
    createdAt: r.created_at,
    title: r.title,
    category: r.category || '',
    type: r.type as ResolutionType,
    difficulty: r.difficulty as Difficulty,
    isPrivate: r.is_private,
    subGoals: r.sub_goals || [],
    peerDifficultyVotes: r.peer_difficulty_votes || {},
    effectiveDifficulty: r.effective_difficulty || r.difficulty,
    credibility: r.credibility || {},
    targetCount: r.target_count || undefined,
    history: (r.history || {}) as Record<string, ResolutionStatus>,
    currentCount: r.current_count || 0,
    currentStreak: r.current_streak || 0,
    todayStatus: (r.today_status as ResolutionStatus) || ResolutionStatus.UNCHECKED,
    isBroken: r.is_broken || false,
    bets: [],
    archivedAt: r.archived_at || undefined,
    archivedReason: r.archived_reason || undefined,
});

const dbBetToBet = (b: DBBet): Bet => ({
    id: b.id,
    resolutionId: b.resolution_id,
    userId: b.user_id,
    createdAt: b.created_at,
    startDate: b.start_date,
    endDate: b.end_date,
    stake: b.stake,
    status: b.status,
});

// --- Invite Code Normalization ---

const normalizeInviteCode = (code: string | null | undefined): string => {
    if (!code) return '';
    let normalized = String(code).trim();
    if (!normalized) return '';
    let decodeAttempts = 0;
    while (decodeAttempts < 3) {
        try {
            const decoded = decodeURIComponent(normalized);
            if (decoded === normalized) break;
            normalized = decoded;
            decodeAttempts++;
        } catch {
            break;
        }
    }
    normalized = normalized.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
    normalized = normalized.toUpperCase();
    normalized = normalized.replace(/[^A-Z0-9]/g, '');
    return normalized;
};

// --- Identity Label Calculation ---

const determineIdentityLabel = (userResolutions: Resolution[]): IdentityLabel => {
    const startOfQuarter = getStartOfQuarter();
    const today = new Date();
    const dates = getDatesInRange(startOfQuarter, today);
    const totalDays = dates.length;
    if (totalDays < 7) return 'Consistent Starter';

    let completed = 0, opportunities = 0;
    let firstHalfCompleted = 0, firstHalfOps = 0;
    let secondHalfCompleted = 0, secondHalfOps = 0;
    const midPoint = Math.floor(totalDays / 2);

    userResolutions.forEach(res => {
        const created = new Date(res.createdAt);
        dates.forEach((dateStr, idx) => {
            if (new Date(dateStr) >= created) {
                opportunities++;
                const isDone = res.history[dateStr] === ResolutionStatus.COMPLETED;
                if (isDone) completed++;
                if (idx < midPoint) { firstHalfOps++; if (isDone) firstHalfCompleted++; }
                else { secondHalfOps++; if (isDone) secondHalfCompleted++; }
            }
        });
    });

    if (opportunities === 0) return 'Sleeping Giant';
    const consistency = completed / opportunities;
    const firstHalfRate = firstHalfOps > 0 ? firstHalfCompleted / firstHalfOps : 0;
    const secondHalfRate = secondHalfOps > 0 ? secondHalfCompleted / secondHalfOps : 0;

    if (consistency >= 0.85) return 'Relentless Maintainer';
    if (firstHalfRate > 0.8 && secondHalfRate < 0.6) return 'Consistent Starter';
    if (firstHalfRate < 0.5 && secondHalfRate > 0.8) return 'Late Bloomer';
    if (secondHalfRate > 0.85) return 'Strong Finisher';
    if (consistency > 0.3) return 'On-and-Off Grinder';
    return 'Sleeping Giant';
};

// --- API Implementation ---

export const api = {

    // --- Auth ---

    getCurrentUserId: (): string | null => {
        return localStorage.getItem('sb-session-user-id');
    },

    getUser: (): User | null => {
        const cached = localStorage.getItem('sb-cached-user');
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                return null;
            }
        }
        return null;
    },

    getUserById: async (id: string): Promise<User | undefined> => {
        console.log('[Supabase] getUserById:', id);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            console.error('[Supabase] getUserById error:', error);
            return undefined;
        }
        if (!data) {
            console.log('[Supabase] getUserById: no data');
            return undefined;
        }
        console.log('[Supabase] getUserById success:', data.name);
        return dbProfileToUser(data);
    },

    login: async (email: string, password: string): Promise<boolean> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
            console.error('[Auth] Login failed:', error?.message);
            throw new Error(error?.message || 'Login failed');
        }
        
        localStorage.setItem('sb-session-user-id', data.user.id);
        await api._cacheCurrentUser(data.user.id);
        return true;
    },

    signup: async (name: string, email: string, password: string): Promise<boolean> => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } }
        });
        
        if (error) {
            console.error('[Auth] Signup failed:', error.message);
            throw new Error(error.message);
        }
        
        if (!data.user) {
            throw new Error('Signup failed - no user returned');
        }
        
        localStorage.setItem('sb-session-user-id', data.user.id);
        
        // Wait briefly for the trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if profile exists, create if not
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();
        
        if (!profile) {
            // Create profile manually if trigger didn't work
            await supabase.from('profiles').insert({
                id: data.user.id,
                name: name,
                email: email,
                avatar_initials: name.substring(0, 2).toUpperCase(),
            });
        }
        
        await api._cacheCurrentUser(data.user.id);
        return true;
    },

    logout: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('sb-session-user-id');
        localStorage.removeItem('sb-cached-user');
    },

    _cacheCurrentUser: async (userId: string) => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profile) {
            const user = dbProfileToUser(profile);
            localStorage.setItem('sb-cached-user', JSON.stringify(user));
        }
    },

    // --- Groups (Simplified: group_id directly on profiles) ---

    createGroup: async (name: string): Promise<Group> => {
        const userId = api.getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        // Check if user already in a group
        const { data: profile } = await supabase
            .from('profiles')
            .select('group_id')
            .eq('id', userId)
            .single();

        if (profile?.group_id) {
            throw new Error('You are already in a group');
        }

        // Create the group
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const { data: group, error } = await supabase
            .from('groups')
            .insert({
                name,
                invite_code: inviteCode,
                creator_id: userId,
                admin_ids: [userId],
            })
            .select()
            .single();

        if (error || !group) {
            console.error('[Group] Failed to create:', error);
            throw new Error(error?.message || 'Failed to create group');
        }

        // Update user's profile with group_id
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ group_id: group.id })
            .eq('id', userId);

        if (updateError) {
            console.error('[Group] Failed to update profile:', updateError);
            // Rollback: delete the group
            await supabase.from('groups').delete().eq('id', group.id);
            throw new Error('Failed to join the group you created');
        }

        // Update cache
        await api._cacheCurrentUser(userId);

        return dbGroupToGroup(group, [userId]);
    },

    joinGroup: async (inviteCode: string): Promise<Group> => {
        const userId = api.getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        // Check if already in a group
        const { data: profile } = await supabase
            .from('profiles')
            .select('group_id')
            .eq('id', userId)
            .single();

        if (profile?.group_id) {
            throw new Error('You are already in a group');
        }

        const normalizedCode = normalizeInviteCode(inviteCode);
        if (!normalizedCode || normalizedCode.length < 4) {
            throw new Error('Invalid invite code format');
        }

        // Find group by invite code (case-insensitive)
        const { data: groups, error: findError } = await supabase
            .from('groups')
            .select('*')
            .ilike('invite_code', normalizedCode);

        if (findError || !groups || groups.length === 0) {
            throw new Error(`Invalid invite code "${normalizedCode}"`);
        }

        const group = groups[0];

        // Update user's profile with group_id
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ group_id: group.id })
            .eq('id', userId);

        if (updateError) {
            console.error('[Group] Failed to join:', updateError);
            throw new Error('Failed to join group');
        }

        // Update cache
        await api._cacheCurrentUser(userId);

        // Get all members
        const { data: members } = await supabase
            .from('profiles')
            .select('id')
            .eq('group_id', group.id);

        return dbGroupToGroup(group, members?.map(m => m.id) || [userId]);
    },

    leaveGroup: async (): Promise<void> => {
        const userId = api.getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('profiles')
            .select('group_id')
            .eq('id', userId)
            .single();

        if (!profile?.group_id) {
            throw new Error('Not in a group');
        }

        // Check if user is creator
        const { data: group } = await supabase
            .from('groups')
            .select('creator_id')
            .eq('id', profile.group_id)
            .single();

        if (group?.creator_id === userId) {
            throw new Error('Group creator cannot leave. Delete the group instead.');
        }

        // Remove group_id from profile
        await supabase
            .from('profiles')
            .update({ group_id: null })
            .eq('id', userId);

        await api._cacheCurrentUser(userId);
    },

    getGroup: async (): Promise<Group | null> => {
        const userId = api.getCurrentUserId();
        if (!userId) return null;

        // Get user's group_id directly from profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('group_id')
            .eq('id', userId)
            .single();

        if (profileError || !profile?.group_id) {
            return null;
        }

        // Get group details
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('id', profile.group_id)
            .single();

        if (groupError || !group) {
            return null;
        }

        // Get all members of this group
        const { data: members } = await supabase
            .from('profiles')
            .select('id')
            .eq('group_id', group.id);

        return dbGroupToGroup(group, members?.map(m => m.id) || [userId]);
    },

    getInviteLink: async (): Promise<string> => {
        const group = await api.getGroup();
        if (!group) throw new Error('Not in a group');

        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl.replace(/\/$/, '')}?invite=${encodeURIComponent(group.inviteCode)}`;
    },

    isGroupAdmin: async (): Promise<boolean> => {
        const userId = api.getCurrentUserId();
        if (!userId) return false;

        const group = await api.getGroup();
        if (!group) return false;

        return group.creatorId === userId || group.adminIds.includes(userId);
    },

    getGroupMembers: async (): Promise<User[]> => {
        const group = await api.getGroup();
        if (!group) return [];

        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .eq('group_id', group.id);

        return (profiles || []).map(dbProfileToUser);
    },

    // --- Resolutions ---

    getMyResolutions: async (): Promise<Resolution[]> => {
        const userId = api.getCurrentUserId();
        if (!userId) return [];

        const { data } = await supabase
            .from('resolutions')
            .select('*')
            .eq('user_id', userId)
            .is('archived_at', null)
            .order('created_at', { ascending: false });

        return (data || []).map(dbResolutionToResolution);
    },

    getPublicResolutions: async (userId: string): Promise<Resolution[]> => {
        const { data } = await supabase
            .from('resolutions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_private', false)
            .is('archived_at', null)
            .order('created_at', { ascending: false });

        return (data || []).map(dbResolutionToResolution);
    },

    getResolutionById: async (id: string): Promise<Resolution | undefined> => {
        const { data } = await supabase
            .from('resolutions')
            .select('*')
            .eq('id', id)
            .single();

        if (!data) return undefined;

        const res = dbResolutionToResolution(data as unknown as DBResolution);

        // Load bets for this resolution
        const { data: betsData, error: betsError } = await supabase
            .from('bets')
            .select('*')
            .eq('resolution_id', id)
            .order('created_at', { ascending: false });

        if (betsError) {
            console.error('[Supabase] getResolutionById bets error:', betsError);
        } else {
            res.bets = (betsData || []).map((b: DBBet) => dbBetToBet(b));
        }

        return res;
    },

    getGraveyard: async (): Promise<Resolution[]> => {
        const userId = api.getCurrentUserId();
        if (!userId) return [];

        const { data } = await supabase
            .from('resolutions')
            .select('*')
            .eq('user_id', userId)
            .not('archived_at', 'is', null)
            .order('archived_at', { ascending: false });

        return (data || []).map(dbResolutionToResolution);
    },

    getPublicResolutionsForGroup: async (): Promise<{ user: User; resolutions: Resolution[] }[]> => {
        const group = await api.getGroup();
        if (!group) return [];

        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .eq('group_id', group.id);

        if (!profiles) return [];

        const results: { user: User; resolutions: Resolution[] }[] = [];

        for (const profile of profiles) {
            const { data: resolutions } = await supabase
                .from('resolutions')
                .select('*')
                .eq('user_id', profile.id)
                .eq('is_private', false)
                .is('archived_at', null);

            if (resolutions && resolutions.length > 0) {
                results.push({
                    user: dbProfileToUser(profile),
                    resolutions: resolutions.map(dbResolutionToResolution),
                });
            }
        }

        return results;
    },

    addResolution: async (res: Partial<Resolution>): Promise<void> => {
        const userId = api.getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        await supabase.from('resolutions').insert({
            user_id: userId,
            title: res.title,
            category: res.category || '',
            type: res.type,
            difficulty: res.difficulty,
            is_private: res.isPrivate || false,
            sub_goals: res.subGoals || [],
            effective_difficulty: res.difficulty,
            history: {},
            today_status: 'UNCHECKED',
        });
    },

    checkIn: async (id: string, status: ResolutionStatus): Promise<void> => {
        const userId = api.getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data: res } = await supabase
            .from('resolutions')
            .select('*')
            .eq('id', id)
            .single();

        if (!res) throw new Error('Resolution not found');

        const todayKey = getTodayKey();
        const history = { ...(res.history || {}), [todayKey]: status };
        const currentStreak = calculateStreak(history as Record<string, ResolutionStatus>, status);

        await supabase
            .from('resolutions')
            .update({
                history,
                today_status: status,
                current_streak: currentStreak,
                is_broken: status === ResolutionStatus.MISSED,
            })
            .eq('id', id);

        if (!res.is_private && status === ResolutionStatus.COMPLETED) {
            const points = Math.round(res.effective_difficulty || res.difficulty);
            await api._addToFeed('check-in', `Checked in on "${res.title}" (+${points} pts)`);
        }

        await api._recalculateUserScores(userId);
    },

    archiveResolution: async (id: string, reason: string): Promise<void> => {
        const { data: res } = await supabase
            .from('resolutions')
            .select('created_at')
            .eq('id', id)
            .single();

        if (res && getDaysSince(res.created_at) < 7) {
            throw new Error('Cannot archive during 7-day lock-in.');
        }

        await supabase
            .from('resolutions')
            .update({
                archived_at: new Date().toISOString(),
                archived_reason: reason,
            })
            .eq('id', id);
    },

    voteDifficulty: async (resolutionId: string, vote: Difficulty): Promise<void> => {
        const userId = api.getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data: res } = await supabase
            .from('resolutions')
            .select('*')
            .eq('id', resolutionId)
            .single();

        if (!res) throw new Error('Resolution not found');
        if (res.user_id === userId) throw new Error('Cannot vote on own resolution');
        if (res.is_private) throw new Error('Cannot vote on private resolution');

        const votes = { ...(res.peer_difficulty_votes || {}), [userId]: vote };
        const voteValues = Object.values(votes) as number[];
        const avgVotes = voteValues.reduce((a, b) => a + b, 0) / voteValues.length;
        const effectiveDifficulty = Math.round(((res.difficulty + avgVotes) / 2) * 10) / 10;

        await supabase
            .from('resolutions')
            .update({ peer_difficulty_votes: votes, effective_difficulty: effectiveDifficulty })
            .eq('id', resolutionId);
    },

    // --- Bets ---

    /**
     * Creates a new bet for a resolution owned by the current user.
     *
     * Args:
     *   resolutionId: Resolution ID to bet on.
     *   endDate: ISO date string (YYYY-MM-DD) representing bet end date.
     *   stake: The penalty text if the bet is lost.
     *
     * Returns:
     *   The created bet.
     *
     * Raises:
     *   Error: If not authenticated, resolution is invalid, or bet creation fails.
     */
    addBet: async (resolutionId: string, endDate: string, stake: string): Promise<Bet> => {
        const userId = api.getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const trimmedStake = stake.trim();
        if (!trimmedStake) throw new Error('Stake is required');

        const startDate = getTodayKey();
        if (!endDate) throw new Error('End date is required');

        // Basic date sanity (allow same-day bets, but not past)
        const end = new Date(endDate);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        if (Number.isNaN(end.getTime())) throw new Error('Invalid end date');
        if (end < start) throw new Error('End date must be today or later');

        // Ensure resolution exists and is owned by the current user
        const { data: resolutionRow, error: resError } = await supabase
            .from('resolutions')
            .select('id, user_id, is_private')
            .eq('id', resolutionId)
            .single();

        if (resError || !resolutionRow) {
            console.error('[Supabase] addBet resolution fetch error:', resError);
            throw new Error('Resolution not found');
        }
        if (resolutionRow.user_id !== userId) {
            throw new Error('You can only bet on your own resolution');
        }
        if (resolutionRow.is_private) {
            throw new Error('Bets are only allowed on public resolutions');
        }

        // Prevent multiple active bets per resolution per user
        const { data: existingActive, error: existingError } = await supabase
            .from('bets')
            .select('id')
            .eq('resolution_id', resolutionId)
            .eq('user_id', userId)
            .eq('status', 'ACTIVE')
            .limit(1);

        if (existingError) {
            console.error('[Supabase] addBet existing bet check error:', existingError);
        }
        if (existingActive && existingActive.length > 0) {
            throw new Error('You already have an active bet on this resolution');
        }

        const { data: betRow, error } = await supabase
            .from('bets')
            .insert({
                resolution_id: resolutionId,
                user_id: userId,
                start_date: startDate,
                end_date: endDate,
                stake: trimmedStake,
                status: 'ACTIVE',
            })
            .select('*')
            .single();

        if (error || !betRow) {
            console.error('[Supabase] addBet insert error:', error);
            throw new Error(error?.message || 'Failed to create bet');
        }

        return dbBetToBet(betRow as DBBet);
    },

    /**
     * Fetches bets for a resolution.
     *
     * Args:
     *   resolutionId: Resolution ID.
     *
     * Returns:
     *   Bets for that resolution, newest first.
     */
    getBetsForResolution: async (resolutionId: string): Promise<Bet[]> => {
        const { data, error } = await supabase
            .from('bets')
            .select('*')
            .eq('resolution_id', resolutionId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Supabase] getBetsForResolution error:', error);
            return [];
        }

        return (data || []).map((b: DBBet) => dbBetToBet(b));
    },

    // --- Feed ---

    getFeed: async (): Promise<FeedEvent[]> => {
        const group = await api.getGroup();
        if (!group) return [];

        const { data } = await supabase
            .from('feed_events')
            .select('*, profiles:user_id(*)')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(50);

        return (data || []).map((e: DBFeedEvent) => ({
            id: e.id,
            type: e.type as FeedEvent['type'],
            userId: e.user_id || undefined,
            userName: e.profiles?.name,
            userAvatar: e.profiles?.avatar_initials,
            message: e.message,
            timestamp: e.created_at,
        }));
    },

    _addToFeed: async (type: FeedEvent['type'], message: string): Promise<void> => {
        const userId = api.getCurrentUserId();
        if (!userId) return;

        const group = await api.getGroup();
        if (!group) return;

        await supabase.from('feed_events').insert({
            type,
            user_id: userId,
            group_id: group.id,
            message,
        });
    },

    // --- Confessions ---

    addConfession: async (text: string): Promise<void> => {
        const group = await api.getGroup();
        if (!group) throw new Error('Not in a group');

        await supabase.from('confessions').insert({
            group_id: group.id,
            text,
        });
    },

    getConfessions: async (): Promise<Confession[]> => {
        const group = await api.getGroup();
        if (!group) return [];

        const { data } = await supabase
            .from('confessions')
            .select('*')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false });

        return (data || []).map(c => ({
            id: c.id,
            groupId: c.group_id,
            text: c.text,
            timestamp: c.created_at,
        }));
    },

    // --- Leaderboard ---

    getLeaderboard: async (period: 'ALL' | 'MONTHLY' = 'ALL'): Promise<User[]> => {
        const group = await api.getGroup();
        if (!group) return [];

        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .eq('group_id', group.id);

        if (!profiles) return [];

        const users = profiles.map(dbProfileToUser);

        users.sort((a, b) => {
            const scoreA = period === 'MONTHLY' ? a.monthlyScore : a.score;
            const scoreB = period === 'MONTHLY' ? b.monthlyScore : b.score;
            if (scoreB !== scoreA) return scoreB - scoreA;
            return b.streak - a.streak;
        });

        return users.map((user, index) => ({ ...user, rank: index + 1 }));
    },

    // --- Score Calculation ---

    _recalculateUserScores: async (userId: string): Promise<void> => {
        const { data: resolutions } = await supabase
            .from('resolutions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_private', false)
            .is('archived_at', null);

        if (!resolutions) return;

        const startOfMonth = getStartOfMonth();
        let totalScore = 0;
        let monthlyScore = 0;
        let maxStreak = 0;

        for (const r of resolutions) {
            const history = r.history || {};
            const allCompletions = Object.values(history).filter(s => s === 'COMPLETED').length;
            totalScore += allCompletions * (r.effective_difficulty || r.difficulty);

            const monthCompletions = Object.entries(history).filter(([date, status]) => {
                return status === 'COMPLETED' && new Date(date) >= startOfMonth;
            }).length;
            monthlyScore += monthCompletions * (r.effective_difficulty || r.difficulty);

            if (r.current_streak > maxStreak) maxStreak = r.current_streak;
        }

        const userResolutions = resolutions.map(dbResolutionToResolution);
        const seasonalLabel = determineIdentityLabel(userResolutions);

        await supabase
            .from('profiles')
            .update({ score: totalScore, monthly_score: monthlyScore, streak: maxStreak, seasonal_label: seasonalLabel })
            .eq('id', userId);

        await api._cacheCurrentUser(userId);
    },

    // --- Health Helpers ---

    getResolutionHealth: (res: Resolution): 'healthy' | 'at-risk' | 'slipping' => {
        if (res.archivedAt) return 'healthy';
        const dates = [];
        const today = new Date();
        for (let i = 1; i <= 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }
        let missesLast7 = 0, missesLast5 = 0;
        dates.forEach((dateStr, idx) => {
            if (res.history[dateStr] === ResolutionStatus.MISSED) {
                missesLast7++;
                if (idx < 5) missesLast5++;
            }
        });
        if (missesLast5 >= 2 || missesLast7 >= 3) return 'slipping';
        if (missesLast7 >= 2) return 'at-risk';
        return 'healthy';
    },

    isResolutionLocked: (res: Resolution): boolean => {
        return getDaysSince(res.createdAt) < 7;
    },

    // --- Reports ---

    getWeeklyReport: async (userId: string): Promise<PeriodicReport> => {
        return {
            type: 'WEEKLY',
            periodLabel: 'Last 7 Days',
            daysCheckedIn: 0,
            pointsGained: 0,
            rankChange: 0,
            consistency: 0,
            bestResolution: 'None',
            worstResolution: 'None',
            trustTrend: 'stable',
            groupHero: 'None',
            groupConsistency: 0,
        };
    },

    getMonthlyReport: async (userId: string): Promise<PeriodicReport> => {
        return {
            type: 'MONTHLY',
            periodLabel: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            daysCheckedIn: 0,
            pointsGained: 0,
            rankChange: 0,
            consistency: 0,
            bestResolution: 'None',
            worstResolution: 'None',
            trustTrend: 'stable',
            groupHero: 'None',
            groupConsistency: 0,
        };
    },

    getScoreBreakdown: async (userId: string): Promise<{ title: string; points: number; days: number; difficulty: number }[]> => {
        const resolutions = await api.getPublicResolutions(userId);
        return resolutions.map(r => {
            const completedDays = Object.values(r.history).filter(s => s === ResolutionStatus.COMPLETED).length;
            return {
                title: r.title,
                difficulty: r.effectiveDifficulty,
                days: completedDays,
                points: Math.round(completedDays * r.effectiveDifficulty),
            };
        }).sort((a, b) => b.points - a.points);
    },

    getYearInReview: async (userId: string) => {
        const user = await api.getUserById(userId);
        return {
            user,
            consistency: 0,
            totalCompleted: 0,
            bestRes: null,
            worstRes: null,
            topPerformer: user,
            groupSize: 0,
        };
    },
};

export default api;
