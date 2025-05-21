document.addEventListener('DOMContentLoaded', () => {
	// Khởi tạo ResponsiveVoice
	if (typeof responsiveVoice !== 'undefined') {
		responsiveVoice.init();
	}

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
	// Load JLPT level data
	const loadLevelData = async (level) => {
		try {
			if (level === 'basic') {
				return await loadBasicConversations();
			}
			const response = await fetch(`jlpt_${level}_lessons_full.json`);
			if (!response.ok)
				throw new Error(`No data for ${level.toUpperCase()}`);
			return await response.json();
		} catch (error) {
			console.log(`${level.toUpperCase()} content not available yet`);
			return null;
		}
	};

	// Setup collapse/expand functionality
	const setupCollapsible = () => {
		const levelHeaders = document.querySelectorAll(
			'.level:not([data-level="basic"]) h2'
		);
		levelHeaders.forEach((header) => {
			header.addEventListener('click', (e) => {
				e.stopPropagation(); // Prevent triggering level click event
				const level = header.parentElement;
				if (!level.classList.contains('active')) {
					// If level is not active, activate it first
					const levelId = level.getAttribute('data-level');
					loadLevelData(levelId).then((data) => {
						if (data) {
							lessons = data;
							// Remove active class from all levels
							document
								.querySelectorAll('.level')
								.forEach((l) => l.classList.remove('active'));
							// Add active class to clicked level
							level.classList.add('active');
							displayLessonList(data, `${levelId}LessonList`);
						}
					});
				}
				// Toggle collapse state
				level.classList.toggle('collapsed');
			});
		});

		// Xử lý riêng cho phần giao tiếp cơ bản
		const basicLevel = document.querySelector('.level[data-level="basic"]');
		if (basicLevel) {
			basicLevel.addEventListener('click', async () => {
				const basicData = await loadBasicConversations();
				if (basicData) {
					displayBasicConversations(basicData);
					document
						.querySelectorAll('.level')
						.forEach((l) => l.classList.remove('active'));
					basicLevel.classList.add('active');
				}
			});
		}
	};

	// Initialize lessons
	const initializeLessons = async () => {
		// Load N5 data first
		const n5Data = await loadLevelData('n5');
		if (n5Data) {
			lessons = n5Data;
			displayLessonList(n5Data, 'n5LessonList');
		}

		// Setup level switching and collapsible
		setupLevelSwitching();
		setupCollapsible();
	};

	const setupLevelSwitching = () => {
		const levels = document.querySelectorAll('.level');
		levels.forEach((level) => {
			level.addEventListener('click', async () => {
				if (level.classList.contains('active')) return;

				// Remove active class from all levels
				levels.forEach((l) => l.classList.remove('active'));
				// Add active class to clicked level
				level.classList.add('active');

				const levelId = level.getAttribute('data-level');
				const data = await loadLevelData(levelId);

				if (data) {
					lessons = data;
					displayLessonList(data, `${levelId}LessonList`);
				}
			});
		});
	};

	const displayLessonList = (data, containerId) => {
		const container = document.getElementById(containerId);
		if (!container) return;

		container.innerHTML = '';
		if (containerId === 'basicConversationList') {
			document
				.querySelector('.level[data-level="basic"]')
				.addEventListener('click', async () => {
					// Load và hiển thị dữ liệu giao tiếp cơ bản
					const basicData = await loadBasicConversations();
					if (basicData) {
						displayBasicConversations(basicData);

						// Cập nhật trạng thái active
						document
							.querySelectorAll('.level')
							.forEach((l) => l.classList.remove('active'));
						document
							.querySelector('.level[data-level="basic"]')
							.classList.add('active');
					}
				});
			return;
		}

		data.forEach((lesson, index) => {
			const lessonElement = document.createElement('div');
			lessonElement.classList.add('lesson-item');

			// Add completed class if lesson is in completedLessons
			if (userProgress.completedLessons.includes(index)) {
				lessonElement.classList.add('completed');
			}

			// Add locked class if lesson is not available yet
			if (index > userProgress.currentLesson) {
				lessonElement.classList.add('locked');
			}

			const titleElement = document.createElement('div');
			titleElement.classList.add('lesson-title');
			titleElement.textContent = lesson.title;

			const quizButton = document.createElement('button');
			quizButton.classList.add('quiz-button');
			quizButton.innerHTML = '<i class="fa-solid fa-graduation-cap"></i>';
			quizButton.title = 'Ôn tập';

			lessonElement.appendChild(titleElement);
			lessonElement.appendChild(quizButton);

			lessonElement.addEventListener('click', (e) => {
				if (
					e.target === quizButton ||
					e.target.parentElement === quizButton
				) {
					startQuiz(index);
				} else {
					displayLesson(index);
				}
			});

			container.appendChild(lessonElement);
		});
	};
	// Initialize on load
	initializeLessons();

	function displayLesson(index) {
		// Kiểm tra xem có thể truy cập bài học này không
		if (index > userProgress.currentLesson) {
			alert('Bạn cần hoàn thành bài học trước để mở khóa bài học này!');
			return;
		}

		// Hiển thị nội dung bài học
		displayLessonContent(lessons[index], index);
	}

	// Hàm hiển thị nội dung bài học
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
                <h3>Từ vựng</h3>                ${lesson.vocabulary
					.map(
						(vocab) => `
                    <div class="vocab-item">
                        <div class="vocab-content">
                            <strong>${vocab.word}</strong> - ${vocab.meaning}
                        </div>                        <button class="vocab-speak-btn" onclick="speakJapanese('${vocab.word}')">
                            <i class="fa-solid fa-volume-high"></i>
                        </button>
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
	let currentPage = 1;
	const itemsPerPage = 10;
	let basicConversationsData = null;

	// Load dữ liệu giao tiếp cơ bản
	const loadBasicConversations = async () => {
		try {
			const response = await fetch('basic_conversations.json');
			if (!response.ok)
				throw new Error('Không thể tải dữ liệu giao tiếp cơ bản');
			return await response.json();
		} catch (error) {
			console.error('Lỗi khi tải dữ liệu giao tiếp:', error);
			return null;
		}
	};

	function displayBasicConversations(data) {
		basicConversationsData = data;
		const contentDiv = document.getElementById('lessonContent');
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		const currentItems = data.conversations.slice(startIndex, endIndex);
		const totalPages = Math.ceil(data.conversations.length / itemsPerPage);

		contentDiv.innerHTML = `
            <h2>${data.title} - Trang ${currentPage}/${totalPages}</h2>
            <div class="page-controls">
                ${
					currentPage > 1
						? '<button class="prev-page-btn">Trang trước</button>'
						: ''
				}
                ${
					currentPage < totalPages
						? '<button class="next-page-btn">Trang tiếp</button>'
						: ''
				}
            </div>
            <div class="conversations-list">
                ${currentItems
					.map(
						(conv) => `
                    <div class="conversation-item">
                        <div class="conversation-content">
                            <div class="japanese-text">
                                <strong>${conv.japanese}</strong>
                                <div class="hiragana">${conv.hiragana}</div>
                            </div>
                            <div class="meaning">${conv.vietnamese}</div>
                            <div class="context">${conv.context}</div>
                        </div>
                        <button class="vocab-speak-btn" onclick="speakJapanese('${conv.japanese}')">
                            <i class="fa-solid fa-volume-high"></i>
                        </button>
                    </div>
                `
					)
					.join('')}
            </div>
            <div class="study-controls">
                <button class="start-flashcards-btn">Học với Flashcard</button>
                <button class="take-test-btn">Kiểm tra</button>
            </div>
        `;

		// Add event listeners
		if (currentPage > 1) {
			contentDiv
				.querySelector('.prev-page-btn')
				.addEventListener('click', () => {
					currentPage--;
					displayBasicConversations(data);
				});
		}

		if (currentPage < totalPages) {
			contentDiv
				.querySelector('.next-page-btn')
				.addEventListener('click', () => {
					currentPage++;
					displayBasicConversations(data);
				});
		}

		// Add flashcards button listener
		contentDiv
			.querySelector('.start-flashcards-btn')
			.addEventListener('click', () => {
				startBasicFlashcards(currentItems);
			});

		// Add test button listener
		contentDiv
			.querySelector('.take-test-btn')
			.addEventListener('click', () => {
				startBasicTest(currentItems);
			});
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
	const UNSPLASH_ACCESS_KEY = 'qnGQNTI93hS0mbWtlkz_UbAAF6pZUKW6atKOOhUaphg';

	async function getImageForWord(word) {
		try {
			// Tìm kiếm ảnh dựa trên từ tiếng Anh
			const englishWord = await translateToEnglish(word);
			const response = await fetch(
				`https://api.unsplash.com/search/photos?query=${englishWord}&per_page=1`,
				{
					headers: {
						Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
					},
				}
			);
			const data = await response.json();

			if (data.results && data.results.length > 0) {
				return data.results[0].urls.small;
			}
			return null;
		} catch (error) {
			console.error('Error fetching image:', error);
			return null;
		}
	}
	// Hàm dịch từ tiếng Nhật sang tiếng Anh sử dụng cache, từ điển nội bộ và MyMemory API
	async function translateToEnglish(japaneseWord) {
		try {
			// Kiểm tra cache trước
			const cachedTranslation = localStorage.getItem(
				`translation_${japaneseWord}`
			);
			if (cachedTranslation) {
				return JSON.parse(cachedTranslation);
			}

			// Từ điển nội bộ JLPT N5 (mở rộng)
			const dictionary = {
				わたし: 'i',
				あなた: 'you',
				かれ: 'he',
				かのじょ: 'she',
				わたしたち: 'we',
				みんな: 'everyone',
				なに: 'what',
				どこ: 'where',
				いつ: 'when',
				どうして: 'why',
				いぬ: 'dog',
				ねこ: 'cat',
				くるま: 'car',
				じてんしゃ: 'bicycle',
				でんしゃ: 'train',
				ひこうき: 'airplane',
				みず: 'water',
				ごはん: 'rice / meal',
				たべる: 'eat',
				のむ: 'drink',
				はなす: 'speak',
				きく: 'listen / ask',
				みる: 'see',
				いく: 'go',
				くる: 'come',
				する: 'do',
				ある: 'exist (inanimate)',
				いる: 'exist (animate)',
				おはようございます: 'good morning',
				こんにちは: 'hello',
				こんばんは: 'good evening',
				さようなら: 'goodbye',
				ありがとう: 'thank you',
				すみません: 'excuse me / sorry',
				はい: 'yes',
				いいえ: 'no',
				いち: 'one',
				に: 'two',
				さん: 'three',
				よん: 'four',
				ご: 'five',
				ろく: 'six',
				なな: 'seven',
				はち: 'eight',
				きゅう: 'nine',
				じゅう: 'ten',
				たかい: 'expensive / tall',
				やすい: 'cheap / inexpensive',
				おおきい: 'big',
				ちいさい: 'small',
				あたらしい: 'new',
				ふるい: 'old',
				いい: 'good',
				わるい: 'bad',
				たのしい: 'fun',
				さびしい: 'lonely',
				うれしい: 'happy',
				かなしい: 'sad',
				せんせい: 'teacher',
				がくせい: 'student',
				がっこう: 'school',
				ともだち: 'friend',
				いえ: 'house',
				へや: 'room',
				でんわ: 'telephone',
				じしょ: 'dictionary',
				ほん: 'book',
				えんぴつ: 'pencil',
				かばん: 'bag',
				シャツ: 'shirt',
				ズボン: 'pants',
				くつ: 'shoes',
				とけい: 'watch / clock',
				としょかん: 'library',
				ぎんこう: 'bank',
				びょういん: 'hospital',
				スーパー: 'supermarket',
				レストラン: 'restaurant',
				いま: 'now',
				きょう: 'today',
				あした: 'tomorrow',
				きのう: 'yesterday',
				まいにち: 'every day',
				しゅうまつ: 'weekend',
				ひる: 'noon',
				よる: 'night',
				あさ: 'morning',
				ときどき: 'sometimes',
				いつも: 'always',
				ぜんぜん: 'never',
				すこし: 'a little',
				たくさん: 'a lot',
				いっしょに: 'together',
				ひとりで: 'alone',
			};

			// Nếu từ có trong từ điển, trả về từ đó
			if (dictionary[japaneseWord]) {
				localStorage.setItem(
					`translation_${japaneseWord}`,
					JSON.stringify(dictionary[japaneseWord])
				);
				return dictionary[japaneseWord];
			}

			// Nếu không có, dùng API
			const response = await fetch(
				`https://api.mymemory.translated.net/get?q=${encodeURIComponent(
					japaneseWord
				)}&langpair=ja|en`
			);
			const data = await response.json();

			if (data.responseData?.translatedText) {
				const translation =
					data.responseData.translatedText.toLowerCase();
				localStorage.setItem(
					`translation_${japaneseWord}`,
					JSON.stringify(translation)
				);
				return translation;
			}

			// Fallback nếu không dịch được
			return japaneseWord;
		} catch (error) {
			console.error('Translation error:', error);
			return japaneseWord;
		}
	}

	function updateCard() {
		const vocab = currentQuizVocab[currentCardIndex];
		const wordElement = document.querySelector('.flashcard-front .word');
		const meaningElement = document.querySelector(
			'.flashcard-back .meaning'
		);
		const illustrationElement = document.querySelector(
			'.illustration-image'
		);

		wordElement.textContent = vocab.word;
		meaningElement.textContent = vocab.meaning;

		// Lấy và hiển thị hình ảnh
		getImageForWord(vocab.word).then((imageUrl) => {
			if (imageUrl) {
				illustrationElement.style.backgroundImage = `url(${imageUrl})`;
				illustrationElement.style.display = 'block';
			} else {
				illustrationElement.style.display = 'none';
			}
		});

		document.querySelector('.flashcard').classList.remove('flipped');
		document.querySelector('.speak-btn').onclick = () =>
			speakJapanese(vocab.word);
	}

	// Xử lý phát âm
	let isSpeaking = false;

	async function playWord(text, rate = 0.7) {
		return new Promise((resolve, reject) => {
			if (isSpeaking) {
				responsiveVoice.cancel();
			}

			isSpeaking = true;
			responsiveVoice.speak(text, 'Japanese Female', {
				rate: rate,
				pitch: 1.0,
				volume: 1.0,
				onend: () => {
					isSpeaking = false;
					resolve();
				},
				onerror: (e) => {
					isSpeaking = false;
					reject(e);
				},
			});
		});
	}

	// Phát âm tiếng Nhật
	window.speakJapanese = async function (word) {
		try {
			await playWord(word);
		} catch (error) {
			console.error('Lỗi phát âm:', error);
		}
	};

	// Close modal when clicking outside
	window.onclick = function (event) {
		const modal = document.getElementById('quizModal');
		if (event.target === modal) {
			modal.style.display = 'none';
		}
	};

	// Welcome modal logic
	const welcomeModal = document.getElementById('welcomeModal');
	const startLearningBtn = document.getElementById('startLearningBtn');

	if (!localStorage.getItem('jlptN5WelcomeShown')) {
		welcomeModal.style.display = 'flex';
		// Tự động ẩn sau 3s
		setTimeout(() => {
			welcomeModal.style.display = 'none';
			localStorage.setItem('jlptN5WelcomeShown', 'yes');
		}, 3000);
	} else {
		welcomeModal.style.display = 'none';
	}

	startLearningBtn.addEventListener('click', () => {
		welcomeModal.style.display = 'none';
		localStorage.setItem('jlptN5WelcomeShown', 'yes');
	});
	function startBasicFlashcards(conversations) {
		const modal = document.createElement('div');
		modal.className = 'quiz-modal';
		modal.style.display = 'flex';
		modal.innerHTML = `
        <div class="quiz-content">
            <div class="quiz-header">
                <h3>Flashcards - Giao tiếp cơ bản</h3>
                <button class="close-quiz">&times;</button>
            </div>
            <div class="flashcard">
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <div class="word"></div>
                        <div class="hiragana"></div>
                        <button class="speak-btn">
                            <i class="fa-solid fa-volume-high"></i>
                        </button>
                    </div>
                    <div class="flashcard-back">
                        <div class="meaning"></div>
                        <div class="context"></div>
                    </div>
                </div>
            </div>
            <div class="quiz-controls">
                <button id="prevCard" disabled>Trước</button>
                <button id="flipCard">Lật thẻ</button>
                <button id="nextCard">Tiếp</button>
            </div>
            <div class="progress">
                <span class="current-progress">1</span>/<span class="total-cards">10</span>
            </div>
            <div class="keyboard-shortcuts">
                <span>←/h: Trước</span>
                <span>→/l: Tiếp</span>
                <span>Space/f: Lật</span>
                <span>s: Phát âm</span>
            </div>
        </div>
    `;
		document.body.appendChild(modal);

		let currentIndex = 0;

		// Update progress display
		function updateProgress() {
			modal.querySelector('.current-progress').textContent =
				currentIndex + 1;
			modal.querySelector('.total-cards').textContent =
				conversations.length;

			// Update navigation buttons state
			modal.querySelector('#prevCard').disabled = currentIndex === 0;
			modal.querySelector('#nextCard').disabled =
				currentIndex === conversations.length - 1;
		}

		// Initial update
		updateBasicFlashcard(conversations[currentIndex], modal);
		updateProgress();

		// Close button
		modal.querySelector('.close-quiz').addEventListener('click', () => {
			modal.remove();
		});

		// Flip card
		modal.querySelector('#flipCard').addEventListener('click', () => {
			modal.querySelector('.flashcard').classList.toggle('flipped');
		});

		// Previous card
		modal.querySelector('#prevCard').addEventListener('click', () => {
			if (currentIndex > 0) {
				currentIndex--;
				updateBasicFlashcard(conversations[currentIndex], modal);
				updateProgress();
			}
		});

		// Next card
		modal.querySelector('#nextCard').addEventListener('click', () => {
			if (currentIndex < conversations.length - 1) {
				currentIndex++;
				updateBasicFlashcard(conversations[currentIndex], modal);
				updateProgress();
			}
		});

		// Keyboard shortcuts
		const handleKeyPress = (e) => {
			// Ignore key events if user is typing in an input field
			if (
				e.target.tagName === 'INPUT' ||
				e.target.tagName === 'TEXTAREA'
			) {
				return;
			}

			switch (e.key.toLowerCase()) {
				case 'arrowleft':
				case 'h': // vim-style navigation
					if (currentIndex > 0) {
						currentIndex--;
						updateBasicFlashcard(
							conversations[currentIndex],
							modal
						);
						updateProgress();
					}
					break;
				case 'arrowright':
				case 'l': // vim-style navigation
					if (currentIndex < conversations.length - 1) {
						currentIndex++;
						updateBasicFlashcard(
							conversations[currentIndex],
							modal
						);
						updateProgress();
					}
					break;
				case ' ':
				case 'f': // 'f' for flip
					e.preventDefault(); // Prevent page scroll on spacebar
					modal
						.querySelector('.flashcard')
						.classList.toggle('flipped');
					break;
				case 's': // 's' for speak
					modal.querySelector('.speak-btn').click();
					break;
			}
		};

		document.addEventListener('keydown', handleKeyPress);

		// Cleanup when modal is closed
		modal.addEventListener('remove', () => {
			document.removeEventListener('keydown', handleKeyPress);
		});
	}
	function updateBasicFlashcard(conversation, modal) {
		const flashcard = modal.querySelector('.flashcard');
		const wordElement = modal.querySelector('.flashcard-front .word');
		const hiraganaElement = modal.querySelector(
			'.flashcard-front .hiragana'
		);
		const meaningElement = modal.querySelector('.flashcard-back .meaning');
		const contextElement = modal.querySelector('.flashcard-back .context');

		// Fade out
		flashcard.classList.add('updating');

		setTimeout(() => {
			// Update content
			wordElement.textContent = conversation.japanese;
			hiraganaElement.textContent = conversation.hiragana;
			meaningElement.textContent = conversation.vietnamese;
			contextElement.textContent = conversation.context;

			// Reset card to front side
			flashcard.classList.remove('flipped');

			// Remove fade effect
			flashcard.classList.remove('updating');

			// Update speak button
			modal.querySelector('.speak-btn').onclick = () =>
				speakJapanese(conversation.japanese);
		}, 150);
	}

	function startBasicTest(conversations) {
		const questions = generateBasicQuestions(conversations);
		displayBasicTest(questions);
	}

	function generateBasicQuestions(conversations) {
		const questions = conversations.map((conv) => ({
			japanese: conv.japanese,
			hiragana: conv.hiragana,
			question: `Câu "${conv.japanese}" có nghĩa là gì?`,
			correctAnswer: conv.vietnamese,
			options: [
				conv.vietnamese,
				...getRandomAnswers(conversations, conv.vietnamese, 3),
			].sort(() => Math.random() - 0.5),
		}));
		return questions;
	}

	function getRandomAnswers(conversations, correct, count) {
		const options = conversations
			.map((conv) => conv.vietnamese)
			.filter((meaning) => meaning !== correct);
		return shuffle(options).slice(0, count);
	}

	function displayBasicTest(questions) {
		const modal = document.createElement('div');
		modal.className = 'test-modal';
		modal.innerHTML = `
        <div class="test-content">
            <h3>Kiểm tra - Giao tiếp cơ bản</h3>
            <form id="basicTestForm">
                ${questions
					.map(
						(q, i) => `
                    <div class="question">
                        <p>${i + 1}. ${q.question}</p>
                        <div class="hiragana-hint">(${q.hiragana})</div>
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

		document
			.getElementById('basicTestForm')
			.addEventListener('submit', (e) => {
				e.preventDefault();
				const score = calculateBasicScore(questions);
				showBasicTestResult(score);
				if (score >= 60) {
					// Lưu tiến độ và cho phép chuyển trang tiếp
					const progress = JSON.parse(
						localStorage.getItem('basicProgress') || '{}'
					);
					progress[currentPage] = true;
					localStorage.setItem(
						'basicProgress',
						JSON.stringify(progress)
					);
				}
				modal.remove();
			});
	}

	function calculateBasicScore(questions) {
		let correct = 0;
		questions.forEach((q, i) => {
			const answer = document.querySelector(
				`input[name="q${i}"]:checked`
			)?.value;
			if (answer === q.correctAnswer) correct++;
		});
		return Math.round((correct / questions.length) * 100);
	}

	function showBasicTestResult(score) {
		const resultModal = document.createElement('div');
		resultModal.className = 'result-modal';
		resultModal.innerHTML = `
        <div class="result-content">
            <h3>Kết quả kiểm tra</h3>
            <p>Điểm số của bạn: ${score}%</p>
            ${
				score >= 60
					? '<p class="success">🎉 Chúc mừng! Bạn đã đạt yêu cầu để mở khóa trang tiếp theo!</p>'
					: '<p class="failure">❌ Bạn cần đạt trên 60% để mở khóa trang tiếp theo. Hãy ôn tập và thử lại!</p>'
			}
            <button onclick="this.parentElement.parentElement.remove()">Đóng</button>
        </div>
    `;
		document.body.appendChild(resultModal);
	}
});
