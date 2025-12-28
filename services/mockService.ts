/**
 * @deprecated This mock service is deprecated. Use pocketbaseService.ts instead.
 * This file is kept for reference only and will be removed in a future update.
 */

import { Resolution, ResolutionType, Difficulty, ResolutionStatus, User, FeedEvent, Confession, Group, Bet, PeriodicReport, IdentityLabel } from '../types';

const KEYS = {
  USERS: 'rl_users_db',
  GROUPS: 'rl_groups_db',
  SESSION: 'rl_session_user_id',
  RESOLUTIONS: 'rl_resolutions_v2', 
  FEED: 'rl_feed_v2',
  CONFESSIONS: 'rl_confessions',
  INIT: 'rl_initialized_v3'
};

// --- Utility Functions ---

/**
 * Generate a unique ID using timestamp + random component
 * Prevents collisions even with rapid calls
 */
const generateId = (prefix: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Check if localStorage is available and has space
 */
const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get estimated storage size in bytes
 */
const getStorageSize = (): number => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
};

/**
 * Check if we're approaching storage quota (5MB limit, warn at 4MB)
 */
const checkStorageQuota = (): void => {
  const size = getStorageSize();
  const maxSize = 4 * 1024 * 1024; // 4MB warning threshold
  if (size > maxSize) {
    console.warn(`Storage quota warning: ${(size / 1024 / 1024).toFixed(2)}MB used`);
  }
};

// --- Date Helpers ---

const getTodayKey = () => new Date().toISOString().split('T')[0];

const getYesterdayKey = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

const getDatesInRange = (startDate: Date, endDate: Date): string[] => {
    const dates = [];
    const current = new Date(startDate);
    current.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(0,0,0,0);

    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

const getDaysSince = (dateStr: string): number => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
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

const getStartOfWeek = (): Date => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0,0,0,0);
    return start;
};

const calculateStreak = (history: Record<string, ResolutionStatus>, todayStatus: ResolutionStatus): number => {
  let streak = 0;
  const today = new Date();
  
  if (todayStatus === ResolutionStatus.COMPLETED) {
      streak = 1;
  }

  const current = new Date(today);
  current.setDate(current.getDate() - 1);
  
  while (true) {
      const dateKey = current.toISOString().split('T')[0];
      const status = history[dateKey];
      
      if (status === ResolutionStatus.COMPLETED) {
          streak++;
          current.setDate(current.getDate() - 1);
      } else {
          break;
      }
  }
  return streak;
};

// --- Enhanced Storage Wrappers with Error Handling ---

/**
 * Get data from localStorage with proper error handling and validation
 */
const getStorage = <T>(key: string, initial: T): T => {
  if (!isStorageAvailable()) {
    console.error('localStorage is not available');
    return initial;
  }

  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      // Initialize with default value
      try {
        localStorage.setItem(key, JSON.stringify(initial));
      } catch (e) {
        console.error(`Failed to initialize storage for key ${key}:`, e);
      }
      return initial;
    }

    const parsed = JSON.parse(stored);
    
    // Basic validation - ensure parsed data matches expected type
    if (Array.isArray(initial) && !Array.isArray(parsed)) {
      console.error(`Data corruption detected for ${key}: expected array, got ${typeof parsed}`);
      return initial;
    }
    
    return parsed;
  } catch (e) {
    console.error(`Error reading storage for key ${key}:`, e);
    // Log corruption but don't silently fail - return initial
    console.warn(`Data corruption detected for ${key}, resetting to initial value`);
    try {
      localStorage.removeItem(key);
      localStorage.setItem(key, JSON.stringify(initial));
    } catch (cleanupError) {
      console.error(`Failed to cleanup corrupted data for ${key}:`, cleanupError);
    }
    return initial;
  }
};

/**
 * Set data to localStorage with proper error handling and quota checking
 */
const setStorage = (key: string, value: any): void => {
  if (!isStorageAvailable()) {
    throw new Error('localStorage is not available');
  }

  try {
    checkStorageQuota();
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (e: any) {
    // Handle quota exceeded error specifically
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.error(`Storage quota exceeded for key ${key}`);
      throw new Error('Storage quota exceeded. Please clear some data.');
    }
    // Handle other errors
    console.error(`Error writing to storage for key ${key}:`, e);
    throw new Error(`Failed to save data: ${e.message}`);
  }
};

/**
 * Batch write multiple keys atomically (as much as possible with localStorage)
 * If any write fails, none are committed
 */
const batchSetStorage = (updates: Array<{ key: string; value: any }>): void => {
  if (!isStorageAvailable()) {
    throw new Error('localStorage is not available');
  }

  // Store original values for rollback
  const originals: Array<{ key: string; value: string | null }> = [];
  
  try {
    // Save originals
    for (const update of updates) {
      originals.push({ key: update.key, value: localStorage.getItem(update.key) });
    }

    // Attempt all writes
    for (const update of updates) {
      setStorage(update.key, update.value);
    }
  } catch (e) {
    // Rollback on failure
    console.error('Batch write failed, rolling back:', e);
    for (const original of originals) {
      try {
        if (original.value === null) {
          localStorage.removeItem(original.key);
        } else {
          localStorage.setItem(original.key, original.value);
        }
      } catch (rollbackError) {
        console.error(`Failed to rollback ${original.key}:`, rollbackError);
      }
    }
    throw e;
  }
};

// --- Data Validation Helpers ---

/**
 * Validate user data structure
 */
const validateUser = (user: any): user is User => {
  return (
    user &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.avatarInitials === 'string' &&
    typeof user.score === 'number' &&
    typeof user.monthlyScore === 'number' &&
    typeof user.streak === 'number' &&
    typeof user.rank === 'number' &&
    Array.isArray(user.badges)
  );
};

/**
 * Validate group data structure
 */
const validateGroup = (group: any): group is Group => {
  return (
    group &&
    typeof group.id === 'string' &&
    typeof group.name === 'string' &&
    typeof group.inviteCode === 'string' &&
    Array.isArray(group.memberIds) &&
    Array.isArray(group.adminIds || []) &&
    typeof group.creatorId === 'string'
  );
};

/**
 * Validate resolution data structure
 */
const validateResolution = (res: any): res is Resolution => {
  return (
    res &&
    typeof res.id === 'string' &&
    typeof res.createdUserId === 'string' &&
    typeof res.createdAt === 'string' &&
    typeof res.title === 'string' &&
    typeof res.difficulty === 'number' &&
    typeof res.isPrivate === 'boolean' &&
    typeof res.history === 'object'
  );
};

/**
 * Validate relationships between entities
 */
const validateRelationships = (users: User[], groups: Group[], resolutions: Resolution[]): void => {
  const userIds = new Set(users.map(u => u.id));
  const groupIds = new Set(groups.map(g => g.id));

  // Validate user.groupId references
  for (const user of users) {
    if (user.groupId && !groupIds.has(user.groupId)) {
      console.warn(`User ${user.id} references non-existent group ${user.groupId}`);
      user.groupId = undefined;
    }
  }

  // Validate group.memberIds references and ensure adminIds exists
  for (const group of groups) {
    // Ensure adminIds exists and includes creator
    if (!group.adminIds || !Array.isArray(group.adminIds)) {
      group.adminIds = [group.creatorId];
    } else if (!group.adminIds.includes(group.creatorId)) {
      group.adminIds.push(group.creatorId);
    }
    
    for (const memberId of group.memberIds) {
      if (!userIds.has(memberId)) {
        console.warn(`Group ${group.id} references non-existent user ${memberId}`);
        group.memberIds = group.memberIds.filter(id => id !== memberId);
        group.adminIds = (group.adminIds || []).filter(id => id !== memberId);
      }
    }
  }

  // Validate resolution.createdUserId references
  for (const res of resolutions) {
    if (!userIds.has(res.createdUserId)) {
      console.warn(`Resolution ${res.id} references non-existent user ${res.createdUserId}`);
    }
  }
};

// --- Internal Logic Helpers ---

/**
 * Normalize invite code for consistent comparison
 * Handles URL encoding, whitespace, case, and special characters
 * This function MUST be idempotent - normalizing twice should give the same result
 */
const normalizeInviteCode = (code: string | null | undefined): string => {
  if (!code) return '';
  
  // Convert to string and handle null/undefined
  let normalized = String(code).trim();
  
  if (!normalized) return '';
  
  // Handle URL-encoded characters (may be double-encoded on mobile)
  let decodeAttempts = 0;
  while (decodeAttempts < 3) {
    try {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) break; // No more encoding to decode
      normalized = decoded;
      decodeAttempts++;
    } catch {
      break; // Can't decode further
    }
  }
  
  // Remove ALL whitespace (spaces, tabs, newlines, zero-width spaces) - mobile keyboards often add these
  normalized = normalized.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
  
  // Convert to uppercase (handles any case variations)
  normalized = normalized.toUpperCase();
  
  // Remove any non-alphanumeric characters (but preserve A-Z and 0-9)
  normalized = normalized.replace(/[^A-Z0-9]/g, '');
  
  return normalized;
};

const determineIdentityLabel = (user: User, resolutions: Resolution[]): IdentityLabel => {
    const startOfQuarter = getStartOfQuarter();
    const today = new Date();
    const dates = getDatesInRange(startOfQuarter, today);
    const totalDays = dates.length;
    
    if (totalDays < 7) return 'Consistent Starter';

    let completed = 0;
    let opportunities = 0;
    let firstHalfCompleted = 0;
    let firstHalfOps = 0;
    let secondHalfCompleted = 0;
    let secondHalfOps = 0;
    
    const midPoint = Math.floor(totalDays / 2);

    resolutions.forEach(res => {
        const created = new Date(res.createdAt);
        dates.forEach((dateStr, idx) => {
             const d = new Date(dateStr);
             if (d >= created) {
                 opportunities++;
                 const isDone = res.history[dateStr] === ResolutionStatus.COMPLETED;
                 if (isDone) completed++;

                 if (idx < midPoint) {
                     firstHalfOps++;
                     if (isDone) firstHalfCompleted++;
                 } else {
                     secondHalfOps++;
                     if (isDone) secondHalfCompleted++;
                 }
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

/**
 * Recalculate scores without mutating input arrays
 */
const recalculateScoresInternal = (users: User[], resolutions: Resolution[]): { users: User[]; resolutions: Resolution[] } => {
  const startOfMonth = getStartOfMonth();

  // Create copies to avoid mutation
  const updatedUsers = users.map(user => ({ ...user }));
  const updatedResolutions = resolutions.map(res => ({ ...res }));

  updatedUsers.forEach(user => {
      const userRes = updatedResolutions.filter(r => r.createdUserId === user.id && !r.isPrivate && !r.archivedAt);
      let totalScore = 0;
      let monthlyScore = 0;
      let maxStreak = 0;

      userRes.forEach(r => {
          const allCompletions = Object.values(r.history).filter(s => s === ResolutionStatus.COMPLETED).length;
          totalScore += (allCompletions * r.effectiveDifficulty);
          
          const monthCompletions = Object.entries(r.history).filter(([date, status]) => {
              return status === ResolutionStatus.COMPLETED && new Date(date) >= startOfMonth;
          }).length;
          monthlyScore += (monthCompletions * r.effectiveDifficulty);

          const s = calculateStreak(r.history, r.todayStatus);
          if (s > maxStreak) maxStreak = s;
          
          r.currentStreak = s;
      });

      user.score = totalScore;
      user.monthlyScore = monthlyScore;
      user.streak = maxStreak;
      user.seasonalLabel = determineIdentityLabel(user, userRes);
  });

  // Validate relationships before saving
  validateRelationships(updatedUsers, getStorage(KEYS.GROUPS, []), updatedResolutions);

  return { users: updatedUsers, resolutions: updatedResolutions };
};

// --- Data Seeding ---

// Initialize empty database if needed
if (!localStorage.getItem(KEYS.INIT)) {
    try {
      // Initialize with empty arrays - no placeholder data
      batchSetStorage([
        { key: KEYS.USERS, value: [] },
        { key: KEYS.RESOLUTIONS, value: [] },
        { key: KEYS.GROUPS, value: [] },
        { key: KEYS.FEED, value: [] },
        { key: KEYS.CONFESSIONS, value: [] }
      ]);
      localStorage.setItem(KEYS.INIT, 'true');
    } catch (e) {
      console.error('Database initialization failed:', e);
    }
}

// --- API Implementation ---

export const api = {
  
  // --- Core Data Access ---

  _getResolutions: (): Resolution[] => {
    const resolutions = getStorage<Resolution[]>(KEYS.RESOLUTIONS, []);
    // Filter out invalid resolutions
    return resolutions.filter(validateResolution);
  },

  _getUsers: (): User[] => {
    const users = getStorage<User[]>(KEYS.USERS, []);
    // Filter out invalid users
    return users.filter(validateUser);
  },

  _getGroups: (): Group[] => {
    const groups = getStorage<Group[]>(KEYS.GROUPS, []);
    // Filter out invalid groups and ensure adminIds exists
    const validGroups = groups.filter(validateGroup);
    
    // Ensure all groups have adminIds initialized
    let needsSave = false;
    const updatedGroups = validGroups.map(group => {
      if (!group.adminIds || !Array.isArray(group.adminIds)) {
        needsSave = true;
        return { ...group, adminIds: [group.creatorId] };
      }
      if (!group.adminIds.includes(group.creatorId)) {
        needsSave = true;
        return { ...group, adminIds: [...group.adminIds, group.creatorId] };
      }
      return group;
    });
    
    if (needsSave) {
      setStorage(KEYS.GROUPS, updatedGroups);
    }
    
    return needsSave ? updatedGroups : validGroups;
  },

  _recalculateAllScores: (users: User[], resolutions: Resolution[]) => {
      const { users: updatedUsers, resolutions: updatedResolutions } = recalculateScoresInternal(users, resolutions);
      batchSetStorage([
        { key: KEYS.USERS, value: updatedUsers },
        { key: KEYS.RESOLUTIONS, value: updatedResolutions }
      ]);
  },

  // --- Auth & User ---

  isAuthenticated: (): boolean => {
    try {
      return !!localStorage.getItem(KEYS.SESSION);
    } catch {
      return false;
    }
  },

  getCurrentUserId: (): string | null => {
    try {
      return localStorage.getItem(KEYS.SESSION);
    } catch {
      return null;
    }
  },
  
  getUser: (): User => {
    const userId = api.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    
    const users = api._getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      // Clean up invalid session
      localStorage.removeItem(KEYS.SESSION);
      throw new Error('Session invalid');
    }
    return user;
  },

  getUserById: (id: string): User | undefined => {
      return api._getUsers().find(u => u.id === id);
  },

  login: (email: string, password?: string): boolean => {
    try {
      const users = api._getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        localStorage.setItem(KEYS.SESSION, user.id);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  },

  signup: (name: string, email: string, password?: string): boolean => {
    try {
      const users = api._getUsers();
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) return false;

      const newUser: User = {
        id: generateId('u'),
        name,
        email,
        password,
        avatarInitials: name.substring(0, 2).toUpperCase(),
        score: 0,
        monthlyScore: 0,
        streak: 0,
        rank: users.length + 1,
        rankChange: 'same',
        groupId: undefined,
        honestyScore: 100,
        isDailyHero: false,
        badges: [],
        seasonalLabel: 'Consistent Starter'
      };

      const updatedUsers = [...users, newUser];
      setStorage(KEYS.USERS, updatedUsers);
      localStorage.setItem(KEYS.SESSION, newUser.id);
      return true;
    } catch (e) {
      console.error('Signup error:', e);
      return false;
    }
  },

  logout: () => {
    try {
      localStorage.removeItem(KEYS.SESSION);
    } catch (e) {
      console.error('Logout error:', e);
    }
  },

  // --- Group Logic ---

  createGroup: (name: string): Group => {
    const user = api.getUser();
    if (user.groupId) throw new Error("User already in a group");

    const newGroup: Group = {
      id: generateId('g'),
      name,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      creatorId: user.id,
      adminIds: [user.id], // Creator is admin
      memberIds: [user.id],
      dailyHeroId: undefined,
      lastHeroSelectionDate: '',
      weeklyComebackHeroId: undefined,
      lastComebackSelectionDate: ''
    };

    const groups = api._getGroups();
    const users = api._getUsers();
    const userIndex = users.findIndex(u => u.id === user.id);
    
    if (userIndex === -1) throw new Error("User not found");

    // Use batch write for atomic update
    const updatedGroups = [...groups, newGroup];
    const updatedUsers = [...users];
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], groupId: newGroup.id };

    batchSetStorage([
      { key: KEYS.GROUPS, value: updatedGroups },
      { key: KEYS.USERS, value: updatedUsers }
    ]);

    return newGroup;
  },

  joinGroup: (inviteCode: string): Group => {
    const user = api.getUser();
    if (user.groupId) throw new Error("User already in a group");

    if (!inviteCode || typeof inviteCode !== 'string') {
      throw new Error("Invalid invite code format");
    }

    // Normalize the input code using shared function
    const normalizedCode = normalizeInviteCode(inviteCode);
    
    if (!normalizedCode || normalizedCode.length < 4) {
      throw new Error("Invalid invite code format. Code should be alphanumeric and at least 4 characters.");
    }

    const groups = api._getGroups();
    
    // Find group by comparing normalized codes
    const groupIndex = groups.findIndex(g => {
      if (!g.inviteCode) return false;
      
      // Normalize stored code using the SAME function
      const storedCode = normalizeInviteCode(g.inviteCode);
      
      // Debug logging in development
      if (process.env.NODE_ENV === 'development' && storedCode === normalizedCode) {
        console.log('Code match found:', {
          attempted: normalizedCode,
          stored: g.inviteCode,
          normalizedStored: storedCode
        });
      }
      
      return storedCode === normalizedCode;
    });
    
    if (groupIndex === -1) {
      // Debug: log what we're comparing
      const allCodes = groups.map(g => ({
        original: g.inviteCode,
        normalized: normalizeInviteCode(g.inviteCode)
      })).filter(c => c.original);
      
      // Check if there's a close match (for debugging)
      const closeMatches = allCodes.filter(c => {
        const stored = c.normalized;
        // Check if codes are similar (same length, similar characters)
        return stored.length === normalizedCode.length || 
               stored.substring(0, 4) === normalizedCode.substring(0, 4);
      });
      
      console.error('Join failed - no exact match found:', {
        attempted: normalizedCode,
        attemptedLength: normalizedCode.length,
        attemptedOriginal: inviteCode,
        allAvailableCodes: allCodes,
        closeMatches: closeMatches,
        totalGroups: groups.length
      });
      
      // More helpful error message
      if (closeMatches.length > 0) {
        throw new Error(`Invalid invite code. Did you mean "${closeMatches[0].original}"? Please check and try again.`);
      }
      
      throw new Error(`Invalid invite code "${normalizedCode}". Please check the code and try again.`);
    }

    const group = groups[groupIndex];
    if (!group.memberIds.includes(user.id)) {
      const users = api._getUsers();
      const userIndex = users.findIndex(u => u.id === user.id);
      
      if (userIndex === -1) throw new Error("User not found");

      const updatedGroups = [...groups];
      updatedGroups[groupIndex] = { ...group, memberIds: [...group.memberIds, user.id] };
      
      const updatedUsers = [...users];
      updatedUsers[userIndex] = { ...updatedUsers[userIndex], groupId: group.id };

      batchSetStorage([
        { key: KEYS.GROUPS, value: updatedGroups },
        { key: KEYS.USERS, value: updatedUsers }
      ]);

      return updatedGroups[groupIndex];
    }

      return group;
  },

  /**
   * Leave the current group (user leaves themselves)
   */
  leaveGroup: (): void => {
    const currentUser = api.getUser();
    if (!currentUser.groupId) throw new Error("Not in a group");

    const groups = api._getGroups();
    const groupIndex = groups.findIndex(g => g.id === currentUser.groupId);
    if (groupIndex === -1) throw new Error("Group not found");

    const group = groups[groupIndex];
    
    // Cannot leave if you're the creator (must transfer ownership or delete group)
    if (group.creatorId === currentUser.id) {
      throw new Error("Group creator cannot leave. Transfer ownership or remove all members first.");
    }

    if (!group.memberIds.includes(currentUser.id)) {
      throw new Error("User is not a member of this group");
    }

    // Remove from group
    const updatedGroups = [...groups];
    updatedGroups[groupIndex] = {
      ...group,
      memberIds: group.memberIds.filter(id => id !== currentUser.id),
      adminIds: (group.adminIds || []).filter(id => id !== currentUser.id)
    };

    // Remove groupId from user
    const users = api._getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
      const updatedUsers = [...users];
      updatedUsers[userIndex] = { ...updatedUsers[userIndex], groupId: undefined };
      
      batchSetStorage([
        { key: KEYS.GROUPS, value: updatedGroups },
        { key: KEYS.USERS, value: updatedUsers }
      ]);
    } else {
      throw new Error("User not found");
    }
  },

  /**
   * Remove a member from the group (admin only)
   */
  removeMember: (memberId: string): void => {
    const currentUser = api.getUser();
    if (!currentUser.groupId) throw new Error("Not in a group");

    const groups = api._getGroups();
    const groupIndex = groups.findIndex(g => g.id === currentUser.groupId);
    if (groupIndex === -1) throw new Error("Group not found");

    const group = groups[groupIndex];
    
    // Check if user is admin
    const isAdmin = group.adminIds?.includes(currentUser.id) || group.creatorId === currentUser.id;
    if (!isAdmin) throw new Error("Only admins can remove members");

    // Cannot remove yourself
    if (memberId === currentUser.id) throw new Error("Cannot remove yourself from the group");

    // Cannot remove creator
    if (memberId === group.creatorId) throw new Error("Cannot remove the group creator");

    if (!group.memberIds.includes(memberId)) {
      throw new Error("User is not a member of this group");
    }

    // Remove from group
    const updatedGroups = [...groups];
    updatedGroups[groupIndex] = {
      ...group,
      memberIds: group.memberIds.filter(id => id !== memberId),
      adminIds: (group.adminIds || []).filter(id => id !== memberId)
    };

    // Remove groupId from user
    const users = api._getUsers();
    const memberIndex = users.findIndex(u => u.id === memberId);
    if (memberIndex !== -1) {
      const updatedUsers = [...users];
      updatedUsers[memberIndex] = { ...updatedUsers[memberIndex], groupId: undefined };
      
      batchSetStorage([
        { key: KEYS.GROUPS, value: updatedGroups },
        { key: KEYS.USERS, value: updatedUsers }
      ]);
    } else {
      setStorage(KEYS.GROUPS, updatedGroups);
    }
  },

  /**
   * Check if current user is admin of their group
   */
  isGroupAdmin: (): boolean => {
    try {
      const user = api.getUser();
      if (!user.groupId) return false;
      
      const group = api._getGroups().find(g => g.id === user.groupId);
      if (!group) return false;
      
      return group.adminIds?.includes(user.id) || group.creatorId === user.id;
    } catch {
      return false;
    }
  },

  /**
   * Generate invite link for the group
   */
  getInviteLink: (): string => {
    const user = api.getUser();
    if (!user.groupId) throw new Error("Not in a group");

    const group = api._getGroups().find(g => g.id === user.groupId);
    if (!group) throw new Error("Group not found");

    // Generate link with invite code using query parameters
    // Query params are preserved by mobile messaging apps (unlike hash fragments)
    // This ensures the invite code survives when links are shared via iMessage, WhatsApp, SMS, etc.
    const baseUrl = window.location.origin + window.location.pathname;
    const cleanBase = baseUrl.replace(/\/$/, '');
    return `${cleanBase}?invite=${encodeURIComponent(group.inviteCode)}`;
  },

  /**
   * Join group using invite link (extracts code from URL)
   */
  joinGroupByLink: (inviteCode: string): Group => {
    return api.joinGroup(inviteCode);
  },

  getGroup: (): Group | null => {
    try {
      const user = api.getUser();
      if (!user.groupId) return null;
      
      const groups = api._getGroups();
      let group = groups.find(g => g.id === user.groupId) || null;
      
      if (group) {
          // Ensure adminIds exists
          if (!group.adminIds || !Array.isArray(group.adminIds)) {
              group = { ...group, adminIds: [group.creatorId] };
              const updatedGroups = groups.map(g => g.id === group!.id ? group! : g);
              setStorage(KEYS.GROUPS, updatedGroups);
          } else if (!group.adminIds.includes(group.creatorId)) {
              group = { ...group, adminIds: [...group.adminIds, group.creatorId] };
              const updatedGroups = groups.map(g => g.id === group!.id ? group! : g);
              setStorage(KEYS.GROUPS, updatedGroups);
          }
          
          const today = getTodayKey();
          if (group.lastHeroSelectionDate !== today) {
              return api._refreshDailyHero(group);
          }
      }
      return group;
    } catch {
      return null;
    }
  },

  _refreshDailyHero: (group: Group): Group => {
      const today = getTodayKey();
      const yesterday = getYesterdayKey();
      const allUsers = api._getUsers();
      const allResolutions = api._getResolutions();
      
      const members = allUsers.filter(u => u.groupId === group.id);
      let bestCandidate: User | null = null;
      let maxScore = -1;

      members.forEach(member => {
          if (member.honestyScore < 80) return;

          const memberResolutions = allResolutions.filter(r => r.createdUserId === member.id && !r.isPrivate && !r.archivedAt);
          if (memberResolutions.length === 0) return;

          const relevantResolutions = memberResolutions.filter(r => {
             const createdDate = r.createdAt.split('T')[0];
             return createdDate <= yesterday;
          });
          
          if (relevantResolutions.length === 0) return;

          const allCompleted = relevantResolutions.every(r => r.history[yesterday] === ResolutionStatus.COMPLETED);
          
          if (allCompleted) {
              if (member.score > maxScore) {
                  maxScore = member.score;
                  bestCandidate = member;
              } else if (member.score === maxScore) {
                  if (bestCandidate && member.streak > bestCandidate.streak) {
                      bestCandidate = member;
                  }
              }
          }
      });

      const groups = api._getGroups();
      const gIndex = groups.findIndex(g => g.id === group.id);
      
      if (gIndex === -1) return group;

      const updatedGroups = [...groups];
      updatedGroups[gIndex] = {
        ...updatedGroups[gIndex],
        dailyHeroId: bestCandidate ? bestCandidate.id : undefined,
        lastHeroSelectionDate: today
      };

      const updatedUsers = allUsers.map(u => {
          if (u.groupId !== group.id) return u;
          return { ...u, isDailyHero: bestCandidate ? u.id === bestCandidate.id : false };
      });

      batchSetStorage([
        { key: KEYS.GROUPS, value: updatedGroups },
        { key: KEYS.USERS, value: updatedUsers }
      ]);
      
      if (bestCandidate) {
          api._addToFeed('hero', `👑 ${bestCandidate.name} is today's Daily Hero!`, bestCandidate);
      }

      return updatedGroups[gIndex];
  },

  // --- Feed & Social ---

  getFeed: (): FeedEvent[] => {
      const feed = getStorage<FeedEvent[]>(KEYS.FEED, []);
      return feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  _addToFeed: (type: FeedEvent['type'], message: string, user: User) => {
      const feed = getStorage<FeedEvent[]>(KEYS.FEED, []);
      const newEvent: FeedEvent = {
          id: generateId('feed'),
          type,
          message,
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatarInitials
      };
      setStorage(KEYS.FEED, [newEvent, ...feed]);
  },

  addConfession: (text: string) => {
      const user = api.getUser();
      if (!user.groupId) throw new Error("Must be in a group");
      
      const all = getStorage<Confession[]>(KEYS.CONFESSIONS, []);
      const newConfession: Confession = {
          id: generateId('c'),
          groupId: user.groupId,
          text,
          timestamp: new Date().toISOString()
      };
      setStorage(KEYS.CONFESSIONS, [newConfession, ...all]);
  },

  getConfessions: (): Confession[] => {
      try {
        const user = api.getUser();
        if (!user.groupId) return [];
        const all = getStorage<Confession[]>(KEYS.CONFESSIONS, []);
        return all
            .filter(c => c.groupId === user.groupId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } catch {
        return [];
      }
  },

  // --- Resolutions ---

  getMyResolutions: (): Resolution[] => {
      const userId = api.getCurrentUserId();
      if (!userId) return [];
      
      const all = api._getResolutions();
      const todayKey = getTodayKey();
      
      return all.filter(r => r.createdUserId === userId && !r.archivedAt).map(res => {
          if (res.history[todayKey] && res.history[todayKey] !== res.todayStatus) {
              return { ...res, todayStatus: res.history[todayKey] };
          }
          return res;
      });
  },
  
  getPublicResolutions: (userId: string): Resolution[] => {
      const all = api._getResolutions();
      const todayKey = getTodayKey();
      return all.filter(r => r.createdUserId === userId && !r.isPrivate && !r.archivedAt).map(res => {
           if (res.history[todayKey] && res.history[todayKey] !== res.todayStatus) {
              return { ...res, todayStatus: res.history[todayKey] };
          }
          return res;
      });
  },

  getResolutionById: (id: string): Resolution | undefined => {
      return api._getResolutions().find(r => r.id === id);
  },
  
  getGraveyard: (): Resolution[] => {
      const userId = api.getCurrentUserId();
      if (!userId) return [];
      return api._getResolutions()
        .filter(r => r.createdUserId === userId && r.archivedAt)
        .sort((a,b) => (b.archivedAt || '').localeCompare(a.archivedAt || ''));
  },

  getPublicResolutionsForGroup: (): { user: User, resolutions: Resolution[] }[] => {
      try {
        const currentUser = api.getUser();
        if (!currentUser.groupId) return [];
        
        const allResolutions = api._getResolutions();
        const allUsers = api._getUsers();
        const groupMembers = allUsers.filter(u => u.groupId === currentUser.groupId);
        
        return groupMembers.map(member => {
            const memberResolutions = allResolutions.filter(r => 
                r.createdUserId === member.id && 
                !r.isPrivate &&
                !r.archivedAt
            );
            return { user: member, resolutions: memberResolutions };
        }).filter(group => group.resolutions.length > 0);
      } catch {
        return [];
      }
  },

  addResolution: (res: any) => {
    const user = api.getUser();
    const newRes: Resolution = {
        ...res,
        id: generateId('r'),
        createdUserId: user.id,
        createdAt: new Date().toISOString(),
        currentStreak: 0,
        todayStatus: ResolutionStatus.UNCHECKED,
        isBroken: false,
        bets: [],
        currentCount: 0,
        history: {},
        peerDifficultyVotes: {},
        effectiveDifficulty: res.difficulty,
        credibility: {},
        subGoals: res.subGoals || []
    };
    const current = api._getResolutions();
    setStorage(KEYS.RESOLUTIONS, [newRes, ...current]);
  },

  checkIn: (id: string, status: ResolutionStatus) => {
      const all = api._getResolutions();
      const index = all.findIndex(r => r.id === id);
      if (index === -1) throw new Error("Resolution not found");

      const user = api.getUser();
      const todayKey = getTodayKey();
      
      // Create updated resolution copy
      const res = { ...all[index] };
      res.history = { ...res.history };
      res.history[todayKey] = status;
      res.todayStatus = status;
      
      const oldStreak = res.currentStreak;
      res.currentStreak = calculateStreak(res.history, status);
      res.isBroken = status === ResolutionStatus.MISSED;
      
      if (status === ResolutionStatus.COMPLETED && res.currentStreak === 5) {
          const streakStart = new Date();
          streakStart.setDate(streakStart.getDate() - 4);
          
          let misses = 0;
          for (let i = 1; i <= 7; i++) {
              const checkDate = new Date(streakStart);
              checkDate.setDate(checkDate.getDate() - i);
              const dateKey = checkDate.toISOString().split('T')[0];
              if (res.history[dateKey] === ResolutionStatus.MISSED) {
                  misses++;
              }
          }
          
          if (misses >= 3) {
              api._handleComebackEvent(user);
          }
      }
      
      if (!res.isPrivate) {
          if (status === ResolutionStatus.COMPLETED) {
              const points = Math.round(res.effectiveDifficulty);
              api._addToFeed('check-in', `${user.name} checked in on "${res.title}" (+${points} pts)`, user);
              
              if (res.currentStreak > 0 && res.currentStreak % 7 === 0 && res.currentStreak > oldStreak) {
                  api._addToFeed('streak', `${user.name} reached a ${res.currentStreak}-day streak on "${res.title}"!`, user);
              }
          }
      }

      const updatedResolutions = [...all];
      updatedResolutions[index] = res;
      setStorage(KEYS.RESOLUTIONS, updatedResolutions);
      
      // Recalc User Stats
      api._recalculateAllScores(api._getUsers(), updatedResolutions);
      
      // Check Badges
      api._checkBadges(user.id);
  },

  _handleComebackEvent: (user: User) => {
      if (!user.groupId) return;
      
      const groups = api._getGroups();
      const gIndex = groups.findIndex(g => g.id === user.groupId);
      if (gIndex === -1) return;
      
      const group = groups[gIndex];
      const weekStart = getStartOfWeek().toISOString().split('T')[0];
      
      if (group.lastComebackSelectionDate !== weekStart) {
          const updatedGroups = [...groups];
          updatedGroups[gIndex] = {
            ...updatedGroups[gIndex],
            lastComebackSelectionDate: weekStart,
            weeklyComebackHeroId: user.id
          };
          
          setStorage(KEYS.GROUPS, updatedGroups);
          
          api._addToFeed('comeback', `🔥 COMEBACK OF THE WEEK: ${user.name} bounced back with a 5-day streak!`, user);
          api._awardBadge(user.id, 'Comeback Kid');
      }
  },

  // --- Betting & Voting ---

  addBet: (resolutionId: string, endDate: string, stake: string) => {
      const user = api.getUser();
      const all = api._getResolutions();
      const index = all.findIndex(r => r.id === resolutionId);
      if (index === -1) throw new Error("Resolution not found");

      const res = { ...all[index] };
      const today = getTodayKey();

      const newBet: Bet = {
          id: generateId('b'),
          resolutionId,
          userId: user.id,
          createdAt: new Date().toISOString(),
          startDate: today,
          endDate,
          stake,
          status: 'ACTIVE'
      };

      if (!res.bets) res.bets = [];
      res.bets = [...res.bets, newBet];
      
      const updatedResolutions = [...all];
      updatedResolutions[index] = res;
      setStorage(KEYS.RESOLUTIONS, updatedResolutions);
      
      if (!res.isPrivate) {
          api._addToFeed('system', `${user.name} placed a bet on "${res.title}" until ${endDate}. Stakes: ${stake}`, user);
      }
  },

  archiveResolution: (id: string, reason: string) => {
      const all = api._getResolutions();
      const index = all.findIndex(r => r.id === id);
      if (index === -1) throw new Error("Resolution not found");
      
      const res = { ...all[index] };
      if (getDaysSince(res.createdAt) < 7) throw new Error("Cannot archive during 7-day lock-in.");
      
      res.archivedAt = new Date().toISOString();
      res.archivedReason = reason;
      
      const updatedResolutions = [...all];
      updatedResolutions[index] = res;
      setStorage(KEYS.RESOLUTIONS, updatedResolutions);
  },

  voteDifficulty: (resolutionId: string, vote: Difficulty) => {
      const currentUser = api.getUser();
      const all = api._getResolutions();
      const index = all.findIndex(r => r.id === resolutionId);
      if (index === -1) throw new Error("Resolution not found");
      
      const res = { ...all[index] };
      if (res.createdUserId === currentUser.id) throw new Error("Cannot vote on own resolution");
      if (res.isPrivate) throw new Error("Cannot vote on private resolution");

      if (!res.peerDifficultyVotes) res.peerDifficultyVotes = {};
      res.peerDifficultyVotes = { ...res.peerDifficultyVotes, [currentUser.id]: vote };

      const votes = Object.values(res.peerDifficultyVotes);
      const sumVotes = votes.reduce((a, b) => a + b, 0);
      const avgVotes = sumVotes / votes.length;
      
      const effective = (res.difficulty + avgVotes) / 2;
      res.effectiveDifficulty = Math.round(effective * 10) / 10; 

      const updatedResolutions = [...all];
      updatedResolutions[index] = res;
      setStorage(KEYS.RESOLUTIONS, updatedResolutions);
      api._recalculateAllScores(api._getUsers(), updatedResolutions);
  },

  voteCredibility: (resolutionId: string, date: string, type: 'BELIEVE' | 'DOUBT') => {
      const currentUser = api.getUser();
      const all = api._getResolutions();
      const index = all.findIndex(r => r.id === resolutionId);
      if (index === -1) throw new Error("Resolution not found");

      const res = { ...all[index] };
      if (res.createdUserId === currentUser.id) throw new Error("Cannot vote on own credibility");

      if (!res.credibility) res.credibility = {};
      if (!res.credibility[date]) {
        res.credibility = { ...res.credibility, [date]: { believers: [], doubters: [] } };
      }

      const dayVotes = { ...res.credibility[date] };
      dayVotes.believers = dayVotes.believers.filter(id => id !== currentUser.id);
      dayVotes.doubters = dayVotes.doubters.filter(id => id !== currentUser.id);

      if (type === 'BELIEVE') dayVotes.believers = [...dayVotes.believers, currentUser.id];
      if (type === 'DOUBT') dayVotes.doubters = [...dayVotes.doubters, currentUser.id];

      res.credibility = { ...res.credibility, [date]: dayVotes };
      
      const updatedResolutions = [...all];
      updatedResolutions[index] = res;
      setStorage(KEYS.RESOLUTIONS, updatedResolutions);
  },

  // --- Reports & Analytics ---

  getScoreBreakdown: (userId: string): { title: string, points: number, days: number, difficulty: number }[] => {
      const allResolutions = api._getResolutions();
      const userResolutions = allResolutions.filter(r => r.createdUserId === userId && !r.isPrivate && !r.archivedAt);
      
      return userResolutions.map(r => {
          const completedDays = Object.values(r.history).filter(s => s === ResolutionStatus.COMPLETED).length;
          const diff = r.effectiveDifficulty || r.difficulty;
          return {
              title: r.title,
              difficulty: Math.round(diff * 10) / 10,
              days: completedDays,
              points: Math.round(completedDays * diff)
          };
      }).sort((a, b) => b.points - a.points);
  },

  getLeaderboard: (period: 'ALL' | 'MONTHLY' = 'ALL'): User[] => {
      const currentUser = api.getUser();
      if (!currentUser.groupId) return [];

      const allUsers = api._getUsers();
      let groupMembers = allUsers.filter(u => u.groupId === currentUser.groupId);
      
      groupMembers.sort((a, b) => {
          const scoreA = period === 'MONTHLY' ? a.monthlyScore : a.score;
          const scoreB = period === 'MONTHLY' ? b.monthlyScore : b.score;

          if (scoreB !== scoreA) return scoreB - scoreA;
          return b.streak - a.streak;
      });
      
      const updatedMembers = groupMembers.map((member, index) => {
          const newRank = index + 1;
          let rankChange: 'up' | 'down' | 'same' = 'same';
          
          if (period === 'ALL' && member.rank !== 0) {
              if (newRank < member.rank) rankChange = 'up';
              else if (newRank > member.rank) rankChange = 'down';
          }
          
          return { ...member, rank: newRank, rankChange };
      });

      if (period === 'ALL') {
          const userMap = new Map(updatedMembers.map(u => [u.id, u]));
          const newAllUsers = allUsers.map(u => userMap.get(u.id) || u);
          setStorage(KEYS.USERS, newAllUsers);
      }

      return updatedMembers;
  },

  _generateReport: (userId: string, type: 'WEEKLY' | 'MONTHLY', startDate: Date, endDate: Date): PeriodicReport => {
      const allResolutions = api._getResolutions();
      const userResolutions = allResolutions.filter(r => r.createdUserId === userId);
      const user = api.getUserById(userId);
      if (!user) throw new Error("User not found");

      const dates = getDatesInRange(startDate, endDate);
      
      let totalCompleted = 0;
      let totalPoints = 0;
      let consistencySum = 0;
      let activeResolutionsCount = 0;
      
      let bestRes: Resolution | null = null;
      let worstRes: Resolution | null = null;
      let bestRate = -1;
      let worstRate = 101;

      userResolutions.forEach(res => {
          const createdAt = new Date(res.createdAt);
          if (createdAt > endDate) return;

          let periodCompleted = 0;
          let periodOpportunities = 0;

          dates.forEach(dateStr => {
              const d = new Date(dateStr);
              if (d >= createdAt) {
                  periodOpportunities++;
                  if (res.history[dateStr] === ResolutionStatus.COMPLETED) {
                      periodCompleted++;
                  }
              }
          });

          if (periodOpportunities === 0) return;
          activeResolutionsCount++;

          totalCompleted += periodCompleted;
          if (!res.isPrivate) {
             totalPoints += (periodCompleted * res.effectiveDifficulty);
          }

          const rate = periodCompleted / periodOpportunities;
          consistencySum += rate;

          if (rate > bestRate) { bestRate = rate; bestRes = res; }
          if (rate < worstRate) { worstRate = rate; worstRes = res; }
      });

      const avgConsistency = activeResolutionsCount > 0 
          ? Math.round((consistencySum / activeResolutionsCount) * 100) 
          : 0;

      const allUsers = api._getUsers();
      const groupMembers = allUsers.filter(u => u.groupId === user.groupId);
      
      let groupConsSum = 0;
      let groupActiveCount = 0;

      groupMembers.forEach(mem => {
          const memRes = allResolutions.filter(r => r.createdUserId === mem.id);
          memRes.forEach(r => {
             const createdAt = new Date(r.createdAt);
             if (createdAt > endDate) return;
             
             let rComp = 0;
             let rOpp = 0;
             dates.forEach(dStr => {
                 if (new Date(dStr) >= createdAt) {
                     rOpp++;
                     if (r.history[dStr] === ResolutionStatus.COMPLETED) rComp++;
                 }
             });
             
             if (rOpp > 0) {
                 groupConsSum += (rComp / rOpp);
                 groupActiveCount++;
             }
          });
      });

      const groupConsistency = groupActiveCount > 0 ? Math.round((groupConsSum / groupActiveCount) * 100) : 0;
      const sortedGroup = [...groupMembers].sort((a, b) => b.score - a.score);

      return {
          type,
          periodLabel: type === 'WEEKLY' ? 'Last 7 Days' : new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
          daysCheckedIn: totalCompleted,
          pointsGained: totalPoints,
          rankChange: user.rankChange === 'up' ? 1 : user.rankChange === 'down' ? -1 : 0,
          consistency: avgConsistency,
          bestResolution: bestRes ? bestRes.title : 'None',
          worstResolution: worstRes ? worstRes.title : 'None',
          trustTrend: user.honestyScore >= 95 ? 'up' : user.honestyScore < 80 ? 'down' : 'stable',
          groupHero: sortedGroup[0]?.name || 'None',
          groupConsistency
      };
  },

  getWeeklyReport: (userId: string): PeriodicReport => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6); 
      return api._generateReport(userId, 'WEEKLY', start, end);
  },

  getMonthlyReport: (userId: string): PeriodicReport => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), 1); 
      return api._generateReport(userId, 'MONTHLY', start, end);
  },
  
  getYearInReview: (userId: string) => {
      const allResolutions = api._getResolutions();
      const userResolutions = allResolutions.filter(r => r.createdUserId === userId);
      const user = api.getUserById(userId);
      
      if (!user) throw new Error("User not found");
      
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const today = new Date();
      const dates = getDatesInRange(startOfYear, today);

      let totalCompleted = 0;
      let consistencySum = 0;
      let activeCount = 0;
      
      let bestRes: Resolution | null = null;
      let worstRes: Resolution | null = null;
      let bestRate = -1;
      let worstRate = 101;

      userResolutions.forEach(res => {
          const createdAt = new Date(res.createdAt);
          let rCompleted = 0;
          let rOpportunities = 0;

          dates.forEach(dStr => {
              if (new Date(dStr) >= createdAt) {
                  rOpportunities++;
                  if (res.history[dStr] === ResolutionStatus.COMPLETED) rCompleted++;
              }
          });

          if (rOpportunities === 0) return;
          
          activeCount++;
          totalCompleted += rCompleted;
          
          const rate = rCompleted / rOpportunities;
          consistencySum += rate;

          if (rate > bestRate) { bestRate = rate; bestRes = res; }
          if (rate < worstRate) { worstRate = rate; worstRes = res; }
      });

      const consistency = activeCount > 0 ? Math.round((consistencySum / activeCount) * 100) : 0;
      
      const allUsers = api._getUsers();
      const groupMembers = allUsers.filter(u => u.groupId === user.groupId);
      const sortedGroup = groupMembers.sort((a, b) => b.score - a.score);
      const topPerformer = sortedGroup[0];
      
      return {
          user,
          consistency,
          totalCompleted,
          bestRes,
          worstRes,
          topPerformer,
          groupSize: groupMembers.length
      };
  },

  // --- Health/Badges Helpers ---
  
  getResolutionHealth: (res: Resolution): 'healthy' | 'at-risk' | 'slipping' => {
      if (res.archivedAt) return 'healthy';
      
      const dates = [];
      const today = new Date();
      for (let i = 1; i <= 7; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          dates.push(d.toISOString().split('T')[0]);
      }

      let missesLast7 = 0;
      let missesLast5 = 0;

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
  
  getUserTodayStatus: (userId: string): 'checked' | 'missed' | 'pending' => {
      const allResolutions = api._getResolutions();
      const userRes = allResolutions.filter(r => r.createdUserId === userId && !r.isPrivate && !r.archivedAt);
      if (userRes.length === 0) return 'pending'; 

      const hasMissed = userRes.some(r => r.todayStatus === ResolutionStatus.MISSED);
      if (hasMissed) return 'missed';

      const allDone = userRes.every(r => r.todayStatus === ResolutionStatus.COMPLETED);
      if (allDone) return 'checked';

      return 'pending';
  },

  _ensureDemoIntegrity: () => {
      // Intentionally left empty
  },

  _checkBadges: (userId: string): string[] => {
      const user = api.getUserById(userId);
      if (!user) return [];
      const userBadges = new Set(user.badges || []);
      const allRes = api._getResolutions();
      const myRes = allRes.filter(r => r.createdUserId === userId);

      if (myRes.some(r => r.currentStreak >= 7)) {
          if (!userBadges.has('7-Day Streak')) api._awardBadge(userId, '7-Day Streak');
      }

      if (myRes.some(r => r.currentStreak >= 30)) {
           if (!userBadges.has('30-Day Streak')) api._awardBadge(userId, '30-Day Streak');
      }

      if (myRes.some(r => getDaysSince(r.createdAt) >= 7 && !r.archivedAt)) {
          if (!userBadges.has('Locked In')) api._awardBadge(userId, 'Locked In');
      }

      return Array.from(userBadges);
  },

  _awardBadge: (userId: string, badgeName: string) => {
      const allUsers = api._getUsers();
      const idx = allUsers.findIndex(u => u.id === userId);
      if (idx !== -1) {
          const updatedUsers = [...allUsers];
          if (!updatedUsers[idx].badges) updatedUsers[idx].badges = [];
          if (!updatedUsers[idx].badges.includes(badgeName)) {
              updatedUsers[idx] = {
                ...updatedUsers[idx],
                badges: [...updatedUsers[idx].badges, badgeName]
              };
              setStorage(KEYS.USERS, updatedUsers);
          }
      }
  },
};
