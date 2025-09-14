// Redirect rules, header modification, and .bitmap interception

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OBI_LOG' && message.message) {
    console.log(message.message);
  }
});

console.log('[OBI Background] Extension initialized with only redirect and header rules. No local content fetching.');