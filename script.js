// Translation Web App JavaScript with Google Translate API Integration
class TranslatorApp {
    constructor() {
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeTheme();
        this.initializeSpeechRecognition();
        this.initializeSpeechSynthesis();
        this.startClock();
        this.translationTimeout = null;
        this.isRecording = false;
        
        // Google Translate API configuration
        this.googleTranslateApiKey = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw'; // Free tier key
        this.googleTranslateEndpoint = 'https://translation.googleapis.com/language/translate/v2';
    }

    initializeElements() {
        this.themeToggle = document.getElementById('themeToggle');
        this.inputText = document.getElementById('inputText');
        this.outputText = document.getElementById('outputText');
        this.fromLang = document.getElementById('fromLang');
        this.toLang = document.getElementById('toLang');
        this.swapBtn = document.getElementById('swapLang');
        this.copyBtn = document.getElementById('copyBtn');
        this.micBtn = document.getElementById('micBtn');
        this.speakInputBtn = document.getElementById('speakInputBtn');
        this.speakOutputBtn = document.getElementById('speakOutputBtn');
        this.charCount = document.getElementById('charCount');
        this.clock = document.getElementById('clock');
        this.date = document.getElementById('date');
    }

    initializeEventListeners() {
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Real-time translation
        this.inputText.addEventListener('input', () => this.handleInput());
        this.fromLang.addEventListener('change', () => this.translateText());
        this.toLang.addEventListener('change', () => this.translateText());

        // Language swap
        this.swapBtn.addEventListener('click', () => this.swapLanguages());

        // Copy functionality
        this.copyBtn.addEventListener('click', () => this.copyTranslation());

        // Voice features
        this.micBtn.addEventListener('click', () => this.toggleVoiceRecording());
        this.speakInputBtn.addEventListener('click', () => this.speakText(this.inputText.value, this.fromLang.value));
        this.speakOutputBtn.addEventListener('click', () => this.speakText(this.outputText.textContent, this.toLang.value));

        // Character count
        this.inputText.addEventListener('input', () => this.updateCharCount());
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('translator-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isRecording = true;
                this.micBtn.classList.add('recording');
                this.micBtn.textContent = '🔴 Recording...';
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.inputText.value = transcript;
                this.updateCharCount();
                this.translateText();
            };

            this.recognition.onend = () => {
                this.isRecording = false;
                this.micBtn.classList.remove('recording');
                this.micBtn.textContent = '🎤';
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isRecording = false;
                this.micBtn.classList.remove('recording');
                this.micBtn.textContent = '🎤';
            };
        } else {
            this.micBtn.style.display = 'none';
            console.warn('Speech Recognition not supported');
        }
    }

    initializeSpeechSynthesis() {
        if ('speechSynthesis' in window) {
            this.synthesis = window.speechSynthesis;
        } else {
            this.speakInputBtn.style.display = 'none';
            this.speakOutputBtn.style.display = 'none';
            console.warn('Speech Synthesis not supported');
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('translator-theme', newTheme);
    }

    startClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        const now = new Date();
        
        // Always use consistent format - no locale dependency
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        // Set time - always same format
        this.clock.textContent = `${hours}:${minutes}:${seconds}`;
        
        // Set date - always same format
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        const dayName = days[now.getDay()];
        const day = String(now.getDate());
        const monthName = months[now.getMonth()];
        const year = String(now.getFullYear());
        
        this.date.textContent = `${dayName}, ${day} ${monthName} ${year}`;
    }

    handleInput() {
        clearTimeout(this.translationTimeout);
        this.translationTimeout = setTimeout(() => {
            this.translateText();
        }, 500); // Debounce for 500ms
    }

    async translateText() {
        const text = this.inputText.value.trim();
        
        if (!text) {
            this.outputText.innerHTML = '<div class="placeholder">Translation will appear here...</div>';
            return;
        }

        // Show loading state
        this.outputText.innerHTML = '<div class="loading"></div> Translating...';

        try {
            let fromLang = this.fromLang.value;
            
            // If auto-detect is selected, detect the language first using Google Translate
            if (fromLang === 'auto') {
                fromLang = await this.detectLanguageWithGoogle(text);
            }
            
            const translation = await this.performGoogleTranslation(text, fromLang, this.toLang.value);
            this.outputText.textContent = translation;
        } catch (error) {
            console.error('Google Translate error:', error);
            this.outputText.innerHTML = '<div style="color: #e53e3e;">Google Translate service unavailable. Please check your internet connection and try again.</div>';
        }
    }

    async detectLanguageWithGoogle(text) {
        try {
            // Use Google Translate Detect API
            const response = await fetch(`${this.googleTranslateEndpoint}/detect?key=${this.googleTranslateApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text
                })
            });
            
            const data = await response.json();
            
            if (data.data && data.data.detections && data.data.detections.length > 0) {
                return data.data.detections[0][0].language;
            }
        } catch (error) {
            console.log('Google language detection failed, using simple detection');
        }
        
        // Fallback to simple detection only if Google API fails
        return this.simpleLanguageDetection(text);
    }

    async performGoogleTranslation(text, fromLang, toLang) {
        const response = await fetch(`${this.googleTranslateEndpoint}?key=${this.googleTranslateApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: fromLang === 'auto' ? undefined : fromLang,
                target: toLang,
                format: 'text'
            })
        });
        
        const data = await response.json();
        
        if (data.data && data.data.translations && data.data.translations.length > 0) {
            return data.data.translations[0].translatedText;
        } else {
            throw new Error('No translation returned from Google Translate');
        }
    }

    simpleLanguageDetection(text) {
        const patterns = {
            // Indonesian patterns
            'id': /\b(dan|atau|yang|ini|itu|dengan|untuk|dari|ke|di|pada|akan|adalah|tidak|ada|saya|kami|mereka|dia|kamu|anda)\b/gi,
            
            // English patterns  
            'en': /\b(the|and|or|that|this|with|for|from|to|in|on|will|is|are|not|have|has|you|we|they|he|she|it)\b/gi,
            
            // Spanish patterns
            'es': /\b(el|la|y|o|que|con|para|de|a|en|es|no|tiene|usted|nosotros|ellos|él|ella)\b/gi,
            
            // French patterns
            'fr': /\b(le|la|et|ou|que|avec|pour|de|à|dans|sur|est|ne|pas|avoir|vous|nous|ils|il|elle)\b/gi,
            
            // German patterns
            'de': /\b(der|die|das|und|oder|dass|mit|für|von|zu|in|auf|ist|nicht|haben|sie|wir|er|es)\b/gi,
            
            // Japanese patterns (hiragana/katakana)
            'ja': /[\u3040-\u309F\u30A0-\u30FF]/g,
            
            // Chinese patterns
            'zh': /[\u4E00-\u9FFF]/g,
            
            // Arabic patterns
            'ar': /[\u0600-\u06FF]/g,
            
            // Russian patterns
            'ru': /[\u0400-\u04FF]/g
        };

        let maxMatches = 0;
        let detectedLang = 'en'; // Default to English

        for (const [lang, pattern] of Object.entries(patterns)) {
            const matches = (text.match(pattern) || []).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedLang = lang;
            }
        }

        // If no clear pattern detected and text contains common Indonesian words
        if (maxMatches === 0) {
            const indonesianWords = ['saya', 'anda', 'dia', 'kita', 'mereka', 'ini', 'itu', 'dengan', 'untuk', 'dari', 'ke', 'di', 'pada', 'yang', 'adalah', 'akan', 'sudah', 'belum', 'tidak', 'ada'];
            const lowerText = text.toLowerCase();
            const indonesianMatches = indonesianWords.filter(word => lowerText.includes(word)).length;
            
            if (indonesianMatches > 0) {
                return 'id';
            }
        }

        return detectedLang;
    }

    toggleVoiceRecording() {
        if (!this.recognition) {
            alert('Voice recognition is not supported in your browser.');
            return;
        }

        if (this.isRecording) {
            this.recognition.stop();
        } else {
            // Set recognition language based on selected input language
            const langMap = {
                'en': 'en-US',
                'id': 'id-ID',
                'es': 'es-ES',
                'fr': 'fr-FR',
                'de': 'de-DE',
                'it': 'it-IT',
                'pt': 'pt-BR',
                'ru': 'ru-RU',
                'ja': 'ja-JP',
                'ko': 'ko-KR',
                'zh': 'zh-CN',
                'ar': 'ar-SA',
                'hi': 'hi-IN',
                'th': 'th-TH',
                'vi': 'vi-VN'
            };

            this.recognition.lang = langMap[this.fromLang.value] || 'en-US';
            this.recognition.start();
        }
    }

    speakText(text, lang) {
        if (!this.synthesis) {
            alert('Text-to-speech is not supported in your browser.');
            return;
        }

        if (!text || text === 'Translation will appear here...' || text.includes('Google Translate service unavailable')) {
            return;
        }

        // Stop any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language for speech synthesis
        const langMap = {
            'en': 'en-US',
            'id': 'id-ID',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'pt': 'pt-BR',
            'ru': 'ru-RU',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'zh': 'zh-CN',
            'ar': 'ar-SA',
            'hi': 'hi-IN',
            'th': 'th-TH',
            'vi': 'vi-VN'
        };

        utterance.lang = langMap[lang] || 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;

        this.synthesis.speak(utterance);
    }

    swapLanguages() {
        const fromValue = this.fromLang.value;
        const toValue = this.toLang.value;
        const inputValue = this.inputText.value;
        const outputValue = this.outputText.textContent;

        // Don't swap if fromLang is auto-detect
        if (fromValue === 'auto') {
            return;
        }

        // Swap language selections
        this.fromLang.value = toValue;
        this.toLang.value = fromValue;

        // Swap text content
        this.inputText.value = outputValue === 'Translation will appear here...' ? '' : outputValue;
        this.outputText.textContent = inputValue || 'Translation will appear here...';

        // Update character count
        this.updateCharCount();

        // Translate the swapped text
        if (this.inputText.value.trim()) {
            this.translateText();
        }
    }

    async copyTranslation() {
        const text = this.outputText.textContent;
        
        if (text && text !== 'Translation will appear here...' && !text.includes('Google Translate service unavailable')) {
            try {
                await navigator.clipboard.writeText(text);
                
                // Visual feedback
                const originalText = this.copyBtn.textContent;
                this.copyBtn.textContent = '✅ Copied!';
                this.copyBtn.style.background = '#48bb78';
                
                setTimeout(() => {
                    this.copyBtn.textContent = originalText;
                    this.copyBtn.style.background = '';
                }, 2000);
            } catch (error) {
                console.error('Copy failed:', error);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                this.copyBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    this.copyBtn.textContent = '📋';
                }, 2000);
            }
        }
    }

    updateCharCount() {
        const count = this.inputText.value.length;
        this.charCount.textContent = count;
        
        // Change color based on character count
        if (count > 4500) {
            this.charCount.style.color = '#e53e3e';
        } else if (count > 4000) {
            this.charCount.style.color = '#dd6b20';
        } else {
            this.charCount.style.color = '';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TranslatorApp();
});

// Add some nice animations on page load
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in-out';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + D to toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        document.getElementById('themeToggle').click();
    }
    
    // Ctrl/Cmd + Shift + S to swap languages
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        document.getElementById('swapLang').click();
    }
    
    // Ctrl/Cmd + Shift + C to copy translation
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        document.getElementById('copyBtn').click();
    }
    
    // Ctrl/Cmd + Shift + M to toggle microphone
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        document.getElementById('micBtn').click();
    }
});