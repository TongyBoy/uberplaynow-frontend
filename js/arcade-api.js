/**
 * Uber Arcade API Bridge
 * This script provides an interface between Unity games and the backend API
 */

class UberArcadeAPI {
  constructor() {
    this.baseURL = this.getApiBaseURL();
    this.sessionId = null;
    this.sessionToken = null;
    this.deviceId = this.getOrCreateDeviceId();
    this.apiKey = this.getApiKey();
  }

  /**
   * Get API base URL from meta tag or environment
   */
  getApiBaseURL() {
    // Check for API URL in meta tag (set by backend/config)
    const metaTag = document.querySelector('meta[name="api-base-url"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }
    
    // Injected at build/runtime from environment variable
    // This placeholder gets replaced by entrypoint.sh or build process
    const injectedURL = '{{API_BASE_URL_PLACEHOLDER}}';
    if (injectedURL && !injectedURL.includes('PLACEHOLDER')) {
      return injectedURL;
    }
    
    // Default fallback for local development
    return window.location.origin + '/api';
  }

  /**
   * Get API key from meta tag or environment
   */
  getApiKey() {
    // Check for API key in meta tag (set by backend/config)
    const metaTag = document.querySelector('meta[name="api-key"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }
    
    // Injected at build/runtime from environment variable
    // This placeholder gets replaced by entrypoint.sh
    return '{{API_KEY_PLACEHOLDER}}';
  }

  /**
   * Get common headers for API requests
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };

    // Add JWT token if available
    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    return headers;
  }

  /**
   * Get or create a unique device ID
   */
  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('uber_arcade_device_id');
    
    if (!deviceId) {
      // Generate a unique device ID
      deviceId = 'device_' + this.generateUUID();
      localStorage.setItem('uber_arcade_device_id', deviceId);
    }
    
    return deviceId;
  }

  /**
   * Generate a simple UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Initialize a new gaming session
   */
  async initSession() {
    try {
      const response = await fetch(`${this.baseURL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          deviceId: this.deviceId,
          userAgent: navigator.userAgent,
          referrer: document.referrer || '',
          metadata: {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            language: navigator.language,
            platform: navigator.platform
          }
        })
      });

      if (!response.ok) {
        // Handle rate limiting / too many sessions
        if (response.status === 429) {
          this.showSessionLimitError();
          throw new Error('Too many active sessions');
        }
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionId = data.sessionId;
      this.sessionToken = data.token;
      
      // Store session ID and token
      sessionStorage.setItem('uber_arcade_session_id', this.sessionId);
      sessionStorage.setItem('uber_arcade_session_token', this.sessionToken);
      
      console.log('✓ Session created:', this.sessionId);
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Show error overlay when session limit reached
   */
  showSessionLimitError() {
    // Don't show overlay on test page
    if (window.location.pathname.includes('test-game-flow.html')) {
      console.warn('⚠️ Test page - session limit error suppressed');
      return;
    }

    // Remove any existing error overlay
    const existing = document.getElementById('session-limit-error');
    if (existing) existing.remove();

    // Create error overlay
    const overlay = document.createElement('div');
    overlay.id = 'session-limit-error';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: fadeIn 0.3s ease-in;
    `;

    overlay.innerHTML = `
      <div style="
        background: #1a1a1a;
        border: 3px solid #ff3333;
        border-radius: 12px;
        padding: 40px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(255, 51, 51, 0.3);
      ">
        <div style="
          font-size: 60px;
          margin-bottom: 20px;
        ">⚠️</div>
        
        <h2 style="
          color: #ff3333;
          font-size: 24px;
          margin: 0 0 20px 0;
          font-weight: bold;
        ">Active Session Detected</h2>
        
        <p style="
          color: #fff;
          font-size: 16px;
          line-height: 1.6;
          margin: 0 0 20px 0;
        ">
          There is already an active Uber Arcade session running from this location or device. 
          Only one session is allowed at a time.
        </p>
        
        <p style="
          color: #ccc;
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
        ">
          Please wait for your current session to end, or use a different device to play.
        </p>
      </div>
    `;

    // Add fade-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);
    
    console.error('🚫 Session limit reached - overlay displayed');
  }

  /**
   * Get existing session or create new one
   */
  async getSession() {
    if (this.sessionId) {
      return this.sessionId;
    }

    // Check if session exists in storage
    const storedSessionId = sessionStorage.getItem('uber_arcade_session_id');
    
    if (storedSessionId) {
      this.sessionId = storedSessionId;
      return this.sessionId;
    }

    // Create new session
    const session = await this.initSession();
    return session.sessionId;
  }

  /**
   * Submit game score to the API
   */
  async submitScore(gameType, score, startTime = null, endTime = null) {
    try {
      const sessionId = await this.getSession();

      // Convert timestamps to ISO strings if provided
      let startedAt = null;
      let completedAt = new Date().toISOString();
      
      if (startTime) {
        startedAt = typeof startTime === 'number' ? new Date(startTime).toISOString() : startTime;
      }
      
      if (endTime) {
        completedAt = typeof endTime === 'number' ? new Date(endTime).toISOString() : endTime;
      }

      const response = await fetch(`${this.baseURL}/games/score`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          sessionId,
          gameType,
          score,
          startedAt,
          completedAt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to submit score: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('✓ Score submitted:', data);
      
      // If qualifies for voucher, automatically generate it
      if (data.qualifies && data.tier > 0) {
        try {
          const voucherResult = await this.generateVoucher(data.gamePlayId);
          data.voucher = voucherResult.voucher;
        } catch (voucherError) {
          // Voucher generation failed (e.g., vouchers exhausted)
          // Still store the result with qualifies=true but hasVoucher=false
          console.warn('⚠️ Voucher generation failed (may be exhausted):', voucherError.message);
          data.voucher = null;
        }
      }

      // Store complete result for nice-work-player page
      const completeResult = {
        score: data.score,
        gameType: gameType,
        tier: data.tier,
        qualifies: data.qualifies,
        tierName: data.tierName,
        discount: data.discount,
        hasVoucher: !!data.voucher,
        voucher: data.voucher || null,
        gamePlayId: data.gamePlayId,
        timestamp: new Date().toISOString()
      };
      
      sessionStorage.setItem('latest_result', JSON.stringify(completeResult));
      console.log('✓ Result saved to sessionStorage:', completeResult);

      return data;
    } catch (error) {
      console.error('Error submitting score:', error);
      throw error;
    }
  }

  /**
   * Generate a voucher for a game play
   */
  async generateVoucher(gamePlayId) {
    try {
      const response = await fetch(`${this.baseURL}/vouchers/generate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ gamePlayId })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate voucher: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✓ Voucher generated:', data.voucher.code);
      
      // Store voucher in local storage
      this.storeVoucher(data.voucher);
      
      return data;
    } catch (error) {
      console.error('Error generating voucher:', error);
      throw error;
    }
  }

  /**
   * Store voucher locally
   */
  storeVoucher(voucher) {
    let vouchers = JSON.parse(localStorage.getItem('uber_arcade_vouchers') || '[]');
    vouchers.push({
      ...voucher,
      storedAt: new Date().toISOString()
    });
    localStorage.setItem('uber_arcade_vouchers', JSON.stringify(vouchers));
  }

  /**
   * Get all stored vouchers
   */
  getStoredVouchers() {
    return JSON.parse(localStorage.getItem('uber_arcade_vouchers') || '[]');
  }

  /**
   * Get voucher details
   */
  async getVoucher(voucherCode) {
    try {
      const response = await fetch(`${this.baseURL}/vouchers/${voucherCode}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get voucher: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching voucher:', error);
      throw error;
    }
  }

  /**
   * Track custom analytics event
   */
  async trackEvent(eventType, eventData = {}) {
    try {
      const sessionId = await this.getSession();

      await fetch(`${this.baseURL}/analytics/event`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          sessionId,
          eventType,
          eventData
        })
      });

      console.log('✓ Event tracked:', eventType);
    } catch (error) {
      console.error('Error tracking event:', error);
      // Don't throw - analytics shouldn't break the game
    }
  }

  /**
   * End the current session
   */
  async endSession() {
    try {
      const sessionId = await this.getSession();

      const response = await fetch(`${this.baseURL}/sessions/${sessionId}/end`, {
        method: 'PUT',
        headers: this.getHeaders()
      });

      // If session not found (already ended or expired), just clean up locally
      if (response.status === 404) {
        console.log('ℹ Session already ended or expired');
        sessionStorage.removeItem('uber_arcade_session_id');
        this.sessionId = null;
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.statusText}`);
      }

      console.log('✓ Session ended');
      sessionStorage.removeItem('uber_arcade_session_id');
      this.sessionId = null;
    } catch (error) {
      console.error('Error ending session:', error);
      // Clean up local session anyway
      sessionStorage.removeItem('uber_arcade_session_id');
      this.sessionId = null;
    }
  }

  /**
   * Get leaderboard for a game
   */
  async getLeaderboard(gameType, limit = 100, offset = 0) {
    try {
      const response = await fetch(
        `${this.baseURL}/games/leaderboard/${gameType}?limit=${limit}&offset=${offset}`,
        { headers: this.getHeaders() }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get leaderboard: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  /**
   * Check voucher availability for a game type
   */
  async checkVoucherAvailability(gameType) {
    try {
      const response = await fetch(`${this.baseURL}/vouchers/availability/${gameType}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check availability: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking voucher availability:', error);
      throw error;
    }
  }
}

// Create global instance
window.UberArcade = new UberArcadeAPI();

// Initialize session when page loads
window.addEventListener('DOMContentLoaded', async () => {
  // Check if on index page
  if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '/index') {
    console.log('✓ Index page detected');
    
    // Check if session already exists
    const existingSessionId = sessionStorage.getItem('uber_arcade_session_id');
    if (existingSessionId) {
      window.UberArcade.sessionId = existingSessionId;
      console.log('✓ Existing session found:', existingSessionId);
      return;
    }
    
    // No session on index page - AccessControl will check verification and redirect if needed
    console.log('ℹ️ No session - user must click "Play Now" to create session');
    
  } else if (window.location.pathname.includes('test-game-flow')) {
    console.log('⚠️ Test page detected - skipping auto session initialization');
  } else {
    // On other pages, just check if session exists
    const sessionId = sessionStorage.getItem('uber_arcade_session_id');
    if (sessionId) {
      window.UberArcade.sessionId = sessionId;
      console.log('✓ Existing session found:', sessionId);
    } else {
      console.warn('⚠️ No session found - user should start from index');
      // AccessControl will handle redirect
    }
  }
});

// End session when user leaves (for browsers that support it)
window.addEventListener('beforeunload', () => {
  // Use sendBeacon for reliable fire-and-forget request
  if (window.UberArcade.sessionId) {
    const url = `${window.UberArcade.baseURL}/sessions/${window.UberArcade.sessionId}/end`;
    navigator.sendBeacon(url, JSON.stringify({}));
  }
});

