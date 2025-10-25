/**
 * DynamicFileGenerator - Generates framework-specific files dynamically
 *
 * This is NOT a static template system. It intelligently generates code
 * based on user requirements, framework conventions, and best practices.
 *
 * @class DynamicFileGenerator
 */
class DynamicFileGenerator {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Generate all files for an entity
     * @param {string} framework - Framework name
     * @param {string} entityType - Entity type
     * @param {Object} spec - Entity specification
     * @returns {Array} Array of {path, content} objects
     */
    generateFiles(framework, entityType, spec) {
        const entity = this.registry.getEntity(framework, entityType);
        if (!entity) {
            throw new Error(`Unsupported framework/entity: ${framework}/${entityType}`);
        }

        const files = [];
        const requiredFiles = this.registry.getRequiredFiles(framework, entityType, true);

        for (const fileSpec of requiredFiles) {
            try {
                const content = this._generateFileContent(framework, entityType, fileSpec, spec);
                const path = this._resolveFilePath(entity.basePath, fileSpec.pattern, spec);

                files.push({
                    path,
                    content,
                    type: fileSpec.type,
                    description: fileSpec.description,
                    mandatory: fileSpec.mandatory
                });
            } catch (error) {
                console.error(`Error generating ${fileSpec.type}:`, error);
            }
        }

        return files;
    }

    /**
     * Generate content for a specific file
     * @private
     */
    _generateFileContent(framework, entityType, fileSpec, spec) {
        const key = `${framework}_${entityType}_${fileSpec.type}`;
        const generator = this._getGenerator(key);

        if (generator) {
            return generator.call(this, spec);
        }

        // Fallback to generic generator
        return this._generateGeneric(framework, entityType, fileSpec, spec);
    }

    /**
     * Get specific generator function
     * @private
     */
    _getGenerator(key) {
        const generators = {
            // ==================== FRAPPE DOCTYPE ====================
            'frappe_doctype_definition': this._generateFrappeDocTypeJSON,
            'frappe_doctype_controller': this._generateFrappeDocTypePy,
            'frappe_doctype_client_script': this._generateFrappeDocTypeJs,
            'frappe_doctype_test': this._generateFrappeDocTypeTest,
            'frappe_doctype_documentation': this._generateFrappeDocTypeReadme,

            // ==================== DJANGO MODEL ====================
            'django_model_model': this._generateDjangoModel,
            'django_model_admin': this._generateDjangoAdmin,
            'django_model_serializer': this._generateDjangoSerializer,
            'django_model_view': this._generateDjangoView,
            'django_model_test': this._generateDjangoTest,

            // ==================== REACT COMPONENT ====================
            'react_component_component': this._generateReactComponent,
            'react_component_test': this._generateReactTest,
            'react_component_types': this._generateReactTypes,

            // ==================== NEXT.JS PAGE ====================
            'nextjs_page_page': this._generateNextJsPage,
            'nextjs_page_layout': this._generateNextJsLayout,
            'nextjs_page_loading': this._generateNextJsLoading,
            'nextjs_page_error': this._generateNextJsError

            // Add more generators as needed
        };

        return generators[key];
    }

    // ==================== FRAPPE GENERATORS ====================

    /**
     * Generate Frappe DocType JSON definition
     * @private
     */
    _generateFrappeDocTypeJSON(spec) {
        const fields = spec.fields || [];
        const docTypeName = spec.name || 'Custom DocType';
        const module = spec.module || 'Custom';

        const fieldDefinitions = fields.map((field, idx) => {
            return {
                fieldname: this._toSnakeCase(field.name || `field_${idx + 1}`),
                label: field.label || field.name || `Field ${idx + 1}`,
                fieldtype: field.type || 'Data',
                reqd: field.required ? 1 : 0,
                bold: field.bold ? 1 : 0,
                in_list_view: field.in_list_view ? 1 : 0,
                in_standard_filter: field.in_standard_filter ? 1 : 0,
                options: field.options || null,
                description: field.description || '',
                default: field.default || null,
                read_only: field.read_only ? 1 : 0,
                unique: field.unique ? 1 : 0,
                insert_after: idx > 0 ? this._toSnakeCase(fields[idx - 1].name) : null
            };
        }).filter(f => f.insert_after || f.fieldname);

        const docTypeDefinition = {
            creation: new Date().toISOString().replace('T', ' ').substring(0, 19),
            docstatus: 0,
            doctype: 'DocType',
            editable_grid: 1,
            engine: 'InnoDB',
            field_order: fieldDefinitions.map(f => f.fieldname),
            fields: fieldDefinitions,
            modified: new Date().toISOString().replace('T', ' ').substring(0, 19),
            modified_by: 'Administrator',
            module,
            name: docTypeName,
            naming_rule: spec.naming_rule || 'Autoincrement',
            owner: 'Administrator',
            permissions: [
                {
                    create: 1,
                    delete: 1,
                    email: 1,
                    export: 1,
                    print: 1,
                    read: 1,
                    report: 1,
                    role: 'System Manager',
                    share: 1,
                    write: 1
                }
            ],
            quick_entry: spec.quick_entry ? 1 : 0,
            sort_field: 'modified',
            sort_order: 'DESC',
            states: [],
            track_changes: spec.track_changes ? 1 : 0,
            track_seen: spec.track_seen ? 1 : 0,
            track_views: spec.track_views ? 1 : 0
        };

        return JSON.stringify(docTypeDefinition, null, 1);
    }

    /**
     * Generate Frappe DocType Python controller
     * @private
     */
    _generateFrappeDocTypePy(spec) {
        const className = this._toPascalCase(spec.name || 'CustomDocType');
        const docTypeName = spec.name || 'Custom DocType';
        const fields = spec.fields || [];

        // Generate validation methods based on field types
        const validations = fields
            .filter(f => f.required || f.unique || f.validation)
            .map(f => this._generateFrappeValidation(f))
            .filter(Boolean)
            .join('\n\n\t');

        // Generate business logic methods
        const methods = spec.methods || [];
        const methodCode = methods
            .map(m => this._generateFrappeMethod(m))
            .join('\n\n\t');

        return `# Copyright (c) ${new Date().getFullYear()}, [Your Organization] and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import cint, flt, getdate, now


class ${className}(Document):
\t"""
\t${docTypeName} - Auto-generated DocType controller
\t
\tThis class handles server-side business logic for the ${docTypeName} DocType.
\tFollow Frappe best practices:
\t- Use self.db_get() for reading database values
\t- Use self.db_set() for direct database updates
\t- Implement validation in validate() method
\t- Use hooks for complex workflows
\t"""

\tdef validate(self):
\t\t"""
\t\tValidate document before saving
\t\tRuns on INSERT and UPDATE operations
\t\t"""
${validations ? `\t\t${validations}` : '\t\tpass'}

\tdef before_save(self):
\t\t"""
\t\tExecuted before document is saved
\t\tUse for data transformation and computed fields
\t\t"""
\t\tpass

\tdef on_update(self):
\t\t"""
\t\tExecuted after document is saved
\t\tUse for side effects and related document updates
\t\t"""
\t\tpass

\tdef on_submit(self):
\t\t"""
\t\tExecuted when document is submitted
\t\tOnly for submittable DocTypes
\t\t"""
\t\tpass

\tdef on_cancel(self):
\t\t"""
\t\tExecuted when document is cancelled
\t\tOnly for submittable DocTypes
\t\t"""
\t\tpass

\tdef on_trash(self):
\t\t"""
\t\tExecuted before document is deleted
\t\tUse for cleanup and cascade deletes
\t\t"""
\t\tpass
${methodCode ? `\n\t${methodCode}` : ''}


# ==================== Whitelisted API Methods ====================

@frappe.whitelist()
def get_${this._toSnakeCase(docTypeName)}_details(name):
\t"""
\tGet detailed information about a ${docTypeName}
\t
\tArgs:
\t\tname (str): Name of the ${docTypeName}
\t
\tReturns:
\t\tdict: ${docTypeName} details
\t"""
\tdoc = frappe.get_doc("${docTypeName}", name)
\treturn doc.as_dict()


@frappe.whitelist()
def create_${this._toSnakeCase(docTypeName)}(data):
\t"""
\tCreate a new ${docTypeName}
\t
\tArgs:
\t\tdata (dict): ${docTypeName} data
\t
\tReturns:
\t\tstr: Name of created ${docTypeName}
\t"""
\tdoc = frappe.new_doc("${docTypeName}")
\tdoc.update(data)
\tdoc.insert()
\tfrappe.db.commit()
\treturn doc.name
`;
    }

    /**
     * Generate Frappe DocType JavaScript
     * @private
     */
    _generateFrappeDocTypeJs(spec) {
        const docTypeName = spec.name || 'Custom DocType';
        const fields = spec.fields || [];

        // Generate field-specific event handlers
        const fieldHandlers = fields
            .map(f => this._generateFrappeFieldHandler(f))
            .filter(Boolean)
            .join('\n\n');

        return `// Copyright (c) ${new Date().getFullYear()}, [Your Organization] and contributors
// For license information, please see license.txt

frappe.ui.form.on('${docTypeName}', {
\trefresh: function(frm) {
\t\t/**
\t\t * Form refresh event - called when form loads
\t\t * Use this for:
\t\t * - Adding custom buttons
\t\t * - Setting field properties
\t\t * - Loading related data
\t\t */
\t\t
\t\t// Add custom buttons for actions
\t\tif (!frm.is_new()) {
\t\t\tfrm.add_custom_button(__('Duplicate'), function() {
\t\t\t\tfrappe.model.open_mapped_doc({
\t\t\t\t\tmethod: 'frappe.model.mapper.make_mapped_doc',
\t\t\t\t\tfrm: frm
\t\t\t\t});
\t\t\t});
\t\t}

\t\t// Set field properties based on conditions
\t\t// Example: frm.set_df_property('field_name', 'read_only', 1);
\t},

\tonload: function(frm) {
\t\t/**
\t\t * Form load event - called once when form is first loaded
\t\t * Use this for initialization that should happen only once
\t\t */
\t},

\tbefore_save: function(frm) {
\t\t/**
\t\t * Before save event - called before document is saved
\t\t * Use this for client-side validation and data transformation
\t\t */
\t},

\tafter_save: function(frm) {
\t\t/**
\t\t * After save event - called after document is saved
\t\t * Use this for post-save operations
\t\t */
\t\tfrappe.show_alert({
\t\t\tmessage: __('${docTypeName} saved successfully'),
\t\t\tindicator: 'green'
\t\t}, 3);
\t},

\tvalidate: function(frm) {
\t\t/**
\t\t * Client-side validation
\t\t * Return false to prevent save
\t\t */
\t}
});

${fieldHandlers || '// No field-specific handlers generated'}

// ==================== Custom Functions ====================

/**
 * Load related data for ${docTypeName}
 */
function load_${this._toSnakeCase(docTypeName)}_data(frm) {
\tfrappe.call({
\t\tmethod: 'your_app.your_module.doctype.${this._toSnakeCase(docTypeName)}.${this._toSnakeCase(docTypeName)}.get_${this._toSnakeCase(docTypeName)}_details',
\t\targs: {
\t\t\tname: frm.doc.name
\t\t},
\t\tcallback: function(r) {
\t\t\tif (r.message) {
\t\t\t\t// Handle response
\t\t\t\tconsole.log(r.message);
\t\t\t}
\t\t}
\t});
}
`;
    }

    /**
     * Generate Frappe DocType test file
     * @private
     */
    _generateFrappeDocTypeTest(spec) {
        const className = this._toPascalCase(spec.name || 'CustomDocType');
        const docTypeName = spec.name || 'Custom DocType';
        const fields = spec.fields || [];

        return `# Copyright (c) ${new Date().getFullYear()}, [Your Organization] and Contributors
# See license.txt

import frappe
import unittest
from frappe.utils import now


class Test${className}(unittest.TestCase):
\t"""
\tUnit tests for ${docTypeName} DocType
\tFollows Frappe testing best practices
\t"""

\tdef setUp(self):
\t\t"""
\t\tSet up test fixtures before each test
\t\t"""
\t\tself.test_records = []

\tdef tearDown(self):
\t\t"""
\t\tClean up after each test
\t\t"""
\t\tfor record in self.test_records:
\t\t\ttry:
\t\t\t\tfrappe.delete_doc("${docTypeName}", record, force=1)
\t\t\texcept:
\t\t\t\tpass
\t\tfrappe.db.commit()

\tdef test_creation(self):
\t\t"""
\t\tTest that ${docTypeName} can be created with required fields
\t\t"""
\t\tdoc = frappe.new_doc("${docTypeName}")
${fields.filter(f => f.required).map(f => `\t\tdoc.${this._toSnakeCase(f.name)} = "${f.name} Test Value"`).join('\n') || '\t\t# No required fields'}
\t\tdoc.insert()
\t\tself.test_records.append(doc.name)

\t\tself.assertTrue(doc.name)
\t\tself.assertEqual(doc.docstatus, 0)

\tdef test_validation(self):
\t\t"""
\t\tTest validation logic
\t\t"""
\t\tdoc = frappe.new_doc("${docTypeName}")
${fields.filter(f => f.required).map(f => `\t\tdoc.${this._toSnakeCase(f.name)} = "${f.name} Test Value"`).join('\n') || '\t\t# No required fields'}
\t\t
\t\t# This should not raise an exception
\t\tdoc.validate()
\t\tself.test_records.append(doc.name)

\tdef test_duplicate_prevention(self):
\t\t"""
\t\tTest that duplicate records are prevented if unique constraint exists
\t\t"""
${fields.find(f => f.unique) ? `\t\t# Create first record
\t\tdoc1 = frappe.new_doc("${docTypeName}")
${fields.filter(f => f.required).map(f => `\t\tdoc1.${this._toSnakeCase(f.name)} = "Test Value"`).join('\n')}
\t\tdoc1.insert()
\t\tself.test_records.append(doc1.name)

\t\t# Try to create duplicate
\t\tdoc2 = frappe.new_doc("${docTypeName}")
${fields.filter(f => f.required).map(f => `\t\tdoc2.${this._toSnakeCase(f.name)} = "Test Value"`).join('\n')}
\t\t
\t\twith self.assertRaises(frappe.UniqueValidationError):
\t\t\tdoc2.insert()` : '\t\tpass  # No unique fields to test'}

\tdef test_before_save(self):
\t\t"""
\t\tTest before_save hook
\t\t"""
\t\tpass

\tdef test_on_update(self):
\t\t"""
\t\tTest on_update hook
\t\t"""
\t\tpass

\tdef test_api_methods(self):
\t\t"""
\t\tTest whitelisted API methods
\t\t"""
\t\t# Create test record
\t\tdoc = frappe.new_doc("${docTypeName}")
${fields.filter(f => f.required).map(f => `\t\tdoc.${this._toSnakeCase(f.name)} = "${f.name} Test Value"`).join('\n') || '\t\t# No required fields'}
\t\tdoc.insert()
\t\tself.test_records.append(doc.name)

\t\t# Test get method
\t\tfrom your_app.your_module.doctype.${this._toSnakeCase(docTypeName)}.${this._toSnakeCase(docTypeName)} import get_${this._toSnakeCase(docTypeName)}_details
\t\tresult = get_${this._toSnakeCase(docTypeName)}_details(doc.name)
\t\tself.assertTrue(result)
\t\tself.assertEqual(result.get('name'), doc.name)
`;
    }

    /**
     * Generate Frappe DocType README
     * @private
     */
    _generateFrappeDocTypeReadme(spec) {
        const docTypeName = spec.name || 'Custom DocType';
        const fields = spec.fields || [];

        return `# ${docTypeName}

## Overview

${spec.description || `Documentation for ${docTypeName} DocType.`}

## Fields

${fields.length > 0 ? fields.map(f => `### ${f.label || f.name}
- **Field Name**: \`${this._toSnakeCase(f.name)}\`
- **Type**: ${f.type || 'Data'}
- **Required**: ${f.required ? 'Yes' : 'No'}
${f.description ? `- **Description**: ${f.description}` : ''}
${f.options ? `- **Options**: ${f.options}` : ''}
`).join('\n') : '_No fields defined_'}

## Business Logic

### Validation

The DocType includes validation logic in the \`validate()\` method to ensure:
${fields.filter(f => f.required).map(f => `- ${f.label || f.name} is provided`).join('\n') || '- Basic data integrity'}

### Hooks

- **before_save**: Data transformation and computed fields
- **on_update**: Side effects and related document updates
- **on_trash**: Cleanup before deletion

## API Methods

### get_${this._toSnakeCase(docTypeName)}_details

Get detailed information about a ${docTypeName}.

**Endpoint**: \`/api/method/your_app.your_module.doctype.${this._toSnakeCase(docTypeName)}.${this._toSnakeCase(docTypeName)}.get_${this._toSnakeCase(docTypeName)}_details\`

**Parameters**:
- \`name\` (string): Name of the ${docTypeName}

**Returns**: ${docTypeName} details as JSON

### create_${this._toSnakeCase(docTypeName)}

Create a new ${docTypeName}.

**Endpoint**: \`/api/method/your_app.your_module.doctype.${this._toSnakeCase(docTypeName)}.${this._toSnakeCase(docTypeName)}.create_${this._toSnakeCase(docTypeName)}\`

**Parameters**:
- \`data\` (object): ${docTypeName} data

**Returns**: Name of created ${docTypeName}

## Testing

Run tests with:
\`\`\`bash
bench run-tests --doctype "${docTypeName}"
\`\`\`

## Development Guidelines

1. **Follow Frappe best practices**: Use frappe.db API for database operations
2. **Implement proper validation**: Validate data in \`validate()\` method
3. **Use hooks appropriately**: Choose the right hook for your use case
4. **Write tests**: Ensure all business logic is tested
5. **Document changes**: Update this README when adding features

## Version History

- **v1.0.0** (${new Date().toISOString().split('T')[0]}): Initial creation

## License

Copyright (c) ${new Date().getFullYear()}, [Your Organization]
`;
    }

    // ==================== HELPER METHODS ====================

    /**
     * Generate validation logic for Frappe field
     * @private
     */
    _generateFrappeValidation(field) {
        const fieldname = this._toSnakeCase(field.name);
        const validations = [];

        if (field.required) {
            validations.push(`if not self.${fieldname}:
\t\t\tfrappe.throw(_("${field.label || field.name} is mandatory"))`);
        }

        if (field.unique) {
            validations.push(`# Check uniqueness of ${field.label || field.name}
\t\tif self.${fieldname}:
\t\t\texisting = frappe.db.exists("${this.docTypeName}", {"${fieldname}": self.${fieldname}, "name": ["!=", self.name]})
\t\t\tif existing:
\t\t\t\tfrappe.throw(_("${field.label || field.name} must be unique"))`);
        }

        if (field.validation) {
            validations.push(`# Custom validation for ${field.label || field.name}
\t\t${field.validation}`);
        }

        return validations.join('\n\n\t\t');
    }

    /**
     * Generate Frappe method
     * @private
     */
    _generateFrappeMethod(method) {
        return `def ${this._toSnakeCase(method.name)}(self${method.params ? ', ' + method.params : ''}):
\t\t"""
\t\t${method.description || method.name}
\t\t"""
\t\t${method.body || 'pass'}`;
    }

    /**
     * Generate Frappe field change handler
     * @private
     */
    _generateFrappeFieldHandler(field) {
        if (!field.onChange && !field.depends_on) {return null;}

        return `frappe.ui.form.on('${this.docTypeName}', {
\t${this._toSnakeCase(field.name)}: function(frm) {
\t\t// Handle ${field.label || field.name} change
\t\t${field.onChange || '// Add your logic here'}
\t}
});`;
    }

    /**
     * Resolve file path with placeholders
     * @private
     */
    _resolveFilePath(basePath, pattern, spec) {
        const name = spec.name || 'custom_entity';
        const snakeName = this._toSnakeCase(name);
        const app = spec.app || 'custom_app';

        let path = basePath
            .replace(/{app}/g, app)
            .replace(/{name}/g, snakeName)
            .replace(/{route}/g, spec.route || snakeName);

        path += '/' + pattern
            .replace(/{name}/g, snakeName)
            .replace(/{route}/g, spec.route || snakeName);

        return path;
    }

    /**
     * Convert string to snake_case
     * @private
     */
    _toSnakeCase(str) {
        if (!str) {return '';}
        return str
            .replace(/([A-Z])/g, '_$1')
            .replace(/\s+/g, '_')
            .toLowerCase()
            .replace(/^_/, '');
    }

    /**
     * Convert string to PascalCase
     * @private
     */
    _toPascalCase(str) {
        if (!str) {return '';}
        return str
            .replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
            .replace(/^(.)/, (_, c) => c.toUpperCase());
    }

    /**
     * Generic file generator fallback
     * @private
     */
    _generateGeneric(framework, entityType, fileSpec, spec) {
        return `// Auto-generated file for ${framework} ${entityType}
// Type: ${fileSpec.type}
// TODO: Implement custom generator for this file type

// Specification:
${JSON.stringify(spec, null, 2)}
`;
    }
}

module.exports = DynamicFileGenerator;
