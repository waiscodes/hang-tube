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
  if (request.action === 'getData') {
    chrome.storage.sync.get(['clickCount'], (result) => {
      sendResponse({ count: result.clickCount || 0 });
    });
    return true; // Required for async sendResponse
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
  }
});

