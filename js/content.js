// Content Script - runs in the context of web pages
console.log('Hang Tube content script loaded');

// Blur the YouTube video title
function blurVideoTitle() {
  // Target the title element - multiple selectors to catch different YouTube layouts
  const titleSelectors = [
    'h1.style-scope.ytd-watch-metadata yt-formatted-string',
    'h1.ytd-watch-metadata yt-formatted-string',
    '#title yt-formatted-string',
    'yt-formatted-string[title]'
  ];

  const style = document.createElement('style');
  style.id = 'hang-tube-title-blur';
  style.textContent = `
    /* Blur the video title */
    h1.style-scope.ytd-watch-metadata yt-formatted-string,
    h1.ytd-watch-metadata yt-formatted-string,
    #title yt-formatted-string,
    ytd-watch-metadata h1 yt-formatted-string {
      filter: blur(5px) !important;
      -webkit-filter: blur(5px) !important;
      user-select: none !important;
      pointer-events: none !important;
    }
  `;
  
  // Remove existing style if present
  const existingStyle = document.getElementById('hang-tube-title-blur');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  document.head.appendChild(style);
  
  // Also try to blur dynamically if title loads later
  const observer = new MutationObserver(() => {
    titleSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.filter = 'blur(5px)';
        el.style.webkitFilter = 'blur(5px)';
        el.style.userSelect = 'none';
        el.style.pointerEvents = 'none';
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Apply blur when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', blurVideoTitle);
} else {
  blurVideoTitle();
}

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

// Auto-popup functionality - show popup after 5 seconds
function createAutoPopup() {
  // Check if popup already exists
  if (document.getElementById('hang-tube-auto-popup')) {
    return;
  }

  // Create overlay backdrop
  const overlay = document.createElement('div');
  overlay.id = 'hang-tube-popup-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-in;
  `;

  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'hang-tube-auto-popup';
  popup.style.cssText = `
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    width: 350px;
    max-height: 80vh;
    overflow-y: auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    animation: slideIn 0.3s ease-out;
    position: relative;
  `;

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Popup content (matching popup.html structure)
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h1 style="font-size: 24px; font-weight: 600; color: #333; margin: 0;">Hang Tube</h1>
      <button id="hang-tube-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
    </div>
    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <button id="hang-tube-action-btn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Action</button>
      <button id="hang-tube-fetch-btn" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Fetch Transcript</button>
    </div>
    <div id="hang-tube-status" style="margin-top: 12px; color: #333; font-size: 14px;">Status: idle</div>
    
    <!-- Multiple Choice Question -->
    <div id="hang-tube-question-container" style="margin-top:20px;padding:16px;background:#f5f5f5;border-radius:8px;border:1px solid #e0e0e0">
      <h2 style="font-size:16px;font-weight:600;color:#333;margin-bottom:12px">Question:</h2>
      <p id="hang-tube-question-text" style="font-size:14px;color:#555;margin-bottom:16px">What is the main topic of this video?</p>
      <div id="hang-tube-answers-container" style="display:flex;flex-direction:column;gap:8px">
        <button class="hang-tube-answer-btn" data-answer="0" style="padding:10px 12px;background:#fff;border:2px solid #ddd;border-radius:6px;cursor:pointer;text-align:left;font-size:14px;transition:all 0.2s">Apple is paying Google to fix Siri</button>
        <button class="hang-tube-answer-btn" data-answer="1" style="padding:10px 12px;background:#fff;border:2px solid #ddd;border-radius:6px;cursor:pointer;text-align:left;font-size:14px;transition:all 0.2s">Google is developing a new AI assistant</button>
        <button class="hang-tube-answer-btn" data-answer="2" style="padding:10px 12px;background:#fff;border:2px solid #ddd;border-radius:6px;cursor:pointer;text-align:left;font-size:14px;transition:all 0.2s">Apple is launching a new iPhone model</button>
      </div>
      <div id="hang-tube-question-feedback" style="margin-top:12px;font-size:14px;font-weight:600;display:none"></div>
    </div>
    
    <div style="margin-top: 12px;">
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <strong style="font-size: 14px;">Transcript</strong>
        <button id="hang-tube-download-btn" style="margin-left: auto; padding: 6px 12px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Download JSON</button>
      </div>
      <pre id="hang-tube-transcript-viewer" style="max-height: 260px; overflow: auto; background: #fafafa; padding: 8px; border: 1px solid #e0e0e0; margin-top: 8px; white-space: pre-wrap; word-break: break-word; font-size: 12px; font-family: monospace;"></pre>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Load saved data
  chrome.storage.sync.get(['clickCount'], (result) => {
    const count = result.clickCount || 0;
    const statusEl = document.getElementById('hang-tube-status');
    if (count > 0 && statusEl) {
      statusEl.textContent = `Button clicked ${count} times`;
    }
  });

  chrome.storage.local.get(['transcript', 'transcript_ts'], (res) => {
    const viewer = document.getElementById('hang-tube-transcript-viewer');
    const statusEl = document.getElementById('hang-tube-status');
    if (res && res.transcript && viewer) {
      try {
        viewer.textContent = JSON.stringify(res.transcript, null, 2);
      } catch (e) {
        viewer.textContent = String(res.transcript);
      }
      if (statusEl) {
        const ts = res.transcript_ts ? new Date(res.transcript_ts).toLocaleString() : 'unknown';
        statusEl.textContent = `Status: loaded saved transcript (${ts})`;
      }
    }
  });

  // Close button handler
  const closeBtn = document.getElementById('hang-tube-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
  }

  // Close on overlay click (outside popup)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  // Action button handler
  const actionBtn = document.getElementById('hang-tube-action-btn');
  if (actionBtn) {
    actionBtn.addEventListener('click', async () => {
      chrome.storage.sync.get(['clickCount'], (result) => {
        const count = (result.clickCount || 0) + 1;
        chrome.storage.sync.set({ clickCount: count });
        const statusEl = document.getElementById('hang-tube-status');
        if (statusEl) {
          statusEl.textContent = `Button clicked ${count} times`;
        }
      });
      // Notify background/content script
      chrome.runtime.sendMessage({ action: 'buttonClicked' });
    });
  }

  // Fetch button handler
  const fetchBtn = document.getElementById('hang-tube-fetch-btn');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', async () => {
      const statusEl = document.getElementById('hang-tube-status');
      const viewer = document.getElementById('hang-tube-transcript-viewer');
      if (statusEl) statusEl.textContent = 'Status: fetching...';
      
      try {
        const resp = await fetch('http://127.0.0.1:5000/transcript', { method: 'GET' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        
        chrome.storage.local.set({ transcript: data, transcript_ts: Date.now() }, () => {
          console.log('transcript saved to local storage');
        });
        
        if (viewer) {
          try {
            viewer.textContent = JSON.stringify(data, null, 2);
          } catch (e) {
            viewer.textContent = String(data);
          }
        }
        
        if (statusEl) {
          const summary = Array.isArray(data) ? data.length + ' items' : 'data received';
          statusEl.textContent = 'Status: fetched and saved (' + summary + ')';
        }
      } catch (err) {
        console.error('fetch error', err);
        if (statusEl) {
          statusEl.textContent = 'Status: fetch error: ' + (err && err.message ? err.message : String(err));
        }
      }
    });
  }

  // Download button handler
  const downloadBtn = document.getElementById('hang-tube-download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      chrome.storage.local.get(['transcript'], (res) => {
        const data = res && res.transcript ? res.transcript : null;
        const statusEl = document.getElementById('hang-tube-status');
        if (!data) {
          if (statusEl) statusEl.textContent = 'Status: no transcript to download';
          return;
        }
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.json';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (statusEl) statusEl.textContent = 'Status: download started';
      });
    });
  }

  // Multiple choice question handler
  const answerButtons = popup.querySelectorAll('.hang-tube-answer-btn');
  const questionFeedback = document.getElementById('hang-tube-question-feedback');
  const correctAnswer = 0; // First answer is correct

  answerButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedAnswer = parseInt(btn.dataset.answer);
      const isCorrect = selectedAnswer === correctAnswer;

      // Disable all buttons
      answerButtons.forEach((b) => {
        b.style.pointerEvents = 'none';
        if (parseInt(b.dataset.answer) === correctAnswer) {
          b.style.background = '#4CAF50';
          b.style.color = '#fff';
          b.style.borderColor = '#4CAF50';
        } else if (parseInt(b.dataset.answer) === selectedAnswer && !isCorrect) {
          b.style.background = '#f44336';
          b.style.color = '#fff';
          b.style.borderColor = '#f44336';
        } else {
          b.style.opacity = '0.6';
        }
      });

      // Show feedback
      if (questionFeedback) {
        questionFeedback.style.display = 'block';
        questionFeedback.textContent = isCorrect ? '✓ Correct!' : '✗ Wrong! The correct answer is: Apple is paying Google to fix Siri';
        questionFeedback.style.color = isCorrect ? '#4CAF50' : '#f44336';
      }
    });

    // Hover effect
    btn.addEventListener('mouseenter', () => {
      if (btn.style.pointerEvents !== 'none') {
        btn.style.borderColor = '#4CAF50';
        btn.style.background = '#f0f8f0';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (btn.style.pointerEvents !== 'none') {
        btn.style.borderColor = '#ddd';
        btn.style.background = '#fff';
      }
    });
  });
}

// Wait for page to be fully loaded, then show popup after 5 seconds
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(createAutoPopup, 5000);
  });
} else {
  setTimeout(createAutoPopup, 5000);
}

