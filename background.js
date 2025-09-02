let fetchedContent = null;

// Round-robin API endpoints with enhanced functionality
const API_ENDPOINTS = [
  'https://ordinals.com/content/',
  'https://ordiscan.com/content/'
  // Add more endpoints as needed
];

let currentEndpointIndex = 0;

// Get next API endpoint in round-robin fashion
function getNextEndpoint() {
  const endpoint = API_ENDPOINTS[currentEndpointIndex];
  currentEndpointIndex = (currentEndpointIndex + 1) % API_ENDPOINTS.length;
  return endpoint;
}

// Fetch with proper binary handling and round-robin
async function fetchWithFallback(inscriptionId, maxRetries = API_ENDPOINTS.length) {
  for (let i = 0; i < maxRetries; i++) {
    const endpoint = getNextEndpoint();
    const url = `${endpoint}${inscriptionId}`;
    
    try {
      console.log(`[OBI Background] Trying endpoint ${i + 1}/${maxRetries}: ${url}`);
      const response = await fetch(url);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
        // Handle binary content properly
        let content;
        if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
          // For binary content, get as ArrayBuffer then convert to string
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          content = String.fromCharCode(...uint8Array);
        } else {
          // For text content, get as text
          content = await response.text();
        }
        
        console.log(`[OBI Background] ✅ Success with ${endpoint}`);
        return {
          data: content,
          contentType: contentType,
          headers: Object.fromEntries(response.headers.entries()),
          isBinary: contentType.includes('image/') || contentType.includes('application/octet-stream')
        };
      }
      console.warn(`[OBI Background] Failed to fetch from ${endpoint}, trying next...`);
    } catch (error) {
      console.warn(`[OBI Background] Error fetching from ${endpoint}:`, error.message);
    }
  }
  throw new Error('All API endpoints failed');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_CONTENT') {
    // Handle both URL and inscriptionId formats
    if (message.inscriptionId) {
      // Direct inscription ID request (from local.html)
      fetchWithFallback(message.inscriptionId)
        .then(result => {
          fetchedContent = result;
          sendResponse({ 
            status: 'success', 
            data: result.data,
            contentType: result.contentType,
            headers: result.headers,
            isBinary: result.isBinary
          });
        })
        .catch(error => {
          console.error('[OBI Background] Fetch error:', error);
          sendResponse({ status: 'error', error: error.message });
        });
    } else if (message.url) {
      // URL-based request (from ordinals.com pages)
      const inscriptionMatch = message.url.match(/\/content\/([a-f0-9]+i?\d*)/i);
      
      if (inscriptionMatch) {
        const inscriptionId = inscriptionMatch[1];
        
        // Use round-robin API fetching
        fetchWithFallback(inscriptionId)
          .then(result => {
            fetchedContent = result;
            sendResponse({ 
              status: 'success', 
              data: result.data,
              contentType: result.contentType,
              headers: result.headers,
              isBinary: result.isBinary
            });
          })
          .catch(error => {
            console.error('[OBI Background] Fetch error:', error);
            sendResponse({ status: 'error', error: error.message });
          });
      } else {
        // Fallback to direct URL fetch
        fetch(message.url)
          .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            const contentType = response.headers.get('content-type') || 'text/html';
            
            if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
              return response.arrayBuffer().then(arrayBuffer => {
                const uint8Array = new Uint8Array(arrayBuffer);
                const content = String.fromCharCode(...uint8Array);
                return {
                  data: content,
                  contentType: contentType,
                  headers: Object.fromEntries(response.headers.entries()),
                  isBinary: true
                };
              });
            } else {
              return response.text().then(data => ({
                data: data,
                contentType: contentType,
                headers: Object.fromEntries(response.headers.entries()),
                isBinary: false
              }));
            }
          })
          .then(result => {
            fetchedContent = result;
            sendResponse({ 
              status: 'success', 
              data: result.data,
              contentType: result.contentType,
              headers: result.headers,
              isBinary: result.isBinary
            });
          })
          .catch(error => {
            console.error('[OBI Background] Fetch error:', error);
            sendResponse({ status: 'error', error: error.message });
          });
      }
    }
    return true;
  } else if (message.type === 'OPEN_CONTENT_TAB') {
    // Open content in a new tab using data URL
    chrome.tabs.create({
      url: message.dataUrl,
      active: true
    }, (tab) => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'error', error: chrome.runtime.lastError.message });
      } else {
        console.log('[OBI Background] Content tab created:', tab.id, 'for inscription:', message.inscriptionId);
        sendResponse({ status: 'success', tabId: tab.id });
      }
    });
    return true;
  } else if (message.type === 'GET_CONTENT') {
    if (fetchedContent) {
      sendResponse({ 
        status: 'success', 
        data: fetchedContent.data,
        contentType: fetchedContent.contentType,
        headers: fetchedContent.headers,
        isBinary: fetchedContent.isBinary
      });
    } else {
      // Use round-robin for default content
      fetchWithFallback('85dfb4a5c63b52f0970b100ae05096ae722fdb8596bc6d9e4afdcb9df5e2c6fdi0')
        .then(result => {
          fetchedContent = result;
          sendResponse({ 
            status: 'success', 
            data: result.data,
            contentType: result.contentType,
            headers: result.headers,
            isBinary: result.isBinary
          });
        })
        .catch(error => {
          console.error('[OBI Background] Fetch error:', error);
          sendResponse({ status: 'error', error: error.message });
        });
    }
    return true;
  } else if (message.type === 'INJECT_SCRIPT') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        if (message.src.startsWith('https://')) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: [message.src]
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('Script injection failed:', chrome.runtime.lastError);
            } else {
              console.log('Script injected:', message.src);
            }
          });
        } else {
          console.error('Script injection skipped: Non-HTTPS URL', message.src);
        }
      }
    });
    sendResponse({ status: 'success' });
    return true;
  }
});

// Setup .bitmap redirect rules on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1001],
    addRules: [
      {
        id: 1001,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            regexSubstitution: chrome.runtime.getURL("redirect.html?query=\\1")
          }
        },
        condition: {
          regexFilter: "^https?://([^/]+)\\.bitmap(/|$)",
          resourceTypes: ["main_frame"]
        }
      }
    ]
  });
});

// URL interception for .bitmap domains
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  const rawUrl = details.url.toLowerCase();
  // Only match raw .bitmap (no protocol) and search-like .bitmap inputs
  const queryMatch = rawUrl.match(/^([^:/?#]+)\.bitmap(?:[?/#].*)?$/);
  const searchMatch = rawUrl.match(/[?&]q=([^&]*)\.bitmap(?:[&#].*)?$/);
  const query = queryMatch ? queryMatch[1] : (searchMatch ? decodeURIComponent(searchMatch[1]) : '');
  if (!query) return;
  chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL(`redirect.html?query=${encodeURIComponent(query)}`) });
}, { url: [
  { urlMatches: '^[^:/?#]+\\.bitmap.*$' },
  { urlMatches: '.*[?&]q=[^&]*\\.bitmap.*$' }
] });

// Modify headers for content compatibility
chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1],
  addRules: [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'content-security-policy', operation: 'remove' },
          { header: 'x-frame-options', operation: 'remove' },
          { header: 'x-content-type-options', operation: 'remove' }
        ]
      },
      condition: {
        urlFilter: 'https://*',
        resourceTypes: [
          'main_frame',
          'sub_frame',
          'stylesheet',
          'script',
          'image',
          'font',
          'object',
          'xmlhttprequest',
          'media'
        ]
      }
    }
  ]
});

console.log('[OBI Background] Extension initialized with round-robin API endpoints:', API_ENDPOINTS);