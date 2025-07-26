// Results Cache Service - Prevents showing same profiles to users
const { logSuccess, logError } = require('../middleware/logging');

class ResultsCacheService {
  constructor() {
    // Cache structure: { userId: { date: 'YYYY-MM-DD', shownProfiles: Set of profile IDs } }
    this.userCache = new Map();
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  }

  // Get today's date string
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  // Initialize or get user's cache for today
  getUserCache(userId) {
    const today = this.getTodayDate();
    
    if (!this.userCache.has(userId)) {
      this.userCache.set(userId, {
        date: today,
        shownProfiles: new Set()
      });
    }
    
    const cache = this.userCache.get(userId);
    
    // Reset cache if it's a new day
    if (cache.date !== today) {
      cache.date = today;
      cache.shownProfiles = new Set();
    }
    
    return cache;
  }

  // Mark profiles as shown to a user
  markProfilesShown(userId, profileIds) {
    try {
      const cache = this.getUserCache(userId);
      profileIds.forEach(id => cache.shownProfiles.add(id.toString()));
      
      logSuccess('profiles_marked_shown', {
        userId,
        count: profileIds.length,
        totalShownToday: cache.shownProfiles.size
      });
    } catch (error) {
      logError(error, { operation: 'markProfilesShown', userId });
    }
  }

  // Get list of already shown profile IDs for a user
  getShownProfiles(userId) {
    try {
      const cache = this.getUserCache(userId);
      return Array.from(cache.shownProfiles);
    } catch (error) {
      logError(error, { operation: 'getShownProfiles', userId });
      return [];
    }
  }

  // Filter out already shown profiles
  filterNewProfiles(userId, profiles) {
    const shownIds = new Set(this.getShownProfiles(userId));
    return profiles.filter(profile => 
      !shownIds.has(profile._id?.toString())
    );
  }

  // Clear cache for a user
  clearUserCache(userId) {
    this.userCache.delete(userId);
  }

  // Clear all cache (for maintenance)
  clearAllCache() {
    this.userCache.clear();
  }
}

module.exports = new ResultsCacheService();