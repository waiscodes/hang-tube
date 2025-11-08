// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const questionText = document.getElementById('question-text');
  const answersContainer = document.getElementById('answers-container');
  const questionFeedback = document.getElementById('question-feedback');
  
  // Function to get YouTube video ID from the active tab
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
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching questions from server:', error);
      throw error;
    }
  }

  // Function to create quiz interface with dynamic questions
  function createQuizInterface(quizData) {
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
      questionText.textContent = 'No questions available';
      return;
    }
    
    // Select a random question from the generated questions
    const randomQuestion = quizData.questions[Math.floor(Math.random() * quizData.questions.length)];
    
    // Set question text
    questionText.textContent = randomQuestion.question;
    
    // Generate answer buttons and attach event listeners
    answersContainer.innerHTML = '';
    const choices = randomQuestion.choices;
    const correctAnswerKey = randomQuestion.correct_answer;
    
    // Create a mapping from (A, B, C) to (0, 1, 2) for indexing
    const choiceMap = { 'A': 0, 'B': 1, 'C': 2 };
    const choiceLabels = ['A', 'B', 'C'];
    
    // Create an array of choices in the right order
    const choiceArray = [
      { key: 'A', text: choices.A },
      { key: 'B', text: choices.B },
      { key: 'C', text: choices.C }
    ];
    
    choiceArray.forEach((choiceObj, index) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.dataset.answer = choiceObj.key; // 'A', 'B', or 'C'
      btn.textContent = `${choiceObj.key}. ${choiceObj.text}`;
      btn.style.cssText = 'padding:10px 12px;background:#fff;border:2px solid #ddd;border-radius:6px;cursor:pointer;text-align:left;font-size:14px;transition:all 0.2s';
      
      // Add click handler
      btn.addEventListener('click', () => {
        const selectedAnswer = btn.dataset.answer; // 'A', 'B', or 'C'
        const isCorrect = selectedAnswer === correctAnswerKey;

        // Disable all buttons
        const allButtons = document.querySelectorAll('.answer-btn');
        allButtons.forEach((b) => {
          b.style.pointerEvents = 'none';
          if (b.dataset.answer === correctAnswerKey) {
            b.style.background = '#4CAF50';
            b.style.color = '#fff';
            b.style.borderColor = '#4CAF50';
          } else if (b.dataset.answer === selectedAnswer && !isCorrect) {
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
          questionFeedback.textContent = isCorrect ? '✓ Correct!' : `✗ Wrong! The correct answer is: ${correctAnswerKey}. ${choices[correctAnswerKey]}`;
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

      answersContainer.appendChild(btn);
    });
  }

  // Main function to initialize the popup
  async function initPopup() {
    try {
      // Get the active tab's URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const videoId = getYouTubeVideoId(tab.url);
      
      if (!videoId) {
        questionText.textContent = 'Not on a YouTube video page';
        return;
      }
      
      // Show loading message
      questionText.textContent = 'Loading questions...';
      answersContainer.innerHTML = '<div style="padding: 10px; text-align: center;">Generating questions from video...</div>';
      
      // Fetch questions from the Python server
      const quizData = await fetchQuestionsFromServer(videoId);
      
      // Create the quiz interface with the fetched questions
      createQuizInterface(quizData);
    } catch (error) {
      console.error('Error initializing popup:', error);
      questionText.textContent = 'Error loading questions';
      answersContainer.innerHTML = `<div style="padding: 10px; color: #f44336;">${error.message}</div>`;
    }
  }
  
  // Initialize the popup
  initPopup();
});

