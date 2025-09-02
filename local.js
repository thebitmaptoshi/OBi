let sandboxReady = false;
let pendingContent = null;
let storedContentData = null; // Store content locally for iframe access

// Get inscription ID from URL parameters
const params = new URLSearchParams(window.location.search);
const inscriptionId = params.get('inscriptionId');

// Enhanced security validation - Anti-clickjacking protection
if (window.top !== window.self) {
  console.error('[OBI Security] Potential clickjacking detected, blocking execution');
  document.body.style.display = 'none';
  throw new Error('Clickjacking protection activated');
}

if (!inscriptionId) {
  showError('No inscription ID provided');
} else {
  loadInscriptionContent(inscriptionId);
}

function showError(message) {
  document.getElementById('loading').style.display = 'none';
  const errorDiv = document.getElementById('error');
  errorDiv.style.display = 'block';
  // XSS prevention - use textContent instead of innerHTML
  errorDiv.textContent = message;
}

function showContent() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';
}

// Enhanced security validation for inscription content
function validateInscriptionId(id) {
  // Only allow valid inscription ID format (64 hex chars + 'i' + number)
  const validPattern = /^[a-f0-9]{64}i\d+$/i;
  return validPattern.test(id);
}

function validateContentSource(content) {
  // Balanced security checks for malicious content - more permissive for Bitcoin inscriptions
  const suspiciousPatterns = [
    /javascript:(?!void\(0\)|;)/i,     // JavaScript URLs (except void(0) and empty)
    /vbscript:/i,                      // VBScript URLs
    /<object[^>]*data\s*=\s*["'](?!data:|https:)/i, // Object embeds with suspicious sources
    /<embed[^>]*src\s*=\s*["'](?!data:|https:)/i,   // Embed tags with suspicious sources
    /<applet[^>]*>/i,                  // Java applets
    /<form[^>]*action\s*=\s*["'][^"']*(?:javascript:|data:)/i, // Forms with suspicious actions
    /<meta[^>]*http-equiv[^>]*refresh[^>]*url\s*=\s*["'](?!https:)/i, // Suspicious meta refreshes
    /<base[^>]*href\s*=\s*["'](?!https:|\/)/i // Base tag with suspicious hrefs
  ];
  
  // More permissive event handler validation for Bitcoin inscriptions
  // Many legitimate inscriptions (like games, interactive art) have many event handlers
  const eventHandlerCount = (content.match(/on\w+\s*=/gi) || []).length;
  if (eventHandlerCount > 50) { // Increased limit significantly
    console.warn('[OBI Security] Very high number of event handlers detected:', eventHandlerCount);
    // Still allow but log for monitoring
  }
  
  // Check for excessive inline scripts (but be more permissive)
  const scriptCount = (content.match(/<script[^>]*>/gi) || []).length;
  if (scriptCount > 20) {
    console.warn('[OBI Security] High number of script tags detected:', scriptCount);
    // Still allow but log for monitoring
  }
  
  return !suspiciousPatterns.some(pattern => pattern.test(content));
}

// Enhanced content validation for additional security
function validateContentType(contentType) {
  // Whitelist of allowed content types
  const allowedTypes = [
    'text/html',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'application/json'
  ];
  
  return allowedTypes.some(type => contentType.includes(type));
}

// Render content using the most appropriate method for Chrome extension restrictions
function renderContentDirectly(content, contentType) {
  const inscriptionId = new URLSearchParams(window.location.search).get('inscriptionId');
  
  // Enhanced security validation
  if (!validateContentSource(content)) {
    console.warn('[OBI Security] Potentially unsafe content blocked');
    showError('Content blocked for security reasons - suspicious patterns detected');
    return;
  }
  
  if (!validateContentType(contentType)) {
    console.warn('[OBI Security] Invalid content type:', contentType);
    showError('Content blocked - unsupported content type');
    return;
  }
  
  const processedContent = processContent(content, contentType);
  
  // For images, use unrestricted tab for consistency
  if (contentType && contentType.includes('image/')) {
    console.log('[OBI Local] Image content detected, opening in unrestricted tab for consistency');
    
    try {
      // Convert string back to binary for images
      const binaryString = content;
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Convert to base64 data URL instead of blob URL to avoid cross-context issues
      let base64String = '';
      const chunkSize = 0x8000; // 32KB chunks to avoid call stack issues
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        base64String += String.fromCharCode.apply(null, chunk);
      }
      const base64Data = btoa(base64String);
      const dataUrl = `data:${contentType};base64,${base64Data}`;
      
      // Create complete HTML for image display with enhanced security
      const imageHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bitcoin Inscription Image - Open Bitmap Internet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100vw; height: 100vh; overflow: hidden; background: #000; }
    .container { 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      width: 100%; 
      height: 100%; 
      padding: 20px; 
    }
    img { 
      max-width: 100%; 
      max-height: 100%; 
      object-fit: contain; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .obi-watermark {
      position: fixed;
      bottom: 10px;
      right: 10px;
      font-size: 10px;
      color: rgba(255,255,255,0.7);
      pointer-events: none;
      z-index: 9999;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${dataUrl}" alt="Bitcoin Inscription Image" />
  </div>
  <div class="obi-watermark">Open Bitmap Internet</div>
  <!-- Inscription ID: ${inscriptionId} -->
</body>
</html>`;
      
      // Open in unrestricted tab like other content
      createUnrestrictedTab(imageHtml);
    } catch (error) {
      console.error('[OBI Security] Image processing failed:', error);
      showError('Failed to process image: ' + error.message);
    }
    return;
  }
  
  // CRITICAL FIX: Handle text/plain content properly
  if (contentType && contentType.includes('text/plain')) {
    console.log('[OBI Local] Plain text content detected, creating formatted text display');
    
    // The processedContent is already wrapped in a proper HTML structure by processContent()
    // Just open it in an unrestricted tab
    createUnrestrictedTab(processedContent);
    return;
  }
  
  // For HTML content, check if it has external scripts or complex content
  console.log('[OBI Local] Rendering HTML content, type:', contentType);
  
  const hasExternalScripts = /<script[^>]*src=["'][^"']*["']/i.test(processedContent);
  const hasInlineScripts = /<script(?![^>]*src=)[^>]*>/i.test(processedContent);
  const isComplexContent = hasExternalScripts || hasInlineScripts || processedContent.includes('fouita') || processedContent.includes('youtube');
  
  // If content has scripts or is complex, always use data URL tab approach
  if (isComplexContent) {
    console.log('[OBI Local] Complex content detected, opening in unrestricted tab');
    createUnrestrictedTab(processedContent);
    return;
  }
  
  // For simple HTML content without scripts, also use unrestricted tab for consistency
  console.log('[OBI Local] Simple content, opening in unrestricted tab for consistency');
  createUnrestrictedTab(processedContent);
}

// Create an unrestricted tab for complex content with enhanced security
function createUnrestrictedTab(content) {
  const inscriptionId = new URLSearchParams(window.location.search).get('inscriptionId');
  
  // Enhanced content sanitization before creating data URL (but more permissive)
  let sanitizedContent = content;
  
  // Only remove dangerous event handlers (script removal disabled for Bitcoin inscriptions)
  sanitizedContent = sanitizedContent.replace(/on\w+\s*=\s*["'][^"']*(?:eval\(|Function\(|setTimeout\(.*["']|setInterval\(.*["'])[^"']*["']/gi, '');
  
  // No watermark injection - keep content clean
  let contentWithWatermark = sanitizedContent;
  
  // Ensure the content has proper HTML structure
  if (!contentWithWatermark.includes('<!DOCTYPE') && !contentWithWatermark.includes('<html')) {
    // Wrap fragment in proper HTML structure
    contentWithWatermark = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bitcoin Inscription - Open Bitmap Internet</title>
</head>
<body>
${contentWithWatermark}
</body>
</html>`;
  } else if (contentWithWatermark.includes('<head>') && !contentWithWatermark.includes('</head>')) {
    // Fix unclosed head tag
    contentWithWatermark = contentWithWatermark.replace(/<head>([^]*?)(<body>|<\/html>|$)/i, '<head>$1</head>$2');
  }
  
  // Fix missing body tag if needed
  if (contentWithWatermark.includes('</head>') && !contentWithWatermark.includes('<body>')) {
    contentWithWatermark = contentWithWatermark.replace('</head>', '</head>\n<body>');
    if (!contentWithWatermark.includes('</body>') && contentWithWatermark.includes('</html>')) {
      contentWithWatermark = contentWithWatermark.replace('</html>', '</body>\n</html>');
    }
  }
  
  // Create data URL - this bypasses ALL CSP restrictions
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(contentWithWatermark);
  
  // Request to open new tab via background script
  chrome.runtime.sendMessage({
    type: 'OPEN_CONTENT_TAB',
    dataUrl: dataUrl,
    inscriptionId: inscriptionId
  }, (response) => {
    if (response && response.status === 'success') {
      console.log('[OBI Local] Content opened in unrestricted tab');
      
      // AUTO-CLOSE: Close this local.html tab after content tab is created
      console.log('[OBI Local] Content tab created successfully, auto-closing local.html tab');
      
      setTimeout(() => {
        try {
          // Close this middleman tab since it's no longer needed
          window.close();
          console.log('[OBI Local] Local.html tab closed successfully');
        } catch (error) {
          console.log('[OBI Local] Could not auto-close tab:', error);
          // If we can't close the tab, at least show a minimal message
          const contentDiv = document.getElementById('content');
          if (contentDiv) {
            contentDiv.innerHTML = `
              <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: Arial, sans-serif; color: #666; text-align: center;">
                <div>
                  <div style="font-size: 18px; margin-bottom: 10px;">✓ Content opened in new tab</div>
                  <div style="font-size: 14px;">You can close this tab manually</div>
                </div>
              </div>
            `;
          }
        }
      }, 500); // Small delay to ensure content tab fully opens before closing this one
      
    } else {
      console.error('[OBI Local] Failed to open content in new tab:', response?.error);
      showError('Failed to open content in new tab: ' + (response?.error || 'Unknown error'));
    }
  });
}

function processContent(content, contentType) {
  // Enhanced URL fixing with security validation
  let fixedContent = content
    .replace(/src="\/content\//g, 'src="https://ordinals.com/content/')
    .replace(/href="\/content\//g, 'href="https://ordinals.com/content/')
    .replace(/url\(\/content\//g, 'url(https://ordinals.com/content/')
    .replace(/src='\/content\//g, "src='https://ordinals.com/content/")
    .replace(/href='\/content\//g, "href='https://ordinals.com/content/")
    .replace(/url\('\/content\//g, "url('https://ordinals.com/content/")
    .replace(/url\("\/content\//g, 'url("https://ordinals.com/content/');

  // Fix ES6 import maps - this is critical for bop.bitmap
  // Replace relative URLs in import maps with absolute URLs
  fixedContent = fixedContent.replace(
    /"\/content\/([a-f0-9]+i\d+)"/g, 
    '"https://ordinals.com/content/$1"'
  );
  
  // Also fix import maps that might use single quotes
  fixedContent = fixedContent.replace(
    /'\/content\/([a-f0-9]+i\d+)'/g, 
    "'https://ordinals.com/content/$1'"
  );
  
  // Fix any JSON-style import map definitions
  fixedContent = fixedContent.replace(
    /:\s*"\/content\/([a-f0-9]+i\d+)"/g,
    ': "https://ordinals.com/content/$1"'
  );

  if (contentType && contentType.includes('text/plain')) {
    return `<div style="padding: 20px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.4; white-space: pre-wrap; word-break: break-word;">${escapeHtml(content)}</div>`;
  }
  
  // For HTML content, return as-is (already fixed URLs)
  return fixedContent;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadInscriptionContent(inscriptionId) {
  try {
    console.log('[OBI Local] Loading inscription:', inscriptionId);
    
    // Enhanced inscription ID validation for security
    if (!validateInscriptionId(inscriptionId)) {
      showError('Invalid inscription ID format - security validation failed');
      return;
    }
    
    // Additional length validation
    if (inscriptionId.length > 80) {
      showError('Inscription ID too long - potential security issue');
      return;
    }
    
    // Request content from background script using round-robin endpoints
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'FETCH_CONTENT',
        inscriptionId: inscriptionId
      }, resolve);
    });
    
    if (response && response.status === 'success' && response.data) {
      console.log('[OBI Local] Content loaded, type:', response.contentType);
      console.log('[OBI Local] Content source: Bitcoin Ordinals inscription', inscriptionId);
      
      const content = response.data;
      let contentType = response.contentType || 'text/html';
      
      // Override content type detection if we have better info from headers
      if (response.headers && response.headers['content-type']) {
        contentType = response.headers['content-type'];
      }
      
      // CRITICAL FIX: Detect actual content type by analyzing the content
      // The ordinals.com server often returns incorrect content-type headers
      const detectedContentType = detectActualContentType(content, contentType);
      if (detectedContentType !== contentType) {
        console.log('[OBI Local] Content type corrected:', contentType, '->', detectedContentType);
        contentType = detectedContentType;
      }
      
      console.log('[OBI Local] Final content type:', contentType);
      
      // Enhanced content size validation
      if (content.length > 10 * 1024 * 1024) { // 10MB limit
        showError('Content too large - potential security issue');
        return;
      }
      
      // Render content directly instead of using iframe
      renderContentDirectly(content, contentType);
    } else {
      const errorMsg = response?.error || 'Unknown error';
      console.error('[OBI Local] Load failed:', errorMsg);
      showError('Failed to load inscription content: ' + errorMsg);
    }
  } catch (error) {
    console.error('[OBI Local] Load error:', error);
    showError('Failed to load inscription content: ' + error.message);
  }
}

// NEW FUNCTION: Detect actual content type by analyzing the content
function detectActualContentType(content, serverContentType) {
  // Handle empty or very small content
  if (!content || content.length < 10) {
    return serverContentType;
  }
  
  // Check for binary content (images, etc.)
  if (typeof content === 'string') {
    // Look for binary markers (non-printable characters in first 100 chars)
    const sample = content.substring(0, 100);
    const binaryCharCount = sample.split('').filter(char => {
      const code = char.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13; // Exclude tab, LF, CR
    }).length;
    
    if (binaryCharCount > 5) {
      // Likely binary content - check for image signatures
      if (content.startsWith('\xFF\xD8\xFF')) return 'image/jpeg';
      if (content.startsWith('\x89PNG')) return 'image/png';
      if (content.startsWith('GIF8')) return 'image/gif';
      if (content.startsWith('<svg') || content.includes('xmlns="http://www.w3.org/2000/svg"')) return 'image/svg+xml';
      return serverContentType; // Keep original for other binary
    }
  }
  
  // Analyze text content structure
  const trimmedContent = content.trim();
  
  // Check for HTML patterns
  const htmlPatterns = [
    /^<!DOCTYPE\s+html/i,
    /^<html[\s>]/i,
    /<\/html>\s*$/i,
    /<head[\s>]/i,
    /<body[\s>]/i,
    /<script[\s>]/i,
    /<style[\s>]/i,
    /<div[\s>]/i,
    /<p[\s>]/i,
    /<h[1-6][\s>]/i
  ];
  
  const htmlMatches = htmlPatterns.filter(pattern => pattern.test(trimmedContent)).length;
  
  // Check for obvious HTML structure
  if (htmlMatches >= 2 || trimmedContent.includes('</') && trimmedContent.includes('/>')) {
    return 'text/html';
  }
  
  // Check for JSON
  if ((trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) || 
      (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))) {
    try {
      JSON.parse(trimmedContent);
      return 'application/json';
    } catch (e) {
      // Not valid JSON, continue checking
    }
  }
  
  // Check for CSS
  if (trimmedContent.includes('{') && trimmedContent.includes('}') && 
      (trimmedContent.includes(':') || trimmedContent.includes('@'))) {
    const cssPatterns = [/@import/, /@media/, /\.[a-zA-Z]/, /#[a-zA-Z]/, /:[a-zA-Z]/];
    if (cssPatterns.some(pattern => pattern.test(trimmedContent))) {
      return 'text/css';
    }
  }
  
  // Check for JavaScript
  const jsPatterns = [
    /function\s+\w+\s*\(/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /var\s+\w+\s*=/,
    /=>\s*{/,
    /console\./,
    /document\./,
    /window\./
  ];
  
  if (jsPatterns.some(pattern => pattern.test(trimmedContent))) {
    return 'application/javascript';
  }
  
  // If it doesn't match HTML, JSON, CSS, or JS patterns, and it's mostly text, it's likely plain text
  // This is especially important for Bitcoin inscriptions that are often plain text but served with text/html headers
  if (htmlMatches === 0 && !trimmedContent.includes('<') && !trimmedContent.includes('>')) {
    return 'text/plain';
  }
  
  // For "Atlas Code" specifically - if it starts with a comment and has no HTML tags, it's likely plain text
  if (trimmedContent.startsWith('<!--') && !trimmedContent.includes('<html') && 
      !trimmedContent.includes('<head') && !trimmedContent.includes('<body')) {
    return 'text/plain';
  }
  
  // Default to server-provided content type
  return serverContentType;
}