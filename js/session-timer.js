/**
 * Session Timer for Uber Arcade
 * Manages a 10-minute countdown timer that persists across pages
 */

class SessionTimer {
  constructor() {
    this.duration = 10 * 60 * 1000; // 10 minutes in milliseconds
    this.bufferTime = 1 * 60 * 1000; // 1 minute buffer (changed from 5)
    this.totalDuration = this.duration + this.bufferTime; // 11 minutes total
    this.startTime = null;
    this.timerElement = null;
    this.intervalId = null;
    this.onExpireCallback = null;
    this.isVisible = true;
    this.hardExpired = false;
    
    this.init();
    this.setupVisibilityHandlers();
  }

  /**
   * Setup handlers for page visibility and orientation changes
   * Fixes issue where timer stops on mobile rotation
   */
  setupVisibilityHandlers() {
    // Handle page visibility changes (tab switching, app backgrounding)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isVisible = false;
        console.log('[Timer] Page hidden - timer will continue in background');
      } else {
        this.isVisible = true;
        console.log('[Timer] Page visible - syncing timer');
        // Immediately update display when returning to page
        if (this.startTime) {
          this.updateDisplay();
        }
      }
    });

    // Handle orientation changes (mobile rotation)
    window.addEventListener('orientationchange', () => {
      console.log('[Timer] Orientation changed - restarting timer interval');
      if (this.startTime) {
        // Restart the interval to ensure it keeps running
        this.startCountdown();
      }
    });

    // Handle window resize (catches some orientation changes that orientationchange misses)
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (this.startTime) {
          console.log('[Timer] Window resized - syncing timer');
          this.updateDisplay();
        }
      }, 100);
    });

    // Handle page focus (additional safety net)
    window.addEventListener('focus', () => {
      if (this.startTime) {
        console.log('[Timer] Window focused - syncing timer');
        this.updateDisplay();
        // Restart interval if it somehow stopped
        if (!this.intervalId) {
          this.startCountdown();
        }
      }
    });
  }

  init() {
    // Check if hard expired - if so, immediately redirect
    const hardExpired = sessionStorage.getItem('uber_arcade_hard_expired');
    if (hardExpired === 'true') {
      console.log('🚨 Session hard expired - redirecting to timeout');
      window.location.replace('/timeout');
      return;
    }

    // Check if timer was already started
    const storedStartTime = sessionStorage.getItem('uber_arcade_timer_start');
    
    if (storedStartTime) {
      this.startTime = parseInt(storedStartTime);
      
      // Check for hard expiration (11 minutes total)
      const elapsed = Date.now() - this.startTime;
      
      if (elapsed >= this.totalDuration) {
        console.log('🚨 HARD EXPIRATION detected on init - redirecting');
        sessionStorage.setItem('uber_arcade_hard_expired', 'true');
        window.location.replace('/timeout');
        return;
      }
      
      // Check if 10 minutes expired but still in buffer time
      const remaining = Math.max(0, this.duration - elapsed);
      
      if (remaining === 0 && elapsed < this.totalDuration) {
        console.log('⚠️ Timer expired, in buffer period');
        sessionStorage.setItem('uber_arcade_timer_expired', 'true');
        this.createTimerElement();
        this.startCountdown();
        this.startHardExpirationCheck();
      } else if (remaining > 0) {
        this.createTimerElement();
        this.startCountdown();
      }
    }
  }

  /**
   * Start the timer (called when first game is clicked)
   */
  start() {
    if (this.startTime) {
      console.log('Timer already running');
      return;
    }

    this.startTime = Date.now();
    sessionStorage.setItem('uber_arcade_timer_start', this.startTime.toString());
    
    this.createTimerElement();
    this.startCountdown();

    console.log('✓ Session timer started - 10 minutes');
  }

  /**
   * Check if timer should be hidden on current page
   */
  shouldHideTimer() {
    const path = window.location.pathname;
    const hideOnPages = ['/games', '/games.html', '/about', '/about.html', '/terms-and-conditions', '/terms-and-conditions.html'];
    return hideOnPages.some(page => path.endsWith(page));
  }

  /**
   * Create the timer UI element
   */
  createTimerElement() {
    // Check if timer already exists
    if (document.getElementById('session-timer')) {
      this.timerElement = document.getElementById('session-timer');
      // Update visibility based on page
      if (this.shouldHideTimer()) {
        this.timerElement.style.display = 'none';
      }
      return;
    }

    // Wait for body to be available
    if (!document.body) {
      console.warn('[Timer] Body not ready, waiting...');
      setTimeout(() => this.createTimerElement(), 50);
      return;
    }

    // Create timer container - narrow black bar at top (in document flow)
    const timerContainer = document.createElement('div');
    timerContainer.id = 'session-timer';
    
    // Hide timer on specific pages
    const displayStyle = this.shouldHideTimer() ? 'none' : 'flex';
    
    timerContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 40px;
      z-index: 9999;
      background: #000000;
      color: #ffffff;
      font-family: Ubermove, Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      padding: 0 15px;
      padding-top: max(env(safe-area-inset-top), 8px);
      text-align: right;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      margin: 0;
      display: ${displayStyle};
      align-items: center;
      justify-content: flex-end;
      line-height: 1;
    `;

    timerContainer.innerHTML = `
      <span style="color: #ffffff; margin-right: 8px;">COUNTDOWN</span><span id="timer-display" style="color: #ffffff;">10:00</span>
    `;

    // Insert at the very beginning of body (not appending to end)
    document.body.insertBefore(timerContainer, document.body.firstChild);
    this.timerElement = timerContainer;
  }

  /**
   * Start the countdown interval
   */
  startCountdown() {
    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Update immediately
    this.updateDisplay();

    // Update every second
    // Note: Using Date.now() for calculations ensures accuracy even if interval delays
    this.intervalId = setInterval(() => {
      this.updateDisplay();
      
      // Extra check: If timer should have expired but interval is still running, force expiration
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.duration && !sessionStorage.getItem('uber_arcade_timer_expired')) {
        console.warn('[Timer] Detected timer should have expired - forcing expiration');
        this.handleExpiration();
      }
    }, 1000);
    
    console.log('[Timer] Countdown interval started/restarted');
  }

  /**
   * Update the timer display
   */
  updateDisplay() {
    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.duration - elapsed);

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    const displayText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const displayElement = document.getElementById('timer-display');
    if (displayElement) {
      displayElement.textContent = displayText;

      // Change color as time runs out
      if (remaining <= 60000) { // Last minute - red
        this.timerElement.style.color = '#ff0000';
        this.timerElement.style.background = '#1a0000';
        
        // Pulse animation in last 10 seconds
        if (remaining <= 10000) {
          this.timerElement.style.animation = 'pulse 0.5s infinite';
        }
      } else if (remaining <= 180000) { // Last 3 minutes - yellow
        this.timerElement.style.color = '#ffff00';
        this.timerElement.style.background = '#1a1a00';
      }
    }

    // Timer expired
    if (remaining === 0) {
      this.onTimerExpire();
    }
  }

  /**
   * Handle timer expiration
   */
  onTimerExpire() {
    clearInterval(this.intervalId);
    
    console.log('⏰ 10-minute gameplay timer expired');

    // Mark timer as expired
    sessionStorage.setItem('uber_arcade_timer_expired', 'true');

    // Show expiration message
    if (this.timerElement) {
      const displayElement = document.getElementById('timer-display');
      if (displayElement) {
        displayElement.textContent = 'TIME\'S UP!';
      }
      this.timerElement.style.color = '#ff0000';
      this.timerElement.style.background = '#1a0000';
    }

    // Call custom callback if set
    if (this.onExpireCallback) {
      this.onExpireCallback();
    }

    // Player has 1 more minute (buffer) to finish current game and claim voucher
    console.log('⚠️ Player has 1 more minute to finish game and claim voucher');
    
    // Start checking for hard expiration (11 minutes total)
    this.startHardExpirationCheck();
  }

  /**
   * Check for hard expiration after buffer time
   */
  startHardExpirationCheck() {
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      
      // After 11 minutes total (10 + 1 buffer), hard redirect
      if (elapsed >= this.totalDuration) {
        clearInterval(checkInterval);
        this.hardExpired = true;
        
        console.log('🚨 HARD EXPIRATION - 11 minutes reached. Redirecting to timeout page...');
        
        // Mark as hard expired
        sessionStorage.setItem('uber_arcade_hard_expired', 'true');
        
        // End the session
        if (window.UberArcade) {
          window.UberArcade.endSession();
        }
        
        // Redirect to timeout page
        window.location.replace('/timeout');
      }
    }, 1000); // Check every second
  }

  /**
   * Get remaining time in milliseconds
   */
  getRemainingTime() {
    if (!this.startTime) return this.duration;
    
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.duration - elapsed);
  }

  /**
   * Check if timer has expired
   */
  isExpired() {
    return this.getRemainingTime() === 0 || 
           sessionStorage.getItem('uber_arcade_timer_expired') === 'true';
  }

  /**
   * Check if timer is running
   */
  isRunning() {
    return this.startTime !== null;
  }

  /**
   * Set callback for when timer expires
   */
  onExpire(callback) {
    this.onExpireCallback = callback;
  }

  /**
   * Reset the timer (for testing or new sessions)
   */
  reset() {
    clearInterval(this.intervalId);
    sessionStorage.removeItem('uber_arcade_timer_start');
    sessionStorage.removeItem('uber_arcade_timer_expired');
    
    if (this.timerElement) {
      this.timerElement.remove();
    }

    this.startTime = null;
    this.timerElement = null;
    this.intervalId = null;

    console.log('Timer reset');
  }
}

// Add pulse animation CSS for timer bar
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
`;
document.head.appendChild(style);

// Create global instance
window.SessionTimer = new SessionTimer();

console.log('[Session Timer] Loaded');

