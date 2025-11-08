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
  // Generate quiz questions using DeepSeek (external API)
  if (request.action === 'GENERATE_QUIZ') {
    // request can include: transcript (optional), options: { numQuestions, difficulty, format, endpoint, apiKey }
    (async () => {
      try {
        const opts = request.options || {};
        // Try provided API key first, then fallback to stored one
        const providedKey = opts.apiKey || request.apiKey;
        const getStoredKey = () => new Promise((resolve) => {
          chrome.storage.sync.get(['deepseek_apiKey'], (res) => resolve(res && res.deepseek_apiKey));
        });

        let apiKey = providedKey;
        if (!apiKey) apiKey = await getStoredKey();

        if (!apiKey) {
          sendResponse({ ok: false, error: 'Missing DeepSeek API key. Provide in request.options.apiKey or save to chrome.storage.sync.deepseek_apiKey' });
          return;
        }

        // Obtain transcript: prefer request.transcript, then stored transcript
        let transcript = request.transcript;
        if (!transcript) {
          const stored = await new Promise((resolve) => chrome.storage.local.get(['transcript'], (r) => resolve(r && r.transcript)));
          transcript = stored;
        }
        if (!transcript) {
          sendResponse({ ok: false, error: 'No transcript provided or stored' });
          return;
        }

        // If endpoint or numQuestions aren't provided in opts, try to read saved options
        const savedCfg = await new Promise((resolve) => chrome.storage.sync.get(['deepseek_endpoint', 'numQuestions'], (r) => resolve(r || {})));
        const finalOpts = Object.assign({}, { apiKey }, savedCfg, opts);

        const quiz = await generateQuizFromTranscript(transcript, finalOpts);
        // Grab assistant text (LLM response) if present so callers can see it directly
        const assistantText = (quiz && quiz.raw && quiz.raw.assistant) || quiz.assistant_text || null;
        if (assistantText) {
          console.log('LLM assistant output:', assistantText);
        } else {
          console.log('No assistant text found in quiz.raw');
        }
        // Save quiz and LLM response to local storage
        chrome.storage.local.set({ quiz, quiz_ts: Date.now(), llm_response: assistantText, llm_ts: Date.now() }, () => {
          console.log('Quiz and LLM response saved to chrome.storage.local');
        });
        sendResponse({ ok: true, quiz, llm_response: assistantText });
      } catch (err) {
        console.error('GENERATE_QUIZ error', err);
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true; // async response
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


/**
 * generateQuizFromTranscript
 * Sends transcript to DeepSeek (or another endpoint) to generate quiz questions.
 * Assumptions made:
 * - DeepSeek exposes a JSON HTTP endpoint that accepts POST { transcript, options }
 * - The endpoint requires an Authorization: Bearer <API_KEY> header
 * - The response is JSON and contains either { questions: [...] } or a similar payload
 *
 * Inputs:
 * - transcript: string or structured transcript object
 * - opts: { apiKey, endpoint, numQuestions, difficulty, format, timeout }
 * Output:
 * - normalized quiz object: { questions: [{ q, choices, answer, meta }], meta }
 */
async function generateQuizFromTranscript(transcript, opts = {}) {
  const {
    apiKey = "sk-35db146d53f0444fb7335c31dc0b4a3b",
    endpoint = 'https://api.deepseek.ai/v1/quiz/generate',
    numQuestions = 5,
    difficulty = 'medium',
    format = 'multiple-choice',
    timeout = 20000
  } = opts;

  if (!apiKey) throw new Error('Missing API key for DeepSeek');

  const payload = {
    transcript,
    options: {
      numQuestions,
      difficulty,
      format
    }
  };

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    // If the requested endpoint doesn't exist (e.g. DeepSeek) or the caller
    // explicitly requests prompt-engineering, fallback to calling an LLM
    // (OpenAI Chat Completions) with a prompt that asks for absurd questions.
    const usePromptEngine = !!opts.usePromptEngine || /deepseek/i.test(endpoint) || /prompt-engine/i.test(opts.promptEngine) || /openai/i.test(endpoint);

    if (usePromptEngine) {
      // Determine which chat endpoint to call. If the configured endpoint points to DeepSeek,
      // use that endpoint and the DeepSeek model (`deepseek-chat`) and request shape.
      const rawEndpoint = (opts.openaiEndpoint || endpoint || '').toString();
      const isDeepseekChat = /deepseek\.com|deepseek\.ai/.test(rawEndpoint.toLowerCase());

      const openaiEndpoint = rawEndpoint || 'https://api.openai.com/v1/chat/completions';
      const model = opts.model || (isDeepseekChat ? 'deepseek-chat' : 'gpt-3.5-turbo');
      const temperature = typeof opts.temperature !== 'undefined' ? opts.temperature : 0.9;

      const systemPrompt = "You are a creative quiz generator. Given a video transcript, produce absurd, funny, surprising multiple-choice questions about the video. Return ONLY valid JSON and nothing else. The JSON must follow this exact shape:\n{\n  \"questions\": [\n    { \"q\": string, \"choices\": [string], \"answer\": number (index into choices) or string, \"meta\": { } }\n  ]\n}\nMake sure to return exactly the number of questions requested and keep choices reasonable (3-5 per question).";

      const userPrompt = `Transcript:\n${typeof transcript === 'string' ? transcript : JSON.stringify(transcript)}\n\nInstructions:\n- Generate ${numQuestions} absurd multiple-choice questions about the video described by the transcript.\n- Be playful and surprising; make some questions intentionally silly or unexpected.\n- Provide 3-5 choices for each question and indicate the correct answer by index or exact choice text.\n- Output must be valid JSON matching the schema in the system prompt and nothing else.`;

      // Prepare request payload for chat completions. DeepSeek expects { model, messages, stream:false }
      const chatBody = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: opts.max_tokens || 1000,
        stream: false
      };

      const resp = await fetch(openaiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(chatBody),
        signal: controller.signal
      });
      clearTimeout(id);
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error('LLM API error: ' + resp.status + ' ' + text);
      }

      const data = await resp.json();
      // The assistant content is expected to be JSON text in choices[0].message.content (same shape as OpenAI/DeepSeek)
      const assistant = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

      let parsed = null;
      try {
        parsed = JSON.parse(assistant);
      } catch (parseErr) {
        // Try to extract JSON substring in case of stray text
        const m = assistant.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            parsed = JSON.parse(m[0]);
          } catch (e) {
            // fallthrough
          }
        }
      }

      let questions = [];
      if (parsed && Array.isArray(parsed.questions)) {
        questions = parsed.questions.map((q) => ({
          q: q.q || q.question || '',
          choices: q.choices || q.options || [],
          answer: typeof q.answer === 'number' || typeof q.answer === 'string' ? q.answer : null,
          meta: q.meta || {}
        }));
      } else {
        // If parsing failed, fall back to returning the raw assistant output as a single meta entry
        questions = [];
      }

      const quiz = {
        source: openaiEndpoint,
        engine: 'openai',
        model,
        questions,
        raw: { assistant, apiResponse: data },
        options: { numQuestions, difficulty, format, temperature },
        generated_ts: Date.now()
      };
      return quiz;
    }

    // Otherwise, call the provided endpoint directly (legacy behavior)
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(id);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error('DeepSeek API error: ' + resp.status + ' ' + text);
    }
    const data = await resp.json();

    // Normalize the response into a simple quiz shape
    let questions = [];
    if (Array.isArray(data.questions)) {
      questions = data.questions.map((q) => ({
        q: q.question || q.q || q.prompt || '',
        choices: q.choices || q.options || [],
        answer: q.answer || q.correct || null,
        meta: q.meta || {}
      }));
    } else if (data.generated && Array.isArray(data.generated.questions)) {
      questions = data.generated.questions;
    } else {
      // Try to coerce simple formats
      if (data.text && typeof data.text === 'string') {
        // Not much we can do; return an empty questions array with raw text
        questions = [];
      }
    }

    const quiz = {
      source: endpoint,
      questions,
      raw: data,
      options: { numQuestions, difficulty, format },
      generated_ts: Date.now()
    };
    return quiz;
  } catch (err) {
    clearTimeout(id);
    console.error('generateQuizFromTranscript error', err && err.message || err);
    throw err;
  }
}

