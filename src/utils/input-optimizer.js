/**
 * Input Optimizer - Enhanced version with preview
 * Provides intelligent input optimization with confidence scoring
 */

class InputOptimizer {
    constructor() {
        this.optimizationRules = {
            // Level 1: Basic cleanup
            cleanup: [
                { pattern: /\s+/g, replacement: ' ', description: 'Remove extra spaces' },
                { pattern: /^\s+|\s+$/g, replacement: '', description: 'Trim whitespace' },
                { pattern: /\.{4,}/g, replacement: '...', description: 'Fix multiple dots' }
            ],

            // Level 2: Context enhancement
            contextual: [
                {
                    trigger: /^(fix|improve|optimize|refactor)/i,
                    enhance: (text) => `Please ${text.toLowerCase()} the following code. Provide specific suggestions and explain the changes.`,
                    description: 'Add explicit instruction'
                },
                {
                    trigger: /^(what|how|why|when|where)/i,
                    enhance: (text) => `${text}? Please provide a detailed explanation with examples.`,
                    description: 'Convert to question format'
                },
                {
                    trigger: /\b(error|bug|issue|problem)\b/i,
                    enhance: (text) => `Help me resolve this: ${text}. Include debugging steps and potential solutions.`,
                    description: 'Add debugging context'
                }
            ],

            // Level 3: Smart structuring
            structure: [
                {
                    condition: (text) => text.split(/\s+/).length < 5,
                    enhance: (text) => `Please help me with: ${text}. Provide step-by-step guidance.`,
                    description: 'Expand brief inputs'
                },
                {
                    condition: (text) => /^[a-z]/.test(text),
                    enhance: (text) => text.charAt(0).toUpperCase() + text.slice(1),
                    description: 'Capitalize first letter'
                },
                {
                    condition: (text) => !/[.!?]$/.test(text),
                    enhance: (text) => text + '.',
                    description: 'Add ending punctuation'
                }
            ]
        };
    }

    /**
     * Analyze input and suggest optimizations
     * @param {string} input - User input text
     * @param {object} context - Workspace context
     * @returns {object} Optimization result with confidence
     */
    analyze(input, context = {}) {
        const original = input;
        const suggestions = [];
        let optimized = input;
        let confidence = 0;

        // Level 1: Cleanup
        this.optimizationRules.cleanup.forEach(rule => {
            if (rule.pattern.test(optimized)) {
                optimized = optimized.replace(rule.pattern, rule.replacement);
                suggestions.push({
                    level: 1,
                    type: 'cleanup',
                    description: rule.description,
                    impact: 'low'
                });
                confidence += 10;
            }
        });

        // Level 2: Contextual enhancement
        this.optimizationRules.contextual.forEach(rule => {
            if (rule.trigger.test(optimized)) {
                optimized = rule.enhance(optimized);
                suggestions.push({
                    level: 2,
                    type: 'contextual',
                    description: rule.description,
                    impact: 'medium'
                });
                confidence += 25;
            }
        });

        // Level 3: Smart structuring
        this.optimizationRules.structure.forEach(rule => {
            if (rule.condition(optimized)) {
                optimized = rule.enhance(optimized);
                suggestions.push({
                    level: 3,
                    type: 'structure',
                    description: rule.description,
                    impact: 'high'
                });
                confidence += 20;
            }
        });

        // Add context-aware enhancements
        if (context.hasSelection) {
            optimized += '\n\nContext: I have code selected in the editor.';
            confidence += 15;
        }

        if (context.activeFile) {
            optimized += `\n\nCurrent file: ${context.activeFile.language} (${context.activeFile.name})`;
            confidence += 15;
        }

        // Calculate final confidence (0-100)
        confidence = Math.min(100, confidence);

        return {
            original,
            optimized,
            confidence,
            suggestions,
            improved: original !== optimized,
            analysis: {
                wordCount: optimized.split(/\s+/).length,
                charCount: optimized.length,
                hasQuestion: /\?/.test(optimized),
                hasPunctuation: /[.!?]$/.test(optimized),
                isComplete: confidence > 50
            }
        };
    }

    /**
     * Generate preview HTML for optimization result
     * @param {object} result - Optimization analysis result
     * @returns {string} HTML preview
     */
    generatePreviewHTML(result) {
        const confidenceColor = result.confidence > 70 ? '#4CAF50' :
            result.confidence > 40 ? '#FF9800' : '#F44336';

        return `
            <div class="optimization-preview">
                <div class="preview-header">
                    <h3>🎯 Input Optimization Preview</h3>
                    <div class="confidence-badge" style="background: ${confidenceColor}">
                        ${result.confidence}% Confidence
                    </div>
                </div>
                
                <div class="preview-comparison">
                    <div class="preview-section original">
                        <h4>📝 Original Input</h4>
                        <div class="preview-text">${this.escapeHTML(result.original)}</div>
                        <div class="preview-stats">
                            ${result.original.split(/\s+/).length} words · 
                            ${result.original.length} characters
                        </div>
                    </div>
                    
                    <div class="preview-arrow">➜</div>
                    
                    <div class="preview-section optimized">
                        <h4>✨ Optimized Input</h4>
                        <div class="preview-text">${this.escapeHTML(result.optimized)}</div>
                        <div class="preview-stats">
                            ${result.analysis.wordCount} words · 
                            ${result.analysis.charCount} characters
                        </div>
                    </div>
                </div>
                
                ${result.suggestions.length > 0 ? `
                    <div class="preview-suggestions">
                        <h4>💡 Applied Optimizations</h4>
                        <ul>
                            ${result.suggestions.map(s => `
                                <li class="suggestion-item">
                                    <span class="suggestion-badge ${s.impact}">${s.impact}</span>
                                    ${s.description}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="preview-actions">
                    <button class="btn-primary" onclick="applyOptimization()">
                        ✅ Use Optimized
                    </button>
                    <button class="btn-secondary" onclick="editOptimization()">
                        ✏️ Edit & Send
                    </button>
                    <button class="btn-tertiary" onclick="cancelOptimization()">
                        ❌ Keep Original
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHTML(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Get contextual suggestions based on workspace
     * @param {object} context - Workspace context
     * @returns {array} Contextual suggestions
     */
    getContextualSuggestions(context) {
        const suggestions = [];

        if (context.hasSelection && context.selectedCode) {
            const language = context.activeFile?.language || 'code';
            suggestions.push({
                text: `Explain this ${language} code`,
                icon: '🔍',
                category: 'Analysis'
            });
            suggestions.push({
                text: `Find bugs in this ${language} code`,
                icon: '🐛',
                category: 'Debugging'
            });
            suggestions.push({
                text: `Improve this ${language} code`,
                icon: '🚀',
                category: 'Optimization'
            });
        }

        if (context.activeFile) {
            suggestions.push({
                text: 'Review the current file',
                icon: '📋',
                category: 'Review'
            });
            suggestions.push({
                text: 'Add comments to this file',
                icon: '💬',
                category: 'Documentation'
            });
        }

        if (context.openFiles && context.openFiles.length > 0) {
            suggestions.push({
                text: 'Analyze all open files',
                icon: '📊',
                category: 'Analysis'
            });
        }

        return suggestions;
    }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputOptimizer;
}
