/**
 * PromptFrameworkDetector - Detect frameworks from user prompts
 * Inspired by GitHub Copilot's intent detection
 * Complements LocalWorkspaceAnalyzer's file-based detection
 */

class PromptFrameworkDetector {
    constructor() {
        // Framework keyword patterns (case-insensitive)
        this._frameworkKeywords = {
            'Frappe': {
                priority: 100,
                keywords: [
                    // Explicit framework mentions
                    'frappe', 'erpnext', 'bench',

                    // Frappe-specific terminology
                    'doctype', 'doc type', 'doctypes',
                    'custom field', 'custom script',
                    'server script', 'client script',
                    'print format', 'report builder',
                    'workflow', 'workspace',
                    'web form', 'portal page',
                    'hooks.py', 'frappe.call',
                    'frappe.db.get_value', 'frappe.get_doc',

                    // Frappe actions
                    'bench start', 'bench new-app',
                    'bench get-app', 'bench migrate'
                ],
                patterns: [
                    /\bdoctype\b/i,
                    /\bfrappe\b/i,
                    /\berpnext\b/i,
                    /\bbench\s+/i,
                    /\.py\s+(doctype|controller|api)/i
                ],
                confidence: {
                    'doctype': 0.95,      // DocType is 95% Frappe
                    'frappe': 1.0,        // Explicit mention
                    'erpnext': 1.0,
                    'bench': 0.9,
                    'custom field': 0.85,
                    'server script': 0.8
                }
            },

            'React': {
                priority: 80,
                keywords: [
                    'react', 'react.js', 'reactjs',
                    'component', 'usestate', 'useeffect',
                    'jsx', 'tsx', 'functional component',
                    'class component', 'react hooks',
                    'next.js', 'nextjs', 'create-react-app',
                    'react router', 'redux', 'context api'
                ],
                patterns: [
                    /\breact\b/i,
                    /\buseState|useEffect|useMemo|useCallback\b/i,
                    /\bcomponent\b.*\bjsx\b/i,
                    /\bnext\.js\b/i
                ],
                confidence: {
                    'react': 1.0,
                    'usestate': 0.9,
                    'jsx': 0.85,
                    'component': 0.6  // Generic term
                }
            },

            'Vue': {
                priority: 78,
                keywords: [
                    'vue', 'vue.js', 'vuejs',
                    'nuxt', 'nuxt.js', 'nuxtjs',
                    'vue component', 'vue router',
                    'vuex', 'pinia', 'composition api'
                ],
                patterns: [
                    /\bvue\b/i,
                    /\bnuxt\b/i,
                    /\.vue\s+file/i
                ],
                confidence: {
                    'vue': 1.0,
                    'nuxt': 1.0,
                    'vuex': 0.95
                }
            },

            'Angular': {
                priority: 77,
                keywords: [
                    'angular', 'angular.js', 'angularjs',
                    'ng', 'typescript component',
                    'angular component', 'angular service',
                    'rxjs', 'observable', 'angular module'
                ],
                patterns: [
                    /\bangular\b/i,
                    /\b@Component\b/,
                    /\b@Injectable\b/
                ],
                confidence: {
                    'angular': 1.0,
                    '@component': 0.9,
                    'rxjs': 0.7
                }
            },

            'Electron': {
                priority: 85,
                keywords: [
                    'electron', 'electron.js', 'electronjs',
                    'main process', 'renderer process',
                    'ipc', 'ipcmain', 'ipcrenderer',
                    'browserwindow', 'electron app',
                    'desktop app', 'cross-platform desktop'
                ],
                patterns: [
                    /\belectron\b/i,
                    /\bmain\s+process\b/i,
                    /\bdesktop\s+app\b/i,
                    /\bBrowserWindow\b/
                ],
                confidence: {
                    'electron': 1.0,
                    'electronjs': 1.0,
                    'browserwindow': 0.95,
                    'ipcmain': 0.9
                }
            },

            'Django': {
                priority: 75,
                keywords: [
                    'django', 'django app',
                    'model', 'view', 'serializer',
                    'django rest framework', 'drf',
                    'django orm', 'migration',
                    'settings.py', 'urls.py', 'admin.py'
                ],
                patterns: [
                    /\bdjango\b/i,
                    /\bmodel.*serializer\b/i,
                    /\bdjango\s+orm\b/i,
                    /\bmanage\.py\b/
                ],
                confidence: {
                    'django': 1.0,
                    'drf': 0.95,
                    'serializer': 0.7,
                    'migration': 0.6
                }
            },

            'Flask': {
                priority: 72,
                keywords: [
                    'flask', 'flask app',
                    'route', 'blueprint',
                    'flask-restful', 'flask-sqlalchemy',
                    'jinja2', 'render_template'
                ],
                patterns: [
                    /\bflask\b/i,
                    /\b@app\.route\b/i,
                    /\brender_template\b/
                ],
                confidence: {
                    'flask': 1.0,
                    '@app.route': 0.9,
                    'blueprint': 0.7
                }
            },

            'FastAPI': {
                priority: 73,
                keywords: [
                    'fastapi', 'fast api',
                    'pydantic', 'basemodel',
                    'async def', 'path operation',
                    'fastapi router', 'depends'
                ],
                patterns: [
                    /\bfastapi\b/i,
                    /\bpydantic\b/i,
                    /\bBaseModel\b/
                ],
                confidence: {
                    'fastapi': 1.0,
                    'pydantic': 0.85,
                    'basemodel': 0.7
                }
            },

            'Express': {
                priority: 65,
                keywords: [
                    'express', 'express.js', 'expressjs',
                    'middleware', 'router',
                    'app.get', 'app.post', 'app.use',
                    'express router', 'express app'
                ],
                patterns: [
                    /\bexpress\b/i,
                    /\bapp\.(get|post|put|delete)\b/i,
                    /\bmiddleware\b/i
                ],
                confidence: {
                    'express': 1.0,
                    'app.get': 0.7,
                    'middleware': 0.6
                }
            },

            'Spring Boot': {
                priority: 82,
                keywords: [
                    'spring boot', 'spring', 'springboot',
                    '@restcontroller', '@service', '@repository',
                    'spring boot application', 'spring data',
                    'spring security', 'hibernate'
                ],
                patterns: [
                    /\bspring\s+boot\b/i,
                    /\b@RestController\b/,
                    /\b@SpringBootApplication\b/
                ],
                confidence: {
                    'spring boot': 1.0,
                    '@restcontroller': 0.95,
                    'hibernate': 0.6
                }
            },

            'Rust': {
                priority: 90,
                keywords: [
                    'rust', 'cargo', 'rustc',
                    'trait', 'impl', 'struct',
                    'rust app', 'rust project',
                    'cargo.toml', 'main.rs'
                ],
                patterns: [
                    /\brust\b/i,
                    /\bcargo\b/i,
                    /\bCargo\.toml\b/,
                    /\.rs\s+file/i
                ],
                confidence: {
                    'rust': 1.0,
                    'cargo': 0.95,
                    'cargo.toml': 1.0,
                    'trait': 0.6
                }
            },

            'Go': {
                priority: 87,
                keywords: [
                    'golang', 'go', 'go app',
                    'goroutine', 'channel', 'go module',
                    'go.mod', 'go.sum', 'package main',
                    'gin', 'echo', 'fiber'
                ],
                patterns: [
                    /\bgolang\b/i,
                    /\bgo\s+module\b/i,
                    /\bgo\.mod\b/,
                    /\bgoroutine\b/i
                ],
                confidence: {
                    'golang': 1.0,
                    'go module': 0.95,
                    'goroutine': 0.9,
                    'gin': 0.7  // Could be other things
                }
            }
        };
    }

    /**
     * Detect frameworks from user prompt
     * @param {string} prompt - User's message/prompt
     * @param {Object} workspaceContext - Optional workspace detection results
     * @returns {Object} Detection results with confidence scores
     */
    detectFromPrompt(prompt, workspaceContext = null) {
        if (!prompt || typeof prompt !== 'string') {
            return { frameworks: [], confidence: 0, method: 'none' };
        }

        const detectedFrameworks = [];
        const lowerPrompt = prompt.toLowerCase();

        // Check each framework
        for (const [framework, config] of Object.entries(this._frameworkKeywords)) {
            let maxConfidence = 0;
            const matchedKeywords = [];

            // Check keywords
            for (const keyword of config.keywords) {
                const keywordLower = keyword.toLowerCase();

                if (lowerPrompt.includes(keywordLower)) {
                    // Get confidence for this keyword
                    const confidence = config.confidence[keywordLower] ||
                                     config.confidence[keyword] ||
                                     0.7; // Default confidence

                    maxConfidence = Math.max(maxConfidence, confidence);
                    matchedKeywords.push(keyword);
                }
            }

            // Check regex patterns
            for (const pattern of config.patterns) {
                if (pattern.test(prompt)) {
                    maxConfidence = Math.max(maxConfidence, 0.8);
                    matchedKeywords.push(`pattern: ${pattern}`);
                }
            }

            // If we found matches, add to results
            if (maxConfidence > 0) {
                detectedFrameworks.push({
                    framework: framework,
                    confidence: maxConfidence,
                    priority: config.priority,
                    keywords: matchedKeywords,
                    source: 'prompt'
                });
            }
        }

        // Sort by confidence, then priority
        detectedFrameworks.sort((a, b) => {
            if (Math.abs(a.confidence - b.confidence) < 0.1) {
                return b.priority - a.priority; // Higher priority first
            }
            return b.confidence - a.confidence; // Higher confidence first
        });

        // Combine with workspace context if available
        let finalFramework = null;
        let combinedConfidence = 0;

        if (detectedFrameworks.length > 0) {
            const topMatch = detectedFrameworks[0];

            // If workspace context agrees, boost confidence
            if (workspaceContext && workspaceContext.framework) {
                const workspaceFramework = workspaceContext.framework.toLowerCase();
                const promptFramework = topMatch.framework.toLowerCase();

                if (workspaceFramework.includes(promptFramework) ||
                    promptFramework.includes(workspaceFramework)) {
                    // Workspace and prompt agree!
                    combinedConfidence = Math.min(topMatch.confidence + 0.2, 1.0);
                    finalFramework = topMatch.framework;
                } else {
                    // Conflict - prefer prompt if high confidence
                    if (topMatch.confidence >= 0.9) {
                        combinedConfidence = topMatch.confidence;
                        finalFramework = topMatch.framework;
                    } else {
                        // Use workspace, but note the conflict
                        combinedConfidence = 0.6;
                        finalFramework = workspaceContext.framework;
                    }
                }
            } else {
                // No workspace context, use prompt detection only
                combinedConfidence = topMatch.confidence;
                finalFramework = topMatch.framework;
            }
        } else if (workspaceContext && workspaceContext.framework) {
            // No prompt detection, use workspace only
            finalFramework = workspaceContext.framework;
            combinedConfidence = 0.7; // Medium confidence
        }

        return {
            framework: finalFramework,
            confidence: combinedConfidence,
            allMatches: detectedFrameworks,
            method: this._getDetectionMethod(detectedFrameworks, workspaceContext)
        };
    }

    /**
     * Get detection method description
     * @private
     */
    _getDetectionMethod(promptMatches, workspaceContext) {
        if (promptMatches.length > 0 && workspaceContext && workspaceContext.framework) {
            return 'hybrid (workspace + prompt)';
        } else if (promptMatches.length > 0) {
            return 'prompt keywords';
        } else if (workspaceContext && workspaceContext.framework) {
            return 'workspace files';
        }
        return 'none';
    }

    /**
     * Get framework-specific hints for AI
     * @param {string} framework - Detected framework
     * @param {string} prompt - User's prompt
     * @returns {Object} Hints for AI model
     */
    getFrameworkHints(framework, prompt) {
        const hints = {
            framework: framework,
            fileTypes: [],
            conventions: [],
            suggestedStructure: null
        };

        switch (framework.toLowerCase()) {
            case 'frappe':
                hints.fileTypes = ['.py', '.json', '.js', '.html', '.css'];
                hints.conventions = [
                    'Use snake_case for Python files and functions',
                    '⚠️ IMPORTANT: Every DocType requires 3 files: {name}.json (definition), {name}.py (server controller), {name}.js (client controller)',
                    'DocTypes are defined in JSON files with field metadata',
                    'Server scripts go in [doctype]/[doctype].py for business logic',
                    'Client scripts in [doctype]/[doctype].js for form behavior',
                    'Use frappe.call() for API calls from client',
                    'Hooks are registered in hooks.py'
                ];

                // Check what user wants to create
                if (prompt.match(/doctype/i)) {
                    hints.suggestedStructure = {
                        type: 'DocType',
                        files: [
                            'custom_app/custom_app/doctype/driver/',
                            'custom_app/custom_app/doctype/driver/driver.json',
                            'custom_app/custom_app/doctype/driver/driver.py',
                            'custom_app/custom_app/doctype/driver/driver.js'
                        ]
                    };
                } else if (prompt.match(/api/i)) {
                    hints.suggestedStructure = {
                        type: 'API',
                        files: [
                            'custom_app/custom_app/api.py',
                            'custom_app/custom_app/api/__init__.py'
                        ]
                    };
                }
                break;

            case 'electron':
                hints.fileTypes = ['.js', '.ts', '.html', '.css'];
                hints.conventions = [
                    'Main process: main.js or electron.js',
                    'Renderer process: renderer.js',
                    'IPC communication between main and renderer',
                    'Use BrowserWindow for windows',
                    'Package with electron-builder'
                ];

                if (prompt.match(/pos|point of sale/i)) {
                    hints.suggestedStructure = {
                        type: 'Electron POS App',
                        files: [
                            'src/main.js',
                            'src/renderer.js',
                            'src/index.html',
                            'src/pos/products.js',
                            'src/pos/cart.js',
                            'src/pos/payments.js'
                        ]
                    };
                }
                break;

            case 'react':
                hints.fileTypes = ['.jsx', '.tsx', '.js', '.ts'];
                hints.conventions = [
                    'Components in PascalCase',
                    'Functional components with hooks',
                    'Use useState, useEffect for state/effects',
                    'Components in src/components/',
                    'Pages in src/pages/'
                ];
                break;

            case 'rust':
                hints.fileTypes = ['.rs'];
                hints.conventions = [
                    'main.rs is entry point',
                    'Use snake_case for functions/variables',
                    'Use PascalCase for types/traits',
                    'Modules in lib.rs or separate files',
                    'Tests with #[cfg(test)]'
                ];
                break;

            case 'go':
                hints.fileTypes = ['.go'];
                hints.conventions = [
                    'package main for executables',
                    'MixedCaps for exported names',
                    'Error handling with error return values',
                    'Interfaces for abstraction',
                    'Use go fmt for formatting'
                ];
                break;

            default:
                hints.conventions = ['Follow framework best practices'];
        }

        return hints;
    }
}

module.exports = PromptFrameworkDetector;
