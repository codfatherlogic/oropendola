/**
 * System Prompt Builder
 * Assembles modular prompt sections into a complete system prompt
 * Inspired by Roo-Code's modular architecture
 */

const fs = require('fs');
const path = require('path');

class SystemPromptBuilder {
    constructor() {
        this.modules = [];
        this.dynamicContext = '';
        this.loadModules();
    }

    /**
     * Load all prompt modules from the modules directory
     * In bundled extension, modules are pre-loaded below
     */
    loadModules() {
        try {
            const modulesDir = path.join(__dirname, '../modules');
            const dirExists = fs.existsSync(modulesDir);
            
            console.log(`🔍 Modules directory check: ${dirExists ? 'EXISTS' : 'NOT FOUND'}`);
            console.log(`🔍 Looking for modules at: ${modulesDir}`);

            // Try to load from filesystem first (development mode)
            if (dirExists) {
                console.log('📁 Development mode: Loading from filesystem');
                const moduleFiles = fs.readdirSync(modulesDir).filter(f => f.endsWith('.js'));
                console.log(`📁 Found ${moduleFiles.length} module files:`, moduleFiles);

                for (const file of moduleFiles) {
                    try {
                        const module = require(path.join(modulesDir, file));
                        this.modules.push(module);
                    } catch (error) {
                        console.warn(`⚠️ Failed to load prompt module ${file}:`, error.message);
                    }
                }
            } else {
                // Bundled mode - directly require modules
                console.log('📦 Bundled mode: Loading modules via require()');
                try {
                    this.modules = [
                        require('../modules/core-instructions'),
                        require('../modules/workflow-guidelines'),
                        require('../modules/reasoning-output'),
                        require('../modules/tool-usage'),
                        require('../modules/capabilities'),
                        require('../modules/progressive-implementation'),
                        require('../modules/search-first-mandate'),
                        require('../modules/automatic-context-awareness'),
                        require('../modules/todo-format')
                    ].filter(m => m); // Filter out any failed loads
                    console.log(`📦 Successfully loaded ${this.modules.length} bundled modules`);
                } catch (error) {
                    console.warn('⚠️ Failed to load bundled modules:', error.message);
                    console.warn('⚠️ Stack trace:', error.stack);
                }
            }

            // Sort modules by priority
            this.modules.sort((a, b) => a.priority - b.priority);

            console.log(`✅ Prompt modules loaded: ${this.modules.length} sections`);
            
            // Log module details
            if (this.modules.length > 0) {
                console.log('📋 Loaded modules:', this.modules.map(m => `${m.section} (priority ${m.priority})`).join(', '));
            } else {
                console.warn('⚠️ WARNING: No modules loaded! System prompt will be incomplete');
            }
        } catch (error) {
            console.warn('⚠️  Failed to load prompt modules:', error.message);
            console.warn('⚠️ Stack trace:', error.stack);
        }
    }

    /**
     * Set dynamic context (framework detection, workspace info, etc.)
     * @param {string} context - Dynamic context string
     */
    setDynamicContext(context) {
        this.dynamicContext = context || '';
    }

    /**
     * Build complete system prompt by assembling all modules
     * @param {Object} options - Options for prompt building
     * @param {boolean} options.includeDynamicContext - Include dynamic context (default: true)
     * @param {string[]} options.excludeSections - Sections to exclude
     * @returns {string} Complete system prompt
     */
    build(options = {}) {
        const {
            includeDynamicContext = true,
            excludeSections = []
        } = options;

        let prompt = '';

        // Add each module's content
        for (const module of this.modules) {
            // Skip excluded sections
            if (excludeSections.includes(module.section)) {
                continue;
            }

            prompt += module.content + '\n\n';
        }

        // Add dynamic context at the end
        if (includeDynamicContext && this.dynamicContext) {
            prompt += this.dynamicContext;
        }

        return prompt;
    }

    /**
     * Get a specific module's content by section name
     * @param {string} sectionName - Section name to retrieve
     * @returns {string|null} Module content or null if not found
     */
    getModule(sectionName) {
        const module = this.modules.find(m => m.section === sectionName);
        return module ? module.content : null;
    }

    /**
     * Build a minimal prompt with only essential sections
     * @returns {string} Minimal system prompt
     */
    buildMinimal() {
        const essentialSections = ['core', 'tools'];
        return this.build({ excludeSections: ['workflow', 'formatting'] });
    }

    /**
     * Build a full-featured prompt with all sections
     * @param {string} dynamicContext - Dynamic context to append
     * @returns {string} Complete system prompt
     */
    buildFull(dynamicContext = '') {
        this.setDynamicContext(dynamicContext);
        return this.build({ includeDynamicContext: true });
    }

    /**
     * List all available modules
     * @returns {Array} Array of module info
     */
    listModules() {
        return this.modules.map(m => ({
            section: m.section,
            priority: m.priority,
            size: m.content.length
        }));
    }
}

// Export singleton instance
module.exports = new SystemPromptBuilder();
