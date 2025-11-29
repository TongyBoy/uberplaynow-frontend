/**
 * Unity WebGL Integration for Uber Arcade
 * This file provides functions that Unity games can call to communicate with the backend
 */

// Global variables to track game state
let gameStartTime = null;
let currentGameType = null;
let unityInstance = null;

/**
 * Called by Unity when the game starts
 * @param {string} gameType - 'snake', 'brick_breaker', or 'meteors'
 */
function OnGameStart(gameType) {
  console.log(`[Unity Bridge] Game started: ${gameType}`);
  gameStartTime = Date.now();
  currentGameType = gameType;
  
  // Track analytics
  if (window.UberArcade) {
    window.UberArcade.trackEvent('game_started', { 
      gameType,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Called by Unity when the game ends
 * @param {string} gameType - 'snake', 'brick_breaker', or 'meteors'
 * @param {number} score - Final score
 */
async function OnGameComplete(gameType, score) {
  console.log(`[Unity Bridge] Game completed: ${gameType}, Score: ${score}`);
  
  const endTime = Date.now();
  
  try {
    if (!window.UberArcade) {
      throw new Error('UberArcade API not initialized');
    }

    // Submit score to backend
    const result = await window.UberArcade.submitScore(
      gameType,
      score,
      gameStartTime,
      endTime
    );

    console.log('[Unity Bridge] Score submission result:', result);

    // If voucher was generated, show it to the user
    if (result.voucher) {
      ShowVoucherToPlayer(result.voucher);
    } else {
      ShowResultToPlayer(result);
    }

    // Send result back to Unity
    if (unityInstance) {
      unityInstance.SendMessage(
        'GameManager', 
        'OnScoreSubmitted', 
        JSON.stringify(result)
      );
    }

    return result;
  } catch (error) {
    console.error('[Unity Bridge] Error submitting score:', error);
    
    // Check if session expired
    if (error.message.includes('Session has expired') || error.message.includes('Session is no longer active')) {
      console.error('⏰ [Unity Bridge] Session expired (15 min) - redirecting to alternative page');
      
      // Clear session storage
      sessionStorage.removeItem('uber_arcade_session_id');
      sessionStorage.removeItem('uber_arcade_session_token');
      sessionStorage.removeItem('uber_arcade_verified');
      sessionStorage.removeItem('uber_arcade_timer_start');
      sessionStorage.removeItem('uber_arcade_timer_expired');
      
      // Show user-friendly message before redirect
      alert('Your 15-minute session has ended.\n\nYou had 10 minutes to play and 5 extra minutes to claim your voucher.\n\nPlease scan the QR code again to start a new session.');
      
      // Redirect to alternative page (session ended)
      setTimeout(() => {
        window.location.href = '/alternative-page';
      }, 500);
      
      return;
    }
    
    // Check if no vouchers available
    if (error.message.includes('No vouchers available') || error.message.includes('Failed to generate voucher')) {
      console.error('🎫 [Unity Bridge] No vouchers available');
      
      // Show user-friendly message
      alert('Sorry! All promotional vouchers have been claimed.\n\nThis campaign has ended.\n\nThank you for playing!');
      
      // Redirect to alternative page
      setTimeout(() => {
        window.location.href = '/alternative-page.html';
      }, 500);
      
      return;
    }
    
    // Notify Unity of error
    if (unityInstance) {
      unityInstance.SendMessage(
        'GameManager',
        'OnScoreSubmissionError',
        error.message
      );
    }
    
    // Show generic error for other issues
    alert('Error submitting your score.\n\nPlease try again or start a new game.');
    
    throw error;
  }
}

/**
 * Show voucher to player (customize this based on your UI)
 */
function ShowVoucherToPlayer(voucherResult) {
  console.log('[Unity Bridge] Voucher generated:', voucherResult);
  
  // Extract voucher data from result
  const voucher = voucherResult.voucher || voucherResult;
  
  const voucherData = {
    code: voucher.code,
    discount: voucher.discount_percent || voucher.discount,
    expiresAt: voucher.expires_at || voucher.expiresAt,
    tierName: voucher.tier_name || voucher.tierName,
    tier: voucher.tier
  };
  
  // Store in sessionStorage for immediate access
  sessionStorage.setItem('latest_voucher', JSON.stringify(voucherData));
  
  // Also store the complete game result with voucher
  const gameResult = {
    score: voucherResult.score,
    gameType: voucherResult.gameType || currentGameType,
    tier: voucherResult.tier || voucher.tier,
    qualifies: true,
    tierName: voucherData.tierName,
    discount: voucherData.discount,
    hasVoucher: true,
    voucher: voucherData,
    timestamp: new Date().toISOString()
  };
  
  sessionStorage.setItem('latest_result', JSON.stringify(gameResult));
  
  // Dispatch custom event that the page can listen to
  window.dispatchEvent(new CustomEvent('voucherGenerated', { 
    detail: voucherData 
  }));
  
  // Redirect to nice-work-player page after a brief delay
  setTimeout(() => {
    window.location.href = '/nice-work-player';
  }, 1000);
}

/**
 * Show game result to player
 */
function ShowResultToPlayer(result) {
  console.log('[Unity Bridge] Game result:', result);
  
  // Store complete game result with score and tier info
  const gameResult = {
    score: result.score,
    gameType: result.gameType || currentGameType,
    tier: result.tier,
    qualifies: result.qualifies,
    tierName: result.tierName,
    discount: result.discount,
    hasVoucher: !!result.voucher,
    timestamp: new Date().toISOString()
  };
  
  sessionStorage.setItem('latest_result', JSON.stringify(gameResult));
  
  window.dispatchEvent(new CustomEvent('gameCompleted', { 
    detail: gameResult 
  }));
  
  // Redirect to nice-work-player page after a brief delay
  setTimeout(() => {
    window.location.href = '/nice-work-player';
  }, 1000);
}

/**
 * Called by Unity to track custom events
 */
function TrackGameEvent(eventName, eventData) {
  console.log(`[Unity Bridge] Tracking event: ${eventName}`, eventData);
  
  if (window.UberArcade) {
    window.UberArcade.trackEvent(eventName, {
      gameType: currentGameType,
      ...( eventData || {})
    });
  }
}

/**
 * Get current session info for Unity
 */
function GetSessionInfo() {
  if (!window.UberArcade) {
    return null;
  }
  
  return {
    sessionId: window.UberArcade.sessionId,
    deviceId: window.UberArcade.deviceId
  };
}

/**
 * Initialize Unity instance reference
 */
function SetUnityInstance(instance) {
  console.log('[Unity Bridge] Unity instance registered');
  unityInstance = instance;
}

/**
 * Get stored vouchers
 */
function GetStoredVouchers() {
  if (window.UberArcade) {
    return window.UberArcade.getStoredVouchers();
  }
  return [];
}

/**
 * Called when Unity game is paused
 */
function OnGamePause() {
  console.log('[Unity Bridge] Game paused');
  TrackGameEvent('game_paused', { timestamp: new Date().toISOString() });
}

/**
 * Called when Unity game is resumed
 */
function OnGameResume() {
  console.log('[Unity Bridge] Game resumed');
  TrackGameEvent('game_resumed', { timestamp: new Date().toISOString() });
}

// Export functions globally for Unity to access
window.OnGameStart = OnGameStart;
window.OnGameComplete = OnGameComplete;
window.TrackGameEvent = TrackGameEvent;
window.GetSessionInfo = GetSessionInfo;
window.SetUnityInstance = SetUnityInstance;
window.GetStoredVouchers = GetStoredVouchers;
window.OnGamePause = OnGamePause;
window.OnGameResume = OnGameResume;

console.log('[Unity Bridge] Integration loaded and ready');

