// Remove REGISTRY_BASE_URL and batch file logic for numeric addresses

// CRITICAL: Prevent infinite loops by tracking redirects
function checkRedirectLoop() {
  const currentTime = Date.now();
  const lastRedirectTime = sessionStorage.getItem('obi_last_redirect_time');
  if (lastRedirectTime && (currentTime - parseInt(lastRedirectTime)) < 1000) {
    // Instead of about:blank, go to error.html with query
    const lastQuery = sessionStorage.getItem('obi_last_query') || '';
    window.location.href = chrome.runtime.getURL(`error.html?query=${encodeURIComponent(lastQuery)}`);
    return true;
  }
  sessionStorage.setItem('obi_last_redirect_time', currentTime.toString());
  return false;
}

function sanitizeQuery(query) {
  return query.replace(/[^a-zA-Z0-9.\-_=!]/g, '').toLowerCase();
}

function isAddress(query) {
  return /^\d+(\.\d+)?$/.test(query);
}

// Name-to-address lookup (BNS registry)
async function fetchAddressForName(name) {
  const REGISTRY_BASE_URL = 'https://raw.githubusercontent.com/thebitmaptoshi/BNS/main/Registry/';
  const firstChar = name[0].toUpperCase();
  const indexFile = /\d/.test(firstChar) ? 'index_0-9.txt' : `index_${firstChar}.txt`;
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

// Round-robin redirect sites for isBitmap = false
const REDIRECT_SITES = [
  'https://ordinals.com/content/',
  'https://ordiscan.com/content/',
  'https://static.unisat.io/preview/'
];
function getNextRedirectSite() {
  let idx = parseInt(localStorage.getItem('obi_redirect_site_index') || '0', 10);
  const site = REDIRECT_SITES[idx];
  idx = (idx + 1) % REDIRECT_SITES.length;
  localStorage.setItem('obi_redirect_site_index', idx.toString());
  // Log to service worker
  try {
    chrome.runtime.sendMessage({
      type: 'OBI_LOG',
      message: `[OBI Redirect] Redirecting user to: ${site}`
    });
  } catch (e) {}
  return site;
}

(async () => {
  if (checkRedirectLoop()) {
    return;
  }
  if (window.OBI_UI) {
    window.OBI_UI.setStep(1);
    window.OBI_UI.setStatus('Parsing query parameters...');
  }
  const params = new URLSearchParams(window.location.search);
  let query = params.get('query');
  if (!query) {
    window.location.href = chrome.runtime.getURL(`error.html?query=`);
    return;
  }
  query = query.replace(/\.bitmap.*$/i, '');
  if (!query) {
    window.location.href = chrome.runtime.getURL(`error.html?query=`);
    return;
  }
  // Cache the query for retry
  sessionStorage.setItem('obi_last_query', query);
  const sanitizedQuery = sanitizeQuery(query);
  let address = null;
  let failType = '';
  if (isAddress(sanitizedQuery)) {
    if (window.OBI_UI) {
      window.OBI_UI.setStatus(`Processing address: ${sanitizedQuery}`);
    }
    address = sanitizedQuery;
    failType = 'address';
  } else {
    if (window.OBI_UI) {
      window.OBI_UI.setStatus(`Resolving name: ${sanitizedQuery}`);
    }
    address = await fetchAddressForName(sanitizedQuery);
    if (!address) {
      if (window.OBI_UI) {
        window.OBI_UI.showError(`Name "${sanitizedQuery}" not found in registry`);
      }
      window.location.href = chrome.runtime.getURL(`error.html?query=${encodeURIComponent(query)}&type=name`);
      return;
    }
    failType = 'address'; // If name resolves, next fail is address
  }
  let result = null;
  let fetchTimedOut = false;
  // Always use OCI for address-to-inscriptionId
  await Promise.race([
    (async () => {
      try {
        const ociModule = await import(chrome.runtime.getURL('oci.js'));
        result = await ociModule.getBitmapInscriptionAndType(address);
      } catch (e) {
        console.error('[OBI Redirect] OCI lookup failed:', e);
        result = null;
      }
    })(),
    new Promise(resolve => setTimeout(() => { fetchTimedOut = true; resolve(); }, 3000))
  ]);
  if (fetchTimedOut || !result || !result.inscriptionId) {
    window.location.href = chrome.runtime.getURL(`error.html?query=${encodeURIComponent(query)}&type=${failType}`);
    return;
  }
  if (result.isBitmap) {
    window.location.href = `https://ordinals.com/inscription/${result.inscriptionId}`;
  } else {
    // Use round robin for actual redirect sites
    const site = getNextRedirectSite();
    window.location.href = `${site}${result.inscriptionId}`;
  }
})();