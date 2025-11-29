/**
 * Voucher Availability Checker
 * Checks which promo code tiers are available and marks exhausted ones
 */

class VoucherAvailabilityChecker {
  constructor(gameType) {
    this.gameType = gameType;
  }

  /**
   * Check availability and update UI
   */
  async checkAndUpdateUI(containerSelector = null) {
    try {
      const availability = await window.UberArcade.checkVoucherAvailability(this.gameType);
      
      console.log(`Voucher availability for ${this.gameType}:`, availability);

      // Update tier 1 (10% off)
      this.updateTierUI('tier1', availability.availability.tier1, containerSelector);
      
      // Update tier 2 (20% off)
      this.updateTierUI('tier2', availability.availability.tier2, containerSelector);
      
      // Update tier 3 (30% off)
      this.updateTierUI('tier3', availability.availability.tier3, containerSelector);

    } catch (error) {
      console.error('Error checking voucher availability:', error);
      // Don't show error to user, just log it
    }
  }

  /**
   * Update UI for a specific tier
   */
  updateTierUI(tierClass, tierData, containerSelector = null) {
    // Find the prize element (e.g., .prize-one, .prize-two, .prize-three)
    const prizeClass = tierClass === 'tier1' ? 'prize-one' : 
                       tierClass === 'tier2' ? 'prize-two' : 
                       'prize-three';
    
    // If containerSelector is provided, search within that container
    let prizeElements;
    if (containerSelector) {
      const container = document.querySelector(containerSelector);
      if (container) {
        prizeElements = container.querySelectorAll(`.${prizeClass}`);
      } else {
        prizeElements = [];
      }
    } else {
      prizeElements = document.querySelectorAll(`.${prizeClass}`);
    }

    if (prizeElements.length === 0) {
      console.warn(`No elements found for ${prizeClass}` + (containerSelector ? ` in ${containerSelector}` : ''));
      return;
    }

    prizeElements.forEach(prizeElement => {
      // Find the discount span inside this prize element
      const discountSpan = prizeElement.querySelector('.text-span, .text-span-2, .text-span-3');
      
      if (!tierData.available) {
        // Mark as exhausted - add strikethrough
        prizeElement.classList.add('exhausted');
        
        // Replace the span text with "No promo codes left..."
        if (discountSpan) {
          // Store original text if not already stored
          if (!discountSpan.dataset.originalText) {
            discountSpan.dataset.originalText = discountSpan.textContent;
          }
          discountSpan.textContent = 'No promo codes left...';
        }
      } else {
        // Remove exhausted class
        prizeElement.classList.remove('exhausted');
        
        // Restore original text if it was changed
        if (discountSpan && discountSpan.dataset.originalText) {
          discountSpan.textContent = discountSpan.dataset.originalText;
        }
      }
    });
  }
}

// Initialize on page load for game pages
window.addEventListener('DOMContentLoaded', () => {
  // Check if we're on a game page
  const gameType = window.location.pathname.includes('snake') ? 'snake' : 
                   window.location.pathname.includes('meteors') ? 'meteors' : 
                   window.location.pathname.includes('brick-breaker') ? 'brick_breaker' : 
                   window.location.pathname.includes('about') ? 'all' : null;

  if (gameType) {
    if (gameType === 'all') {
      // On about page, check each game in its own section
      const snakeChecker = new VoucherAvailabilityChecker('snake');
      snakeChecker.checkAndUpdateUI('.snake-section, .div-block:has(.about-snake-logo)');
      
      const meteorsChecker = new VoucherAvailabilityChecker('meteors');
      meteorsChecker.checkAndUpdateUI('.meteors-section, .div-block:has(.about-meteors-logo)');
      
      const brickBreakerChecker = new VoucherAvailabilityChecker('brick_breaker');
      brickBreakerChecker.checkAndUpdateUI('.brick-breaker-section, .div-block:has(.about-brickbreaker-logo)');
    } else {
      // On specific game page
      const checker = new VoucherAvailabilityChecker(gameType);
      checker.checkAndUpdateUI();
    }
  }
});

