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
      // Wait for config to be loaded
      if (window.UberArcade && window.UberArcade.ensureConfigLoaded) {
        await window.UberArcade.ensureConfigLoaded();
      }
      
      if (!window.UberArcade) {
        console.error('[Voucher Availability] UberArcade API not loaded');
        return;
      }
      
      const availability = await window.UberArcade.checkVoucherAvailability(this.gameType);
      
      console.log(`✓ Voucher availability for ${this.gameType}:`, availability);

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
        // Get the main prize text (before the <br>)
        const prizeHTML = prizeElement.innerHTML;
        
        // Find the text before <br> and the span
        const brIndex = prizeHTML.indexOf('<br>');
        if (brIndex > 0 && discountSpan) {
          const mainPrizeText = prizeHTML.substring(0, brIndex).trim();
          
          // Restructure: wrap main text in a span with strikethrough
          prizeElement.innerHTML = `
            <span style="text-decoration: line-through;">${mainPrizeText}</span>
            <br>
            <span class="${discountSpan.className}" style="text-decoration: none; color: var(--_colors---grey);">No promo codes left. Aim for another tier</span>
          `;
          
          // Add grey color to parent (but not strikethrough)
          prizeElement.style.color = 'var(--_colors---grey)';
          prizeElement.classList.add('exhausted');
          // Remove strikethrough from parent since we're applying it to inner span
          prizeElement.style.textDecoration = 'none';
        }
      } else {
        // Remove exhausted class and restore original styling
        prizeElement.classList.remove('exhausted');
        prizeElement.style.color = '';
        prizeElement.style.textDecoration = '';
        
        // Restore original text if it was changed
        if (discountSpan && discountSpan.dataset.originalText) {
          discountSpan.textContent = discountSpan.dataset.originalText;
          discountSpan.style.textDecoration = '';
          discountSpan.style.color = '';
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
      // Wait for UberArcade API to be ready
      setTimeout(() => {
        const snakeChecker = new VoucherAvailabilityChecker('snake');
        snakeChecker.checkAndUpdateUI('.snake-section');
        
        const meteorsChecker = new VoucherAvailabilityChecker('meteors');
        meteorsChecker.checkAndUpdateUI('.meteors-section');
        
        const brickBreakerChecker = new VoucherAvailabilityChecker('brick_breaker');
        brickBreakerChecker.checkAndUpdateUI('.brick-breaker-section');
      }, 500);
    } else {
      // On specific game page
      // Wait for UberArcade API to be ready
      setTimeout(() => {
        const checker = new VoucherAvailabilityChecker(gameType);
        checker.checkAndUpdateUI();
      }, 500);
    }
  }
});

