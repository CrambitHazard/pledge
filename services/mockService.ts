import { Resolution, ResolutionType, Difficulty, ResolutionStatus, User, FeedEvent, Confession, Group, Bet, PeriodicReport, IdentityLabel } from '../types';

const KEYS = {
  USERS: 'rl_users_db',
  GROUPS: 'rl_groups_db',
  SESSION: 'rl_session_user_id',
  RESOLUTIONS: 'rl_resolutions_v2', 
  FEED: 'rl_feed_v2',
  CONFESSIONS: 'rl_confessions',
  INIT: 'rl_initialized_v3' // Incremented to force re-seed
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
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const start = new Date(d.setDate(diff));
    start.setHours(0,0,0,0);
    return start;
};

const calculateStreak = (history: Record<string, ResolutionStatus>, todayStatus: ResolutionStatus): number => {
  let streak = 0;
  const today = new Date();
  
  // Check today first
  if (todayStatus === ResolutionStatus.COMPLETED) {
      streak = 1;
  }

  // Check backwards from yesterday
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

// --- Storage Wrappers ---

const getStorage = <T>(key: string, initial: T): T => {
  try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(stored);
  } catch (e) {
      return initial;
  }
};

const setStorage = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// --- Internal Logic Helpers (Prevents Hoisting Issues) ---

const determineIdentityLabel = (user: User, resolutions: Resolution[]): IdentityLabel => {
    // Analyze behavior since start of quarter
    const startOfQuarter = getStartOfQuarter();
    const today = new Date();
    const dates = getDatesInRange(startOfQuarter, today);
    const totalDays = dates.length;
    
    if (totalDays < 7) return 'Consistent Starter'; // Default for new quarter

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

const recalculateScoresInternal = (users: User[], resolutions: Resolution[]) => {
      const startOfMonth = getStartOfMonth();

      users.forEach(user => {
          const userRes = resolutions.filter(r => r.createdUserId === user.id && !r.isPrivate && !r.archivedAt);
          let totalScore = 0;
          let monthlyScore = 0;
          let maxStreak = 0;

          userRes.forEach(r => {
              // Calculate Lifetime Score
              const allCompletions = Object.values(r.history).filter(s => s === ResolutionStatus.COMPLETED).length;
              totalScore += (allCompletions * r.effectiveDifficulty);
              
              // Calculate Monthly Score (Step 2K)
              const monthCompletions = Object.entries(r.history).filter(([date, status]) => {
                  return status === ResolutionStatus.COMPLETED && new Date(date) >= startOfMonth;
              }).length;
              monthlyScore += (monthCompletions * r.effectiveDifficulty);

              // Calculate Streak
              const s = calculateStreak(r.history, r.todayStatus);
              if (s > maxStreak) maxStreak = s;
              
              // Update Resolution State
              r.currentStreak = s;
          });

          user.score = totalScore;
          user.monthlyScore = monthlyScore;
          user.streak = maxStreak;
          
          // Identity Label Update
          user.seasonalLabel = determineIdentityLabel(user, userRes);
      });

      setStorage(KEYS.USERS, users);
      setStorage(KEYS.RESOLUTIONS, resolutions);
};

// --- Data Seeding (The "Real Database" Simulation) ---

const generateHistoricalData = (userId: string, resId: string, daysBack: number, consistencyRate: number): Record<string, ResolutionStatus> => {
    const history: Record<string, ResolutionStatus> = {};
    const today = new Date();
    
    for (let i = 1; i <= daysBack; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        
        // Randomly determine status based on consistency rate
        const roll = Math.random();
        if (roll < consistencyRate) {
            history[key] = ResolutionStatus.COMPLETED;
        } else if (roll < consistencyRate + 0.1) {
            // Small chance of missed
            history[key] = ResolutionStatus.MISSED;
        }
        // Remaining is UNCHECKED (gap in data)
    }
    return history;
};

const initializeDatabase = () => {
    // Determine start of year for seeding
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const daysSinceStartOfYear = Math.floor((new Date().getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

    // 1. Users
    const users: User[] = [
      { 
        id: 'u1', name: 'Alex Doe', email: 'alex@example.com', password: 'password', 
        avatarInitials: 'AD', score: 0, monthlyScore: 0, streak: 0, rank: 2, rankChange: 'same', groupId: 'g1', honestyScore: 100, isDailyHero: false, badges: [], seasonalLabel: 'Consistent Starter' 
      },
      { 
        id: 'u2', name: 'Sarah Smith', email: 'sarah@example.com', password: 'password',
        avatarInitials: 'SS', score: 0, monthlyScore: 0, streak: 0, rank: 1, rankChange: 'up', groupId: 'g1', honestyScore: 98, isDailyHero: false, badges: ['7-Day Streak', '30-Day Streak'], seasonalLabel: 'Relentless Maintainer' 
      }
    ];

    // 2. Resolutions (Backfilled with Real Data)
    const resolutions: Resolution[] = [
        // Sarah's Goals (High Consistency)
        {
            id: 'r_sarah_1', createdUserId: 'u2', createdAt: startOfYear.toISOString(),
            title: 'Morning Run 5k', category: 'Health', type: ResolutionType.BINARY, difficulty: 4, isPrivate: false,
            peerDifficultyVotes: {}, effectiveDifficulty: 4, credibility: {},
            history: generateHistoricalData('u2', 'r_sarah_1', daysSinceStartOfYear, 0.9), // 90% consistency
            currentStreak: 12, todayStatus: ResolutionStatus.UNCHECKED, isBroken: false, bets: [], subGoals: []
        },
        // Alex's Goals (Medium Consistency)
        {
            id: 'r_alex_1', createdUserId: 'u1', createdAt: startOfYear.toISOString(),
            title: 'Read 30 mins', category: 'Intellect', type: ResolutionType.BINARY, difficulty: 2, isPrivate: false,
            peerDifficultyVotes: {}, effectiveDifficulty: 2, credibility: {},
            history: generateHistoricalData('u1', 'r_alex_1', daysSinceStartOfYear, 0.6), // 60% consistency
            currentStreak: 3, todayStatus: ResolutionStatus.UNCHECKED, isBroken: false, bets: [], subGoals: []
        },
        {
            id: 'r_alex_2', createdUserId: 'u1', createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), // Created 30 days ago
            title: 'No Sugar', category: 'Health', type: ResolutionType.BINARY, difficulty: 5, isPrivate: false,
            peerDifficultyVotes: {}, effectiveDifficulty: 5, credibility: {},
            history: generateHistoricalData('u1', 'r_alex_2', 30, 0.4), // 40% consistency
            currentStreak: 0, todayStatus: ResolutionStatus.UNCHECKED, isBroken: true, bets: [], subGoals: []
        }
    ];

    // Force Yesterday Completion for Sarah (Daily Hero Logic)
    const sarahRes = resolutions.find(r => r.id === 'r_sarah_1');
    if (sarahRes) {
        sarahRes.history[getYesterdayKey()] = ResolutionStatus.COMPLETED;
    }

    // 3. Groups
    const groups: Group[] = [
      { id: 'g1', name: 'Iron Circle', inviteCode: 'IRON24', memberIds: ['u1', 'u2'], creatorId: 'u1', dailyHeroId: undefined, lastHeroSelectionDate: '', weeklyComebackHeroId: undefined, lastComebackSelectionDate: '' }
    ];

    setStorage(KEYS.USERS, users);
    setStorage(KEYS.RESOLUTIONS, resolutions);
    setStorage(KEYS.GROUPS, groups);
    
    // Recalculate Initial Scores based on generated history using internal helper
    recalculateScoresInternal(users, resolutions);
};

// Run initialization if needed
if (!localStorage.getItem(KEYS.INIT)) {
    initializeDatabase();
    localStorage.setItem(KEYS.INIT, 'true');
}

// --- API Implementation ---

export const api = {
  
  // --- Core Data Access ---

  _getResolutions: (): Resolution[] => getStorage(KEYS.RESOLUTIONS, []),
  _getUsers: (): User[] => getStorage(KEYS.USERS, []),
  _getGroups: (): Group[] => getStorage(KEYS.GROUPS, []),

  _recalculateAllScores: (users: User[], resolutions: Resolution[]) => {
      recalculateScoresInternal(users, resolutions);
  },

  // --- Auth & User ---

  isAuthenticated: (): boolean => !!localStorage.getItem(KEYS.SESSION),
  getCurrentUserId: (): string | null => localStorage.getItem(KEYS.SESSION),
  
  getUser: (): User => {
    const userId = api.getCurrentUserId();
    const users = api._getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('Session invalid');
    return user;
  },

  getUserById: (id: string): User | undefined => {
      return api._getUsers().find(u => u.id === id);
  },

  login: (email: string, password?: string): boolean => {
    const users = api._getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      localStorage.setItem(KEYS.SESSION, user.id);
      return true;
    }
    return false;
  },

  signup: (name: string, email: string, password?: string): boolean => {
    const users = api._getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) return false;

    const newUser: User = {
      id: 'u' + Date.now(),
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

    users.push(newUser);
    setStorage(KEYS.USERS, users);
    localStorage.setItem(KEYS.SESSION, newUser.id);
    return true;
  },

  logout: () => {
    localStorage.removeItem(KEYS.SESSION);
  },

  // --- Group Logic ---

  createGroup: (name: string): Group => {
    const user = api.getUser();
    if (user.groupId) throw new Error("User already in a group");

    const newGroup: Group = {
      id: 'g' + Date.now(),
      name,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      creatorId: user.id,
      memberIds: [user.id]
    };

    const groups = api._getGroups();
    groups.push(newGroup);
    setStorage(KEYS.GROUPS, groups);

    const users = api._getUsers();
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex >= 0) {
      users[userIndex].groupId = newGroup.id;
      setStorage(KEYS.USERS, users);
    }
    return newGroup;
  },

  joinGroup: (inviteCode: string): Group => {
    const user = api.getUser();
    if (user.groupId) throw new Error("User already in a group");

    const groups = api._getGroups();
    const groupIndex = groups.findIndex(g => g.inviteCode === inviteCode);
    if (groupIndex === -1) throw new Error("Invalid invite code");

    const group = groups[groupIndex];
    if (!group.memberIds.includes(user.id)) {
      group.memberIds.push(user.id);
      groups[groupIndex] = group;
      setStorage(KEYS.GROUPS, groups);
    }

    const users = api._getUsers();
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex >= 0) {
      users[userIndex].groupId = group.id;
      setStorage(KEYS.USERS, users);
    }
    return group;
  },

  getGroup: (): Group | null => {
    const user = api.getUser();
    if (!user.groupId) return null;
    
    const groups = api._getGroups();
    let group = groups.find(g => g.id === user.groupId) || null;
    
    // Check for Daily Hero Refresh on Read
    if (group) {
        const today = getTodayKey();
        if (group.lastHeroSelectionDate !== today) {
            return api._refreshDailyHero(group);
        }
    }
    return group;
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
      
      if (gIndex !== -1) {
          groups[gIndex].dailyHeroId = bestCandidate ? bestCandidate.id : undefined;
          groups[gIndex].lastHeroSelectionDate = today;
          setStorage(KEYS.GROUPS, groups);
      }

      // Reset old hero status, set new
      const updatedUsers = allUsers.map(u => {
          if (u.groupId !== group.id) return u;
          let isHero = false;
          if (bestCandidate && u.id === bestCandidate.id) isHero = true;
          return { ...u, isDailyHero: isHero };
      });
      setStorage(KEYS.USERS, updatedUsers);
      
      if (bestCandidate) {
          api._addToFeed('hero', `👑 ${bestCandidate.name} is today's Daily Hero!`, bestCandidate);
      }

      return groups[gIndex];
  },

  // --- Feed & Social ---

  getFeed: (): FeedEvent[] => {
      const feed = getStorage<FeedEvent[]>(KEYS.FEED, []);
      return feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  _addToFeed: (type: FeedEvent['type'], message: string, user: User) => {
      const feed = getStorage<FeedEvent[]>(KEYS.FEED, []);
      const newEvent: FeedEvent = {
          id: Date.now().toString() + Math.random(),
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
          id: 'c' + Date.now(),
          groupId: user.groupId,
          text,
          timestamp: new Date().toISOString()
      };
      setStorage(KEYS.CONFESSIONS, [newConfession, ...all]);
  },

  getConfessions: (): Confession[] => {
      const user = api.getUser();
      if (!user.groupId) return [];
      const all = getStorage<Confession[]>(KEYS.CONFESSIONS, []);
      return all
          .filter(c => c.groupId === user.groupId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  // --- Resolutions ---

  getMyResolutions: (): Resolution[] => {
      const userId = api.getCurrentUserId();
      const all = api._getResolutions();
      const todayKey = getTodayKey();
      
      // Filter & Process on read
      const myRes = all.filter(r => r.createdUserId === userId && !r.archivedAt).map(res => {
          // Ensure today status matches history
          if (res.history[todayKey] && res.history[todayKey] !== res.todayStatus) {
              return { ...res, todayStatus: res.history[todayKey] };
          }
          return res;
      });
      
      return myRes;
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
      return api._getResolutions()
        .filter(r => r.createdUserId === userId && r.archivedAt)
        .sort((a,b) => b.archivedAt!.localeCompare(a.archivedAt!));
  },

  getPublicResolutionsForGroup: (): { user: User, resolutions: Resolution[] }[] => {
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
  },

  addResolution: (res: any) => {
    const user = api.getUser();
    const newRes: Resolution = {
        ...res,
        id: Date.now().toString(),
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

      let res = all[index];
      const user = api.getUser();
      const todayKey = getTodayKey();
      
      // Update DB
      res.history[todayKey] = status;
      res.todayStatus = status;
      
      // Recalc Streak
      const oldStreak = res.currentStreak;
      res.currentStreak = calculateStreak(res.history, status);
      
      res.isBroken = status === ResolutionStatus.MISSED;
      
      // Comeback Logic (Step 2K)
      if (status === ResolutionStatus.COMPLETED && res.currentStreak === 5) {
          // Check for 3+ misses in 7 days prior to streak start
          // Streak start date approx: today - 4 days
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
              // Trigger Comeback Highlight Candidate
              api._handleComebackEvent(user);
          }
      }
      
      // Feed
      if (!res.isPrivate) {
          if (status === ResolutionStatus.COMPLETED) {
              const points = Math.round(res.effectiveDifficulty);
              api._addToFeed('check-in', `${user.name} checked in on "${res.title}" (+${points} pts)`, user);
              
              if (res.currentStreak > 0 && res.currentStreak % 7 === 0 && res.currentStreak > oldStreak) {
                  api._addToFeed('streak', `${user.name} reached a ${res.currentStreak}-day streak on "${res.title}"!`, user);
              }
          }
      }

      all[index] = res;
      setStorage(KEYS.RESOLUTIONS, all);
      
      // Recalc User Stats
      api._recalculateAllScores(api._getUsers(), all);
      
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
      
      // Only one comeback highlight per week per group
      if (group.lastComebackSelectionDate !== weekStart) {
          group.lastComebackSelectionDate = weekStart;
          group.weeklyComebackHeroId = user.id;
          groups[gIndex] = group;
          setStorage(KEYS.GROUPS, groups);
          
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

      const res = all[index];
      const today = getTodayKey();

      const newBet: Bet = {
          id: 'b' + Date.now(),
          resolutionId,
          userId: user.id,
          createdAt: new Date().toISOString(),
          startDate: today,
          endDate,
          stake,
          status: 'ACTIVE'
      };

      if (!res.bets) res.bets = [];
      res.bets.push(newBet);
      all[index] = res;
      setStorage(KEYS.RESOLUTIONS, all);
      
      if (!res.isPrivate) {
          api._addToFeed('system', `${user.name} placed a bet on "${res.title}" until ${endDate}. Stakes: ${stake}`, user);
      }
  },

  archiveResolution: (id: string, reason: string) => {
      const all = api._getResolutions();
      const index = all.findIndex(r => r.id === id);
      if (index === -1) throw new Error("Resolution not found");
      
      const res = all[index];
      if (getDaysSince(res.createdAt) < 7) throw new Error("Cannot archive during 7-day lock-in.");
      
      res.archivedAt = new Date().toISOString();
      res.archivedReason = reason;
      all[index] = res;
      setStorage(KEYS.RESOLUTIONS, all);
  },

  voteDifficulty: (resolutionId: string, vote: Difficulty) => {
      const currentUser = api.getUser();
      const all = api._getResolutions();
      const index = all.findIndex(r => r.id === resolutionId);
      if (index === -1) throw new Error("Resolution not found");
      
      const res = all[index];
      if (res.createdUserId === currentUser.id) throw new Error("Cannot vote on own resolution");
      if (res.isPrivate) throw new Error("Cannot vote on private resolution");

      if (!res.peerDifficultyVotes) res.peerDifficultyVotes = {};
      res.peerDifficultyVotes[currentUser.id] = vote;

      const votes = Object.values(res.peerDifficultyVotes);
      const sumVotes = votes.reduce((a, b) => a + b, 0);
      const avgVotes = sumVotes / votes.length;
      
      const effective = (res.difficulty + avgVotes) / 2;
      res.effectiveDifficulty = Math.round(effective * 10) / 10; 

      all[index] = res;
      setStorage(KEYS.RESOLUTIONS, all);
      api._recalculateAllScores(api._getUsers(), all);
  },

  voteCredibility: (resolutionId: string, date: string, type: 'BELIEVE' | 'DOUBT') => {
      const currentUser = api.getUser();
      const all = api._getResolutions();
      const index = all.findIndex(r => r.id === resolutionId);
      if (index === -1) throw new Error("Resolution not found");

      const res = all[index];
      if (res.createdUserId === currentUser.id) throw new Error("Cannot vote on own credibility");

      if (!res.credibility) res.credibility = {};
      if (!res.credibility[date]) res.credibility[date] = { believers: [], doubters: [] };

      const dayVotes = res.credibility[date];
      dayVotes.believers = dayVotes.believers.filter(id => id !== currentUser.id);
      dayVotes.doubters = dayVotes.doubters.filter(id => id !== currentUser.id);

      if (type === 'BELIEVE') dayVotes.believers.push(currentUser.id);
      if (type === 'DOUBT') dayVotes.doubters.push(currentUser.id);

      res.credibility[date] = dayVotes;
      all[index] = res;
      setStorage(KEYS.RESOLUTIONS, all);
  },

  // --- Reports & Analytics (Real Calculations) ---

  getScoreBreakdown: (userId: string): { title: string, points: number, days: number, difficulty: number }[] => {
      const allResolutions = api._getResolutions();
      const userResolutions = allResolutions.filter(r => r.createdUserId === userId && !r.isPrivate && !r.archivedAt);
      
      return userResolutions.map(r => {
          const completedDays = Object.values(r.history).filter(status => status === ResolutionStatus.COMPLETED).length;
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
      
      // Sort logic
      groupMembers.sort((a, b) => {
          const scoreA = period === 'MONTHLY' ? a.monthlyScore : a.score;
          const scoreB = period === 'MONTHLY' ? b.monthlyScore : b.score;

          if (scoreB !== scoreA) return scoreB - scoreA;
          return b.streak - a.streak;
      });
      
      // Reassign Ranks (Local display rank, does not persist to DB if monthly view)
      const updatedMembers = groupMembers.map((member, index) => {
          const newRank = index + 1;
          let rankChange: 'up' | 'down' | 'same' = 'same';
          
          // Only compare rank change for All Time view for consistency
          if (period === 'ALL' && member.rank !== 0) {
              if (newRank < member.rank) rankChange = 'up';
              else if (newRank > member.rank) rankChange = 'down';
          }
          
          // Clone to avoid mutation of source if just viewing
          return { ...member, rank: newRank, rankChange };
      });

      // Only persist ALL time ranks
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
          // Check if resolution was active during this period
          const createdAt = new Date(res.createdAt);
          if (createdAt > endDate) return; // Created after period

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

      // Group Stats
      const allUsers = api._getUsers();
      const groupMembers = allUsers.filter(u => u.groupId === user.groupId);
      
      // Calculate Group Consistency
      let groupConsSum = 0;
      let groupActiveCount = 0;

      groupMembers.forEach(mem => {
          const memRes = allResolutions.filter(r => r.createdUserId === mem.id);
          memRes.forEach(r => {
             // Simplified calculation for group aggregation to save cycles
             // Using total history intersection with period
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
          groupHero: sortedGroup[0].name,
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
      // Intentionally left empty as the initialization logic handles this now
  },

  _checkBadges: (userId: string): string[] => {
      const user = api.getUserById(userId);
      if (!user) return [];
      const userBadges = new Set(user.badges || []);
      const allRes = api._getResolutions();
      const myRes = allRes.filter(r => r.createdUserId === userId);

      // 7-Day Streak Badge
      if (myRes.some(r => r.currentStreak >= 7)) {
          if (!userBadges.has('7-Day Streak')) api._awardBadge(userId, '7-Day Streak');
      }

      // 30-Day Streak Badge
      if (myRes.some(r => r.currentStreak >= 30)) {
           if (!userBadges.has('30-Day Streak')) api._awardBadge(userId, '30-Day Streak');
      }

      // Locked In Badge (Completed 7 day lock-in on any resolution)
      if (myRes.some(r => getDaysSince(r.createdAt) >= 7 && !r.archivedAt)) {
          if (!userBadges.has('Locked In')) api._awardBadge(userId, 'Locked In');
      }

      return Array.from(userBadges);
  },

  _awardBadge: (userId: string, badgeName: string) => {
      const allUsers = api._getUsers();
      const idx = allUsers.findIndex(u => u.id === userId);
      if (idx !== -1) {
          if (!allUsers[idx].badges) allUsers[idx].badges = [];
          if (!allUsers[idx].badges.includes(badgeName)) {
              allUsers[idx].badges.push(badgeName);
              setStorage(KEYS.USERS, allUsers);
          }
      }
  },
};
