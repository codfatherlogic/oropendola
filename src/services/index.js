/**
 * Oropendola Services Module
 * Unified access to all services
 */

const { contextService, ContextService } = require('./contextService');
const { enhancedChatHandler, EnhancedChatHandler } = require('./enhancedChatHandler');

module.exports = {
    contextService,
    ContextService,
    enhancedChatHandler,
    EnhancedChatHandler
};
