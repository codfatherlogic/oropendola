/**
 * ConversationContextTracker - Track entities mentioned in conversation
 *
 * Like GitHub Copilot, this tracks:
 * 1. Files created/modified (remember "it", "this file", "the component")
 * 2. Entities mentioned (remember "the driver", "the API", "that function")
 * 3. Actions taken (remember what was just done)
 *
 * Example conversation:
 * User: "Create driver DocType"
 * AI: [creates driver.json]
 * Context: { lastCreated: "driver DocType", lastFile: "driver.json" }
 *
 * User: "Add email field to it"
 * AI reads context: "it" = "driver DocType" in file "driver.json"
 *
 * User: "Now create a report for this"
 * AI reads context: "this" = "driver DocType"
 */

const path = require('path');

class ConversationContextTracker {
    constructor() {
        this.reset();
    }

    /**
     * Reset context (new conversation)
     */
    reset() {
        this.entities = new Map(); // entity name -> metadata
        this.lastCreatedFile = null;
        this.lastModifiedFile = null;
        this.lastCreatedEntity = null;
        this.lastAction = null;
        this.fileStack = []; // History of files mentioned/created
        this.entityStack = []; // History of entities mentioned
        this.actionHistory = []; // History of actions taken
    }

    /**
     * Track file creation
     * @param {string} filePath - Path to created file
     * @param {string} entityType - Type of entity (e.g., "DocType", "Component", "API")
     * @param {string} entityName - Name of entity (e.g., "Driver", "UserList", "getUsers")
     */
    trackFileCreation(filePath, entityType = null, entityName = null) {
        this.lastCreatedFile = filePath;
        this.lastAction = `created ${entityType || 'file'} ${entityName || path.basename(filePath)}`;

        this.fileStack.push({
            path: filePath,
            action: 'created',
            timestamp: Date.now(),
            entityType,
            entityName
        });

        // Keep stack limited
        if (this.fileStack.length > 20) {
            this.fileStack.shift();
        }

        // Register entity if provided
        if (entityType && entityName) {
            this.trackEntity(entityName, entityType, filePath);
            this.lastCreatedEntity = {
                name: entityName,
                type: entityType,
                file: filePath
            };
        }

        console.log(`📝 [Context] Tracked creation: ${entityType} "${entityName}" in ${filePath}`);
    }

    /**
     * Track file modification
     * @param {string} filePath - Path to modified file
     * @param {string} modification - Description of modification
     */
    trackFileModification(filePath, modification = null) {
        this.lastModifiedFile = filePath;
        this.lastAction = modification || `modified ${path.basename(filePath)}`;

        this.fileStack.push({
            path: filePath,
            action: 'modified',
            timestamp: Date.now(),
            modification
        });

        if (this.fileStack.length > 20) {
            this.fileStack.shift();
        }

        console.log(`✏️ [Context] Tracked modification: ${filePath} - ${modification}`);
    }

    /**
     * Track entity (DocType, Component, Function, etc.)
     * @param {string} name - Entity name
     * @param {string} type - Entity type
     * @param {string} file - Associated file path
     * @param {Object} metadata - Additional metadata
     */
    trackEntity(name, type, file = null, metadata = {}) {
        const entity = {
            name,
            type,
            file,
            firstMentioned: this.entities.has(name) ? this.entities.get(name).firstMentioned : Date.now(),
            lastMentioned: Date.now(),
            mentionCount: (this.entities.get(name)?.mentionCount || 0) + 1,
            ...metadata
        };

        this.entities.set(name, entity);
        this.entityStack.push({
            name,
            type,
            timestamp: Date.now()
        });

        if (this.entityStack.length > 20) {
            this.entityStack.shift();
        }

        console.log(`🏷️ [Context] Tracked entity: ${type} "${name}"`);
    }

    /**
     * Track action (for action history)
     * @param {string} action - Action description
     * @param {Object} metadata - Additional metadata
     */
    trackAction(action, metadata = {}) {
        this.lastAction = action;
        this.actionHistory.push({
            action,
            timestamp: Date.now(),
            ...metadata
        });

        if (this.actionHistory.length > 20) {
            this.actionHistory.shift();
        }

        console.log(`⚡ [Context] Tracked action: ${action}`);
    }

    /**
     * Resolve reference ("it", "this", "that", "the driver", etc.)
     * @param {string} userMessage - User's message
     * @returns {Object} Resolved context
     */
    resolveReference(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        const resolved = {
            referenceType: null,
            entity: null,
            file: null,
            suggestion: null
        };

        // Pattern 1: "it" or "this" - refers to last created/modified entity
        if (/\b(it|this)\b/i.test(lowerMessage)) {
            if (this.lastCreatedEntity) {
                resolved.referenceType = 'last_created';
                resolved.entity = this.lastCreatedEntity;
                resolved.file = this.lastCreatedEntity.file;
                resolved.suggestion = `"${lowerMessage.includes('it') ? 'it' : 'this'}" → ${this.lastCreatedEntity.type} "${this.lastCreatedEntity.name}"`;

                console.log(`🎯 [Context] Resolved "it/this" → ${this.lastCreatedEntity.type} "${this.lastCreatedEntity.name}"`);
            } else if (this.lastModifiedFile) {
                resolved.referenceType = 'last_modified';
                resolved.file = this.lastModifiedFile;
                resolved.suggestion = `"${lowerMessage.includes('it') ? 'it' : 'this'}" → ${path.basename(this.lastModifiedFile)}`;

                console.log(`🎯 [Context] Resolved "it/this" → ${this.lastModifiedFile}`);
            }
        }

        // Pattern 2: "that" - refers to last mentioned entity
        if (/\bthat\b/i.test(lowerMessage)) {
            if (this.entityStack.length > 0) {
                const lastEntity = this.entityStack[this.entityStack.length - 1];
                const entityData = this.entities.get(lastEntity.name);

                resolved.referenceType = 'last_mentioned';
                resolved.entity = entityData;
                resolved.file = entityData.file;
                resolved.suggestion = `"that" → ${lastEntity.type} "${lastEntity.name}"`;

                console.log(`🎯 [Context] Resolved "that" → ${lastEntity.type} "${lastEntity.name}"`);
            }
        }

        // Pattern 3: "the [entity]" - search for named entity
        const entityMatch = lowerMessage.match(/\bthe\s+(\w+)/i);
        if (entityMatch) {
            const entityName = entityMatch[1];
            const entity = this.entities.get(entityName) || this.entities.get(entityName.charAt(0).toUpperCase() + entityName.slice(1));

            if (entity) {
                resolved.referenceType = 'named_entity';
                resolved.entity = entity;
                resolved.file = entity.file;
                resolved.suggestion = `"the ${entityName}" → ${entity.type} "${entity.name}"`;

                console.log(`🎯 [Context] Resolved "the ${entityName}" → ${entity.type} "${entity.name}"`);
            }
        }

        // Pattern 4: Detect actions on references
        const actionPatterns = {
            'add': /add\s+(.*?)\s+to\s+(it|this|that)/i,
            'modify': /modify|update|change|edit/i,
            'create': /create\s+(.*?)\s+for\s+(it|this|that)/i,
            'delete': /delete|remove/i
        };

        for (const [actionType, pattern] of Object.entries(actionPatterns)) {
            if (pattern.test(lowerMessage)) {
                resolved.actionType = actionType;
                console.log(`🎯 [Context] Detected action: ${actionType} on reference`);
                break;
            }
        }

        return resolved;
    }

    /**
     * Extract entities from AI response (tool calls)
     * @param {Object} toolCall - Tool call object
     */
    extractFromToolCall(toolCall) {
        if (!toolCall) return;

        const { action, path: filePath, description } = toolCall;

        // Extract entity type and name from description or path
        let entityType = null;
        let entityName = null;

        // Frappe patterns
        if (description && /doctype/i.test(description)) {
            entityType = 'DocType';
            const match = description.match(/(?:creating|create)\s+(\w+)\s+doctype/i);
            if (match) entityName = match[1];
        }

        // React patterns
        if (filePath && /component/i.test(filePath)) {
            entityType = 'Component';
            entityName = path.basename(filePath, path.extname(filePath));
        }

        // API patterns
        if (filePath && /api/i.test(filePath)) {
            entityType = 'API';
            entityName = path.basename(filePath, '.py').replace('_api', '');
        }

        // Track based on action
        if (action === 'create_file') {
            this.trackFileCreation(filePath, entityType, entityName);
        } else if (action === 'edit_file') {
            this.trackFileModification(filePath, description);
        }
    }

    /**
     * Get context summary for AI
     * @returns {string} Context summary
     */
    getContextSummary() {
        let summary = '';

        if (this.lastCreatedEntity) {
            summary += `\n**Last Created**: ${this.lastCreatedEntity.type} "${this.lastCreatedEntity.name}" in ${this.lastCreatedEntity.file}\n`;
        }

        if (this.lastModifiedFile) {
            summary += `**Last Modified**: ${this.lastModifiedFile}\n`;
        }

        if (this.lastAction) {
            summary += `**Last Action**: ${this.lastAction}\n`;
        }

        if (this.entities.size > 0) {
            summary += `\n**Entities in Conversation**:\n`;
            const recentEntities = Array.from(this.entities.values())
                .sort((a, b) => b.lastMentioned - a.lastMentioned)
                .slice(0, 5);

            recentEntities.forEach(entity => {
                summary += `- ${entity.type}: "${entity.name}"${entity.file ? ` (${entity.file})` : ''}\n`;
            });
        }

        return summary;
    }

    /**
     * Get context for specific user message
     * @param {string} userMessage - User's message
     * @returns {string} Relevant context
     */
    getContextForMessage(userMessage) {
        const resolved = this.resolveReference(userMessage);

        if (!resolved.suggestion) {
            return '';
        }

        let context = `\n**💡 CONVERSATION CONTEXT:**\n`;
        context += `${resolved.suggestion}\n`;

        if (resolved.entity) {
            context += `- Type: ${resolved.entity.type}\n`;
            context += `- Name: ${resolved.entity.name}\n`;
            if (resolved.entity.file) {
                context += `- File: ${resolved.entity.file}\n`;
            }
        }

        if (resolved.actionType) {
            context += `- Action: ${resolved.actionType}\n`;
        }

        return context;
    }

    /**
     * Get state for serialization
     * @returns {Object} Serializable state
     */
    getState() {
        return {
            entities: Array.from(this.entities.entries()),
            lastCreatedFile: this.lastCreatedFile,
            lastModifiedFile: this.lastModifiedFile,
            lastCreatedEntity: this.lastCreatedEntity,
            lastAction: this.lastAction,
            fileStack: this.fileStack,
            entityStack: this.entityStack,
            actionHistory: this.actionHistory
        };
    }

    /**
     * Restore state from serialization
     * @param {Object} state - Serialized state
     */
    restoreState(state) {
        this.entities = new Map(state.entities || []);
        this.lastCreatedFile = state.lastCreatedFile;
        this.lastModifiedFile = state.lastModifiedFile;
        this.lastCreatedEntity = state.lastCreatedEntity;
        this.lastAction = state.lastAction;
        this.fileStack = state.fileStack || [];
        this.entityStack = state.entityStack || [];
        this.actionHistory = state.actionHistory || [];

        console.log('🔄 [Context] Restored conversation context');
    }
}

module.exports = ConversationContextTracker;
