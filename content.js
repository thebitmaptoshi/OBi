if (window.location.href.includes('ordinals.com/content/')) {
    chrome.runtime.sendMessage(
        {
            type: 'FETCH_CONTENT',
            url: window.location.href
        },
        response => {
            if (response && response.status === 'success' && response.data) {
                // Check if DOMPurify is available
                if (typeof DOMPurify === 'undefined') {
                    console.error('[OBI] DOMPurify not available, retrying...');
                    setTimeout(initializeContentInjection, 100);
                    return;
                }

                const sanitizedHtml = DOMPurify.sanitize(response.data, {
                    ALLOWED_TAGS: ['iframe', 'script', 'div', 'img', 'a', 'p', 'span', 'h1', 'h2', 'h3', 'style', 'link'],
                    ALLOWED_ATTR: ['src', 'href', 'class', 'style', 'id', 'title', 'alt', 'width', 'height'],
                    ALLOWED_URI_REGEXP: /^https:\/\//,
                    ADD_ATTR: ['sandbox'],
                    FORBID_TAGS: ['object', 'applet'],
                    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
                    ADD_TAGS: ['iframe'],
                    ADD_ATTR: ['sandbox'],
                });
                
                const parser = new DOMParser();
                const doc = parser.parseFromString(sanitizedHtml, 'text/html');
                
                const iframes = doc.querySelectorAll('iframe');
                iframes.forEach(iframe => {
                    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
                });
                
                const contentDiv = document.getElementById('content');
                if (contentDiv) {
                    contentDiv.innerHTML = doc.body.innerHTML;
                    
                    // Re-execute external scripts for widgets
                    setTimeout(() => {
                        const externalScripts = contentDiv.querySelectorAll('script[src]');
                        externalScripts.forEach(oldScript => {
                            if (oldScript.src && oldScript.src.startsWith('https://')) {
                                const newScript = document.createElement('script');
                                newScript.src = oldScript.src;
                                newScript.async = true;
                                oldScript.parentNode.replaceChild(newScript, oldScript);
                            }
                        });
                    }, 50);
                }
            }
        }
    );
}

// Wait for DOMPurify to be available before proceeding
function initializeContentInjection() {
  // Handle ordinals.com/content/ID pages
  if (window.location.href.includes('ordinals.com/content/')) {
    chrome.runtime.sendMessage(
      {
        type: 'FETCH_CONTENT',
        url: window.location.href
      },
      response => {
        if (response && response.status === 'success' && response.data) {
          // Check if DOMPurify is available
          if (typeof DOMPurify === 'undefined') {
            console.error('[OBI] DOMPurify not available, retrying...');
            setTimeout(initializeContentInjection, 100);
            return;
          }

          const sanitizedHtml = DOMPurify.sanitize(response.data, {
            ALLOWED_TAGS: ['iframe', 'script', 'div', 'img', 'a', 'p', 'span', 'h1', 'h2', 'h3', 'style', 'link'],
            ALLOWED_ATTR: ['src', 'href', 'class', 'style', 'id', 'title', 'alt', 'width', 'height'],
            ALLOWED_URI_REGEXP: /^https:\/\//,
            ADD_ATTR: ['sandbox'],
            FORBID_TAGS: ['object', 'applet'],
            FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
            ADD_TAGS: ['iframe'],
            ADD_ATTR: ['sandbox'],
          });
          
          const parser = new DOMParser();
          const doc = parser.parseFromString(sanitizedHtml, 'text/html');
          
          const iframes = doc.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
          });
          
          const contentDiv = document.getElementById('content');
          if (contentDiv) {
            contentDiv.innerHTML = doc.body.innerHTML;
            
            // Re-execute external scripts for widgets
            setTimeout(() => {
              const externalScripts = contentDiv.querySelectorAll('script[src]');
              externalScripts.forEach(oldScript => {
                if (oldScript.src && oldScript.src.startsWith('https://')) {
                  const newScript = document.createElement('script');
                  newScript.src = oldScript.src;
                  newScript.async = true;
                  oldScript.parentNode.replaceChild(newScript, oldScript);
                }
              });
            }, 50);
          }
        }
      }
    );
  }
  
  // Handle local.html pages with inscriptionId parameter
  if (window.location.href.includes('local.html')) {
    const params = new URLSearchParams(window.location.search);
    const inscriptionId = params.get('inscriptionId');
    
    if (inscriptionId) {
      chrome.runtime.sendMessage(
        {
          type: 'FETCH_CONTENT',
          inscriptionId: inscriptionId
        },
        response => {
          if (response && response.status === 'success' && response.data) {
            // Check if DOMPurify is available
            if (typeof DOMPurify === 'undefined') {
              console.error('[OBI] DOMPurify not available, retrying...');
              setTimeout(initializeContentInjection, 100);
              return;
            }

            const sanitizedHtml = DOMPurify.sanitize(response.data, {
              ALLOWED_TAGS: ['iframe', 'script', 'div', 'img', 'a', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'style', 'link', 'br', 'hr', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'canvas', 'svg', 'path', 'g', 'circle', 'rect', 'text'],
              ALLOWED_ATTR: ['src', 'href', 'class', 'style', 'id', 'title', 'alt', 'width', 'height', 'target', 'rel', 'type', 'charset', 'async', 'defer', 'crossorigin', 'integrity'],
              ALLOWED_URI_REGEXP: /^https:\/\//,
              ADD_TAGS: ['iframe', 'script'],
              FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
              KEEP_CONTENT: true
            });
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(sanitizedHtml, 'text/html');
            
            const iframes = doc.querySelectorAll('iframe');
            iframes.forEach(iframe => {
              iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
            });
            
            const contentDiv = document.getElementById('content');
            if (contentDiv) {
              contentDiv.innerHTML = doc.body.innerHTML;
              
              // Re-execute external scripts for widgets
              setTimeout(() => {
                const externalScripts = contentDiv.querySelectorAll('script[src]');
                externalScripts.forEach(oldScript => {
                  if (oldScript.src && oldScript.src.startsWith('https://')) {
                    const newScript = document.createElement('script');
                    newScript.src = oldScript.src;
                    newScript.async = true;
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                  }
                });
              }, 50);
            }
          } else {
            document.getElementById('content').innerHTML = '<p>Failed to load inscription content.</p>';
          }
        }
      );
    } else {
      document.getElementById('content').innerHTML = '<p>No inscription ID provided.</p>';
    }
  }
}

// Initialize with retry mechanism
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentInjection);
} else {
  initializeContentInjection();
}