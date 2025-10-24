/**
 * FrameworkConventions - Validates and enforces framework-specific conventions
 *
 * Ensures generated code follows framework best practices:
 * - Naming conventions (snake_case, PascalCase, kebab-case)
 * - File organization patterns
 * - Code style and structure
 * - Required imports and dependencies
 *
 * @class FrameworkConventions
 */
class FrameworkConventions {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Validate entity specification against framework conventions
     * @param {string} framework - Framework name
     * @param {string} entityType - Entity type
     * @param {Object} spec - Entity specification
     * @returns {Object} Validation result {valid, errors, warnings}
     */
    validate(framework, entityType, spec) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Check if framework/entity is supported
        if (!this.registry.isSupported(framework, entityType)) {
            result.valid = false;
            result.errors.push(`Unsupported framework/entity: ${framework}/${entityType}`);
            return result;
        }

        // Validate naming convention
        const namingErrors = this._validateNaming(framework, entityType, spec);
        result.errors.push(...namingErrors);

        // Validate required fields
        const fieldErrors = this._validateRequiredFields(framework, entityType, spec);
        result.errors.push(...fieldErrors);

        // Check best practices
        const practiceWarnings = this._checkBestPractices(framework, entityType, spec);
        result.warnings.push(...practiceWarnings);

        result.valid = result.errors.length === 0;
        return result;
    }

    /**
     * Apply framework conventions to specification
     * @param {string} framework - Framework name
     * @param {string} entityType - Entity type
     * @param {Object} spec - Entity specification
     * @returns {Object} Normalized specification
     */
    normalize(framework, entityType, spec) {
        const normalized = { ...spec };

        // Apply naming convention
        const convention = this.registry.getNamingConvention(framework, entityType);
        normalized.name = this._applyNamingConvention(spec.name, convention);

        // Normalize field names if applicable
        if (normalized.fields && Array.isArray(normalized.fields)) {
            normalized.fields = normalized.fields.map(field => ({
                ...field,
                name: this._applyNamingConvention(field.name, convention)
            }));
        }

        // Add framework-specific defaults
        normalized.framework = framework;
        normalized.entityType = entityType;

        return normalized;
    }

    /**
     * Get conventions summary for framework/entity
     * @param {string} framework - Framework name
     * @param {string} entityType - Entity type
     * @returns {string} Human-readable conventions summary
     */
    getConventionsSummary(framework, entityType) {
        const conventions = this.registry.getConventions(framework, entityType);
        const namingConvention = this.registry.getNamingConvention(framework, entityType);
        const requiredFiles = this.registry.getRequiredFiles(framework, entityType, true);

        let summary = `## ${framework.toUpperCase()} ${entityType.toUpperCase()} CONVENTIONS\n\n`;

        summary += `### Naming Convention\n`;
        summary += `- **Style**: ${namingConvention}\n`;
        summary += `- **Example**: ${this._getExampleName(namingConvention)}\n\n`;

        summary += `### Required Files (${requiredFiles.length})\n`;
        requiredFiles.forEach(file => {
            const status = file.mandatory ? '🔴 MANDATORY' : '🟡 RECOMMENDED';
            summary += `- ${status}: ${file.type}${file.extension} - ${file.description}\n`;
        });

        if (conventions.length > 0) {
            summary += `\n### Framework Conventions\n`;
            conventions.forEach(conv => {
                summary += `- ${conv}\n`;
            });
        }

        return summary;
    }

    // ==================== VALIDATION METHODS ====================

    /**
     * Validate naming convention
     * @private
     */
    _validateNaming(framework, entityType, spec) {
        const errors = [];
        const convention = this.registry.getNamingConvention(framework, entityType);

        if (!spec.name) {
            errors.push('Entity name is required');
            return errors;
        }

        const expectedFormat = this._getExpectedFormat(convention);
        if (!this._matchesConvention(spec.name, convention)) {
            errors.push(
                `Name "${spec.name}" doesn't follow ${convention} convention. Expected format: ${expectedFormat}`
            );
        }

        return errors;
    }

    /**
     * Validate required fields
     * @private
     */
    _validateRequiredFields(framework, entityType, spec) {
        const errors = [];

        // Framework-specific required fields
        const requirements = this._getRequiredFields(framework, entityType);

        for (const req of requirements) {
            if (!spec[req.field]) {
                errors.push(`Required field missing: ${req.field} (${req.description})`);
            }
        }

        return errors;
    }

    /**
     * Check best practices
     * @private
     */
    _checkBestPractices(framework, entityType, spec) {
        const warnings = [];

        // Check for documentation
        if (!spec.description) {
            warnings.push('Consider adding a description for better documentation');
        }

        // Check for tests
        if (!spec.includeTests) {
            warnings.push('Consider including test files (best practice)');
        }

        // Framework-specific checks
        if (framework.toLowerCase() === 'frappe' && entityType === 'doctype') {
            if (!spec.module) {
                warnings.push('Module name not specified, will use "Custom"');
            }

            if (spec.fields && spec.fields.length === 0) {
                warnings.push('DocType has no fields defined');
            }
        }

        return warnings;
    }

    /**
     * Get required fields for framework/entity
     * @private
     */
    _getRequiredFields(framework, entityType) {
        const requirements = {
            frappe: {
                doctype: [
                    { field: 'name', description: 'DocType name' }
                ],
                page: [
                    { field: 'name', description: 'Page name' }
                ]
            },
            django: {
                model: [
                    { field: 'name', description: 'Model name' }
                ]
            }
        };

        const fw = requirements[framework.toLowerCase()];
        return (fw && fw[entityType]) || [];
    }

    // ==================== NAMING CONVENTION HELPERS ====================

    /**
     * Check if name matches convention
     * @private
     */
    _matchesConvention(name, convention) {
        const patterns = {
            'snake_case': /^[a-z][a-z0-9_]*$/,
            'kebab-case': /^[a-z][a-z0-9-]*$/,
            'PascalCase': /^[A-Z][a-zA-Z0-9]*$/,
            'camelCase': /^[a-z][a-zA-Z0-9]*$/,
            'Title Case with Spaces': /^[A-Z][a-zA-Z\s]*$/
        };

        const pattern = patterns[convention];
        return pattern ? pattern.test(name) : true;
    }

    /**
     * Apply naming convention to string
     * @private
     */
    _applyNamingConvention(str, convention) {
        if (!str) return str;

        switch (convention) {
            case 'snake_case':
                return this._toSnakeCase(str);
            case 'kebab-case':
                return this._toKebabCase(str);
            case 'PascalCase':
                return this._toPascalCase(str);
            case 'camelCase':
                return this._toCamelCase(str);
            case 'Title Case with Spaces':
                return this._toTitleCase(str);
            default:
                return str;
        }
    }

    /**
     * Get expected format description
     * @private
     */
    _getExpectedFormat(convention) {
        const formats = {
            'snake_case': 'lowercase_with_underscores',
            'kebab-case': 'lowercase-with-dashes',
            'PascalCase': 'CapitalizedCamelCase',
            'camelCase': 'lowercaseFirstCamelCase',
            'Title Case with Spaces': 'Title Case With Spaces'
        };

        return formats[convention] || convention;
    }

    /**
     * Get example name for convention
     * @private
     */
    _getExampleName(convention) {
        const examples = {
            'snake_case': 'my_custom_entity',
            'kebab-case': 'my-custom-entity',
            'PascalCase': 'MyCustomEntity',
            'camelCase': 'myCustomEntity',
            'Title Case with Spaces': 'My Custom Entity'
        };

        return examples[convention] || 'example';
    }

    // ==================== STRING CONVERSION HELPERS ====================

    _toSnakeCase(str) {
        return str
            .replace(/([A-Z])/g, '_$1')
            .replace(/\s+/g, '_')
            .replace(/-/g, '_')
            .toLowerCase()
            .replace(/^_/, '');
    }

    _toKebabCase(str) {
        return str
            .replace(/([A-Z])/g, '-$1')
            .replace(/\s+/g, '-')
            .replace(/_/g, '-')
            .toLowerCase()
            .replace(/^-/, '');
    }

    _toPascalCase(str) {
        return str
            .replace(/[_\s-]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
            .replace(/^(.)/, (_, c) => c.toUpperCase());
    }

    _toCamelCase(str) {
        const pascal = this._toPascalCase(str);
        return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    }

    _toTitleCase(str) {
        return str
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }
}

module.exports = FrameworkConventions;
