Open Bitmap Internet (OBI) Extension v1.1
Overview
This Chrome extension enables seamless resolution and redirection of .bitmap numeric addresses to their corresponding Ordinals inscriptions or content, using a round-robin approach across multiple public Ordinals explorers.
Features
•	.bitmap Name Resolution:
Looks up BNS names using the public BNS registry and resolves them to numeric addresses. This is purely for fun, see note at end of file.
•	Address to Inscription Resolution:
Uses the onchain index (OCI) to resolve numeric addresses to inscription IDs and determine if they are Bitmap or non-Bitmap content.
•	Round Robin Redirects:
For non-Bitmap content, users are redirected in a round-robin fashion to one of:
•	ordinals.com
•	ordiscan.com
•	static.unisat.io
•	Bitmap Content:
Bitmap content always redirects to ordinals.com/inscription/ID as they are the most robust informationally.
•	Error Handling:
Friendly error page for unresolved names or addresses.
•	No Local Content Hosting:
All content is served directly from public explorers; no local preview or content fetching.
How It Works
1.	User enters a .bitmap name or numeric address in the browser.
2.	The extension intercepts the navigation and resolves the name/address.
3.	If a Bitmap, redirects to ordinals.com/inscription/ID.
4.	If not a Bitmap, redirects to one of the three explorers above (cycling with each request).
5.	If not found, shows a styled error page.
Files
•	background.js – Handles redirect rules, header modifications, and .bitmap interception.
•	redirect.js – Main logic for name/address resolution and round robin redirect.
•	oci.js – On-chain index logic for address-to-inscription resolution.
•	error.html / error.js – Error page and logic.
•	manifest.json – Chrome extension manifest.
•	purify.min.js, redirect-ui.js, content.html, content.js, sandbox.html – Supporting files for UI and compatibility.
Installation
1.	Go to chrome://extensions in your browser.
2.	Enable "Developer mode".
3.	Click "Load unpacked" and select the v1.1/ directory.
4.	Use the extension by navigating to any .bitmap name or numeric address in your browser.
Notes
•	No API keys, tokens, or personal information are required or stored.
•	All redirects and lookups use public endpoints.
•	The round robin index is stored in localStorage for persistence across tabs and sessions.
•	If you would like your name included in the public registry email the dev to get it added manually. The names are
   intended for enjoyment and ease of use until consensus is reached. No monetary involvement needed until after consensus.
