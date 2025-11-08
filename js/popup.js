// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('actionBtn');
  const status = document.getElementById('status');

  // Load saved state
  chrome.storage.sync.get(['clickCount'], (result) => {
    const count = result.clickCount || 0;
    if (count > 0) {
      status.textContent = `Button clicked ${count} times`;
    }
  });

  // Handle button click
  actionBtn.addEventListener('click', async () => {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Update storage
    chrome.storage.sync.get(['clickCount'], (result) => {
      const count = (result.clickCount || 0) + 1;
      chrome.storage.sync.set({ clickCount: count });
      status.textContent = `Button clicked ${count} times`;
    });

    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'buttonClicked' });
  });
});

