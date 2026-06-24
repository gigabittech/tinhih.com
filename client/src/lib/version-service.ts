// clear// Simple version service for TiNHiH Portal
export interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  changelog?: string;
  forceUpdate?: boolean;
}

export interface UpdateProgress {
  percentage: number;
  status: 'checking' | 'downloading' | 'installing' | 'complete' | 'error';
  message: string;
}

class VersionService {
  private currentVersion: string;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private onUpdateAvailable: ((versionInfo: VersionInfo) => void) | null = null;
  private onUpdateProgress: ((progress: UpdateProgress) => void) | null = null;

  constructor() {
    // Get version from environment variable or use build timestamp
    this.currentVersion = localStorage.getItem('appVersion') || import.meta.env.VITE_APP_VERSION || 
                         new Date().toISOString().split('T')[0] ||
                         '1.0.0';
  }

  // Set up version checking
  initialize(onUpdateAvailable: (versionInfo: VersionInfo) => void, onUpdateProgress: (progress: UpdateProgress) => void) {
    this.onUpdateAvailable = onUpdateAvailable;
    this.onUpdateProgress = onUpdateProgress;
    
    // Check for updates only when user visits the site
    this.checkForUpdates();
  }

  // Check for updates
  private async checkForUpdates() {
    try {
      // Get the current version from localStorage (source of truth)
      const currentVersion = localStorage.getItem('appVersion') || '0.0.0';
      
      // Call API to get latest version
      const response = await fetch('/api/version/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache', // Prevent caching
      });

      if (!response.ok) {
        throw new Error('Failed to check for updates');
      }

      const versionInfo: VersionInfo = await response.json();
      
      
      // Update the versionInfo to show current version from localStorage
      versionInfo.currentVersion = currentVersion;
      
      // Check if current version already matches latest version
      if (currentVersion === versionInfo.latestVersion) {
        return; // No update needed
      }
      
      // Check if server version > current version
      if (this.isVersionNewer(versionInfo.latestVersion, currentVersion)) {
        console.log(`🔄 Update available: ${currentVersion} → ${versionInfo.latestVersion}`);
        
        // Check if user has skipped this specific version
        const skippedVersion = localStorage.getItem('skipVersionUpdate');
        if (skippedVersion === versionInfo.latestVersion) {
          return;
        }
        
        // Check if user chose "remind later" (within 1 hour)
        const remindLater = localStorage.getItem('remindUpdateLater');
        if (remindLater) {
          const remindTime = parseInt(remindLater);
          const oneHour = 60 * 60 * 1000;
          if (Date.now() - remindTime < oneHour) {
            return;
          }
        }
        
        // Show update dialog
        if (this.onUpdateAvailable) {
          this.onUpdateAvailable(versionInfo);
        }
      } else {
      }
    } catch (error) {
      console.warn('Version check failed:', error);
      // Don't show error to user for background checks
    }
  }

  // Compare version strings (e.g., "1.2.3" > "1.2.2")
  private isVersionNewer(newVersion: string, currentVersion: string): boolean {
    const newParts = newVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }
    
    return false; // Versions are equal
  }

  // Start the update process
  async startUpdate(versionInfo: VersionInfo): Promise<void> {
    if (!this.onUpdateProgress) return;

    try {
      // Step 1: Checking
      this.onUpdateProgress({
        percentage: 0,
        status: 'checking',
        message: 'Checking for updates...'
      });

      await this.delay(800);

      // Step 2: Downloading
      this.onUpdateProgress({
        percentage: 15,
        status: 'downloading',
        message: 'Downloading new version...'
      });

      // Simulate download progress with more frequent updates
      for (let i = 15; i <= 65; i += 5) {
        await this.delay(150);
        this.onUpdateProgress({
          percentage: i,
          status: 'downloading',
          message: `Downloading new version... ${i}%`
        });
      }

      // Step 3: Installing and clearing cache
      this.onUpdateProgress({
        percentage: 70,
        status: 'installing',
        message: 'Installing new version and clearing cache...'
      });

      // Clear only cache-related data, preserve user authentication
      await this.clearCacheOnly();
      
      // Show cache clearing progress
      this.onUpdateProgress({
        percentage: 85,
        status: 'installing',
        message: 'Clearing cache and preparing for reload...'
      });
      
      await this.delay(800);

      // Step 4: Complete
      this.onUpdateProgress({
        percentage: 100,
        status: 'complete',
        message: 'Update complete! Reloading with fresh cache...'
      });

      // IMPORTANT: localStorage is only updated here when user actually completes an update
      // This prevents localStorage from being updated during version checks
      localStorage.setItem('appVersion', versionInfo.latestVersion);

      await this.delay(1000);

      // Force hard reload (like Cmd+Shift+R) with cache busting
      this.forceHardReload();

    } catch (error) {
      this.onUpdateProgress({
        percentage: 0,
        status: 'error',
        message: 'Update failed. Please try again.'
      });
      throw error;
    }
  }

  // Clear only cache-related data, preserve user authentication
  private async clearCacheOnly() {
    try {
      // PRESERVE: Keep authentication and user data
      const token = localStorage.getItem('token');
      const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
      const notificationCenterUserInteracted = localStorage.getItem('notificationCenter_userInteracted');
      const appVersion = localStorage.getItem('appVersion');
      const skipVersionUpdate = localStorage.getItem('skipVersionUpdate');
      const remindUpdateLater = localStorage.getItem('remindUpdateLater');
      
      // Get all welcome-shown keys for users
      const welcomeKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('welcome-shown-')) {
          welcomeKeys.push({ key, value: localStorage.getItem(key) });
        }
      }
      
      // Clear only cache-related data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('welcome-shown-') && 
            key !== 'token' &&
            key !== 'redirectAfterLogin' &&
            key !== 'notificationCenter_userInteracted' &&
            key !== 'appVersion' &&
            key !== 'skipVersionUpdate' &&
            key !== 'remindUpdateLater') {
          keysToRemove.push(key);
        }
      }
      
      // Remove cache keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage (usually contains temporary data)
      sessionStorage.clear();

      // Clear IndexedDB if available (but preserve user data)
      if ('indexedDB' in window) {
        try {
          const databases = await window.indexedDB.databases();
          databases.forEach(db => {
            if (db.name && !db.name.includes('user') && !db.name.includes('auth')) {
              window.indexedDB.deleteDatabase(db.name);
            }
          });
        } catch (error) {
          console.warn('IndexedDB cleanup failed:', error);
        }
      }

      // Clear service worker cache if available
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        } catch (error) {
          console.warn('Service worker cache cleanup failed:', error);
        }
      }

      // RESTORE: Put back authentication and user data
      if (token) localStorage.setItem('token', token);
      if (redirectAfterLogin) localStorage.setItem('redirectAfterLogin', redirectAfterLogin);
      if (notificationCenterUserInteracted) localStorage.setItem('notificationCenter_userInteracted', notificationCenterUserInteracted);
      if (appVersion) localStorage.setItem('appVersion', appVersion);
      if (skipVersionUpdate) localStorage.setItem('skipVersionUpdate', skipVersionUpdate);
      if (remindUpdateLater) localStorage.setItem('remindUpdateLater', remindUpdateLater);
      
      // Restore welcome-shown keys
      welcomeKeys.forEach(({ key, value }) => {
        if (value) localStorage.setItem(key, value);
      });
     
    } catch (error) {
      console.warn('Failed to clear some cache:', error);
    }
  }

  // Force hard reload with cache busting (like Cmd+Shift+R)
  private forceHardReload() {
    try {
      // Method 1: Use location.reload with cache busting
      window.location.reload();
    } catch (error) {
      try {
        // Method 2: Navigate to same page with timestamp
        const timestamp = Date.now();
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('_v', timestamp.toString());
        window.location.href = currentUrl.toString();
      } catch (fallbackError) {
        // Method 3: Simple reload as last resort
        window.location.reload();
      }
    }
  }

  // Clean up
  destroy() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  // Get current version
  getCurrentVersion(): string {
    // Return the actual current version from localStorage, not the .env version
    return localStorage.getItem('appVersion') || this.currentVersion;
  }

  // Check if update is needed (for debugging/testing)
  async checkIfUpdateNeeded(): Promise<{ needsUpdate: boolean; currentVersion: string; latestVersion: string; reason: string }> {
    try {
      const userVersion = localStorage.getItem('appVersion') || '0.0.0';
      
      const response = await fetch('/api/version/check', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error('Failed to check version');
      }

      const versionInfo: VersionInfo = await response.json();
      
      // Check if client already has the latest version
      if (this.currentVersion === versionInfo.latestVersion) {
        return {
          needsUpdate: false,
          currentVersion: this.currentVersion,
          latestVersion: versionInfo.latestVersion,
          reason: 'Client already has latest version'
        };
      }
      
      // Check if update is available
      if (this.isVersionNewer(versionInfo.latestVersion, this.currentVersion)) {
        return {
          needsUpdate: true,
          currentVersion: this.currentVersion,
          latestVersion: versionInfo.latestVersion,
          reason: 'Newer version available'
        };
      }
      
      return {
        needsUpdate: false,
        currentVersion: this.currentVersion,
        latestVersion: versionInfo.latestVersion,
        reason: 'Versions are equal'
      };
      
    } catch (error) {
      return {
        needsUpdate: false,
        currentVersion: this.currentVersion,
        latestVersion: 'unknown',
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test authentication preservation (for debugging)
  testAuthPreservation(): void {
    
    const importantKeys = [
      'token',
      'redirectAfterLogin', 
      'notificationCenter_userInteracted',
      'appVersion',
      'skipVersionUpdate',
      'remindUpdateLater'
    ];
    
    const welcomeKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('welcome-shown-')) {
        welcomeKeys.push(key);
      }
    }
    
  }

  // Utility function for delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
export const versionService = new VersionService(); 