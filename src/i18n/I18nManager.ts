import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { BackendConfig, getInstance as getBackendConfig } from '../config/BackendConfig';
import type { SupportedLanguage, LanguageInfo } from '../types';

/**
 * I18nManager - Manages internationalization
 * Integrates with backend API for translations
 */
export class I18nManager {
    private backendConfig: BackendConfig;
    private initialized: boolean = false;
    private currentLanguage: SupportedLanguage = 'en';
    private translationCache: Map<string, any> = new Map();
    private languages: LanguageInfo[] = [];

    // Supported languages with metadata
    private static readonly LANGUAGE_INFO: LanguageInfo[] = [
        { code: 'en', name: 'English', nativeName: 'English', rtl: false },
        { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
        { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
        { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true }
    ];

    constructor() {
        this.backendConfig = getBackendConfig();
    }

    /**
     * Initialize i18next with backend integration
     */
    async initialize(defaultLanguage: SupportedLanguage = 'en'): Promise<void> {
        if (this.initialized) {
            return;
        }

        // Fetch available languages from backend
        await this.fetchAvailableLanguages();

        // Get saved language preference or use default
        const savedLanguage = this.getSavedLanguage() || defaultLanguage;
        this.currentLanguage = this.validateLanguage(savedLanguage);

        // Initialize i18next
        await i18n
            .use(LanguageDetector)
            .init({
                lng: this.currentLanguage,
                fallbackLng: 'en',
                supportedLngs: ['en', 'es', 'fr', 'de', 'ar'],

                // Backend loading disabled (we'll handle manually)
                load: 'currentOnly',

                // Detection options
                detection: {
                    order: ['localStorage', 'navigator'],
                    lookupLocalStorage: 'oropendola_language',
                    caches: ['localStorage']
                },

                // Translation resources (will be loaded from backend)
                resources: {},

                interpolation: {
                    escapeValue: false // React already escapes
                },

                react: {
                    useSuspense: false
                }
            });

        // Load translations for current language
        await this.loadLanguage(this.currentLanguage);

        // Set RTL if needed
        this.updateRTL(this.currentLanguage);

        this.initialized = true;
        console.log(`✅ I18nManager initialized with language: ${this.currentLanguage}`);
    }

    /**
     * Fetch available languages from backend
     */
    private async fetchAvailableLanguages(): Promise<void> {
        try {
            // Use static list for now, but could fetch from backend
            this.languages = I18nManager.LANGUAGE_INFO;

            // Optionally fetch from backend for dynamic updates
            // const response = await fetch(
            //     this.backendConfig.endpoints.i18n?.getLanguages ||
            //     `${this.backendConfig.getApiUrl('/api/method/ai_assistant.api.i18n_get_languages')}`
            // );
            // if (response.ok) {
            //     const data = await response.json();
            //     if (data.success) {
            //         this.languages = data.languages;
            //     }
            // }
        } catch (error) {
            console.warn('Could not fetch languages from backend, using defaults:', error);
            this.languages = I18nManager.LANGUAGE_INFO;
        }
    }

    /**
     * Load translations for a specific language from backend
     */
    async loadLanguage(language: SupportedLanguage): Promise<void> {
        // Check cache first
        if (this.translationCache.has(language)) {
            const translations = this.translationCache.get(language);
            i18n.addResourceBundle(language, 'translation', translations, true, true);
            return;
        }

        try {
            // Fetch from backend
            const url = `${this.backendConfig.getApiUrl('/api/method/ai_assistant.api.i18n_get_translations')}?language=${language}`;

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch translations: ${response.statusText}`);
            }

            const data = await response.json() as any;

            if (data.success && data.translations) {
                // Cache translations
                this.translationCache.set(language, data.translations);

                // Add to i18next
                i18n.addResourceBundle(language, 'translation', data.translations, true, true);

                console.log(`✅ Loaded ${Object.keys(data.translations).length} translations for ${language}`);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error(`Failed to load translations for ${language}:`, error);

            // Fall back to English if loading failed and not already English
            if (language !== 'en') {
                console.log('Falling back to English translations');
                await this.loadLanguage('en');
            } else {
                // Use hardcoded fallback translations
                this.loadFallbackTranslations();
            }
        }
    }

    /**
     * Load hardcoded fallback translations (for offline/error scenarios)
     */
    private loadFallbackTranslations(): void {
        const fallbackTranslations = {
            // Common
            'common.yes': 'Yes',
            'common.no': 'No',
            'common.ok': 'OK',
            'common.cancel': 'Cancel',
            'common.save': 'Save',
            'common.delete': 'Delete',
            'common.edit': 'Edit',
            'common.close': 'Close',
            'common.loading': 'Loading...',
            'common.error': 'Error',
            'common.success': 'Success',
            'common.warning': 'Warning',

            // Actions
            'actions.send': 'Send',
            'actions.upload': 'Upload',
            'actions.download': 'Download',
            'actions.copy': 'Copy',
            'actions.paste': 'Paste',
            'actions.cut': 'Cut',
            'actions.undo': 'Undo',
            'actions.redo': 'Redo',

            // Chat
            'chat.title': 'Chat',
            'chat.placeholder': 'Type your message...',
            'chat.send': 'Send',
            'chat.clear': 'Clear Chat',
            'chat.new': 'New Chat',
            'chat.history': 'Chat History',

            // Document
            'document.upload': 'Upload Document',
            'document.analyze': 'Analyze Document',
            'document.processing': 'Processing document...',
            'document.error': 'Failed to process document',
            'document.success': 'Document processed successfully',

            // Settings
            'settings.title': 'Settings',
            'settings.language': 'Language',
            'settings.theme': 'Theme',
            'settings.preferences': 'Preferences',

            // Errors
            'error.network': 'Network error. Please check your connection.',
            'error.server': 'Server error. Please try again later.',
            'error.unauthorized': 'Please login to continue.',
            'error.unknown': 'An unknown error occurred.'
        };

        this.translationCache.set('en', fallbackTranslations);
        i18n.addResourceBundle('en', 'translation', fallbackTranslations, true, true);
    }

    /**
     * Change current language
     */
    async changeLanguage(language: SupportedLanguage): Promise<void> {
        const validatedLanguage = this.validateLanguage(language);

        // Load language if not already loaded
        if (!this.translationCache.has(validatedLanguage)) {
            await this.loadLanguage(validatedLanguage);
        }

        // Change i18next language
        await i18n.changeLanguage(validatedLanguage);

        // Update current language
        this.currentLanguage = validatedLanguage;

        // Save preference
        this.saveLanguagePreference(validatedLanguage);

        // Update RTL
        this.updateRTL(validatedLanguage);

        console.log(`✅ Language changed to: ${validatedLanguage}`);
    }

    /**
     * Update RTL (Right-to-Left) styling for Arabic
     */
    private updateRTL(language: SupportedLanguage): void {
        const languageInfo = this.getLanguageInfo(language);
        const isRTL = languageInfo?.rtl || false;

        // Check if running in browser context (not Node.js)
        if (typeof document !== 'undefined') {
            // Update document direction
            document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
            document.documentElement.lang = language;

            // Update body class for additional RTL styling
            if (isRTL) {
                document.body.classList.add('rtl');
                document.body.classList.remove('ltr');
            } else {
                document.body.classList.add('ltr');
                document.body.classList.remove('rtl');
            }
        }

        console.log(`✅ RTL mode: ${isRTL ? 'enabled' : 'disabled'} for ${language}`);
    }

    /**
     * Get translation for a key
     */
    t(key: string, options?: any): string {
        const translation = i18n.t(key, options);
        return typeof translation === 'string' ? translation : String(translation);
    }

    /**
     * Get current language
     */
    getCurrentLanguage(): SupportedLanguage {
        return this.currentLanguage;
    }

    /**
     * Get available languages
     */
    getAvailableLanguages(): LanguageInfo[] {
        return this.languages;
    }

    /**
     * Get language info by code
     */
    getLanguageInfo(code: SupportedLanguage): LanguageInfo | undefined {
        return this.languages.find(lang => lang.code === code);
    }

    /**
     * Check if current language is RTL
     */
    isRTL(): boolean {
        const languageInfo = this.getLanguageInfo(this.currentLanguage);
        return languageInfo?.rtl || false;
    }

    /**
     * Validate language code
     */
    private validateLanguage(language: string): SupportedLanguage {
        const validLanguages: SupportedLanguage[] = ['en', 'es', 'fr', 'de', 'ar'];
        return validLanguages.includes(language as SupportedLanguage)
            ? (language as SupportedLanguage)
            : 'en';
    }

    /**
     * Get saved language preference from localStorage
     */
    private getSavedLanguage(): SupportedLanguage | null {
        try {
            if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem('oropendola_language');
                return saved ? (saved as SupportedLanguage) : null;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Save language preference to localStorage
     */
    private saveLanguagePreference(language: SupportedLanguage): void {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('oropendola_language', language);
            }
        } catch (error) {
            console.warn('Could not save language preference:', error);
        }
    }

    /**
     * Add custom translation
     */
    addTranslation(language: SupportedLanguage, key: string, value: string): void {
        const translations = this.translationCache.get(language) || {};
        translations[key] = value;
        this.translationCache.set(language, translations);
        i18n.addResourceBundle(language, 'translation', { [key]: value }, true, true);
    }

    /**
     * Clear translation cache
     */
    clearCache(): void {
        this.translationCache.clear();
        console.log('✅ Translation cache cleared');
    }

    /**
     * Get i18next instance (for advanced usage)
     */
    getI18nInstance() {
        return i18n;
    }
}

/**
 * Singleton instance
 */
let instance: I18nManager | null = null;

/**
 * Get I18nManager singleton instance
 */
export function getInstance(): I18nManager {
    if (!instance) {
        instance = new I18nManager();
    }
    return instance;
}
