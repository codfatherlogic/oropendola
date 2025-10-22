/**
 * Oropendola Services Module
 * Unified access to all services
 */

const { contextService, ContextService } = require('./contextService');
const { enhancedChatHandler, EnhancedChatHandler } = require('./enhancedChatHandler');

let EnhancedAuthManager = null;
try {
    // TypeScript file; consumers may import compiled JS from out/ when built
    EnhancedAuthManager = require('../auth/AuthManager').EnhancedAuthManager;
} catch (e) {
    // ignore if not available at runtime (during build or tests)
}

let WorkspaceIndexer = null;
try {
    WorkspaceIndexer = require('../workspace/WorkspaceIndexer').WorkspaceIndexer;
} catch (e) {
    // ignore if not available at runtime
}

let TelemetryService = null;
try {
    TelemetryService = require('../telemetry/TelemetryService').TelemetryService;
} catch (e) {
    // ignore if not available at runtime
}

let SettingsProvider = null;
try {
    SettingsProvider = require('../settings/SettingsProvider').SettingsProvider;
} catch (e) {
    // ignore if not available at runtime
}

module.exports = {
    contextService,
    ContextService,
    enhancedChatHandler,
    EnhancedChatHandler,
    EnhancedAuthManager,
    WorkspaceIndexer,
    TelemetryService,
    SettingsProvider
};
