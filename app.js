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
    const retryBtn = document.getElementById('retry-btn');
    const closeResultBtn = document.getElementById('close-result-btn');

    let questions = [];
    let score = 0;
    let answeredQuestions = 0;
    let isOneTimeMode = false;
    let currentQuizId = null;

    // Check URL hash on load
    if (window.location.hash && window.location.hash.length > 5) {
        try {
            const hash = window.location.hash.substring(1);
            const decodedStr = LZString.decompressFromEncodedURIComponent(hash);
            const data = JSON.parse(decodedStr);
            
            if (data && data.questions) {
                if (data.oneTime && data.id) {
                    isOneTimeMode = true;
                    currentQuizId = data.id;
                    if (localStorage.getItem('quiz_completed_' + currentQuizId)) {
                        alert('Bài kiểm tra này chỉ cho phép làm 1 lần và bạn đã làm rồi!');
                        return; // Block Quiz
                    }
                }
                setTimeout(() => {
                    startQuiz(data.questions);
                }, 100);
            }
        } catch (e) {
            console.error('Lỗi giải mã quiz từ URL:', e);
            alert('Đường dẫn chia sẻ không hợp lệ hoặc bị lỗi!');
            window.location.hash = '';
        }
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
        handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
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
        updateScore();
    });

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            resultModal.classList.add('hidden');
            startQuiz(questions);
        });
    }

    if (closeResultBtn) {
        closeResultBtn.addEventListener('click', () => {
            resultModal.classList.add('hidden');
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
            
            const url = window.location.origin + window.location.pathname + '#' + compressed;
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
        updateScore();
        
        uploadSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        
        renderQuestions();
    }

    function renderQuestions() {
        questionsContainer.innerHTML = '';
        
        questions.forEach((q, index) => {
            // Card element
            const qCard = document.createElement('div');
            qCard.className = 'question-card';
            // Stagger animation delay
            qCard.style.animationDelay = `${index * 0.1}s`;
            
            // Question Text
            const qText = document.createElement('div');
            qText.className = 'question-text';
            qText.textContent = q.text;
            qCard.appendChild(qText);

            // Options container
            const optionsGrid = document.createElement('div');
            optionsGrid.className = 'options-grid';

            // Feedback element
            const feedback = document.createElement('div');
            feedback.className = 'feedback-msg';

            // Loop over options
            q.options.forEach(opt => {
                const optEl = document.createElement('div');
                optEl.className = 'option';
                optEl.innerHTML = `<strong>${opt.char}.</strong> &nbsp;${opt.text}`;
                
                optEl.addEventListener('click', () => {
                    handleAnswerSelection(qCard, optionsGrid, optEl, opt.char, q.correctAnswer, feedback, index);
                });
                
                optionsGrid.appendChild(optEl);
            });

            qCard.appendChild(optionsGrid);
            qCard.appendChild(feedback);
            questionsContainer.appendChild(qCard);
        });
    }

    function handleAnswerSelection(card, grid, selectedEl, selectedChar, correctChar, feedbackEl, itemIndex) {
        // Prevent double selecting
        if (card.classList.contains('answered')) return;
        card.classList.add('answered');

        const options = grid.querySelectorAll('.option');
        options.forEach(opt => opt.classList.add('disabled'));

        answeredQuestions++;

        // Some questions might not have answers specified explicitly
        if (!correctChar) {
            selectedEl.classList.add('selected');
            feedbackEl.textContent = 'Câu hỏi này không có đáp án mẫu trong file.';
            feedbackEl.style.color = 'var(--text-secondary)';
            feedbackEl.style.display = 'block';
            updateScore();
            return;
        }

        const isCorrect = selectedChar === correctChar;
        
        if (isCorrect) {
            selectedEl.classList.add('correct');
            score++;
            feedbackEl.textContent = '🎉 Tuyệt vời! Bạn chọn đúng rồi.';
            feedbackEl.className = 'feedback-msg correct-text';
        } else {
            selectedEl.classList.add('incorrect');
            // Find correct one and highlight it
            const correctText = options[0].innerText; // Just for fallback
            let foundCorrect = false;
            options.forEach(opt => {
                if (opt.innerHTML.includes(`<strong>${correctChar}.</strong>`)) {
                    opt.classList.add('correct');
                    foundCorrect = true;
                }
            });
            
            feedbackEl.textContent = `❌ Rất tiếc, đáp án đúng là ${correctChar}.`;
            feedbackEl.className = 'feedback-msg incorrect-text';
        }

        updateScore();
        
        if (itemIndex !== undefined) {
            const cards = document.querySelectorAll('.question-card');
            if (itemIndex + 1 < cards.length && answeredQuestions < questions.length) {
                setTimeout(() => {
                    cards[itemIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 600);
            }
        }
        
        if (answeredQuestions === questions.length) {
            setTimeout(() => {
                if (isOneTimeMode) {
                    localStorage.setItem('quiz_completed_' + currentQuizId, 'true');
                    if (retryBtn) retryBtn.style.display = 'none';
                } else {
                    if (retryBtn) retryBtn.style.display = 'block';
                }

                if (resultModal) {
                    const point = (score / questions.length) * 10;
                    const pointFormatted = parseFloat(point.toFixed(2));
                    
                    let rankText = 'Yếu 😞';
                    let rankColor = 'var(--error-color)';
                    if (point >= 8) {
                        rankText = 'Giỏi 🏆';
                        rankColor = 'var(--success-color)';
                    } else if (point >= 6) {
                        rankText = 'Khá 🌟';
                        rankColor = '#3b82f6'; // Blue
                    } else if (point >= 4) {
                        rankText = 'Trung bình 😐';
                        rankColor = '#eab308'; // Yellow
                    }

                    finalScore.textContent = `${pointFormatted}/10`;
                    if (finalRank) {
                        finalRank.innerHTML = `${rankText} <span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: normal;">(Đúng ${score}/${questions.length} câu)</span>`;
                        finalRank.style.color = rankColor;
                    }

                    resultModal.classList.remove('hidden');
                }
            }, 600);
        }
    }

    function updateScore() {
        scoreDisplay.textContent = `Điểm: ${score}/${questions.length} (Đã làm: ${answeredQuestions})`;
    }
});
