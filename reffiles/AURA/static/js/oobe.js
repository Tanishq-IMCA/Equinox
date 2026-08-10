// --- OOBE STATE & Q&A DATA ---
let currentStress = 0;
let targetStress = 0;
let rawCumulativeStress = 0;
let stressVelocity = 0;
const TOTAL_SEGMENTS = 22;
let userName = "";
let spiritualAlignment = "";
let selectedCategory = "";
let currentQuestionIndex = 0;
let selectedMandala = '';
let oobeVoice = null;
let activeVoiceToken = 0;
let oobeFallbackTimer = null;

const introSentences = [
    "Welcome, GEMINI_START{name}GEMINI_END.",
    "We’re glad you’re here.",
    "You’ve taken the first step towards something better.",
    "Now, let’s set things up—properly.",
    "Before we begin, we’d like to understand you a little better.",
    "Just a few simple questions… nothing intense.",
    "Go at your own pace.",
    "There’s no rush here.",
    "Let’s begin."
];

const qnaDatabase = {
    'Work': [
        { q: "How overwhelmed do you feel by your current workload?", answers: [{ t: "Not at all", v: 2 }, { t: "Slightly", v: 6 }, { t: "Very overwhelmed", v: 14 }] },
        { q: "Are you struggling to meet deadlines?", answers: [{ t: "No, I'm on track", v: 1 }, { t: "Barely managing", v: 8 }, { t: "Constantly behind", v: 15 }] },
        { q: "How is your work-life balance?", answers: [{ t: "Excellent", v: 1 }, { t: "Blurring together", v: 7 }, { t: "Non-existent", v: 14 }] },
        { q: "Do you feel supported by your peers or management?", answers: [{ t: "Yes, fully", v: 1 }, { t: "Somewhat", v: 6 }, { t: "Not at all", v: 12 }] },
        { q: "Are you worried about job security?", answers: [{ t: "No concerns", v: 1 }, { t: "A little uneasy", v: 8 }, { t: "Highly anxious", v: 15 }] },
        { q: "How often do you think about work outside of work hours?", answers: [{ t: "Rarely", v: 2 }, { t: "Sometimes", v: 7 }, { t: "Constantly", v: 14 }] },
        { q: "Do you feel appropriately compensated for your effort?", answers: [{ t: "Yes", v: 1 }, { t: "It could be better", v: 5 }, { t: "Highly undervalued", v: 12 }] }
    ],
    'Relationships': [
        { q: "Have you had a recent conflict with someone close?", answers: [{ t: "No", v: 1 }, { t: "A minor disagreement", v: 7 }, { t: "A major fight", v: 15 }] },
        { q: "How isolated are you feeling?", answers: [{ t: "Very connected", v: 1 }, { t: "A bit lonely", v: 8 }, { t: "Completely isolated", v: 15 }] },
        { q: "Are you able to communicate your feelings effectively?", answers: [{ t: "Yes, easily", v: 1 }, { t: "Sometimes", v: 6 }, { t: "I feel misunderstood", v: 13 }] },
        { q: "Is trust an issue in your current relationships?", answers: [{ t: "No trust issues", v: 1 }, { t: "Minor doubts", v: 7 }, { t: "Major breach of trust", v: 14 }] },
        { q: "Do you feel burdened by the expectations of others?", answers: [{ t: "Not at all", v: 1 }, { t: "Somewhat", v: 8 }, { t: "Extremely burdened", v: 15 }] },
        { q: "How much social energy do you have left?", answers: [{ t: "Plenty", v: 1 }, { t: "Getting low", v: 7 }, { t: "Completely drained", v: 14 }] },
        { q: "Are you currently avoiding a difficult conversation?", answers: [{ t: "No", v: 1 }, { t: "Thinking about it", v: 6 }, { t: "Actively avoiding it", v: 12 }] }
    ],
    'Health': [
        { q: "How is your sleep quality?", answers: [{ t: "Restful", v: 1 }, { t: "Interrupted", v: 8 }, { t: "Insomnia / Exhausted", v: 15 }] },
        { q: "Are you experiencing physical tension or pain?", answers: [{ t: "None", v: 1 }, { t: "Mild discomfort", v: 7 }, { t: "Chronic/Severe pain", v: 14 }] },
        { q: "How are your energy levels throughout the day?", answers: [{ t: "High and stable", v: 1 }, { t: "Fluctuating", v: 6 }, { t: "Constantly drained", v: 13 }] },
        { q: "Are you anxious about a specific health concern?", answers: [{ t: "No", v: 1 }, { t: "Mildly worried", v: 8 }, { t: "Highly anxious", v: 15 }] },
        { q: "How would you rate your diet recently?", answers: [{ t: "Healthy and balanced", v: 1 }, { t: "Could be better", v: 5 }, { t: "Very poor", v: 12 }] },
        { q: "Are you engaging in regular physical activity?", answers: [{ t: "Yes, frequently", v: 1 }, { t: "Occasionally", v: 5 }, { t: "Rarely/Never", v: 12 }] },
        { q: "Do you feel you have time to rest and recover?", answers: [{ t: "Yes", v: 1 }, { t: "Not enough", v: 7 }, { t: "No time at all", v: 14 }] }
    ],
    'Existential': [
        { q: "Do you feel a sense of purpose in your daily life?", answers: [{ t: "Yes, clearly", v: 1 }, { t: "Somewhat blurred", v: 8 }, { t: "I feel lost", v: 15 }] },
        { q: "Are you worried about the future?", answers: [{ t: "I am optimistic", v: 1 }, { t: "A little uncertain", v: 7 }, { t: "Highly anxious about it", v: 14 }] },
        { q: "Do you feel aligned with your core values?", answers: [{ t: "Absolutely", v: 1 }, { t: "Mostly", v: 6 }, { t: "I feel disconnected", v: 13 }] },
        { q: "Are you questioning past life choices?", answers: [{ t: "No regrets", v: 1 }, { t: "Sometimes", v: 7 }, { t: "Constantly dwelling on them", v: 15 }] },
        { q: "How much control do you feel you have over your life?", answers: [{ t: "A lot", v: 1 }, { t: "Some control", v: 7 }, { t: "I feel powerless", v: 15 }] },
        { q: "Do you feel stuck in a routine?", answers: [{ t: "No, life is dynamic", v: 1 }, { t: "A bit repetitive", v: 6 }, { t: "Trapped in a cycle", v: 13 }] },
        { q: "Are you seeking a major change?", answers: [{ t: "No, I am content", v: 1 }, { t: "Considering it", v: 6 }, { t: "Desperately", v: 12 }] }
    ]
};

const progressPhrases = [ "Beginning analysis...", "Gathering bio-feedback...", "Mapping emotional baseline...", "Calibrating sanctuary...", "Almost there...", "Finalizing alignment..." ];
const oobeAudioAliases = {
    "Welcome, {name}.": "Welcome",
    "What is your spiritual alignment?": "What is your spiritual alignment",
    "What is currently your primary source of stress?": "What is currently your primary source of stress",
    "Great, we have collected your data. Thank you for your time. Let's get started.": "Great, we have collected your data. Thank you for your time. Let's get started",
    "Thank you, {name}. Your sanctuary is ready, aligned with the principles of {spiritualAlignment}.": "Thank you. Your sanctuary is ready, aligned with the principles of",
    "Your sanctuary is ready, aligned with the principles of {spiritualAlignment}.": "Thank you. Your sanctuary is ready, aligned with the principles of"
};

let segmentCache = [];

function initOobeVoice() {
    if (!oobeVoice) {
        oobeVoice = new Audio();
        oobeVoice.preload = 'auto';
    }
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getOobeAudioCandidates(rawText) {
    const trimmed = rawText
        .replace(/GEMINI_START(.*?)GEMINI_END/g, '$1')
        .replace(/<span class='[^']+'>(.*?)<\/span>/g, '$1')
        .trim();
    let normalized = trimmed;

    if (userName) {
        normalized = normalized.replace(new RegExp(escapeRegex(userName), 'g'), '{name}');
    }
    if (spiritualAlignment) {
        normalized = normalized.replace(new RegExp(escapeRegex(spiritualAlignment), 'g'), '{spiritualAlignment}');
    }

    const candidates = [trimmed];
    const alias = oobeAudioAliases[normalized];
    if (alias) candidates.unshift(alias);

    return [...new Set(candidates)];
}

function playOobeAudio(text, options = {}) {
    initOobeVoice();
    const candidates = getOobeAudioCandidates(text);
    const token = ++activeVoiceToken;
    const allowInteractionResume = options.allowInteractionResume === true;

    return new Promise((resolve) => {
        const tryNext = (index) => {
            if (token !== activeVoiceToken || index >= candidates.length) {
                resolve();
                return;
            }

            const candidate = candidates[index];
            const audioPath = `/static/audio/OOTB/${encodeURIComponent(candidate)}.mp3`;

            const cleanup = () => {
                oobeVoice.onended = null;
                oobeVoice.onerror = null;
                oobeVoice.onloadedmetadata = null;
                if (oobeFallbackTimer) {
                    clearTimeout(oobeFallbackTimer);
                    oobeFallbackTimer = null;
                }
            };

            oobeVoice.onended = () => {
                cleanup();
                resolve();
            };

            oobeVoice.onerror = () => {
                cleanup();
                tryNext(index + 1);
            };

            oobeVoice.onloadedmetadata = () => {
                if (!Number.isFinite(oobeVoice.duration) || oobeVoice.duration <= 0) return;
                if (oobeFallbackTimer) clearTimeout(oobeFallbackTimer);
                oobeFallbackTimer = setTimeout(() => {
                    cleanup();
                    resolve();
                }, Math.ceil(oobeVoice.duration * 1000) + 300);
            };

            oobeVoice.src = audioPath;
            oobeVoice.load();

            const playPromise = oobeVoice.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    cleanup();
                    if (token !== activeVoiceToken) {
                        resolve();
                        return;
                    }
                    if (allowInteractionResume) {
                        const resumeAfterInteraction = () => {
                            document.removeEventListener('click', resumeAfterInteraction);
                            document.removeEventListener('keydown', resumeAfterInteraction);
                            document.removeEventListener('touchstart', resumeAfterInteraction);
                            playOobeAudio(text, { allowInteractionResume: false }).then(resolve);
                        };
                        document.addEventListener('click', resumeAfterInteraction, { once: true });
                        document.addEventListener('keydown', resumeAfterInteraction, { once: true });
                        document.addEventListener('touchstart', resumeAfterInteraction, { once: true, passive: true });
                        return;
                    }
                    tryNext(index + 1);
                });
            }
        };

        tryNext(0);
    });
}

function typeWriterWithAudio(element, text, fnCallback, audioOptions = {}) {
    typeWriter(element, text, () => {
        playOobeAudio(text, audioOptions).then(() => {
            if (typeof fnCallback === 'function') {
                fnCallback();
            }
        });
    });
}

function initDialometer() {
    const svg = document.getElementById('dial-svg');
    const radiusX = 85, radiusY = 85, centerX = 100, centerY = 105;
    const startAngle = -175, endAngle = -5;
    const angleStep = (endAngle - startAngle) / (TOTAL_SEGMENTS - 1);
    
    segmentCache = [];
    for (let i = 0; i < TOTAL_SEGMENTS; i++) {
        const angleDeg = startAngle + (i * angleStep);
        const angleRad = angleDeg * (Math.PI / 180);
        const x = centerX + (radiusX * Math.cos(angleRad));
        const y = centerY + (radiusY * Math.sin(angleRad));
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("class", "dial-segment");
        rect.setAttribute("id", `segment-${i}`);
        rect.setAttribute("x", x - 3);
        rect.setAttribute("y", y - 12);
        rect.setAttribute("width", 6);
        rect.setAttribute("height", 24);
        rect.setAttribute("rx", 3);
        rect.setAttribute("ry", 3);
        rect.setAttribute("transform", `rotate(${angleDeg + 90}, ${x}, ${y})`);
        svg.appendChild(rect);
        segmentCache.push(rect);
    }
}

let lastLitSegments = -1;
let odometerStrip = null;

function initOdometer() {
    const strip = document.getElementById('odometer-strip');
    if (!strip) return;
    let html = '';
    for(let i = -5; i <= 105; i++) {
        html += `<div class="odometer-item">${Math.min(100, Math.max(0, i))}%</div>`;
    }
    strip.innerHTML = html;
    strip.style.transform = `translateY(-5em)`;
    odometerStrip = strip; // Cache it here too
}

function animateDial() {
    const diff = targetStress - currentStress;
    const absDiff = Math.abs(diff);
    
    if (absDiff > 0.001 || Math.abs(stressVelocity) > 0.001) {
        // Snappier physics: higher acceleration, lower damping
        stressVelocity += diff * 0.08; 
        stressVelocity *= 0.82;
        currentStress += stressVelocity;
        
        // Clamp currentStress to avoid overshooting too far
        if (Math.abs(currentStress - targetStress) < 0.01 && Math.abs(stressVelocity) < 0.01) {
            currentStress = targetStress;
            stressVelocity = 0;
        }

        if (!odometerStrip) odometerStrip = document.getElementById('odometer-strip');
        if (odometerStrip) {
            odometerStrip.style.transform = `translateY(-${currentStress + 5}em)`;
        }
        
        const segmentsToLight = Math.round((currentStress / 100) * TOTAL_SEGMENTS);
        
        // Only update DOM if the number of segments to light has changed
        if (segmentsToLight !== lastLitSegments) {
            for (let i = 0; i < TOTAL_SEGMENTS; i++) {
                const seg = segmentCache[i] || document.getElementById(`segment-${i}`);
                if(!seg) continue;
                
                // Minimize classList operations
                let newClass = 'dial-segment';
                if (i < segmentsToLight) {
                    const p = (i / TOTAL_SEGMENTS) * 100;
                    if (p < 55) newClass += ' active-green';
                    else if (p < 75) newClass += ' active-yellow';
                    else newClass += ' active-red';
                    
                    if (i === segmentsToLight - 1) newClass += ' blinking';
                }
                
                if (seg.getAttribute('class') !== newClass) {
                    seg.setAttribute('class', newClass);
                }
            }
            lastLitSegments = segmentsToLight;
        }
    }
    requestAnimationFrame(animateDial);
}

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+<>?:{}|';

function typeWriter(element, text, fnCallback) {
    if (!element) return;
    element.innerHTML = '';

    // Process text into segments (GEMINI markers, spans, or plain text)
    // This allows us to handle themed words like <span class='active-green'>low</span>
    const tokenRegex = /(GEMINI_START.*?GEMINI_END|<span class='[^']+'>.*?<\/span>)/g;
    const parts = text.split(tokenRegex);
    let currentPart = 0;
    let totalWordsTyped = 0;

    function processNextPart() {
        if (currentPart >= parts.length) {
            if (typeof fnCallback === 'function') {
                // Keep the extra pause for Gemini-themed sentences (Welcome screen)
                if (text.includes("GEMINI_START")) {
                    setTimeout(fnCallback, 1500);
                } else {
                    fnCallback();
                }
            }
            return;
        }

        const part = parts[currentPart++];
        if (!part) {
            processNextPart();
            return;
        }

        if (part.startsWith("GEMINI_START")) {
            const name = part.replace("GEMINI_START", "").replace("GEMINI_END", "");
            renderGemini(element, name, processNextPart);
            totalWordsTyped += 1; // Count name as one word for scramble logic
        } else if (part.startsWith("<span")) {
            const match = part.match(/<span class='([^']+)'>([^<]+)<\/span>/);
            if (match) {
                const className = match[1];
                const content = match[2];
                typeWriterScramble(element, content, processNextPart, className, totalWordsTyped);
                totalWordsTyped += content.trim().split(/\s+/).filter(w => w.length > 0).length;
            } else {
                processNextPart();
            }
        } else {
            typeWriterScramble(element, part, processNextPart, null, totalWordsTyped);
            totalWordsTyped += part.trim().split(/\s+/).filter(w => w.length > 0).length;
        }
    }

    processNextPart();
}

function renderGemini(element, name, callback) {
    const nameContainer = document.createElement('span');
    nameContainer.className = 'ai-name-highlight'; // Base stays white; shine passes through
    nameContainer.setAttribute('data-text', '');
    element.appendChild(nameContainer);
    
    // Type out the name quickly and keep data-text in sync for the ::after mask
    let charIndex = 0;
    const typeName = () => {
        if (charIndex < name.length) {
            nameContainer.textContent += name[charIndex];
            nameContainer.setAttribute('data-text', nameContainer.textContent);
            charIndex++;
            setTimeout(typeName, 50);
        } else {
            // Once fully typed, let the pass-through finish, then remove overlay
            setTimeout(() => {
                nameContainer.classList.add('white-fade');
                if (callback) callback();
            }, 3000); // aligns with CSS animation duration for the shine
        }
    };
    typeName();
}

function typeWriterScramble(element, text, fnCallback, className = null, wordsOffset = 0) {
    if (!text) {
        if (fnCallback) fnCallback();
        return;
    }

    const words = text.trim().split(/\s+/);
    const MAX_SCRAMBLE_WORDS = 3;
    let charIndex = 0;
    let scramblingChars = [];
    
    const interval = setInterval(() => {
        if (charIndex < text.length) {
            const char = text[charIndex];
            const wordsSoFar = text.substring(0, charIndex + 1).trim().split(/\s+/).filter(w => w.length > 0);
            const isScrambleZone = (wordsSoFar.length + wordsOffset) <= MAX_SCRAMBLE_WORDS && char !== ' ';

            const span = document.createElement('span');
            if (className) span.className = className;
            
            if (char === ' ') {
                span.textContent = ' ';
            } else {
                span.textContent = char;
            }
            element.appendChild(span);

            if (isScrambleZone) {
                scramblingChars.push({
                    el: span,
                    target: char,
                    frames: 8 + Math.floor(Math.random() * 12)
                });
            }
            charIndex++;
        }

        // Update scramblers
        scramblingChars.forEach(obj => {
            if (obj.frames > 0) {
                obj.el.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                obj.el.style.opacity = '0.7';
                obj.frames--;
            } else if (obj.frames === 0) {
                obj.el.textContent = obj.target;
                obj.el.style.opacity = '1';
                obj.frames = -1; // Done
            }
        });

        if (charIndex >= text.length && scramblingChars.every(o => o.frames < 0)) {
            clearInterval(interval);
            if (fnCallback) fnCallback();
        }
    }, 35);
}

function startTextAnimation(i) {
    if (i < introSentences.length) {
        let text = introSentences[i];
        if (text.includes("{name}")) {
            text = text.replace("{name}", userName);
        }
        const introTextEl = document.getElementById("intro-text");
        typeWriterWithAudio(introTextEl, text, function() {
            // Fade out current text before typing next
            setTimeout(() => {
                introTextEl.style.transition = "opacity 0.5s ease";
                introTextEl.style.opacity = '0';
                
                setTimeout(() => {
                    introTextEl.innerHTML = "";
                    introTextEl.style.opacity = '1';
                    startTextAnimation(i + 1);
                }, 500);
            }, 800); // Pause before fading out
        }, i === 0 ? { allowInteractionResume: true } : {});
    } else {
        const introScreen = document.getElementById('oobe-intro');
        introScreen.style.opacity = '0';
        introScreen.style.pointerEvents = 'none';
        setTimeout(() => {
            introScreen.style.display = 'none';
            showDialAndMove();
        }, 1000);
    }
}

function showDialAndMove() {
    const dialContainer = document.getElementById('dial-container');
    const oobeSequence = document.getElementById('oobe-sequence');
    
    oobeSequence.style.visibility = 'visible';
    dialContainer.classList.add('visible');
    
    // Give it a small delay so it appears in center first, then moves
    setTimeout(() => {
        dialContainer.classList.add('moved-right');
        setTimeout(startDialIntro, 1200); // Wait for movement to finish
    }, 1000);
}

function startDialIntro() {
    const dialIntroStep = document.getElementById('dial-intro-step');
    const leftPanel = document.getElementById('oobe-left-panel');
    
    leftPanel.classList.add('active');
    dialIntroStep.classList.add('active');
    
    // Explicitly set opacity to 1 so the text container is visible
    setTimeout(() => {
        dialIntroStep.style.opacity = '1';
    }, 50);
    
    const title = dialIntroStep.querySelector('.oobe-title');
    const lowText = document.getElementById('dial-intro-text-low');
    const mediumText = document.getElementById('dial-intro-text-medium');
    const highText = document.getElementById('dial-intro-text-high');

    typeWriterWithAudio(title, "This dial indicates your stress levels.", () => {
        setTimeout(() => {
            typeWriterWithAudio(lowText, "When your stress is <span class='active-green'>low</span>, your dial will look like this.", () => {
                targetStress = 30;
                rawCumulativeStress = 30;
                setTimeout(() => {
                    typeWriterWithAudio(mediumText, "When it's <span class='active-yellow'>medium</span>, it will look like this.", () => {
                        targetStress = 60;
                        rawCumulativeStress = 60;
                        setTimeout(() => {
                            typeWriterWithAudio(highText, "And when it's <span class='active-red'>high</span>, it will look like this.", () => {
                                targetStress = 90;
                                rawCumulativeStress = 90;
                                setTimeout(() => {
                                    targetStress = 0;
                                    rawCumulativeStress = 0;
                                    dialIntroStep.style.opacity = '0';
                                    setTimeout(() => {
                                        dialIntroStep.classList.remove('active');
                                        const step2 = document.getElementById('oobe-step-2');
                                        if (step2) {
                                            const step2Title = document.getElementById('step-2-title');
                                            // Set opacity before typing so user sees the progress
                                            step2.classList.add('active');
                                            setTimeout(() => step2.style.opacity = '1', 50);
                                            
                                            const ladder = document.querySelector('#oobe-step-2 .oobe-options-ladder');
                                            if (ladder) {
                                                ladder.style.opacity = '0';
                                                ladder.style.pointerEvents = 'none';
                                            }

                                            typeWriterWithAudio(step2Title, "What is your spiritual alignment?", () => {
                                                // Options appear only after text finishes, matching later questions
                                                if (ladder) {
                                                    setTimeout(() => {
                                                        ladder.style.opacity = '1';
                                                        ladder.style.pointerEvents = 'all';
                                                    }, 300);
                                                }
                                            });
                                        }
                                    }, 600); // Reduced from 800
                                }, 1500); // Wait a bit to show high stress before resetting
                            });
                        }, 500); // Reduced from 1000
                    });
                }, 1000); // Reduced from 2000
            });
        }, 500); // Reduced from 1000
    });
}

function startQnA(category) {
    // If it's a religion, save it and ask for stress source
    if (['Hinduism', 'Buddhism', 'Jainism', 'Sikhism', 'Not Religious'].includes(category)) {
        spiritualAlignment = category;
        const step2Title = document.getElementById('step-2-title');
        const ladder = document.querySelector('#oobe-step-2 .oobe-options-ladder');
        
        // Smoothly fade out current content
        if (step2Title) step2Title.style.opacity = '0';
        if (ladder) {
            ladder.style.opacity = '0';
            ladder.style.pointerEvents = 'none';
        }

        setTimeout(() => {
            // Show step2 panel if not already visible
            const step2 = document.getElementById('oobe-step-2');
            if (step2) {
                step2.classList.add('active');
                step2.style.opacity = '1';
            }
            
            // Ensure title is ready to be seen before typing
            if (step2Title) step2Title.style.opacity = '1';
        
            typeWriterWithAudio(step2Title, "What is currently your primary source of stress?", () => {
                setTimeout(() => {
                    if (ladder) {
                        ladder.innerHTML = `
                            <div class="ladder-btn" onclick="startQnA('Work')">💼 Work & Career</div>
                            <div class="ladder-btn" onclick="startQnA('Relationships')">🤝 Relationships</div>
                            <div class="ladder-btn" onclick="startQnA('Health')">🏥 Health & Well-being</div>
                            <div class="ladder-btn" onclick="startQnA('Existential')">🌌 Life Purpose / Existential</div>
                        `;
                        ladder.style.opacity = '1';
                        ladder.style.pointerEvents = 'all';
                    }
                }, 400); // Smooth arrival
            });
        }, 600);
        return;
    }

    selectedCategory = category;
    currentQuestionIndex = 0;
    targetStress = 0;
    rawCumulativeStress = 0;
    currentStress = 0;
    
    // Select the appropriate questions based on the selected stress category
    if (!qnaDatabase[selectedCategory]) {
        console.error("Category not found in database:", selectedCategory);
        selectedCategory = 'Work'; // Fallback
    }
    
    // Shuffle the questions for variety
    qnaDatabase[selectedCategory].sort(() => Math.random() - 0.5);
    
    const step2 = document.getElementById('oobe-step-2');
    const qnaStep = document.getElementById('oobe-qna');
    
    if (step2) step2.style.opacity = '0';
    setTimeout(() => {
        if (step2) step2.classList.remove('active');
        if (qnaStep) {
            qnaStep.classList.add('active');
            qnaStep.style.opacity = '1';
            renderQuestion();
        }
    }, 200); // Reduced delay
}

function renderQuestion() {
    const questions = qnaDatabase[selectedCategory];
    if (currentQuestionIndex >= questions.length) {
        showFinalStep();
        return;
    }
    
    const progressEl = document.getElementById('qna-progress');
    let phraseIndex = Math.floor((currentQuestionIndex / questions.length) * progressPhrases.length);
    if (phraseIndex >= progressPhrases.length) phraseIndex = progressPhrases.length - 1;
    if (progressEl) {
        progressEl.innerText = progressPhrases[phraseIndex];
        progressEl.style.opacity = '1';
    }

    const currentQ = questions[currentQuestionIndex];
    
    const titleEl = document.getElementById('qna-title');
    if (titleEl) {
        titleEl.innerHTML = '';
        // Ensure title is visible
        titleEl.style.opacity = '1';
        
        typeWriter(titleEl, currentQ.q, () => {
            const optionsContainer = document.getElementById('qna-options');
            if (optionsContainer) {
                optionsContainer.innerHTML = '';
                optionsContainer.style.opacity = '0'; // Start hidden
                
                currentQ.answers.forEach(ans => {
                    const btn = document.createElement('div');
                    btn.className = 'ladder-btn';
                    btn.style.pointerEvents = 'all'; 
                    btn.innerText = ans.t;
                    btn.onclick = () => answerQuestion(ans.v);
                    optionsContainer.appendChild(btn);
                });
                
                // Reveal options with a slight delay for smoothness
                setTimeout(() => {
                    optionsContainer.style.opacity = '1';
                }, 300);
            }
        });
    }
}

function answerQuestion(stressValue) {
    const questions = qnaDatabase[selectedCategory];
    
    // Find the actual maximum possible stress for the current set of questions
    let totalMaxStress = 0;
    questions.forEach(q => {
        let maxQ = 0;
        q.answers.forEach(a => {
            if (a.v > maxQ) maxQ = a.v;
        });
        totalMaxStress += maxQ;
    });

    const normalizedContribution = (stressValue / totalMaxStress) * 100;
    
    rawCumulativeStress += normalizedContribution;
    targetStress = Math.round(Math.min(100, rawCumulativeStress));
    
    const qnaStep = document.getElementById('oobe-qna');
    const optionsContainer = document.getElementById('qna-options');
    
    if (optionsContainer) optionsContainer.style.opacity = '0';
    
    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < qnaDatabase[selectedCategory].length) {
            renderQuestion();
        } else {
            showFinalStep();
        }
    }, 600);
}

function showFinalStep() {
    const qnaStep = document.getElementById('oobe-qna');
    const finalStep = document.getElementById('oobe-final');
    
    const finalNameEl = document.getElementById('final-name');
    if (finalNameEl) {
        finalNameEl.innerHTML = "";
        // Re-use the typing function for the name
        typeWriter(finalNameEl, `GEMINI_START${userName}GEMINI_END`, () => {});
    }
    
    const subtext = document.getElementById('final-subtext');
    let alignmentMessage = "Your sanctuary is ready.";
    if (spiritualAlignment && spiritualAlignment !== 'Not Religious') {
         alignmentMessage = `Your sanctuary is ready, aligned with the principles of ${spiritualAlignment}.`;
    }
    
    if (qnaStep) qnaStep.style.opacity = '0';
    setTimeout(() => {
        if (qnaStep) qnaStep.classList.remove('active');
        
        // Show "Great, we have collected your data" before the final step
        const dialIntroStep = document.getElementById('dial-intro-step');
        
        if (dialIntroStep) {
            // Clear previous content
            document.getElementById('dial-intro-text-low').innerHTML = '';
            document.getElementById('dial-intro-text-medium').innerHTML = '';
            document.getElementById('dial-intro-text-high').innerHTML = '';
            dialIntroStep.querySelector('.oobe-title').innerHTML = '';
            
            // Create the done text element dynamically
            let doneText = document.getElementById('dial-intro-text-done');
            if (!doneText) {
                doneText = document.createElement('p');
                doneText.id = 'dial-intro-text-done';
                doneText.style.fontSize = '1.2rem';
                doneText.style.minHeight = '2em';
                doneText.style.marginBottom = '0.5em';
                doneText.style.color = 'var(--accent-color)';
                dialIntroStep.appendChild(doneText);
            }
            
            dialIntroStep.classList.add('active');
            dialIntroStep.style.opacity = '1';
            
            typeWriterWithAudio(doneText, "Great, we have collected your data. Thank you for your time. Let's get started.", () => {
                setTimeout(() => {
                    dialIntroStep.style.opacity = '0';
                    setTimeout(() => {
                        dialIntroStep.classList.remove('active');
                        
                        if (finalStep) {
                            finalStep.classList.add('active');
                            setTimeout(() => { 
                                finalStep.style.opacity = '1'; 
                                if (subtext) {
                                    typeWriterWithAudio(subtext, alignmentMessage, () => {
                                        const btnWrap = document.getElementById('final-btn-wrap');
                                        if (btnWrap) {
                                            btnWrap.style.pointerEvents = 'all';
                                            btnWrap.style.opacity = '1';
                                        }
                                    });
                                }
                            }, 50);
                        }
                    }, 600); // Reduced from 800
                }, 2000); // Increased from 1000 for readability
            });
        }
    }, 400); // Reduced from 800
}

function finishOOBE() {
    const dialContainer = document.getElementById('dial-container');
    const oobeSequence = document.getElementById('oobe-sequence');
    
    // Fade out everything
    if (dialContainer) dialContainer.style.opacity = '0';
    if (oobeSequence) oobeSequence.style.opacity = '0';
    
    setTimeout(() => {
        // Send updated profile data to server
        const profileData = { 
            religion: spiritualAlignment,
            stress_score: Math.round(targetStress)
        };
        
        fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        }).then(() => {
            sessionStorage.setItem('aura_force_music_start', 'true');
            localStorage.setItem('aura_music_paused', 'false');
            window.location.href = '/';
        });
    }, 1500);
}

document.addEventListener('DOMContentLoaded', () => {
    initOobeVoice();
    fetch('/api/profile').then(r => r.json()).then(data => {
        userName = data.name || "Traveler";
        startTextAnimation(0);
    });
    initDialometer();
    initOdometer();
    requestAnimationFrame(animateDial);
});
