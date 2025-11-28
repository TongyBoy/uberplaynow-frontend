/**
 * Game Result Handler for nice-work-player.html
 * Displays game results and voucher information
 */

console.log('=== GAME RESULT HANDLER SCRIPT LOADED ===');

(function() {
  'use strict';

  console.log('[Result Handler] Starting initialization...');

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    console.log('[Result Handler] Waiting for DOM...');
    document.addEventListener('DOMContentLoaded', initResultPage);
  } else {
    console.log('[Result Handler] DOM already ready, initializing now...');
    initResultPage();
  }

  function initResultPage() {
    console.log('[Result Handler] Initializing...');
    
    // Get game result from session storage
    const resultData = sessionStorage.getItem('latest_result');
    console.log('[Result Handler] Session data:', resultData);
    
    if (!resultData) {
      console.warn('[Result Handler] No sessionStorage data found');
      
      // Try to fetch from API using current session
      if (window.UberArcade && window.UberArcade.sessionId) {
        console.log('[Result Handler] Attempting to fetch from API...');
        fetchLatestResultFromAPI();
      } else {
        console.warn('[Result Handler] No active session - redirecting to alternative page');
        setTimeout(() => {
          window.location.href = '/alternative-page';
        }, 2000);
      }
      return;
    }

    try {
      const result = JSON.parse(resultData);
      console.log('[Result Handler] Parsed result:', result);
      
      // Check if vouchers are exhausted (player qualified but no voucher available)
      const vouchersExhausted = result.qualifies && result.tier && !result.hasVoucher;
      
      displayGameResult(result, vouchersExhausted);
      
      // Check if voucher was generated
      if (result.hasVoucher && result.voucher) {
        setupVoucherClaim(result.voucher);
      } else if (vouchersExhausted) {
        // Vouchers exhausted for this tier
        updateForExhaustedVoucher(result);
      } else {
        // No voucher - show try again message
        updateForNoVoucher(result);
      }
    } catch (error) {
      console.error('[Result Handler] Error parsing game result:', error);
    }
  }

  /**
   * Fetch latest result from API as fallback
   */
  async function fetchLatestResultFromAPI() {
    try {
      const sessionId = window.UberArcade.sessionId || sessionStorage.getItem('uber_arcade_session_id');
      
      if (!sessionId) {
        console.error('[Result Handler] No session ID available');
        window.location.href = '/games.html';
        return;
      }

      console.log('[Result Handler] Fetching vouchers for session:', sessionId);
      
      // Fetch vouchers for this session
      const response = await fetch(`${window.UberArcade.baseURL}/vouchers/session/${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch session vouchers');
      }

      const data = await response.json();
      console.log('[Result Handler] API data:', data);

      if (data.vouchers && data.vouchers.length > 0) {
        // Get the latest voucher
        const latestVoucher = data.vouchers[0];
        
        // Reconstruct result object
        const result = {
          score: latestVoucher.score,
          gameType: latestVoucher.gameType,
          tier: latestVoucher.tier,
          qualifies: true,
          tierName: getTierName(latestVoucher.tier),
          discount: latestVoucher.discount,
          hasVoucher: true,
          voucher: {
            code: latestVoucher.code,
            discount: latestVoucher.discount,
            tier: latestVoucher.tier,
            expiresAt: latestVoucher.expiresAt,
            tierName: getTierName(latestVoucher.tier)
          },
          timestamp: latestVoucher.issuedAt
        };

        console.log('[Result Handler] Reconstructed result from API:', result);
        
        // Store in sessionStorage for next time
        sessionStorage.setItem('latest_result', JSON.stringify(result));
        
        displayGameResult(result);
        setupVoucherClaim(result.voucher);
      } else {
        console.warn('[Result Handler] No vouchers found for session - redirecting to alternative page');
        window.location.href = '/alternative-page';
      }

    } catch (error) {
      console.error('[Result Handler] Error fetching from API:', error);
      window.location.href = '/alternative-page';
    }
  }

  /**
   * Get tier name from tier number
   */
  function getTierName(tier) {
    const names = { 1: 'Bronze', 2: 'Silver', 3: 'Gold' };
    return names[tier] || 'Bronze';
  }

  /**
   * Display the game result with score and tier
   */
  function displayGameResult(result, vouchersExhausted = false) {
    console.log('[Result Handler] 🎮 Displaying result:', result);
    console.log('[Result Handler] 📊 Score:', result.score);
    console.log('[Result Handler] 🎯 Tier:', result.tier);
    
    if (result.hasVoucher && result.voucher) {
      console.log('[Result Handler] 🎫 VOUCHER CODE:', result.voucher.code);
      console.log('[Result Handler] 💰 Discount:', result.voucher.discount + '%');
      console.log('[Result Handler] 📅 Expires:', result.voucher.expiresAt);
    } else if (vouchersExhausted) {
      console.log('[Result Handler] ⚠️ Vouchers exhausted for this tier');
    } else {
      console.log('[Result Handler] ❌ No voucher - Score not high enough');
    }

    // Update score and discount text
    const winnerText = document.querySelector('.p-white.c-align.winner');
    const exhaustedText = document.querySelector('.p-white.c-align.exhausted-message');
    const claimMessage = document.querySelector('.p-white.c-align:not(.winner):not(.exhausted-message)');
    
    console.log('[Result Handler] Found winner text element:', !!winnerText);
    console.log('[Result Handler] Found exhausted text element:', !!exhaustedText);
    
    if (vouchersExhausted) {
      // Hide winner message, show exhausted message
      if (winnerText) {
        winnerText.style.display = 'none';
      }
      if (exhaustedText) {
        exhaustedText.style.display = 'block';
        exhaustedText.innerHTML = `You scored ${result.score} Points!<br>No promo codes left for this tier, try again for a different tier`;
        console.log('[Result Handler] ✅ Updated exhausted message');
      }
      if (claimMessage) {
        claimMessage.style.display = 'none';
      }
    } else {
      // Show normal winner message
      if (winnerText) {
        winnerText.style.display = 'block';
        let message = '';
        
        if (result.hasVoucher && result.voucher && result.voucher.discount) {
          // Player won a voucher - use actual voucher discount
          const discount = result.voucher.discount;
          const maxDiscount = getMaxDiscountForTier(result.tier);
          message = `You scored ${result.score} points and earned a promo code for ${discount}% off your next Uber ride (up to $${maxDiscount} off)!`;
          console.log('[Result Handler] ✅ Updating with voucher message:', message);
        } else if (result.hasVoucher && result.discount) {
          // Fallback to result discount if voucher object doesn't have it
          const maxDiscount = getMaxDiscountForTier(result.tier);
          message = `You scored ${result.score} points and earned a promo code for ${result.discount}% off your next Uber ride (up to $${maxDiscount} off)!`;
          console.log('[Result Handler] ✅ Updating with fallback message:', message);
        } else {
          // Player didn't qualify
          message = `You scored ${result.score} points. Keep trying to unlock a promo code!`;
          console.log('[Result Handler] ⚠️ Updating with no-voucher message:', message);
        }
        
        winnerText.innerHTML = message + '<br><span class="text-span-4">Expires 11.59pm 30 December 2025.</span>';
        console.log('[Result Handler] ✅ Text updated successfully');
      }
      if (exhaustedText) {
        exhaustedText.style.display = 'none';
      }
    }

    // Update game type if displayed
    const gameTypeElement = document.querySelector('[data-game-type]');
    if (gameTypeElement && result.gameType) {
      gameTypeElement.textContent = formatGameType(result.gameType);
    }
  }

  /**
   * Setup voucher claim functionality
   */
  function setupVoucherClaim(voucher) {
    console.log('🎫 Setting up voucher claim for:', voucher.code);
    
    const claimButton = document.querySelector('[data-w-id="64c9b983-bb94-d380-21ed-5f962ab42894"]');
    const confirmModal = document.querySelector('.confirm-modal');
    const confirmButtonParent = confirmModal?.querySelector('.pixel-button');
    const closeButton = confirmModal?.querySelector('.close');

    // Make sure claim button is visible
    if (claimButton) {
      claimButton.style.display = 'block';
      
      claimButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🖱️ Claim button clicked');
        // Show confirmation modal
        if (confirmModal) {
          confirmModal.style.display = 'flex';
        }
      });
    }

    if (confirmButtonParent) {
      confirmButtonParent.addEventListener('click', async (e) => {
        e.preventDefault();
        
        console.log('✅ Voucher claim confirmed!');
        console.log('🎫 FINAL VOUCHER CODE:', voucher.code);
        console.log('💰 Discount:', voucher.discount + '%');
        
        try {
          // Mark voucher as redeemed in the database
          console.log('📝 Marking voucher as redeemed...');
          const redeemResponse = await fetch(`${window.UberArcade.baseURL}/vouchers/${voucher.code}/redeem`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              redemptionMetadata: {
                redeemedAt: new Date().toISOString(),
                userAgent: navigator.userAgent
              }
            })
          });
          
          if (redeemResponse.ok) {
            console.log('✅ Voucher marked as redeemed');
          } else {
            console.warn('⚠️ Failed to mark voucher as redeemed, but continuing...');
          }
        } catch (error) {
          console.error('❌ Error redeeming voucher:', error);
          // Continue anyway - don't block the user
        }
        
        // End the session
        if (window.UberArcade) {
          await window.UberArcade.endSession();
          console.log('✓ Session ended');
        }
        
        // End the timer
        if (window.SessionTimer) {
          window.SessionTimer.reset();
          console.log('✓ Timer ended');
        }
        
        // Clear session storage
        sessionStorage.clear();
        
        // Open Uber app with deep link
        const uberDeepLink = `uber://?action=applyPromo&client_id=uber&promo=${voucher.code}`;
        console.log('🚗 Opening Uber app:', uberDeepLink);
        
        // Try to open the Uber app
        window.location.href = uberDeepLink;
        
        // After a brief delay, redirect to alternative page
        setTimeout(() => {
          console.log('🔄 Redirecting to alternative page...');
          window.location.href = '/alternative-page';
        }, 1500);
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        console.log('❌ Modal closed');
        if (confirmModal) {
          confirmModal.style.display = 'none';
        }
      });
    }
  }

  /**
   * Update page for players who didn't win a voucher
   */
  function updateForNoVoucher(result) {
    console.log('[Result Handler] ⚠️ No voucher earned - updating UI');
    
    // Hide claim button
    const claimButton = document.querySelector('[data-w-id="64c9b983-bb94-d380-21ed-5f962ab42894"]');
    if (claimButton) {
      claimButton.style.display = 'none';
      console.log('[Result Handler] ✓ Claim button hidden');
    }

    // Update message text
    const messageText = document.querySelector('.p-white.c-align:not(.winner):not(.exhausted-message)');
    if (messageText) {
      messageText.textContent = 'You didn\'t score high enough this time, but you can try again! Keep playing to unlock your reward. The timer is still running!';
      console.log('[Result Handler] ✓ Message updated for try again');
    }

    // Make try again button more prominent
    const tryAgainButton = document.querySelector('a[href="games"]');
    if (tryAgainButton) {
      tryAgainButton.style.transform = 'scale(1.1)';
      tryAgainButton.style.transition = 'transform 0.3s ease';
      console.log('[Result Handler] ✓ Try again button emphasized');
    }
    
    // Note: Timer continues running - NOT ended
    console.log('[Result Handler] ⏱️ Timer continues running - player can try again');
  }

  /**
   * Update page for players who qualified but vouchers are exhausted
   */
  function updateForExhaustedVoucher(result) {
    console.log('[Result Handler] ⚠️ Vouchers exhausted for tier - updating UI');
    
    // Hide claim button
    const claimButton = document.querySelector('[data-w-id="64c9b983-bb94-d380-21ed-5f962ab42894"]');
    if (claimButton) {
      claimButton.style.display = 'none';
      console.log('[Result Handler] ✓ Claim button hidden');
    }

    // Hide the claim message
    const claimMessage = document.querySelector('.p-white.c-align:not(.winner):not(.exhausted-message)');
    if (claimMessage) {
      claimMessage.style.display = 'none';
      console.log('[Result Handler] ✓ Claim message hidden');
    }

    // Make try again button more prominent
    const tryAgainButton = document.querySelector('a[href="games"]');
    if (tryAgainButton) {
      tryAgainButton.style.transform = 'scale(1.1)';
      tryAgainButton.style.transition = 'transform 0.3s ease';
      console.log('[Result Handler] ✓ Try again button emphasized');
    }
    
    // Note: Timer continues running - player can try again for a different tier
    console.log('[Result Handler] ⏱️ Timer continues running - player can try again for different tier');
  }

  /**
   * Format game type for display
   */
  function formatGameType(gameType) {
    const names = {
      'snake': 'Snake',
      'brick_breaker': 'Brick Breaker',
      'meteors': 'Meteors',
      'asteroids': 'Meteors'
    };
    return names[gameType] || gameType;
  }

  /**
   * Get max discount amount for tier
   */
  function getMaxDiscountForTier(tier) {
    const maxDiscounts = {
      1: 5,   // Tier 1: 10% off, up to $5 max
      2: 10,  // Tier 2: 20% off, up to $10 max
      3: 15   // Tier 3: 30% off, up to $15 max
    };
    return maxDiscounts[tier] || 5;
  }

  /**
   * Get discount percentage for tier
   */
  function getDiscountForTier(tier) {
    const discounts = {
      1: 10,  // Tier 1: 10% off
      2: 20,  // Tier 2: 20% off
      3: 30   // Tier 3: 30% off
    };
    return discounts[tier] || 10;
  }

  /**
   * Track page view analytics
   */
  if (window.UberArcade) {
    const result = JSON.parse(sessionStorage.getItem('latest_result') || '{}');
    window.UberArcade.trackEvent('result_page_viewed', {
      hasVoucher: result.hasVoucher,
      score: result.score,
      tier: result.tier
    });
  }

  console.log('[Game Result Handler] Initialized');
})();

