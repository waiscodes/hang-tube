// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('actionBtn');
  const status = document.getElementById('status');
  const fetchBtn = document.getElementById('fetchBtn');
  const transcriptViewer = document.getElementById('transcriptViewer');
  const downloadBtn = document.getElementById('downloadBtn');

  // Load saved click count and transcript on popup open
  chrome.storage.sync.get(['clickCount'], (result) => {
    const count = result.clickCount || 0;
    if (count > 0) status.textContent = `Button clicked ${count} times`;
  });
  chrome.storage.local.get(['transcript', 'transcript_ts'], (res) => {
    if (res && res.transcript) {
      try { transcriptViewer.textContent = JSON.stringify(res.transcript, null, 2); }
      catch (e) { transcriptViewer.textContent = String(res.transcript); }
      const ts = res.transcript_ts ? new Date(res.transcript_ts).toLocaleString() : 'unknown';
      status.textContent = `Status: loaded saved transcript (${ts})`;
    }
  });

  // Handle Action button (existing behavior)
  actionBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.storage.sync.get(['clickCount'], (result) => {
      const count = (result.clickCount || 0) + 1;
      chrome.storage.sync.set({ clickCount: count });
      status.textContent = `Button clicked ${count} times`;
    });
    // Notify content script
    if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { action: 'buttonClicked' });
  });

  // Helper: fetch directly from popup (bypassing background) and save/display
  async function fetchDirect(apiUrl) {
    status.textContent = 'Status: fetching...';
    try {
      const resp = await fetch(apiUrl, { method: 'GET' });
      console.log('popup fetch status', resp.status);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      // save to local storage
      chrome.storage.local.set({ transcript: data, transcript_ts: Date.now() }, () => {
        console.log('popup: transcript saved to local storage');
      });
      try { transcriptViewer.textContent = JSON.stringify(data, null, 2); }
      catch (e) { transcriptViewer.textContent = String(data); }
      const summary = Array.isArray(data) ? data.length + ' items' : 'data received';
      status.textContent = 'Status: fetched and saved (' + summary + ')';
    } catch (err) {
      console.error('popup fetch error', err);
      status.textContent = 'Status: fetch error: ' + (err && err.message ? err.message : String(err));
    }
  }

  // Wire fetchBtn to perform direct fetch
  if (fetchBtn) {
    fetchBtn.addEventListener('click', () => {
      const apiUrl = 'http://127.0.0.1:5000/transcript';
      fetchDirect(apiUrl);
    });
  }

  // Wire download button
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      chrome.storage.local.get(['transcript'], (res) => {
        const data = res && res.transcript ? res.transcript : null;
        if (!data) { status.textContent = 'Status: no transcript to download'; return; }
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'transcript.json'; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        status.textContent = 'Status: download started';
      });
    });
  }

  // Multiple choice question handler
  const answerButtons = document.querySelectorAll('.answer-btn');
  const questionFeedback = document.getElementById('question-feedback');
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
      questionFeedback.style.display = 'block';
      questionFeedback.textContent = isCorrect ? '✓ Correct!' : '✗ Wrong! The correct answer is: Apple is paying Google to fix Siri';
      questionFeedback.style.color = isCorrect ? '#4CAF50' : '#f44336';
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
});

