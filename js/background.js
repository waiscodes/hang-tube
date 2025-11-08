// Service Worker (Background Script) for Manifest V3
chrome.runtime.onInstalled.addListener(() => {
  console.log('Hang Tube extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    installed: true,
    clickCount: 0
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('background onMessage received', request, 'from', sender && (sender.id || sender.tab && sender.tab.id));
  if (request.action === 'getData') {
    chrome.storage.sync.get(['clickCount'], (result) => {
      sendResponse({ count: result.clickCount || 0 });
    });
    return true; // Required for async sendResponse
  }
  // Fetch transcript from a local server and save it
  if (request.action === 'FETCH_TRANSCRIPT') {
    console.log('background: FETCH_TRANSCRIPT requested, url=', request.url);
    const url = request.url || 'http://127.0.0.1:5000/transcript';
    fetchTranscript(url)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true; // Will respond asynchronously
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
  }
});

// Helper: fetch JSON from the given URL and store it in chrome.storage.local
async function fetchTranscript(url, { timeout = 15000 } = {}) {
  console.log('fetchTranscript: starting fetch to', url);
  // Simple timeout helper
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    console.log('fetchTranscript: fetch completed, status=', resp.status);
    clearTimeout(id);
    if (!resp.ok) throw new Error('Network response was not ok: ' + resp.status);
    // Some endpoints may return plain text JSON or JSON; attempt to parse
    const data = await resp.json();
    // Save to local storage so other parts of the extension can read it
    chrome.storage.local.set({ transcript: data, transcript_ts: Date.now() }, () => {
      console.log('Transcript saved to chrome.storage.local');
    });
    return data;
  } catch (err) {
    clearTimeout(id);
    console.error('fetchTranscript error', err.name, err.message || err);
    throw err;
  }
}

