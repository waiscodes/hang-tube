// Options page script
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  const defaultSetting = document.getElementById('defaultSetting');
  const saveStatus = document.getElementById('saveStatus');
  const deepseekApiKey = document.getElementById('deepseekApiKey');
  const deepseekEndpoint = document.getElementById('deepseekEndpoint');
  const numQuestions = document.getElementById('numQuestions');
  const validateBtn = document.getElementById('validateBtn');
  const validateStatus = document.getElementById('validateStatus');

  // Load saved options
  chrome.storage.sync.get(['defaultSetting'], (result) => {
    if (result.defaultSetting) {
      defaultSetting.value = result.defaultSetting;
    }
  });
  // Load saved DeepSeek / API key and endpoint
  chrome.storage.sync.get(['deepseek_apiKey', 'deepseek_endpoint', 'numQuestions'], (res) => {
    if (res.deepseek_apiKey) deepseekApiKey.value = res.deepseek_apiKey;
    if (res.deepseek_endpoint) deepseekEndpoint.value = res.deepseek_endpoint;
    if (res.numQuestions) numQuestions.value = res.numQuestions;
  });

  // Save options
  saveBtn.addEventListener('click', () => {
    const value = defaultSetting.value;
    const key = deepseekApiKey.value && deepseekApiKey.value.trim();
    const endpoint = deepseekEndpoint.value && deepseekEndpoint.value.trim();
    const nQ = Number(numQuestions.value) || 5;

    chrome.storage.sync.set({ defaultSetting: value, deepseek_apiKey: key, deepseek_endpoint: endpoint, numQuestions: nQ }, () => {
      saveStatus.textContent = 'Options saved!';
      saveStatus.style.color = '#4CAF50';

      setTimeout(() => {
        saveStatus.textContent = '';
      }, 2000);
    });
  });

  // Validate the saved API key/endpoint by making a small POST request
  validateBtn.addEventListener('click', async () => {
    validateStatus.textContent = 'Validating...';
    validateStatus.style.color = '#333';

    const keyVal = deepseekApiKey.value && deepseekApiKey.value.trim();
    const endpointVal = deepseekEndpoint.value && deepseekEndpoint.value.trim() || 'https://api.deepseek.ai/v1/quiz/generate';

    if (!keyVal) {
      validateStatus.textContent = 'Please provide an API key first.';
      validateStatus.style.color = '#d9534f';
      return;
    }

    // Simple test payload
    const payload = { transcript: 'Test transcript for validation', options: { numQuestions: 1 } };

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch(endpointVal, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + keyVal
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(id);

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        validateStatus.textContent = `Validation failed: ${resp.status} ${resp.statusText} ${text}`;
        validateStatus.style.color = '#d9534f';
        return;
      }

      // Try to read JSON or text
      let body = null;
      try { body = await resp.json(); } catch (e) { body = await resp.text().catch(() => ''); }

      validateStatus.textContent = 'Validation succeeded — endpoint reachable and key accepted.';
      validateStatus.style.color = '#4CAF50';
    } catch (err) {
      clearTimeout(id);
      console.error('Validation error', err);
      validateStatus.textContent = 'Validation error: ' + (err && err.message ? err.message : String(err));
      validateStatus.style.color = '#d9534f';
    }
  });
});

