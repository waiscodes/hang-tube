// Content Script - runs in the context of web pages
console.log('Hang Tube content script loaded');

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'buttonClicked') {
    console.log('Button clicked from popup!');
    
    // Example: Change page background color temporarily
    document.body.style.transition = 'background-color 0.3s';
    document.body.style.backgroundColor = '#f0f0f0';
    
    setTimeout(() => {
      document.body.style.backgroundColor = '';
    }, 1000);
    
    sendResponse({ success: true });
  }
  
  return true;
});

// Example: Add a visual indicator
const indicator = document.createElement('div');
indicator.id = 'hang-tube-indicator';
indicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #4CAF50;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10000;
  display: none;
`;
indicator.textContent = 'Hang Tube Active';
document.body.appendChild(indicator);

