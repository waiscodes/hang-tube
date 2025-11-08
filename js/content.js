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

// Punishment functions
const punishments = {
  shrinkVideoPlayer: () => {
    const player = document.getElementById('player');
    if (player) {
      player.style.transform = 'scale(0.5)';
      player.style.transformOrigin = 'top left';
      player.style.transition = 'transform 0.3s ease-in-out';
      console.log('Video player shrunk to 50%');
    } else {
      console.warn('Video player element not found');
      // Try to find it with a delay in case it loads later
      setTimeout(() => {
        const playerRetry = document.getElementById('player');
        if (playerRetry) {
          playerRetry.style.transform = 'scale(0.5)';
          playerRetry.style.transformOrigin = 'top left';
          playerRetry.style.transition = 'transform 0.3s ease-in-out';
        }
      }, 500);
    }
  },
  makeScreenRed: () => {
    // Create a red overlay that covers the entire screen
    let redOverlay = document.getElementById('hang-tube-red-overlay');
    if (!redOverlay) {
      redOverlay = document.createElement('div');
      redOverlay.id = 'hang-tube-red-overlay';
      redOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: red;
        opacity: 0.3;
        z-index: 99999;
        pointer-events: none;
        transition: opacity 0.5s ease-in-out;
      `;
      document.body.appendChild(redOverlay);
    } else {
      // If overlay already exists, just make sure it's visible
      redOverlay.style.opacity = '0.3';
    }
    console.log('Screen turned red');
  },
  // Add more punishment functions here as needed
  // blurVideo: () => { ... },
  // pauseVideo: () => { ... },
};

// Function to get YouTube video ID from the current page URL
function getYouTubeVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// Function to fetch questions from the Python server
async function fetchQuestionsFromServer(videoId) {
  try {
    const response = await fetch('http://127.0.0.1:5001/generate_questions_for_video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ video_id: videoId })
    });
    
    if (!response.ok) {
      // Try to get the error message from the response
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = `Server error: ${errorData.error}`;
        }
      } catch (e) {
        // If we can't parse the error response, use the status code
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching questions from server:', error);
    throw error;
  }
}

// Track wrong guesses to apply stronger punishments after second wrong guess
let wrongGuessCounter = 0;

// Function to transform server question format to quiz format
function transformServerQuestionToQuiz(serverQuestion, index) {
  const choiceMap = { 'A': 0, 'B': 1, 'C': 2 };
  const correctAnswerKey = serverQuestion.correct_answer;
  const correctAnswerIndex = choiceMap[correctAnswerKey] || 0;
  
  // Generate unique ID using counter
  quizCounter++;
  const uniqueId = `quiz-${quizCounter}`;
  
  return {
    id: uniqueId,
    title: `Hang Tube Quiz ${index + 1}`,
    question: serverQuestion.question,
    answers: [
      serverQuestion.choices.A,
      serverQuestion.choices.B,
      serverQuestion.choices.C
    ],
    correctAnswerIndex: correctAnswerIndex,
    punishment: 'shrinkVideoPlayer' // Default punishment
  };
}

// Quiz configuration array - will be populated from server
let quizzes = [];

// Quiz queue and state management
let quizQueue = [];
let isQuizShowing = false;
let quizTimer = null;
let quizCounter = 0; // Counter for unique quiz IDs

// Function to show the next quiz from the queue
function showNextQuiz() {
  // If there's already a quiz showing or timer running, don't show another
  if (isQuizShowing || quizTimer !== null) {
    return;
  }
  
  // If queue is empty, nothing to show
  if (quizQueue.length === 0) {
    return;
  }
  
  // Get the next quiz from the queue
  const nextQuiz = quizQueue.shift();
  
  // Mark that we're showing a quiz before creating it
  isQuizShowing = true;
  
  // Create and show the quiz
  createQuiz(nextQuiz);
}

// Function to schedule the next quiz after 5 seconds
function scheduleNextQuiz() {
  // Clear any existing timer
  if (quizTimer !== null) {
    clearTimeout(quizTimer);
    quizTimer = null;
  }
  
  // Wait 5 seconds before showing the next quiz
  quizTimer = setTimeout(() => {
    quizTimer = null;
    isQuizShowing = false;
    showNextQuiz();
  }, 5000);
}

// Generic quiz creation function
function createQuiz(quizData) {
  // Check if quiz already exists
  if (document.getElementById(`hang-tube-quiz-${quizData.id}`)) {
    return;
  }

  // Extract quiz index from id (e.g., "quiz-1" -> 1)
  const quizIndex = parseInt(quizData.id.replace('quiz-', '')) || 0;
  
  // Create overlay backdrop
  const overlay = document.createElement('div');
  overlay.id = `hang-tube-quiz-overlay-${quizData.id}`;
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: ${100000 + quizIndex};
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-in;
  `;

  // Create popup container
  const popup = document.createElement('div');
  popup.id = `hang-tube-quiz-${quizData.id}`;
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

  // Add CSS animations if not already added
  if (!document.getElementById('hang-tube-quiz-animations')) {
    const style = document.createElement('style');
    style.id = 'hang-tube-quiz-animations';
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
  }

  // Generate answer buttons HTML
  const answersHTML = quizData.answers.map((answer, index) => 
    `<button class="hang-tube-quiz-answer-btn" data-quiz-id="${quizData.id}" data-answer="${index}" style="padding:10px 12px;background:#fff;border:2px solid #ddd;border-radius:6px;cursor:pointer;text-align:left;font-size:14px;transition:all 0.2s">${answer}</button>`
  ).join('');

  // Popup content
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h1 style="font-size: 24px; font-weight: 600; color: #333; margin: 0;">${quizData.title}</h1>
      <button id="hang-tube-quiz-close-${quizData.id}" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
    </div>
    
    <!-- Multiple Choice Question -->
    <div id="hang-tube-question-container-${quizData.id}" style="margin-top:20px;padding:16px;background:#f5f5f5;border-radius:8px;border:1px solid #e0e0e0">
      <h2 style="font-size:16px;font-weight:600;color:#333;margin-bottom:12px">Question:</h2>
      <p id="hang-tube-question-text-${quizData.id}" style="font-size:14px;color:#555;margin-bottom:16px">${quizData.question}</p>
      <div id="hang-tube-answers-container-${quizData.id}" style="display:flex;flex-direction:column;gap:8px">
        ${answersHTML}
      </div>
      <div id="hang-tube-question-feedback-${quizData.id}" style="margin-top:12px;font-size:14px;font-weight:600;display:none"></div>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Function to close the quiz and schedule the next one
  const closeQuiz = () => {
    overlay.remove();
    isQuizShowing = false;
    scheduleNextQuiz();
  };

  // Close button handler
  const closeBtn = document.getElementById(`hang-tube-quiz-close-${quizData.id}`);
  if (closeBtn) {
    closeBtn.addEventListener('click', closeQuiz);
  }

  // Close on overlay click (outside popup)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeQuiz();
    }
  });

  // Answer button handlers
  const answerButtons = popup.querySelectorAll(`.hang-tube-quiz-answer-btn[data-quiz-id="${quizData.id}"]`);
  const questionFeedback = document.getElementById(`hang-tube-question-feedback-${quizData.id}`);

  answerButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedAnswer = parseInt(btn.dataset.answer);
      const isCorrect = selectedAnswer === quizData.correctAnswerIndex;

      // Disable all buttons
      answerButtons.forEach((b) => {
        b.style.pointerEvents = 'none';
        if (parseInt(b.dataset.answer) === quizData.correctAnswerIndex) {
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
        const correctAnswerText = quizData.answers[quizData.correctAnswerIndex];
        questionFeedback.textContent = isCorrect ? '✓ Correct!' : `✗ Wrong! The correct answer is: ${correctAnswerText}`;
        questionFeedback.style.color = isCorrect ? '#4CAF50' : '#f44336';
      }

      // Apply punishment if wrong answer
      if (!isCorrect) {
        // Update the wrong guess counter
        wrongGuessCounter++;
        
        // Apply appropriate punishment based on number of wrong guesses
        if (wrongGuessCounter >= 2) {
          // Apply more severe punishment after second wrong guess
          if (punishments.makeScreenRed) {
            punishments.makeScreenRed();
          }
          // Also apply the original punishment
          if (quizData.punishment && punishments[quizData.punishment]) {
            punishments[quizData.punishment]();
          }
        } else {
          // Apply the original punishment for first wrong guess
          if (quizData.punishment && punishments[quizData.punishment]) {
            punishments[quizData.punishment]();
          }
        }
      } else {
        // If correct answer, reset the counter
        wrongGuessCounter = 0;
      }
      
      // Close the quiz after showing feedback (wait a bit for user to see it)
      setTimeout(() => {
        const overlay = document.getElementById(`hang-tube-quiz-overlay-${quizData.id}`);
        if (overlay) {
          overlay.remove();
          isQuizShowing = false;
          scheduleNextQuiz();
        }
      }, 2000); // Wait 2 seconds after answer to show feedback, then close
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

// Auto-popup functionality
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

  // Popup content
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h1 style="font-size: 24px; font-weight: 600; color: #333; margin: 0;">Hang Tube</h1>
      <button id="hang-tube-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
    </div>
    <div id="hang-tube-status" style="margin-top: 12px; color: #333; font-size: 14px;">Status: idle</div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

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
}

// Function to fetch and create quizzes from server
async function fetchAndCreateQuizzes() {
  try {
    // Get video ID from current page
    const videoId = getYouTubeVideoId(window.location.href);
    
    if (!videoId) {
      console.log('Not on a YouTube video page, skipping quiz fetch');
      return;
    }
    
    // Fetch questions from server
    const quizData = await fetchQuestionsFromServer(videoId);
    
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
      console.log('No questions received from server');
      return;
    }
    
    // Transform server questions to quiz format
    const fetchedQuizzes = quizData.questions.map((q, index) => transformServerQuestionToQuiz(q, index));
    
    // Add quizzes to the queue instead of creating them immediately
    fetchedQuizzes.forEach((quiz) => {
      // Check if quiz already exists in the DOM (avoid duplicates)
      if (!document.getElementById(`hang-tube-quiz-${quiz.id}`)) {
        quizQueue.push(quiz);
      }
    });
    
    // Try to show the next quiz if none is currently showing
    showNextQuiz();
  } catch (error) {
    console.error('Error fetching and creating quizzes:', error);
  }
}

// Initialize: fetch on load and then every 10 seconds
function initializeQuizzes() {
  // Fetch immediately on load
  fetchAndCreateQuizzes();
  
  // Then fetch every 10 seconds
  setInterval(() => {
    fetchAndCreateQuizzes();
  }, 10000);
}

// Wait for page to be fully loaded, then initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeQuizzes);
} else {
  initializeQuizzes();
}

