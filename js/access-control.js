/**
 * Uber Arcade Access Control
 * Ensures users can only access via Uber app on mobile devices
 */

class AccessControl {
  constructor() {
    this.REQUIRED_REF_ID = 'uberClick';
    this.ALTERNATIVE_PAGE = '/alternative-pagedock';
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

