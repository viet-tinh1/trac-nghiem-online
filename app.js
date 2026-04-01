document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadSection = document.getElementById('upload-section');
    const quizSection = document.getElementById('quiz-section');
    const questionsContainer = document.getElementById('questions-container');
    const scoreDisplay = document.getElementById('score-display');
    const resetBtn = document.getElementById('reset-btn');
    
    // Share elements
    const shareBtn = document.getElementById('share-btn');
    const shareModal = document.getElementById('share-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const generateLinkBtn = document.getElementById('generate-link-btn');
    const shareLinkContainer = document.getElementById('share-link-container');
    const shareLinkInput = document.getElementById('share-link-input');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const oneTimeCheckbox = document.getElementById('one-time-checkbox');
    
    // Result elements
    const resultModal = document.getElementById('result-modal');
    const finalScore = document.getElementById('final-score');
    const finalRank = document.getElementById('final-rank');
    const finalTime = document.getElementById('final-time');
    const retryBtn = document.getElementById('retry-btn');
    const closeResultBtn = document.getElementById('close-result-btn');

    // Timer elements
    const floatingTimer = document.getElementById('floating-timer');
    const timeText = document.getElementById('time-text');
    
    // History elements
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyList = document.getElementById('history-list');
    const reviewBanner = document.getElementById('review-banner');
    const exitReviewBtn = document.getElementById('exit-review-btn');
    const quizTitleDisplay = document.getElementById('quiz-title-display');

    let questions = [];
    let score = 0;
    let answeredQuestions = 0;
    let isOneTimeMode = false;
    let isReviewMode = false;
    let currentQuizId = null;
    let currentFileName = "Bộ đề trắc nghiệm";
    let timerInterval = null;
    let secondsElapsed = 0;
    let userAnswers = []; // Store chosen chars for current session

    function startTimer() {
        if (timerInterval) return;
        if (floatingTimer) floatingTimer.classList.remove('hidden');
        timerInterval = setInterval(() => {
            secondsElapsed++;
            const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
            const s = (secondsElapsed % 60).toString().padStart(2, '0');
            if (timeText) timeText.textContent = `${m}:${s}`;
        }, 1000);
    }

    function resetTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        secondsElapsed = 0;
        if (timeText) timeText.textContent = '00:00';
        if (floatingTimer) floatingTimer.classList.add('hidden');
    }

    // Check URL hash on load
    function checkHash() {
        if (window.location.hash && window.location.hash.length > 5) {
            try {
                const hash = window.location.hash.substring(1);
                // Use decodeURIComponent if the browser has already messed with it
                const decodedEncoded = decodeURIComponent(hash);
                
                // Try decompressing both ways just in case
                let decodedStr = typeof LZString !== 'undefined' ? LZString.decompressFromEncodedURIComponent(hash) : null;
                if (!decodedStr) {
                    decodedStr = typeof LZString !== 'undefined' ? LZString.decompressFromEncodedURIComponent(decodedEncoded) : null;
                }

                if (decodedStr) {
                    const data = JSON.parse(decodedStr);
                    if (data && data.questions) {
                        if (data.oneTime && data.id) {
                            isOneTimeMode = true;
                            currentQuizId = data.id;
                            if (localStorage.getItem('quiz_completed_' + currentQuizId)) {
                                alert('Bài kiểm tra này chỉ cho phép làm 1 lần và bạn đã làm rồi!');
                                return;
                            }
                        }
                        setTimeout(() => {
                            startQuiz(data.questions);
                        }, 200);
                    }
                }
            } catch (e) {
                console.error('Lỗi giải mã quiz từ URL:', e);
            }
        }
    }

    if (typeof LZString !== 'undefined') {
        checkHash();
    } else {
        // Fallback if script loads a bit late
        setTimeout(checkHash, 500);
    }

    // Drag and drop event listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        currentFileName = file.name;
        handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            currentFileName = file.name;
            handleFile(file);
        }
    });

    resetBtn.addEventListener('click', () => {
        quizSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        questionsContainer.innerHTML = '';
        fileInput.value = '';
        questions = [];
        score = 0;
        answeredQuestions = 0;
        isOneTimeMode = false;
        currentQuizId = null;
        window.location.hash = '';
        resetTimer();
        updateScore();
    });

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            resultModal.classList.add('hidden');
            resetTimer();
            startQuiz(questions);
        });
    }

    if (closeResultBtn) {
        closeResultBtn.addEventListener('click', () => {
            resultModal.classList.add('hidden');
        });
    }

    if (viewHistoryBtn) {
        const handleHistoryClick = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            renderHistory();
            historyModal.classList.remove('hidden');
        };
        viewHistoryBtn.addEventListener('click', handleHistoryClick);
        viewHistoryBtn.addEventListener('touchstart', handleHistoryClick, {passive: false});
    }

    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            historyModal.classList.add('hidden');
        });
    }

    // Close modals on background click
    [shareModal, resultModal, historyModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    if (exitReviewBtn) {
        exitReviewBtn.addEventListener('click', () => {
            isReviewMode = false;
            reviewBanner.classList.add('hidden');
            quizSection.classList.add('hidden');
            uploadSection.classList.remove('hidden');
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            shareModal.classList.remove('hidden');
            shareLinkContainer.classList.add('hidden');
            oneTimeCheckbox.checked = false;
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            shareModal.classList.add('hidden');
        });
    }

    if (generateLinkBtn) {
        generateLinkBtn.addEventListener('click', () => {
            const data = {
                questions: questions,
                oneTime: oneTimeCheckbox.checked,
                id: 'quiz_' + Math.random().toString(36).substring(2, 9)
            };
            const jsonStr = JSON.stringify(data);
            const compressed = LZString.compressToEncodedURIComponent(jsonStr);
            
            // Safer URL generation: removes previous hash if any
            const baseUrl = window.location.href.split('#')[0];
            const url = baseUrl + '#' + compressed;
            shareLinkInput.value = url;
            shareLinkContainer.classList.remove('hidden');
        });
    }

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            shareLinkInput.select();
            document.execCommand('copy');
            copyLinkBtn.textContent = 'Đã Copy!';
            setTimeout(() => copyLinkBtn.textContent = 'Copy Link', 2000);
        });
    }

    function handleFile(file) {
        if (!file.name.endsWith('.txt') && !file.name.endsWith('.docx')) {
            alert('Vui lòng tải lên file định dạng .txt hoặc .docx');
            return;
        }

        if (file.name.endsWith('.docx')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                mammoth.extractRawText({arrayBuffer: e.target.result})
                    .then((result) => {
                        parseContent(result.value);
                    })
                    .catch((err) => {
                        console.error(err);
                        alert('Không thể đọc file .docx. Vui lòng kiểm tra lại.');
                    });
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                parseContent(content);
            };
            reader.onerror = () => {
                alert('Có lỗi xảy ra khi đọc file.');
            };
            reader.readAsText(file);
        }
    }

    // A robust parser that handles common Vietnamese multiple choice formats
    function parseContent(content) {
        // Normalize line endings and trim spaces
        const lines = content.replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        const parsedQuestions = [];
        let currentQuestion = null;

        const answerRegex = /^(?:đáp án|answer|đ\/a|kq|kết quả)[\s:]*([A-Za-z])/i;
        const optionRegex = /^(\*?)\s*([A-Za-z])[\.\:\)]\s*(.+)/i;
        const questionRegex = /^(?:câu|question|)[\s]*(\d+)[\.\:\)]?\s*(.+)/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check if Answer line
            const answerMatch = line.match(answerRegex);
            if (answerMatch && currentQuestion) {
                // Determine the correct option character A, B, C, D
                currentQuestion.correctAnswer = answerMatch[1].toUpperCase();
                parsedQuestions.push(currentQuestion);
                currentQuestion = null;
                continue;
            }

            // Check if Option line
            const optionMatch = line.match(optionRegex);
            if (optionMatch && currentQuestion) {
                const isCorrect = optionMatch[1] === '*';
                const char = optionMatch[2].toUpperCase();
                
                currentQuestion.options.push({
                    char: char,
                    text: optionMatch[3]
                });
                
                if (isCorrect) {
                     currentQuestion.correctAnswer = char;
                }
                continue;
            }

            // If not option or answer, it's either a new question start, or continuation of previous line.
            // Check if it's explicitly a new question:
            const qMatch = line.match(questionRegex);
            
            if (qMatch) {
                // If we already had a question without an answer (maybe poorly formatted), save it
                if (currentQuestion) {
                    if (currentQuestion.options.length > 0) {
                        parsedQuestions.push(currentQuestion);
                    }
                }
                
                currentQuestion = {
                    text: line, // Store whole line as question text
                    options: [],
                    correctAnswer: null,
                    qNumber: qMatch[1]
                };
            } else {
                // Continuation of text or implicit start
                if (!currentQuestion) {
                    currentQuestion = {
                        text: line,
                        options: [],
                        correctAnswer: null
                    };
                } else {
                    if (currentQuestion.options.length === 0) {
                        currentQuestion.text += " " + line;
                    } else {
                        // Continuation of the last option?
                        currentQuestion.options[currentQuestion.options.length-1].text += " " + line;
                    }
                }
            }
        }

        // Push last question if it wasn't ended properly with an answer line
        if (currentQuestion && currentQuestion.options.length > 0) {
           parsedQuestions.push(currentQuestion);
        }

        if (parsedQuestions.length === 0) {
            alert("Không tìm thấy câu hỏi nào hợp lệ trong file. Vui lòng kiểm tra định dạng.");
            return;
        }

        startQuiz(parsedQuestions);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function startQuiz(parsedQuestions) {
        let shuffledQs = [...parsedQuestions];
        shuffleArray(shuffledQs);
        
        questions = shuffledQs;
        score = 0;
        answeredQuestions = 0;
        userAnswers = new Array(questions.length).fill(null);
        isReviewMode = false;
        reviewBanner.classList.add('hidden');
        quizTitleDisplay.textContent = currentFileName || "Bài Trắc Nghiệm";
        updateScore();
        
        uploadSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        
        renderQuestions();
    }

    function renderQuestions(isReview = false) {
        questionsContainer.innerHTML = '';
        
        questions.forEach((q, index) => {
            const qCard = document.createElement('div');
            qCard.className = 'question-card';
            qCard.style.animationDelay = `${index * 0.1}s`;
            
            const qText = document.createElement('div');
            qText.className = 'question-text';
            qText.textContent = q.text;
            qCard.appendChild(qText);

            const optionsGrid = document.createElement('div');
            optionsGrid.className = 'options-grid';

            const feedback = document.createElement('div');
            feedback.className = 'feedback-msg';

            q.options.forEach(opt => {
                const optEl = document.createElement('div');
                optEl.className = 'option';
                if (isReview) optEl.classList.add('disabled');
                
                optEl.innerHTML = `<strong>${opt.char}.</strong> &nbsp;${opt.text}`;
                
                if (isReview) {
                    const pickedChar = userAnswers[index];
                    if (opt.char === q.correctAnswer) optEl.classList.add('correct');
                    if (opt.char === pickedChar && pickedChar !== q.correctAnswer) optEl.classList.add('incorrect');
                } else {
                    optEl.addEventListener('click', () => {
                        handleAnswerSelection(qCard, optionsGrid, optEl, opt.char, q.correctAnswer, feedback, index);
                    });
                }
                optionsGrid.appendChild(optEl);
            });

            if (isReview) {
                const pickedChar = userAnswers[index];
                feedback.style.display = 'block';
                if (pickedChar === q.correctAnswer) {
                    feedback.textContent = '✅ Bạn đã trả lời đúng.';
                    feedback.className = 'feedback-msg correct-text';
                } else if (pickedChar) {
                    feedback.textContent = `❌ Bạn đã chọn ${pickedChar}. Đáp án đúng là ${q.correctAnswer}.`;
                    feedback.className = 'feedback-msg incorrect-text';
                } else {
                    feedback.textContent = `⚪ Bạn chưa trả lời câu này. Đáp án đúng là ${q.correctAnswer}.`;
                    feedback.className = 'feedback-msg';
                }
            }

            qCard.appendChild(optionsGrid);
            qCard.appendChild(feedback);
            questionsContainer.appendChild(qCard);
        });
    }

    function handleAnswerSelection(card, grid, selectedEl, selectedChar, correctChar, feedbackEl, itemIndex) {
        if (card.classList.contains('answered')) return;
        card.classList.add('answered');

        const options = grid.querySelectorAll('.option');
        options.forEach(opt => opt.classList.add('disabled'));

        userAnswers[itemIndex] = selectedChar;
        answeredQuestions++;
        
        if (answeredQuestions === 1) startTimer();

        if (!correctChar) {
            selectedEl.classList.add('selected');
            feedbackEl.textContent = 'Câu hỏi này không có đáp án mẫu.';
            feedbackEl.style.display = 'block';
            updateScore();
            return;
        }

        const isCorrect = selectedChar === correctChar;
        if (isCorrect) {
            selectedEl.classList.add('correct');
            score++;
            feedbackEl.textContent = '🎉 Tuyệt vời!';
            feedbackEl.className = 'feedback-msg correct-text';
        } else {
            selectedEl.classList.add('incorrect');
            options.forEach(opt => {
                if (opt.innerHTML.includes(`<strong>${correctChar}.</strong>`)) opt.classList.add('correct');
            });
            feedbackEl.textContent = `❌ Đáp án đúng là ${correctChar}.`;
            feedbackEl.className = 'feedback-msg incorrect-text';
        }

        updateScore();
        
        const cards = document.querySelectorAll('.question-card');
        if (itemIndex + 1 < cards.length && answeredQuestions < questions.length) {
            setTimeout(() => {
                cards[itemIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 600);
        }
        
        if (answeredQuestions === questions.length) {
            if (timerInterval) clearInterval(timerInterval);
            setTimeout(() => {
                const point = (score / questions.length) * 10;
                const pointFormatted = parseFloat(point.toFixed(2));
                let rank = 'Yếu 😞';
                if (point >= 8) rank = 'Giỏi 🏆';
                else if (point >= 6) rank = 'Khá 🌟';
                else if (point >= 4) rank = 'Trung bình 😐';

                finalScore.textContent = `${pointFormatted}/10`;
                finalRank.innerHTML = `${rank} <span style="font-size:0.9rem; font-weight:normal;">(Đúng ${score}/${questions.length})</span>`;
                finalTime.textContent = timeText.textContent;
                
                saveAttemptToHistory(pointFormatted, rank);
                resultModal.classList.remove('hidden');
            }, 600);
        }
    }

    function saveAttemptToHistory(point, rank) {
        const attempt = {
            id: Date.now(),
            fileName: currentFileName,
            date: new Date().toLocaleString('vi-VN'),
            score: score,
            total: questions.length,
            point: point,
            rank: rank,
            timeSpent: timeText.textContent,
            questions: JSON.parse(JSON.stringify(questions)),
            userAnswers: [...userAnswers]
        };
        let history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
        history.unshift(attempt);
        if (history.length > 20) history = history.slice(0, 20);
        localStorage.setItem('quiz_history', JSON.stringify(history));
    }

    function renderHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
            historyList.innerHTML = history.length === 0 ? '<div class="empty-history">Chưa có lịch sử làm bài.</div>' : '';
            history.forEach((item, index) => {
                const el = document.createElement('div');
                el.className = 'history-item';
                el.innerHTML = `
                    <div class="history-info">
                        <h4>${item.fileName || "Hồ sơ trắc nghiệm"}</h4>
                        <p>📅 ${item.date} | 🏆 ${item.point}/10 (${item.rank})</p>
                        <p>⏱ ${item.timeSpent} | Đúng: ${item.score}/${item.total}</p>
                    </div>
                    <button class="btn-view" onclick="viewHistoryDetail(${index})">Xem lại</button>
                `;
                historyList.appendChild(el);
            });
        } catch (e) {
            console.error("Lỗi khi tải lịch sử:", e);
            historyList.innerHTML = '<div class="empty-history">Lỗi khi tải lịch sử.</div>';
        }
    }

    window.viewHistoryDetail = (index) => {
        const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
        const item = history[index];
        if (!item) return;
        historyModal.classList.add('hidden');
        isReviewMode = true;
        questions = item.questions;
        userAnswers = item.userAnswers;
        uploadSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        reviewBanner.classList.remove('hidden');
        quizTitleDisplay.textContent = item.fileName;
        renderQuestions(true);
    };

    function updateScore() {
        scoreDisplay.textContent = `Điểm: ${score}/${questions.length} (Đã làm: ${answeredQuestions})`;
    }
});
