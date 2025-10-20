/**
 * Oropendola API Module
 * Unified API access for all backend services
 */

const { apiClient, ApiClient } = require('./client');
const { WorkspaceAPI } = require('./workspace');
const { GitAPI } = require('./git');
const { SymbolsAPI } = require('./symbols');
const { ChatAPI } = require('./chat');
const { InlineAPI } = require('./inline');

module.exports = {
    apiClient,
    ApiClient,
    WorkspaceAPI,
    GitAPI,
    SymbolsAPI,
    ChatAPI,
    InlineAPI
};
