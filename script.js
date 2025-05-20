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
});
