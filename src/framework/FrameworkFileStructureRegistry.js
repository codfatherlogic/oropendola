/**
 * FrameworkFileStructureRegistry - Comprehensive mapping of framework file structures
 *
 * Defines what files each framework requires for different entity types,
 * following world-standard practices and conventions.
 *
 * @class FrameworkFileStructureRegistry
 */
class FrameworkFileStructureRegistry {
    constructor() {
        this.registry = this._buildRegistry();
    }

    /**
     * Build comprehensive framework registry
     * @private
     */
    _buildRegistry() {
        return {
            // ==================== FRAPPE FRAMEWORK ====================
            frappe: {
                name: 'Frappe Framework',
                version: '15.x',
                entities: {
                    doctype: {
                        requiredFiles: [
                            {
                                type: 'definition',
                                extension: '.json',
                                pattern: '{name}/{name}.json',
                                description: 'DocType field definitions and metadata',
                                mandatory: true
                            },
                            {
                                type: 'controller',
                                extension: '.py',
                                pattern: '{name}/{name}.py',
                                description: 'Server-side controller (Document class)',
                                mandatory: true
                            },
                            {
                                type: 'client_script',
                                extension: '.js',
                                pattern: '{name}/{name}.js',
                                description: 'Client-side form behavior',
                                mandatory: true
                            },
                            {
                                type: 'test',
                                extension: '.py',
                                pattern: '{name}/test_{name}.py',
                                description: 'Unit tests for DocType',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'list_view',
                                extension: '.js',
                                pattern: '{name}/{name}_list.js',
                                description: 'List view customization',
                                mandatory: false,
                                bestPractice: false
                            },
                            {
                                type: 'dashboard',
                                extension: '.json',
                                pattern: '{name}/{name}_dashboard.json',
                                description: 'Dashboard configuration',
                                mandatory: false,
                                bestPractice: false
                            },
                            {
                                type: 'documentation',
                                extension: '.md',
                                pattern: '{name}/README.md',
                                description: 'DocType documentation',
                                mandatory: false,
                                bestPractice: true
                            }
                        ],
                        basePath: '{app}/{app}/doctype/{name}',
                        namingConvention: 'snake_case',
                        conventions: [
                            'DocType names use Title Case with Spaces',
                            'File names use snake_case',
                            'Python classes inherit from Document',
                            'All database operations use frappe.db API',
                            'Client scripts use frappe.call() for server communication'
                        ]
                    },
                    page: {
                        requiredFiles: [
                            {
                                type: 'definition',
                                extension: '.json',
                                pattern: '{name}/{name}.json',
                                mandatory: true
                            },
                            {
                                type: 'script',
                                extension: '.js',
                                pattern: '{name}/{name}.js',
                                mandatory: true
                            },
                            {
                                type: 'style',
                                extension: '.css',
                                pattern: '{name}/{name}.css',
                                mandatory: false
                            },
                            {
                                type: 'template',
                                extension: '.html',
                                pattern: '{name}/{name}.html',
                                mandatory: false
                            }
                        ],
                        basePath: '{app}/{app}/page/{name}',
                        namingConvention: 'snake_case'
                    },
                    api: {
                        requiredFiles: [
                            {
                                type: 'endpoints',
                                extension: '.py',
                                pattern: 'api.py',
                                mandatory: true
                            },
                            {
                                type: 'test',
                                extension: '.py',
                                pattern: 'test_api.py',
                                mandatory: false,
                                bestPractice: true
                            }
                        ],
                        basePath: '{app}/{app}',
                        namingConvention: 'snake_case'
                    }
                }
            },

            // ==================== DJANGO FRAMEWORK ====================
            django: {
                name: 'Django',
                version: '4.x/5.x',
                entities: {
                    model: {
                        requiredFiles: [
                            {
                                type: 'model',
                                extension: '.py',
                                pattern: 'models/{name}.py',
                                mandatory: true
                            },
                            {
                                type: 'admin',
                                extension: '.py',
                                pattern: 'admin.py',
                                description: 'Admin interface registration',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'serializer',
                                extension: '.py',
                                pattern: 'serializers/{name}_serializer.py',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'view',
                                extension: '.py',
                                pattern: 'views/{name}_views.py',
                                mandatory: true
                            },
                            {
                                type: 'urls',
                                extension: '.py',
                                pattern: 'urls/{name}_urls.py',
                                mandatory: true
                            },
                            {
                                type: 'test',
                                extension: '.py',
                                pattern: 'tests/test_{name}.py',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'migration',
                                extension: '.py',
                                pattern: 'migrations/0001_initial.py',
                                mandatory: true,
                                auto_generated: true
                            }
                        ],
                        basePath: '{app}',
                        namingConvention: 'snake_case',
                        conventions: [
                            'Model classes use PascalCase',
                            'Function names use snake_case',
                            'Use Django ORM for database operations',
                            'Follow Django REST framework conventions for APIs'
                        ]
                    }
                }
            },

            // ==================== NEXT.JS FRAMEWORK ====================
            nextjs: {
                name: 'Next.js',
                version: '13.x/14.x (App Router)',
                entities: {
                    page: {
                        requiredFiles: [
                            {
                                type: 'page',
                                extension: '.tsx',
                                pattern: 'app/{route}/page.tsx',
                                mandatory: true
                            },
                            {
                                type: 'layout',
                                extension: '.tsx',
                                pattern: 'app/{route}/layout.tsx',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'loading',
                                extension: '.tsx',
                                pattern: 'app/{route}/loading.tsx',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'error',
                                extension: '.tsx',
                                pattern: 'app/{route}/error.tsx',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'test',
                                extension: '.test.tsx',
                                pattern: '__tests__/{route}/page.test.tsx',
                                mandatory: false,
                                bestPractice: true
                            }
                        ],
                        basePath: '',
                        namingConvention: 'kebab-case',
                        conventions: [
                            'Use TypeScript for type safety',
                            'Server Components by default',
                            'Client Components marked with "use client"',
                            'Follow React Server Components patterns'
                        ]
                    },
                    api: {
                        requiredFiles: [
                            {
                                type: 'route',
                                extension: '.ts',
                                pattern: 'app/api/{endpoint}/route.ts',
                                mandatory: true
                            },
                            {
                                type: 'test',
                                extension: '.test.ts',
                                pattern: '__tests__/api/{endpoint}/route.test.ts',
                                mandatory: false,
                                bestPractice: true
                            }
                        ],
                        basePath: '',
                        namingConvention: 'kebab-case'
                    }
                }
            },

            // ==================== REACT FRAMEWORK ====================
            react: {
                name: 'React',
                version: '18.x',
                entities: {
                    component: {
                        requiredFiles: [
                            {
                                type: 'component',
                                extension: '.tsx',
                                pattern: '{name}/{name}.tsx',
                                mandatory: true
                            },
                            {
                                type: 'styles',
                                extension: '.module.css',
                                pattern: '{name}/{name}.module.css',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'test',
                                extension: '.test.tsx',
                                pattern: '{name}/{name}.test.tsx',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'storybook',
                                extension: '.stories.tsx',
                                pattern: '{name}/{name}.stories.tsx',
                                mandatory: false,
                                bestPractice: false
                            },
                            {
                                type: 'types',
                                extension: '.types.ts',
                                pattern: '{name}/{name}.types.ts',
                                mandatory: false,
                                bestPractice: true
                            }
                        ],
                        basePath: 'src/components/{name}',
                        namingConvention: 'PascalCase',
                        conventions: [
                            'Components use PascalCase',
                            'Hooks start with "use"',
                            'Props interfaces end with "Props"',
                            'Use functional components with hooks'
                        ]
                    }
                }
            },

            // ==================== FLASK FRAMEWORK ====================
            flask: {
                name: 'Flask',
                version: '2.x/3.x',
                entities: {
                    blueprint: {
                        requiredFiles: [
                            {
                                type: 'routes',
                                extension: '.py',
                                pattern: '{name}/routes.py',
                                mandatory: true
                            },
                            {
                                type: 'models',
                                extension: '.py',
                                pattern: '{name}/models.py',
                                mandatory: true
                            },
                            {
                                type: 'init',
                                extension: '.py',
                                pattern: '{name}/__init__.py',
                                mandatory: true
                            },
                            {
                                type: 'forms',
                                extension: '.py',
                                pattern: '{name}/forms.py',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'test',
                                extension: '.py',
                                pattern: 'tests/test_{name}.py',
                                mandatory: false,
                                bestPractice: true
                            }
                        ],
                        basePath: 'app/{name}',
                        namingConvention: 'snake_case'
                    }
                }
            },

            // ==================== EXPRESS.JS FRAMEWORK ====================
            express: {
                name: 'Express.js',
                version: '4.x',
                entities: {
                    router: {
                        requiredFiles: [
                            {
                                type: 'routes',
                                extension: '.ts',
                                pattern: 'routes/{name}.routes.ts',
                                mandatory: true
                            },
                            {
                                type: 'controller',
                                extension: '.ts',
                                pattern: 'controllers/{name}.controller.ts',
                                mandatory: true
                            },
                            {
                                type: 'service',
                                extension: '.ts',
                                pattern: 'services/{name}.service.ts',
                                mandatory: true
                            },
                            {
                                type: 'model',
                                extension: '.ts',
                                pattern: 'models/{name}.model.ts',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'validation',
                                extension: '.ts',
                                pattern: 'validators/{name}.validator.ts',
                                mandatory: false,
                                bestPractice: true
                            },
                            {
                                type: 'test',
                                extension: '.test.ts',
                                pattern: '__tests__/{name}.test.ts',
                                mandatory: false,
                                bestPractice: true
                            }
                        ],
                        basePath: 'src',
                        namingConvention: 'kebab-case'
                    }
                }
            }
        };
    }

    /**
     * Get framework structure
     * @param {string} framework - Framework name
     * @returns {Object|null} Framework structure or null
     */
    getFramework(framework) {
        if (!framework) return null;
        const key = framework.toLowerCase().replace(/[.\s-]/g, '');
        return this.registry[key] || null;
    }

    /**
     * Get entity structure for framework
     * @param {string} framework - Framework name
     * @param {string} entityType - Entity type (doctype, model, component, etc.)
     * @returns {Object|null} Entity structure or null
     */
    getEntity(framework, entityType) {
        const fw = this.getFramework(framework);
        if (!fw || !fw.entities) return null;

        const key = entityType.toLowerCase().replace(/[.\s-]/g, '');
        return fw.entities[key] || null;
    }

    /**
     * Get all required files for an entity
     * @param {string} framework - Framework name
     * @param {string} entityType - Entity type
     * @param {boolean} includeBestPractices - Include best practice files
     * @returns {Array} Array of file specifications
     */
    getRequiredFiles(framework, entityType, includeBestPractices = true) {
        const entity = this.getEntity(framework, entityType);
        if (!entity) return [];

        return entity.requiredFiles.filter(file => {
            if (file.mandatory) return true;
            if (includeBestPractices && file.bestPractice) return true;
            return false;
        });
    }

    /**
     * Get base path pattern for entity
     * @param {string} framework - Framework name
     * @param {string} entityType - Entity type
     * @returns {string|null} Base path pattern
     */
    getBasePath(framework, entityType) {
        const entity = this.getEntity(framework, entityType);
        return entity ? entity.basePath : null;
    }

    /**
     * Get naming convention for entity
     * @param {string} framework - Framework name
     * @param {string} entityType - Entity type
     * @returns {string} Naming convention
     */
    getNamingConvention(framework, entityType) {
        const entity = this.getEntity(framework, entityType);
        return entity ? entity.namingConvention : 'snake_case';
    }

    /**
     * Get all conventions for framework/entity
     * @param {string} framework - Framework name
     * @param {string} entityType - Entity type
     * @returns {Array} Array of conventions
     */
    getConventions(framework, entityType) {
        const entity = this.getEntity(framework, entityType);
        return entity ? entity.conventions || [] : [];
    }

    /**
     * Get all supported frameworks
     * @returns {Array} Array of framework names
     */
    getSupportedFrameworks() {
        return Object.keys(this.registry);
    }

    /**
     * Get all entity types for framework
     * @param {string} framework - Framework name
     * @returns {Array} Array of entity type names
     */
    getEntityTypes(framework) {
        const fw = this.getFramework(framework);
        return fw && fw.entities ? Object.keys(fw.entities) : [];
    }

    /**
     * Check if framework/entity combination is supported
     * @param {string} framework - Framework name
     * @param {string} entityType - Entity type
     * @returns {boolean} True if supported
     */
    isSupported(framework, entityType) {
        return this.getEntity(framework, entityType) !== null;
    }
}

module.exports = FrameworkFileStructureRegistry;
