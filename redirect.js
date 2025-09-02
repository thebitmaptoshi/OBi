const REGISTRY_BASE_URL = 'https://raw.githubusercontent.com/thebitmaptoshi/BNS/main/Registry/';

// CRITICAL: Prevent infinite loops by tracking redirects
function checkRedirectLoop() {
  const currentTime = Date.now();
  const lastRedirect = sessionStorage.getItem('obi_last_redirect');
  const lastRedirectTime = sessionStorage.getItem('obi_last_redirect_time');
  
  // If we redirected recently (within 5 seconds), it's likely a loop
  if (lastRedirectTime && (currentTime - parseInt(lastRedirectTime)) < 5000) {
    console.log('[OBI Redirect] Loop detected, blocking redirect');
    if (window.OBI_UI) {
      window.OBI_UI.showError('Redirect loop detected - blocking to prevent infinite redirection');
      setTimeout(() => window.location.href = 'about:blank', 2000);
    } else {
      window.location.href = 'about:blank';
    }
    return true; // Loop detected
  }
  
  // Store this redirect attempt
  sessionStorage.setItem('obi_last_redirect', window.location.href);
  sessionStorage.setItem('obi_last_redirect_time', currentTime.toString());
  return false; // No loop
}

// Function to open local content tab (back to original approach)
function openLocalContentTab(inscriptionId) {
  const localUrl = chrome.runtime.getURL(`local.html?inscriptionId=${inscriptionId}`);
  window.open(localUrl, '_blank');
  console.log('[OBI Redirect] Opened local content tab for inscription:', inscriptionId);
}

// Function to sanitize query
function sanitizeQuery(query) {
  // Allow a-z, A-Z, 0-9, period, dash, underscore, exclamation, equals
  return query.replace(/[^a-zA-Z0-9.\-_=!]/g, '').toLowerCase();
}

// Function to determine if query is likely an address (only # or #.# allowed)
function isAddress(query) {
  // Matches a single number (e.g., 123) or number.number (e.g., 123.456)
  return /^\d+(\.\d+)?$/.test(query);
}

// Function to get the correct index file for a name
function getIndexFileForName(name) {
  const firstChar = name[0].toUpperCase();
  if (/\d/.test(firstChar)) {
    return 'index_0-9.txt';
  }
  return `index_${firstChar}.txt`;
}

// Function to get the correct batch file for an address
function getBatchFileForAddress(address) {
  const num = parseInt(address, 10);
  const start = Math.floor(num / 10000) * 10000;
  const end = start + 9999;
  return `${start}-${end}.txt`;
}

// Function to fetch and parse the index file for a name
async function fetchAddressForName(name) {
  const indexFile = getIndexFileForName(name);
  const url = `${REGISTRY_BASE_URL}${indexFile}`;
  try {
    if (window.OBI_UI) {
      window.OBI_UI.setStep(2);
      window.OBI_UI.setStatus(`Looking up name "${name}" in registry...`);
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    // Entries are (name,address), separated by commas
    const entries = text.match(/\([^\)]+\)/g) || [];
    const sanitizedInput = sanitizeQuery(name);
    for (const entry of entries) {
      const [entryName, entryAddress] = entry.slice(1, -1).split(',');
      const sanitizedEntryName = sanitizeQuery(entryName ? entryName.trim() : '');
      if (
        entryName &&
        entryAddress &&
        sanitizedEntryName === sanitizedInput
      ) {
        return entryAddress.trim();
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Function to fetch inscriptionId for an address
async function fetchInscriptionIdForAddress(address) {
  const batchFile = getBatchFileForAddress(address);
  const url = `${REGISTRY_BASE_URL}${batchFile}`;
  try {
    if (window.OBI_UI) {
      window.OBI_UI.setStep(3);
      window.OBI_UI.setStatus(`Resolving address "${address}" to inscription...`);
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    // Entries are (address,ID,T/F), separated by commas
    const entries = text.match(/\([^\)]+\)/g) || [];
    for (const entry of entries) {
      const [entryAddress, inscriptionId, isBitmapFlag] = entry.slice(1, -1).split(',');
      if (entryAddress && inscriptionId && entryAddress.trim() === address) {
        const isBitmap = (isBitmapFlag && isBitmapFlag.trim().toUpperCase() === 'T');
        return { inscriptionId: inscriptionId.trim(), isBitmap };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Process the redirect
(async () => {
  // FIRST: Check for infinite loops and block if detected
  if (checkRedirectLoop()) {
    return; // Stop execution if loop detected
  }
  
  if (window.OBI_UI) {
    window.OBI_UI.setStep(1);
    window.OBI_UI.setStatus('Parsing query parameters...');
  }
  
  const params = new URLSearchParams(window.location.search);
  let query = params.get('query');
  if (!query) {
    if (window.OBI_UI) {
      window.OBI_UI.showError('No query parameter found in URL');
      setTimeout(() => {
        window.location.href = chrome.runtime.getURL(`error.html?query=unknown`);
      }, 200);
    } else {
      window.location.href = chrome.runtime.getURL(`error.html?query=unknown`);
    }
    return;
  }
  
  // Remove the first occurrence of .bitmap (case-insensitive) and everything after it
  query = query.replace(/\.bitmap.*$/i, '');
  if (!query) {
    if (window.OBI_UI) {
      window.OBI_UI.showError('Invalid query - no content before .bitmap');
      setTimeout(() => {
        window.location.href = chrome.runtime.getURL(`error.html?query=unknown`);
      }, 200);
    } else {
      window.location.href = chrome.runtime.getURL(`error.html?query=unknown`);
    }
    return;
  }
  
  const sanitizedQuery = sanitizeQuery(query);
  let address = null;
  
  if (isAddress(sanitizedQuery)) {
    if (window.OBI_UI) {
      window.OBI_UI.setStatus(`Processing address: ${sanitizedQuery}`);
    }
    address = sanitizedQuery;
  } else {
    if (window.OBI_UI) {
      window.OBI_UI.setStatus(`Resolving name: ${sanitizedQuery}`);
    }
    address = await fetchAddressForName(sanitizedQuery);
    if (!address) {
      if (window.OBI_UI) {
        window.OBI_UI.showError(`Name "${sanitizedQuery}" not found in registry`);
        setTimeout(() => {
          window.location.href = chrome.runtime.getURL(`error.html?query=${encodeURIComponent(sanitizedQuery)}&type=name`);
        }, 200);
      } else {
        window.location.href = chrome.runtime.getURL(`error.html?query=${encodeURIComponent(sanitizedQuery)}&type=name`);
      }
      return;
    }
  }
  
  const result = await fetchInscriptionIdForAddress(address);
  if (result && result.inscriptionId) {
    if (window.OBI_UI) {
      window.OBI_UI.setStep(4);
      window.OBI_UI.setStatus(`Redirecting to inscription ${result.inscriptionId.slice(0, 8)}...`);
    }
    
    // FLOW: For ALL content types
    console.log('[OBI Redirect] Found inscription:', result.inscriptionId, 'isBitmap:', result.isBitmap);
    
    // For NON-BITMAP content: Open local.html tab (which will auto-close after creating content tab)
    if (!result.isBitmap) {
      console.log('[OBI Redirect] Non-bitmap content - opening local.html tab');
      openLocalContentTab(result.inscriptionId);
      
      // Reduced delay to ensure tab opens before redirect
      setTimeout(() => {
        // Same tab: Always redirect to inscription page for ALL content
        window.location.href = `https://ordinals.com/inscription/${result.inscriptionId}`;
      }, window.OBI_UI ? 150 : 100);
    } else {
      // For BITMAP content: Fast redirect - minimal delay
      console.log('[OBI Redirect] True bitmap content - fast redirecting to inscription page');
      
      if (window.OBI_UI) {
        // Show fast completion for bitmap content
        window.OBI_UI.setStatus('True bitmap - redirecting immediately...');
        // Very minimal delay to show the status update, then immediate redirect
        setTimeout(() => {
          window.location.href = `https://ordinals.com/inscription/${result.inscriptionId}`;
        }, 50);
      } else {
        // No UI - immediate redirect
        window.location.href = `https://ordinals.com/inscription/${result.inscriptionId}`;
      }
    }
  } else {
    if (window.OBI_UI) {
      window.OBI_UI.showError(`Address "${address}" not found in inscription registry`);
      setTimeout(() => {
        window.location.href = chrome.runtime.getURL(`error.html?query=${encodeURIComponent(address)}&type=address`);
      }, 200);
    } else {
      window.location.href = chrome.runtime.getURL(`error.html?query=${encodeURIComponent(address)}&type=address`);
    }
    return;
  }
})();