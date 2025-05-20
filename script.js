document.addEventListener('DOMContentLoaded', () => {
	let lessons = [];
	let currentQuizVocab = [];
	let currentCardIndex = 0;
	const backToTop = document.getElementById('backToTop');

	// Show/hide back to top button
	window.onscroll = function () {
		if (
			document.body.scrollTop > 500 ||
			document.documentElement.scrollTop > 500
		) {
			backToTop.classList.add('visible');
		} else {
			backToTop.classList.remove('visible');
		}
	};

	// Scroll to top when button is clicked
	backToTop.addEventListener('click', () => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
	});
	let userProgress = JSON.parse(localStorage.getItem('userProgress')) || {
		currentLesson: 0,
		completedLessons: [],
		quizScores: {},
	};

	// Fetch lessons data from JSON file
	fetch('jlpt_n5_lessons_full.json')
		.then((response) => response.json())
		.then((data) => {
			lessons = data;
			displayLessonList(lessons);
		})
		.catch((error) => console.error('Error loading lessons:', error));

	function displayLessonList(lessons) {
		const lessonList = document.getElementById('lessonList');
		lessonList.innerHTML = '';
		lessons.forEach((lesson, index) => {
			const lessonItem = document.createElement('div');
			lessonItem.className = 'lesson-item';
			if (index > userProgress.currentLesson) {
				lessonItem.classList.add('locked');
			}

			// Add lock icon for locked lessons
			const lockStatus = index <= userProgress.currentLesson ? '' : '🔒 ';
			lessonItem.textContent = lockStatus + lesson.title;

			if (index <= userProgress.currentLesson) {
				lessonItem.addEventListener('click', () => {
					document
						.querySelectorAll('.lesson-item')
						.forEach((item) => {
							item.classList.remove('active');
						});
					lessonItem.classList.add('active');
					displayLessonContent(lesson, index);
				});
			}
			lessonList.appendChild(lessonItem);
		});
	}
	function displayLessonContent(lesson, lessonIndex) {
		const contentDiv = document.getElementById('lessonContent');
		const isCompleted = userProgress.completedLessons.includes(lessonIndex);
		const quizScore = userProgress.quizScores[lessonIndex] || 0;

		// Scroll to content on mobile
		if (window.innerWidth <= 1024) {
			contentDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}

		contentDiv.innerHTML = `
            <h2>${lesson.title}</h2>
            ${
				isCompleted
					? '<div class="completion-badge">✅ Đã hoàn thành</div>'
					: ''
			}
            ${
				quizScore > 0
					? `<div class="score-display">Điểm bài kiểm tra: ${quizScore}%</div>`
					: ''
			}

            <div class="vocab-list">
                <h3>Từ vựng</h3>
                ${lesson.vocabulary
					.map(
						(vocab) => `
                    <div class="vocab-item">
                        <strong>${vocab.word}</strong> - ${vocab.meaning}
                    </div>
                `
					)
					.join('')}
                <button class="start-quiz-btn" onclick="startFlashcards(${lessonIndex})">Ôn tập từ vựng</button>
                ${
					!isCompleted
						? `<button class="take-test-btn" onclick="startTest(${lessonIndex})">Kiểm tra bài học</button>`
						: ''
				}
            </div>

            <div class="grammar-list">
                <h3>Ngữ pháp</h3>
                ${lesson.grammar
					.map(
						(gram) => `
                    <div class="grammar-item">
                        <strong>Cấu trúc:</strong> ${gram.structure}<br>
                        <strong>Ý nghĩa:</strong> ${gram.meaning}
                        <div class="example">
                            <div><strong>Ví dụ:</strong></div>
                            <div>${gram.example.japanese}</div>
                            <div>${gram.example.hiragana}</div>
                            <div>${gram.example.vietnamese}</div>
                        </div>
                    </div>
                `
					)
					.join('')}
            </div>
        `;
	}

	// Flashcards functionality
	window.startFlashcards = function (lessonIndex) {
		currentQuizVocab = lessons[lessonIndex].vocabulary;
		currentCardIndex = 0;
		updateCard();
		document.getElementById('quizModal').style.display = 'flex';
	};

	// Test functionality
	window.startTest = function (lessonIndex) {
		const lesson = lessons[lessonIndex];
		const questions = generateQuestions(lesson);
		displayTest(questions, lessonIndex);
	};

	function generateQuestions(lesson) {
		let questions = [];

		// Vocabulary questions
		lesson.vocabulary.forEach((vocab) => {
			questions.push({
				type: 'vocab',
				question: `Ý nghĩa của từ "${vocab.word}" là gì?`,
				correctAnswer: vocab.meaning,
				options: [
					vocab.meaning,
					...getRandomVocabOptions(
						lesson.vocabulary,
						vocab.meaning,
						3
					),
				].sort(() => Math.random() - 0.5),
			});
		});

		// Grammar questions
		lesson.grammar.forEach((gram) => {
			questions.push({
				type: 'grammar',
				question: `Cấu trúc "${gram.structure}" có ý nghĩa gì?`,
				correctAnswer: gram.meaning,
				options: [
					gram.meaning,
					...getRandomGrammarOptions(lessons, gram.meaning, 3),
				].sort(() => Math.random() - 0.5),
			});
		});

		return questions.sort(() => Math.random() - 0.5).slice(0, 10);
	}

	function getRandomVocabOptions(vocabulary, correct, count) {
		const options = vocabulary
			.map((v) => v.meaning)
			.filter((meaning) => meaning !== correct);
		return shuffle(options).slice(0, count);
	}

	function getRandomGrammarOptions(allLessons, correct, count) {
		const options = allLessons
			.flatMap((lesson) => lesson.grammar.map((g) => g.meaning))
			.filter((meaning) => meaning !== correct);
		return shuffle(options).slice(0, count);
	}

	function shuffle(array) {
		return array.sort(() => Math.random() - 0.5);
	}

	function displayTest(questions, lessonIndex) {
		const modal = document.createElement('div');
		modal.className = 'test-modal';
		modal.innerHTML = `
            <div class="test-content">
                <h3>Kiểm tra - ${lessons[lessonIndex].title}</h3>
                <form id="testForm">
                    ${questions
						.map(
							(q, i) => `
                        <div class="question">
                            <p>${i + 1}. ${q.question}</p>
                            ${q.options
								.map(
									(option) => `
                                <label>
                                    <input type="radio" name="q${i}" value="${option}">
                                    ${option}
                                </label>
                            `
								)
								.join('')}
                        </div>
                    `
						)
						.join('')}
                    <button type="submit" class="submit-test">Nộp bài</button>
                </form>
            </div>
        `;

		document.body.appendChild(modal);

		document.getElementById('testForm').addEventListener('submit', (e) => {
			e.preventDefault();
			const score = calculateScore(questions);
			if (score >= 50) {
				userProgress.completedLessons.push(lessonIndex);
				if (lessonIndex === userProgress.currentLesson) {
					userProgress.currentLesson++;
				}
				userProgress.quizScores[lessonIndex] = score;
				localStorage.setItem(
					'userProgress',
					JSON.stringify(userProgress)
				);
				displayLessonList(lessons);
			}
			showTestResult(score, lessonIndex);
			modal.remove();
		});
	}

	function calculateScore(questions) {
		let correct = 0;
		questions.forEach((q, i) => {
			const answer = document.querySelector(
				`input[name="q${i}"]:checked`
			)?.value;
			if (answer === q.correctAnswer) correct++;
		});
		return Math.round((correct / questions.length) * 100);
	}

	function showTestResult(score, lessonIndex) {
		const resultModal = document.createElement('div');
		resultModal.className = 'result-modal';
		resultModal.innerHTML = `
            <div class="result-content">
                <h3>Kết quả kiểm tra</h3>
                <p>Điểm số của bạn: ${score}%</p>
                ${
					score >= 50
						? '<p class="success">🎉 Chúc mừng! Bạn đã đạt yêu cầu để mở khóa bài tiếp theo!</p>'
						: '<p class="failure">❌ Bạn cần đạt trên 50% để mở khóa bài tiếp theo. Hãy ôn tập và thử lại!</p>'
				}
                <button onclick="this.parentElement.parentElement.remove()">Đóng</button>
            </div>
        `;
		document.body.appendChild(resultModal);
	}

	// Close quiz modal
	document.querySelector('.close-quiz').addEventListener('click', () => {
		document.getElementById('quizModal').style.display = 'none';
	});

	// Flip card
	document.getElementById('flipCard').addEventListener('click', () => {
		document.querySelector('.flashcard').classList.toggle('flipped');
	});

	// Next card
	document.getElementById('nextCard').addEventListener('click', () => {
		if (currentCardIndex < currentQuizVocab.length - 1) {
			currentCardIndex++;
			updateCard();
		}
	});

	// Previous card
	document.getElementById('prevCard').addEventListener('click', () => {
		if (currentCardIndex > 0) {
			currentCardIndex--;
			updateCard();
		}
	});

	function updateCard() {
		const vocab = currentQuizVocab[currentCardIndex];
		document.querySelector('.flashcard-front .word').textContent =
			vocab.word;
		document.querySelector('.flashcard-back .meaning').textContent =
			vocab.meaning;
		document.querySelector('.flashcard').classList.remove('flipped');
	}

	// Close modal when clicking outside
	window.onclick = function (event) {
		const modal = document.getElementById('quizModal');
		if (event.target === modal) {
			modal.style.display = 'none';
		}
	};
});
