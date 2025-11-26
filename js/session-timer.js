/**
 * Session Timer for Uber Arcade
 * Manages a 10-minute countdown timer that persists across pages
 */

class SessionTimer {
  constructor() {
    this.duration = 10 * 60 * 1000; // 10 minutes in milliseconds
    this.startTime = null;
    this.timerElement = null;
    this.intervalId = null;
    this.onExpireCallback = null;
    
    this.init();
  }

  init() {
    // Check if timer was already started
    const storedStartTime = sessionStorage.getItem('uber_arcade_timer_start');
    
    if (storedStartTime) {
      this.startTime = parseInt(storedStartTime);
      
      // Check if timer is already expired - if so, clear it instead of auto-redirecting
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.duration - elapsed);
      
      if (remaining === 0) {
        console.log('⚠️ Timer was expired, clearing old timer');
        sessionStorage.removeItem('uber_arcade_timer_start');
        sessionStorage.removeItem('uber_arcade_timer_expired');
        this.startTime = null;
        return;
      }
      
      this.createTimerElement();
      this.startCountdown();
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
   * Create the timer UI element
   */
  createTimerElement() {
    // Check if timer already exists
    if (document.getElementById('session-timer')) {
      this.timerElement = document.getElementById('session-timer');
      return;
    }

    // Create timer container - narrow black bar at top (in document flow)
    const timerContainer = document.createElement('div');
    timerContainer.id = 'session-timer';
    timerContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      width: 96%;
      height: 15px;
      z-index: 9999;
      background: #000000;
      color: #ffffff;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      font-weight: bold;
      padding: 0 15px 0 10px;
      text-align: right;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      line-height: 15px;
    `;

    timerContainer.innerHTML = `
      <span style="color: #ffffff; margin-right: 3px;">COUNTDOWN</span><span id="timer-display" style="color: #ffffff;">10:00</span>
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
    this.intervalId = setInterval(() => {
      this.updateDisplay();
    }, 1000);
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
    
    console.log('⏰ Session timer expired');

    // Mark session as expired
    sessionStorage.setItem('uber_arcade_timer_expired', 'true');

    // Show expiration message
    if (this.timerElement) {
      const displayElement = document.getElementById('timer-display');
      if (displayElement) {
        displayElement.textContent = 'TIME\'S UP!';
      }
    }

    // Call custom callback if set
    if (this.onExpireCallback) {
      this.onExpireCallback();
    }

    // Redirect to try-again page after 2 seconds (but not on test page)
    setTimeout(() => {
      // Don't redirect on test pages
      if (window.location.pathname.includes('test-game-flow')) {
        console.log('⚠️ Test page detected - skipping redirect to try-again');
        return;
      }
      window.location.href = '/try-again';
    }, 2000);
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

