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
    const shortenLinkBtn = document.getElementById('shorten-link-btn');
    const shortenStatus = document.getElementById('shorten-status');
    const qrContainer = document.getElementById('qr-container');
    const qrCode = document.getElementById('qr-code');
    const oneTimeCheckbox = document.getElementById('one-time-checkbox');
    
    // Result elements
    const resultModal = document.getElementById('result-modal');
    const finalScore = document.getElementById('final-score');
    const finalRank = document.getElementById('final-rank');
    const finalTime = document.getElementById('final-time');
    const retryBtn = document.getElementById('retry-btn');
    const closeResultBtn = document.getElementById('close-result-btn');
    
    // Setup Modal elements
    const setupModal = document.getElementById('setup-modal');
    const setupTotal = document.getElementById('setup-total');
    const modePracticeLabel = document.getElementById('mode-practice-label');
    const modeExamLabel = document.getElementById('mode-exam-label');
    const examConfig = document.getElementById('exam-config');
    const setupLimit = document.getElementById('setup-limit');
    const setupLimitMax = document.getElementById('setup-limit-max');
    const startBtn = document.getElementById('start-btn');
    const cancelSetupBtn = document.getElementById('cancel-setup-btn');
    const quizModeRadios = document.getElementsByName('quiz-mode');

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
    
    // Sidebar/Palette elements
    const questionPalette = document.getElementById('question-palette');
    const reviewFilter = document.getElementById('review-filter');
    const prevQBtn = document.getElementById('prev-q-btn');
    const nextQBtn = document.getElementById('next-q-btn');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageIndicator = document.getElementById('page-indicator');
    
    // View & Sync Controls
    const viewModeSelect = document.getElementById('view-mode-select');
    const autoNextSelect = document.getElementById('auto-next-select');
    const viewModeSelectReview = document.getElementById('view-mode-select-review');
    const autoNextSelectReview = document.getElementById('auto-next-select-review');

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
    let currentQuestionIndex = 0;
    let currentReviewFilter = 'all';
    let palettePageSize = 50;
    let currentPalettePage = 0;
    let viewMode = 'single';
    let autoNextDelay = 0;
    let autoNextTimeout = null;
    let pendingQuestions = [];
    let pendingFileName = "";
    let fullQuestionBank = []; // Permanent store for current file
    
    // Load persisted settings
    function loadSettings() {
        const savedViewMode = localStorage.getItem('quiz_view_mode');
        const savedAutoNext = localStorage.getItem('quiz_auto_next');
        const savedQuizMode = localStorage.getItem('quiz_mode');
        const savedLimit = localStorage.getItem('quiz_exam_limit');

        if (savedViewMode) {
            viewMode = savedViewMode;
            if (viewModeSelect) viewModeSelect.value = viewMode;
            if (viewModeSelectReview) viewModeSelectReview.value = viewMode;
        }
        if (savedAutoNext) {
            autoNextDelay = parseInt(savedAutoNext);
            if (autoNextSelect) autoNextSelect.value = savedAutoNext;
            if (autoNextSelectReview) autoNextSelectReview.value = savedAutoNext;
        }
        if (savedQuizMode && quizModeRadios) {
            quizModeRadios.forEach(r => {
                if (r.value === savedQuizMode) r.checked = true;
            });
            updateSetupModeUI(savedQuizMode);
        }
        if (savedLimit && setupLimit) {
            setupLimit.value = savedLimit;
        }
    }

    function saveSettings() {
        localStorage.setItem('quiz_view_mode', viewMode);
        localStorage.setItem('quiz_auto_next', autoNextDelay.toString());
        const selectedQuizMode = Array.from(quizModeRadios).find(r => r.checked)?.value;
        if (selectedQuizMode) localStorage.setItem('quiz_mode', selectedQuizMode);
        if (setupLimit) localStorage.setItem('quiz_exam_limit', setupLimit.value);
    }

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
                    let data = JSON.parse(decodedStr);
                    
                    // Convert compact format (v2) to original format if needed
                    if (data.q && !data.questions) {
                        data.questions = data.q.map(item => ({
                            text: item[0],
                            options: item[1].map(optStr => {
                                const dotIndex = optStr.indexOf('.');
                                return {
                                    char: optStr.substring(0, dotIndex),
                                    text: optStr.substring(dotIndex + 1).trim()
                                };
                            }),
                            correctAnswer: item[2]
                        }));
                        data.oneTime = data.o;
                        data.id = data.i;
                    }

                    if (data && data.questions) {
                        fullQuestionBank = data.questions; // Store for change mode
                        pendingQuestions = data.questions; 
                        if (data.oneTime && data.id) {
                            isOneTimeMode = true;
                            currentQuizId = data.id;
                            if (localStorage.getItem('quiz_completed_' + currentQuizId)) {
                                alert('Bài kiểm tra này chỉ cho phép làm 1 lần và bạn đã làm rồi!');
                                return;
                            }
                        }
                        const sharedName = data.id || "Quiz Chia Sẻ";
                        setTimeout(() => {
                            showSetupModal(pendingQuestions, sharedName);
                        }, 200);
                    }
                }
            } catch (e) {
                console.error('Lỗi giải mã quiz từ URL:', e);
            }
        }
    }

    function showSetupModal(qs, fileName) {
        pendingQuestions = qs;
        pendingFileName = fileName || "Bộ đề trắc nghiệm";
        
        const setupTitle = document.getElementById('setup-title');
        if (setupTitle) setupTitle.textContent = pendingFileName;
        if (setupTotal) setupTotal.textContent = `Bộ đề: ${pendingFileName} (${qs.length} câu hỏi)`;
        if (setupLimitMax) setupLimitMax.textContent = qs.length;
        if (setupLimit) {
            setupLimit.max = qs.length;
            setupLimit.value = Math.min(50, qs.length);
        }
        
        // Reset modal state
        quizModeRadios.forEach(r => {
            if (r.value === 'practice') r.checked = true;
        });
        updateSetupModeUI('practice');
        
        // Hide upload section to avoid background clutter
        uploadSection.classList.add('hidden');
        setupModal.classList.remove('hidden');
    }

    const changeModeBtn = document.getElementById('change-mode-btn');
    if (changeModeBtn) {
        changeModeBtn.addEventListener('click', () => {
            if (fullQuestionBank.length > 0) {
                showSetupModal(fullQuestionBank, currentFileName);
            }
        });
    }

    function updateSetupModeUI(mode) {
        if (mode === 'practice') {
            modePracticeLabel.style.borderColor = 'var(--primary-color)';
            modePracticeLabel.style.background = 'rgba(99, 102, 241, 0.1)';
            modeExamLabel.style.borderColor = 'transparent';
            modeExamLabel.style.background = 'rgba(255, 255, 255, 0.05)';
            examConfig.classList.add('hidden');
        } else {
            modeExamLabel.style.borderColor = 'var(--primary-color)';
            modeExamLabel.style.background = 'rgba(99, 102, 241, 0.1)';
            modePracticeLabel.style.borderColor = 'transparent';
            modePracticeLabel.style.background = 'rgba(255, 255, 255, 0.05)';
            examConfig.classList.remove('hidden');
        }
    }

    quizModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateSetupModeUI(e.target.value);
        });
    });

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            const selectedMode = Array.from(quizModeRadios).find(r => r.checked)?.value;
            let limit = null;
            
            if (selectedMode === 'exam') {
                limit = parseInt(setupLimit.value) || 50;
                if (limit < 1) limit = 1;
                if (limit > pendingQuestions.length) limit = pendingQuestions.length;
            }
            
            setupModal.classList.add('hidden');
            currentFileName = pendingFileName;
            saveSettings(); // Persist the mode and limit
            startQuiz(pendingQuestions, limit);
        });
    }

    if (cancelSetupBtn) {
        cancelSetupBtn.addEventListener('click', () => {
            setupModal.classList.add('hidden');
            window.location.hash = '';
        });
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
        handleFileUpload(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            currentFileName = file.name;
            handleFileUpload(file); // Call the defined handler
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
        currentPalettePage = 0;
        if (questionPalette) questionPalette.innerHTML = '';
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
            // Trigger review mode immediately from result modal
            startReview(questions, userAnswers, currentFileName);
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
            currentReviewFilter = 'all';
            if (reviewFilter) reviewFilter.value = 'all';
            reviewBanner.classList.add('hidden');
            quizSection.classList.add('hidden');
            uploadSection.classList.remove('hidden');
        });
    }

    if (reviewFilter) {
        reviewFilter.addEventListener('change', (e) => {
            currentReviewFilter = e.target.value;
            renderQuestions(true, currentReviewFilter);
        });
    }

    if (prevQBtn) {
        prevQBtn.addEventListener('click', () => navigateQuestion(-1));
    }

    if (nextQBtn) {
        nextQBtn.addEventListener('click', () => navigateQuestion(1));
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPalettePage > 0) {
                currentPalettePage--;
                renderPalette(isReviewMode);
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if ((currentPalettePage + 1) * palettePageSize < questions.length) {
                currentPalettePage++;
                renderPalette(isReviewMode);
            }
        });
    }

    [viewModeSelect, viewModeSelectReview].forEach(select => {
        if (select) {
            select.addEventListener('change', (e) => {
                viewMode = e.target.value;
                if (viewModeSelect) viewModeSelect.value = viewMode;
                if (viewModeSelectReview) viewModeSelectReview.value = viewMode;
                saveSettings();
                renderQuestions(isReviewMode, currentReviewFilter);
                jumpToQuestion(currentQuestionIndex);
            });
        }
    });

    [autoNextSelect, autoNextSelectReview].forEach(select => {
        if (select) {
            select.addEventListener('change', (e) => {
                autoNextDelay = parseInt(e.target.value);
                if (autoNextSelect) autoNextSelect.value = autoNextDelay;
                if (autoNextSelectReview) autoNextSelectReview.value = autoNextDelay;
                saveSettings();
                resetAutoNextTimer();
            });
        }
    });



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
            // Create a COMPACT version of the data to keep URL short
            const compactData = {
                q: questions.map(q => [
                    q.text,
                    q.options.map(o => `${o.char}.${o.text}`),
                    q.correctAnswer
                ]),
                o: oneTimeCheckbox.checked,
                i: 'quiz_' + Math.random().toString(36).substring(2, 7)
            };
            
            const jsonStr = JSON.stringify(compactData);
            const compressed = LZString.compressToEncodedURIComponent(jsonStr);
            
            const baseUrl = window.location.href.split('#')[0];
            const url = baseUrl + '#' + compressed;
            shareLinkInput.value = url;
            shareLinkContainer.classList.remove('hidden');

            // Generate QR Code as a fallback
            if (url.length < 2500) {
                qrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
                qrContainer.classList.remove('hidden');
            } else {
                qrContainer.classList.add('hidden');
                shortenStatus.innerHTML = `⚠️ Bài quá lớn (${questions.length} câu), link cực dài. Một số máy có thể không mở được. Bạn nên dùng Bitly.com để rút gọn thủ công.`;
            }
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

    if (shortenLinkBtn) {
        shortenLinkBtn.addEventListener('click', async () => {
            const longUrl = shareLinkInput.value;
            if (!longUrl) return;

            shortenStatus.textContent = "⚡ Đang xử lý...";
            shortenStatus.style.color = "var(--text-secondary)";
            shortenLinkBtn.disabled = true;

            try {
                // Sử dụng proxy để gửi yêu cầu đến is.gd (hỗ trợ các URL dài hơn TinyURL)
                const apiUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`);
                const data = await response.json();
                const result = JSON.parse(data.contents);

                if (result.shorturl) {
                    shareLinkInput.value = result.shorturl;
                    shortenStatus.textContent = "✅ Đã rút gọn thành công!";
                    shortenStatus.style.color = "var(--success-color)";
                } else if (result.errorcode === 4) {
                    throw new Error("URL quá dài cho is.gd");
                } else {
                    throw new Error("Lỗi API");
                }
            } catch (err) {
                console.error("Lỗi rút gọn:", err);
                // Nếu tự động thất bại, mở trang rút gọn chuyên sâu Bitly/TinyURL
                shortenStatus.innerHTML = `Link bài quá dài để rút gọn tự động. Hãy <a href="https://tinyurl.com/create.php?url=${encodeURIComponent(longUrl)}" target="_blank" style="color:#3b82f6; text-decoration:underline; font-weight:bold;">Bấm vào đây để thử lại</a> hoặc dùng Bitly.com để rút gọn thủ công.`;
                shortenStatus.style.color = "var(--error-color)";
            } finally {
                shortenLinkBtn.disabled = false;
            }
        });
    }

    function handleFileUpload(file) {
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

        fullQuestionBank = parsedQuestions; // Store the original full bank
        showSetupModal(parsedQuestions, currentFileName);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function startQuiz(parsedQuestions, limit) {
        let shuffledQs = [...parsedQuestions];
        shuffleArray(shuffledQs);
        
        if (limit) {
            shuffledQs = shuffledQs.slice(0, limit);
        }
        
        questions = shuffledQs;
        score = 0;
        answeredQuestions = 0;
        userAnswers = new Array(questions.length).fill(null);
        isReviewMode = false;
        currentQuestionIndex = 0;
        reviewBanner.classList.add('hidden');
        quizTitleDisplay.textContent = currentFileName || "Bài Trắc Nghiệm";
        updateScore();
        
        uploadSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        
        renderPalette(false);
        renderQuestions();
        updateNavButtons();
        resetAutoNextTimer();
    }

    function startReview(qs, ans, name) {
        isReviewMode = true;
        questions = qs;
        userAnswers = ans;
        currentFileName = name;
        currentQuestionIndex = 0;
        
        uploadSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        reviewBanner.classList.remove('hidden');
        quizTitleDisplay.textContent = name;
        
        renderPalette(true);
        renderQuestions(true, currentReviewFilter);
        updateNavButtons();
        resetAutoNextTimer();
    }

    function renderPalette(isReview) {
        if (!questionPalette) return;
        questionPalette.innerHTML = '';
        
        const start = currentPalettePage * palettePageSize;
        const end = Math.min(start + palettePageSize, questions.length);
        
        // Update pagination UI
        if (pageIndicator) {
            const totalPages = Math.ceil(questions.length / palettePageSize);
            pageIndicator.textContent = `Trang ${currentPalettePage + 1} / ${totalPages || 1}`;
        }
        if (prevPageBtn) prevPageBtn.disabled = currentPalettePage === 0;
        if (nextPageBtn) nextPageBtn.disabled = (currentPalettePage + 1) * palettePageSize >= questions.length;
        
        for (let index = start; index < end; index++) {
            const item = document.createElement('div');
            item.className = 'palette-item';
            item.textContent = index + 1;
            item.id = `palette-item-${index}`;
            
            if (index === currentQuestionIndex) item.classList.add('active');
            
            const ua = userAnswers[index];
            const correct = questions[index].correctAnswer;
            
            if (ua !== null) {
                if (ua === correct) {
                    item.classList.add('correct');
                } else {
                    item.classList.add('incorrect');
                }
            }
            
            item.addEventListener('click', () => {
                jumpToQuestion(index);
                if (autoNextDelay > 0) resetAutoNextTimer();
            });
            questionPalette.appendChild(item);
        }
    }

    function resetAutoNextTimer() {
        if (autoNextTimeout) clearTimeout(autoNextTimeout);
        if (autoNextDelay > 0) {
            autoNextTimeout = setTimeout(() => {
                navigateQuestion(1);
            }, autoNextDelay);
        }
    }

    function updatePaletteStatus(index, isReview) {
        const item = document.getElementById(`palette-item-${index}`);
        if (!item) return;
        
        const ua = userAnswers[index];
        const correct = questions[index].correctAnswer;
        
        item.classList.remove('correct', 'incorrect', 'answered');
        
        if (ua !== null) {
            if (ua === correct) {
                item.classList.add('correct');
            } else {
                item.classList.add('incorrect');
            }
        }
    }

    function jumpToQuestion(index) {
        currentQuestionIndex = index;
        
        // Reset auto-next timer whenever we move to a question
        resetAutoNextTimer();

        // Auto-switch palette page if needed
        const targetPage = Math.floor(index / palettePageSize);
        if (targetPage !== currentPalettePage) {
            currentPalettePage = targetPage;
            renderPalette(isReviewMode);
        }

        // Update palette UI active state
        document.querySelectorAll('.palette-item').forEach(p => p.classList.remove('active'));
        const activeItem = document.getElementById(`palette-item-${index}`);
        if (activeItem) activeItem.classList.add('active');
        
        if (viewMode === 'single') {
            const cards = document.querySelectorAll('.question-card');
            cards.forEach(card => {
                const cardIndex = parseInt(card.getAttribute('data-index'));
                if (cardIndex === index) {
                    card.style.display = 'block';
                    // Scroll to top of the card/page for better focus
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    card.style.display = 'none';
                }
            });
        } else {
            // Scroll to question in list mode
            const targetCard = document.querySelector(`.question-card[data-index="${index}"]`);
            if (targetCard) {
                targetCard.style.display = 'block'; // Ensure it's not hidden by filter
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        updateNavButtons();
    }

    function navigateQuestion(direction) {
        let newIndex = currentQuestionIndex;
        
        if (isReviewMode && currentReviewFilter === 'incorrect') {
            // Smart Skip: find next/prev incorrect question
            let step = direction > 0 ? 1 : -1;
            let i = currentQuestionIndex + step;
            while (i >= 0 && i < questions.length) {
                const ua = userAnswers[i];
                const correct = questions[i].correctAnswer;
                if (ua !== correct && ua !== null) {
                    newIndex = i;
                    break;
                }
                i += step;
            }
        } else {
            newIndex = currentQuestionIndex + direction;
        }

        if (newIndex >= 0 && newIndex < questions.length && newIndex !== currentQuestionIndex) {
            jumpToQuestion(newIndex);
        } else if (direction > 0 && newIndex === currentQuestionIndex && autoNextDelay > 0) {
            // If we're at the end in auto-next mode, stop timer
            if (autoNextTimeout) clearTimeout(autoNextTimeout);
        }
    }

    function updateNavButtons() {
        if (prevQBtn) prevQBtn.disabled = currentQuestionIndex === 0;
        if (nextQBtn) nextQBtn.disabled = currentQuestionIndex === questions.length - 1;
    }

    function renderQuestions(isReview = false, filter = 'all') {
        questionsContainer.innerHTML = '';
        
        questions.forEach((q, index) => {
            const ua = userAnswers[index];
            const isCorrect = ua === q.correctAnswer;
            
            // Apply filter in review mode
            if (isReview && filter === 'incorrect' && isCorrect && ua !== null) {
                return; // Skip correct answers
            }

            const qCard = document.createElement('div');
            qCard.className = 'question-card';
            qCard.setAttribute('data-index', index);
            qCard.style.animationDelay = `${index * 0.05}s`;
            
            // Handle Single View Mode Visibility
            if (viewMode === 'single' && index !== currentQuestionIndex) {
                qCard.style.display = 'none';
            } else if (viewMode === 'single' && index === currentQuestionIndex) {
                qCard.style.display = 'block';
            }
            
            // Sequential Header
            const qHeader = document.createElement('h3');
            qHeader.className = 'question-number-header';
            qHeader.textContent = `Câu ${index + 1}`;
            qCard.appendChild(qHeader);

            const qText = document.createElement('div');
            qText.className = 'question-text';
            qText.textContent = q.text; // Original text (e.g. "Câu 137: ...")
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
                    if (opt.char === q.correctAnswer) optEl.classList.add('correct');
                    if (opt.char === ua && ua !== q.correctAnswer) optEl.classList.add('incorrect');
                } else {
                    if (ua === opt.char) optEl.classList.add('selected');
                    optEl.addEventListener('click', () => {
                        handleAnswerSelection(qCard, optionsGrid, optEl, opt.char, q.correctAnswer, feedback, index);
                    });
                }
                optionsGrid.appendChild(optEl);
            });

            if (isReview) {
                feedback.style.display = 'block';
                if (ua === q.correctAnswer) {
                    feedback.textContent = '✅ Bạn đã trả lời đúng.';
                    feedback.className = 'feedback-msg correct-text';
                } else if (ua) {
                    feedback.textContent = `❌ Bạn đã chọn ${ua}. Đáp án đúng là ${q.correctAnswer}.`;
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
        updatePaletteStatus(itemIndex, false);
        
        // In "Auto-Next" mode, reset timer after selecting
        if (autoNextDelay > 0) {
            resetAutoNextTimer();
        } else {
            // Standard small delay for UX
            const cards = document.querySelectorAll('.question-card');
            if (itemIndex + 1 < cards.length && answeredQuestions < questions.length) {
                setTimeout(() => {
                    jumpToQuestion(itemIndex + 1);
                }, 600);
            }
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
        startReview(item.questions, item.userAnswers, item.fileName);
    };

    function updateScore() {
        scoreDisplay.textContent = `Điểm: ${score}/${questions.length} (Đã làm: ${answeredQuestions})`;
    }

    // Apply persisted settings
    loadSettings();
});
