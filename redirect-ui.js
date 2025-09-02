// OBI Redirect UI Management - External Script for CSP Compliance
// Enhanced UI state management with balanced security

(function() {
  'use strict';
  
  // Anti-tampering protection - store critical DOM methods
  const originalGetElementById = document.getElementById;
  const originalQuerySelector = document.querySelector;
  
  // Enhanced UI state management - gracefully degrade if not available
  if (typeof window.OBI_UI === 'undefined') {
    window.OBI_UI = {
      currentStep: 0,
      isSecureContext: true, // Track if we're in a secure context
      
      // Security validation
      validateElement: function(element) {
        if (!element) return false;
        // Ensure element is in the DOM and not hijacked
        return document.contains(element);
      },
      
      setStep: function(stepNumber, status = 'active') {
        // Input validation
        if (typeof stepNumber !== 'number' || stepNumber < 1 || stepNumber > 4) {
          console.warn('[OBI Security] Invalid step number:', stepNumber);
          return;
        }
        
        try {
          // Update previous steps to completed
          for (let i = 1; i < stepNumber; i++) {
            const step = originalGetElementById.call(document, `step${i}`);
            if (step && this.validateElement(step)) {
              step.classList.remove('active');
              step.classList.add('completed');
              const icon = step.querySelector('.step-icon');
              if (icon && this.validateElement(icon)) {
                icon.textContent = '?';
              }
            }
          }
          
          // Update current step
          const currentStep = originalGetElementById.call(document, `step${stepNumber}`);
          if (currentStep && this.validateElement(currentStep)) {
            currentStep.classList.remove('completed');
            currentStep.classList.add('active');
          }
          
          // Update currentStep property (not frozen anymore)
          this.currentStep = stepNumber;
        } catch (error) {
          console.error('[OBI Security] Error in setStep:', error);
        }
      },
      
      setStatus: function(message) {
        // Input sanitization
        if (typeof message !== 'string') {
          console.warn('[OBI Security] Invalid status message type');
          return;
        }
        
        // Basic XSS prevention - strip HTML tags
        const sanitizedMessage = message.replace(/<[^>]*>/g, '');
        
        try {
          const statusEl = originalGetElementById.call(document, 'status');
          if (statusEl && this.validateElement(statusEl)) {
            statusEl.textContent = sanitizedMessage;
          }
        } catch (error) {
          console.error('[OBI Security] Error in setStatus:', error);
        }
      },
      
      showQuery: function(query) {
        // Input validation and sanitization
        if (typeof query !== 'string') {
          console.warn('[OBI Security] Invalid query type');
          return;
        }
        
        // Sanitize query to prevent XSS
        const sanitizedQuery = query.replace(/<[^>]*>/g, '').substring(0, 100);
        
        try {
          const queryInfo = originalGetElementById.call(document, 'queryInfo');
          if (queryInfo && this.validateElement(queryInfo)) {
            queryInfo.textContent = `Query: ${sanitizedQuery}`;
            queryInfo.style.display = 'block';
          }
        } catch (error) {
          console.error('[OBI Security] Error in showQuery:', error);
        }
      },
      
      showError: function(message) {
        // Input sanitization
        if (typeof message !== 'string') {
          console.warn('[OBI Security] Invalid error message type');
          return;
        }
        
        const sanitizedMessage = message.replace(/<[^>]*>/g, '');
        
        try {
          const spinner = originalGetElementById.call(document, 'spinner');
          const progressSteps = originalGetElementById.call(document, 'progressSteps');
          const error = originalGetElementById.call(document, 'error');
          const errorMessage = originalGetElementById.call(document, 'errorMessage');
          
          if (spinner && this.validateElement(spinner)) {
            spinner.style.display = 'none';
          }
          if (progressSteps && this.validateElement(progressSteps)) {
            progressSteps.style.display = 'none';
          }
          if (error && this.validateElement(error)) {
            error.classList.add('show');
          }
          if (errorMessage && this.validateElement(errorMessage)) {
            errorMessage.textContent = sanitizedMessage;
          }
        } catch (error) {
          console.error('[OBI Security] Error in showError:', error);
        }
      },
      
      hideError: function() {
        try {
          const error = originalGetElementById.call(document, 'error');
          if (error && this.validateElement(error)) {
            error.classList.remove('show');
          }
        } catch (error) {
          console.error('[OBI Security] Error in hideError:', error);
        }
      },
      
      // Security enhancement: Validate page integrity
      validatePageIntegrity: function() {
        const expectedElements = ['spinner', 'status', 'queryInfo', 'progressSteps', 'error'];
        for (const elementId of expectedElements) {
          const element = originalGetElementById.call(document, elementId);
          if (!element || !this.validateElement(element)) {
            console.warn('[OBI Security] Page integrity check failed for:', elementId);
            return false;
          }
        }
        return true;
      }
    };
    
    // Balanced security - freeze only the methods, not the entire object
    // This allows currentStep to be modified while protecting against method tampering
    Object.defineProperty(window.OBI_UI, 'validateElement', { writable: false, configurable: false });
    Object.defineProperty(window.OBI_UI, 'setStep', { writable: false, configurable: false });
    Object.defineProperty(window.OBI_UI, 'setStatus', { writable: false, configurable: false });
    Object.defineProperty(window.OBI_UI, 'showQuery', { writable: false, configurable: false });
    Object.defineProperty(window.OBI_UI, 'showError', { writable: false, configurable: false });
    Object.defineProperty(window.OBI_UI, 'hideError', { writable: false, configurable: false });
    Object.defineProperty(window.OBI_UI, 'validatePageIntegrity', { writable: false, configurable: false });
  }
  
  // Secure retry function with enhanced validation
  function secureRetry() {
    // Basic anti-clickjacking protection
    if (window.top !== window.self) {
      console.error('[OBI Security] Potential clickjacking detected');
      return;
    }
    
    // Validate current origin
    if (!location.href.startsWith('chrome-extension://')) {
      console.error('[OBI Security] Invalid origin for retry');
      return;
    }
    
    try {
      location.reload();
    } catch (error) {
      console.error('[OBI Security] Secure reload failed:', error);
    }
  }
  
  // Initialize UI with security checks
  function initializeSecureUI() {
    try {
      // Validate page integrity first
      if (!window.OBI_UI.validatePageIntegrity()) {
        console.error('[OBI Security] Page integrity validation failed');
        return;
      }
      
      // Get and validate query parameter
      const params = new URLSearchParams(window.location.search);
      const query = params.get('query');
      
      if (query && window.OBI_UI) {
        // Additional query validation
        if (query.length > 100) {
          console.warn('[OBI Security] Query too long, truncating');
        }
        
        window.OBI_UI.showQuery(query);
        window.OBI_UI.setStep(1);
        window.OBI_UI.setStatus('Processing bitmap query...');
      } else if (!query && window.OBI_UI) {
        window.OBI_UI.showError('No query parameter found');
      }
      
      // Enhance retry button security
      const retryBtn = originalQuerySelector.call(document, '.retry-btn');
      if (retryBtn && window.OBI_UI.validateElement(retryBtn)) {
        // Remove any existing onclick handlers
        retryBtn.removeAttribute('onclick');
        
        // Add secure event listener
        retryBtn.addEventListener('click', function(event) {
          event.preventDefault();
          event.stopPropagation();
          secureRetry();
        }, { once: false, passive: false });
      }
      
    } catch (error) {
      console.error('[OBI Security] UI initialization failed:', error);
    }
  }
  
  // Enhanced DOM ready detection with security validation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSecureUI, { once: true });
  } else {
    // Add small delay to ensure all elements are properly loaded
    setTimeout(initializeSecureUI, 10);
  }
  
  // Security monitoring - detect potential tampering (less aggressive)
  const securityMonitor = {
    checkInterval: null,
    
    start: function() {
      this.checkInterval = setInterval(() => {
        // Verify critical UI elements haven't been tampered with
        if (window.OBI_UI && !window.OBI_UI.validatePageIntegrity()) {
          console.warn('[OBI Security] Potential page tampering detected');
          // Don't clear interval immediately, just warn
        }
      }, 10000); // Check every 10 seconds (less frequent)
    },
    
    stop: function() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    }
  };
  
  // Start security monitoring
  securityMonitor.start();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    securityMonitor.stop();
  }, { once: true });
  
})();