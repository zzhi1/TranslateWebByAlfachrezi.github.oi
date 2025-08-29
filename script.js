// Translation Web App JavaScript with Voice Features
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
            
            // If auto-detect is selected, detect the language first
            if (fromLang === 'auto') {
                fromLang = await this.detectLanguage(text);
            }
            
            const translation = await this.performTranslation(text, fromLang, this.toLang.value);
            this.outputText.textContent = translation;
        } catch (error) {
            console.error('Translation error:', error);
            this.outputText.innerHTML = '<div style="color: #e53e3e;">Translation failed. Please try again.</div>';
        }
    }

    async detectLanguage(text) {
        try {
            // Use Google Translate's detect API through a proxy service
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|en`);
            const data = await response.json();
            
            if (data.responseStatus === 200 && data.matches && data.matches.length > 0) {
                // Extract detected language from the response
                const detectedLang = data.matches[0].source || 'en';
                return detectedLang;
            }
        } catch (error) {
            console.log('Language detection failed, using simple detection');
        }
        
        // Fallback: Simple language detection based on character patterns
        return this.simpleLanguageDetection(text);
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

    async performTranslation(text, fromLang, toLang) {
        // Using MyMemory Translation API (free service)
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`);
            const data = await response.json();
            
            if (data.responseStatus === 200) {
                return data.responseData.translatedText;
            } else {
                throw new Error('Translation service error');
            }
        } catch (error) {
            // Fallback to basic dictionary for common words
            return this.fallbackTranslation(text, fromLang, toLang);
        }
    }

    fallbackTranslation(text, fromLang, toLang) {
        // Basic fallback dictionary for common words
        const dictionary = {
            'en-id': {
                'hello': 'halo',
                'goodbye': 'selamat tinggal',
                'thank you': 'terima kasih',
                'please': 'tolong',
                'yes': 'ya',
                'no': 'tidak',
                'good morning': 'selamat pagi',
                'good afternoon': 'selamat siang',
                'good evening': 'selamat sore',
                'good night': 'selamat malam',
                'how are you': 'apa kabar',
                'i love you': 'aku cinta kamu',
                'water': 'air',
                'food': 'makanan',
                'house': 'rumah',
                'car': 'mobil',
                'book': 'buku',
                'computer': 'komputer',
                'phone': 'telepon',
                'money': 'uang'
            },
            'id-en': {
                'halo': 'hello',
                'selamat tinggal': 'goodbye',
                'terima kasih': 'thank you',
                'tolong': 'please',
                'ya': 'yes',
                'tidak': 'no',
                'selamat pagi': 'good morning',
                'selamat siang': 'good afternoon',
                'selamat sore': 'good evening',
                'selamat malam': 'good night',
                'apa kabar': 'how are you',
                'aku cinta kamu': 'i love you',
                'air': 'water',
                'makanan': 'food',
                'rumah': 'house',
                'mobil': 'car',
                'buku': 'book',
                'komputer': 'computer',
                'telepon': 'phone',
                'uang': 'money'
            }
        };

        const langPair = `${fromLang}-${toLang}`;
        const lowerText = text.toLowerCase();
        
        if (dictionary[langPair] && dictionary[langPair][lowerText]) {
            return dictionary[langPair][lowerText];
        }
        
        // If no translation found, return a helpful message
        return `Translation not available. Try using simpler words or check your internet connection.`;
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

        if (!text || text === 'Translation will appear here...' || text.includes('Translation not available')) {
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
        
        if (text && text !== 'Translation will appear here...' && !text.includes('Translation not available')) {
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