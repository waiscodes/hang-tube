// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');

  // Quiz configuration array - same as in content.js
  const quizzes = [
    {
      id: 'quiz-1',
      title: 'Hang Tube',
      question: 'What is the main topic of this video?',
      answers: [
        'Apple is paying Google to fix Siri',
        'Google is developing a new AI assistant',
        'Apple is launching a new iPhone model'
      ],
      correctAnswerIndex: 0,
      delay: 5000,
      punishment: null
    },
    {
      id: 'quiz-2',
      title: 'Second Quiz',
      question: 'What is the capital of France?',
      answers: [
        'London',
        'Paris',
        'Berlin'
      ],
      correctAnswerIndex: 1,
      delay: 15000,
      punishment: 'shrinkVideoPlayer'
    }
    // Add more quizzes here as needed
  ];

  // Select a random question from the quizzes array
  function selectRandomQuiz() {
    if (quizzes.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * quizzes.length);
    return quizzes[randomIndex];
  }

  // Populate question from selected quiz
  const selectedQuiz = selectRandomQuiz();
  if (!selectedQuiz) {
    console.error('No quizzes available');
    return;
  }

  const questionText = document.getElementById('question-text');
  const answersContainer = document.getElementById('answers-container');
  const questionFeedback = document.getElementById('question-feedback');

  // Set question text
  if (questionText) {
    questionText.textContent = selectedQuiz.question;
  }

  // Multiple choice question handler
  const correctAnswer = selectedQuiz.correctAnswerIndex;
  const correctAnswerText = selectedQuiz.answers[correctAnswer];

  // Generate answer buttons and attach event listeners
  if (answersContainer) {
    answersContainer.innerHTML = '';
    selectedQuiz.answers.forEach((answer, index) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.dataset.answer = index.toString();
      btn.textContent = answer;
      btn.style.cssText = 'padding:10px 12px;background:#fff;border:2px solid #ddd;border-radius:6px;cursor:pointer;text-align:left;font-size:14px;transition:all 0.2s';
      
      // Add click handler
      btn.addEventListener('click', () => {
        const selectedAnswer = parseInt(btn.dataset.answer);
        const isCorrect = selectedAnswer === correctAnswer;

        // Disable all buttons
        const allButtons = document.querySelectorAll('.answer-btn');
        allButtons.forEach((b) => {
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
          questionFeedback.textContent = isCorrect ? '✓ Correct!' : `✗ Wrong! The correct answer is: ${correctAnswerText}`;
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
});

