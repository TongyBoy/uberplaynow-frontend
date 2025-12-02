/**
 * Uber Arcade Access Control
 * Ensures users can only access via Uber app on mobile devices
 */

class AccessControl {
  constructor() {
    this.REQUIRED_REF_ID = 'uberClick';
    this.ALTERNATIVE_PAGE = '/alternative-page';
    this.allowedPages = ['/', '/index.html', '/index', '/play', '/play/', '/play/index.html'];
    
    console.log('🔒 [Access Control] PRODUCTION MODE');
    console.log('   - refID required for first access');
    console.log('   - All security checks enforced');
    console.log('   - Use: http://localhost:8081/?refID=uberClick');
  }

  /**
   * Check if on mobile device (required for production)
   */
  isMobileDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
      'android', 'webos', 'iphone', 'ipad', 'ipod', 
      'blackberry', 'windows phone', 'mobile'
    ];
    
    return mobileKeywords.some(keyword => userAgent.includes(keyword));
  }

  /**
   * Check if access is from desktop
   */
  isDesktop() {
    return !this.isMobileDevice();
  }

  /**
   * Check if referrer is valid (from Uber or direct with refID)
   */
  isValidReferrer() {
    const referrer = document.referrer.toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const refID = urlParams.get('refID');

    // If has correct refID parameter, allow
    if (refID === this.REQUIRED_REF_ID) {
      console.log('✅ Valid refID parameter found');
      
      // Store in sessionStorage that this session came from Uber
      sessionStorage.setItem('uber_arcade_verified', 'true');
      sessionStorage.setItem('uber_arcade_entry_time', Date.now().toString());
      
      // 🔒 SECURITY: Remove refID from URL to prevent sharing
      this.cleanUrlParameters();
      
      return true;
    }

    // Check if already verified in this session
    if (sessionStorage.getItem('uber_arcade_verified') === 'true') {
      console.log('✅ Already verified in this session');
      return true;
    }

    // Check if referrer is from Uber domains
    const uberDomains = ['uber.com', 'uber.app', 'm.uber.com'];
    const isFromUber = uberDomains.some(domain => referrer.includes(domain));
    
    if (isFromUber) {
      console.log('✅ Valid Uber referrer found');
      sessionStorage.setItem('uber_arcade_verified', 'true');
      return true;
    }

    console.warn('⚠️ Invalid access - no valid refID or Uber referrer');
    return false;
  }

  /**
   * Check if user has an active session
   */
  hasActiveSession() {
    const sessionId = sessionStorage.getItem('uber_arcade_session_id');
    const verified = sessionStorage.getItem('uber_arcade_verified');
    
    return sessionId !== null && verified === 'true';
  }

  /**
   * Check if current page is the index/landing page
   */
  isIndexPage() {
    const path = window.location.pathname;
    return this.allowedPages.includes(path) || 
           path === '' || 
           path.endsWith('/');
  }

  /**
   * Check if current page is alternative page
   */
  isAlternativePage() {
    return window.location.pathname.includes('alternative-page');
  }

  /**
   * Check if current page is test page
   */
  isTestPage() {
    return window.location.pathname.includes('test-game-flow');
  }

  /**
   * Redirect to alternative page
   */
  redirectToAlternative(reason) {
    console.warn(`🚫 Access denied: ${reason}`);
    console.log('Redirecting to alternative page...');
    
    // Track the denial
    if (window.gtag) {
      gtag('event', 'access_denied', {
        reason: reason,
        page: window.location.pathname,
        user_agent: navigator.userAgent
      });
    }
    
    window.location.href = this.ALTERNATIVE_PAGE;
  }

  /**
   * Main access control check
   */
  checkAccess() {
    // Skip checks for test pages and alternative page
    if (this.isTestPage() || this.isAlternativePage()) {
      console.log('🧪 Test/Alternative page - skipping access control');
      return true;
    }

    // Allow manual testing bypass with ?allowDesktop=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('allowDesktop') === 'true') {
      console.log('🧪 [TEST MODE] Desktop access allowed via allowDesktop parameter');
    } else {
      // RULE 1: Desktop users always go to alternative page
      if (this.isDesktop()) {
        this.redirectToAlternative('Desktop access not allowed - Use Chrome mobile emulator (Ctrl+Shift+M) with ?refID=uberClick');
        return false;
      }
    }

    // RULE 2: Index page - check for valid entry OR existing session
    if (this.isIndexPage()) {
      // Allow if has valid refID (just landed from Uber)
      const urlParams = new URLSearchParams(window.location.search);
      const refID = urlParams.get('refID');
      
      if (refID === this.REQUIRED_REF_ID) {
        console.log('✅ Index page access granted - valid refID');
        // Set verified flag so other pages know this is a valid session
        sessionStorage.setItem('uber_arcade_verified', 'true');
        sessionStorage.setItem('uber_arcade_entry_time', Date.now().toString());
        
        // 🔒 SECURITY: Remove refID from URL to prevent sharing
        this.cleanUrlParameters();
        
        // 🎮 Initialize backend session automatically
        this.initializeBackendSession();
        
        return true;
      }
      
      // Allow if already has active session (returning user)
      if (this.hasActiveSession()) {
        console.log('✅ Index page access granted - has active session');
        return true;
      }
      
      // No refID and no session = redirect
      this.redirectToAlternative('Must come from Uber app or have active session');
      return false;
    }

    // RULE 3: All other pages - must have active session
    if (!this.hasActiveSession()) {
      this.redirectToAlternative('No active session - must start from index');
      return false;
    }

    console.log('✅ Page access granted');
    return true;
  }

  /**
   * Initialize access control
   */
  init() {
    console.log('[Access Control] Initializing...');
    
    // Run check immediately
    const hasAccess = this.checkAccess();
    
    if (hasAccess) {
      console.log('[Access Control] ✅ Access granted');
      
      // Track successful access
      if (window.gtag && this.isIndexPage()) {
        gtag('event', 'page_access_granted', {
          page: window.location.pathname,
          ref_id: new URLSearchParams(window.location.search).get('refID'),
          is_mobile: this.isMobileDevice()
        });
      }
    }
    
    return hasAccess;
  }

  /**
   * Clean URL parameters (remove refID from address bar)
   * This prevents users from seeing and sharing the refID
   */
  cleanUrlParameters() {
    try {
      // Get current URL without query parameters
      const cleanUrl = window.location.protocol + '//' + 
                       window.location.host + 
                       window.location.pathname;
      
      // Replace current URL without reloading the page
      window.history.replaceState({}, document.title, cleanUrl);
      
      console.log('🔒 URL cleaned - refID removed from address bar');
    } catch (error) {
      console.warn('Could not clean URL parameters:', error);
    }
  }

  /**
   * Initialize backend session automatically when valid refID is detected
   * This ensures the session exists before user navigates to games
   */
  async initializeBackendSession() {
    try {
      // Check if session already exists
      const existingSessionId = sessionStorage.getItem('uber_arcade_session_id');
      if (existingSessionId) {
        console.log('✓ Backend session already exists:', existingSessionId);
        return;
      }

      console.log('🎮 Initializing backend session...');

      // Wait for UberArcade API to be ready
      if (typeof window.UberArcade === 'undefined') {
        console.log('⏳ Waiting for UberArcade API...');
        await this.waitForAPI();
      }

      // Initialize session via API
      if (window.UberArcade && typeof window.UberArcade.initSession === 'function') {
        await window.UberArcade.initSession();
        console.log('✅ Backend session created successfully');
      } else {
        console.warn('⚠️ UberArcade API not available - session will be created on first game play');
      }
    } catch (error) {
      console.warn('Could not initialize backend session:', error);
      // Don't fail - session will be created when user plays a game
    }
  }

  /**
   * Wait for UberArcade API to be available
   */
  waitForAPI() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (typeof window.UberArcade !== 'undefined') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }

  /**
   * Get device fingerprint (basic version)
   */
  getDeviceFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.maxTouchPoints || 0
    ];
    
    // Simple hash function
    const hash = components.join('|');
    let h = 0;
    for (let i = 0; i < hash.length; i++) {
      h = ((h << 5) - h) + hash.charCodeAt(i);
      h = h & h; // Convert to 32bit integer
    }
    
    return 'fp_' + Math.abs(h).toString(36);
  }
}

// Create global instance
window.AccessControl = new AccessControl();

// Auto-initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  window.AccessControl.init();
});

console.log('[Access Control] Module loaded');

