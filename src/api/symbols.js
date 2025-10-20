const { apiClient } = require('./client');

/**
 * Code Intelligence / Symbols API
 * @typedef {import('../types/api').ApiResponse} ApiResponse
 * @typedef {import('../types/api').CodeSymbol} CodeSymbol
 */

class SymbolsAPI {
    static BASE = '/api/method/ai_assistant.api.symbols';

    /**
     * Get symbol tree for file
     * @param {string} filePath - Absolute file path
     * @returns {Promise<ApiResponse<{file: string, symbols: CodeSymbol[], count: number}>>}
     */
    static async getSymbolTree(filePath) {
        try {
            const response = await apiClient.post(`${this.BASE}.get_symbol_tree`, {
                file_path: filePath
            });
            return response;
        } catch (error) {
            console.error('Failed to get symbol tree:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Find symbol definition
     * @param {string} workspacePath - Workspace path
     * @param {string} symbol - Symbol name
     * @param {'python'|'javascript'|'typescript'} language - Language
     * @returns {Promise<ApiResponse<{symbol: string, language: string, definitions: any[], count: number}>>}
     */
    static async findSymbolDefinition(workspacePath, symbol, language) {
        try {
            const response = await apiClient.post(`${this.BASE}.find_symbol_definition`, {
                workspace_path: workspacePath,
                symbol,
                language
            });
            return response;
        } catch (error) {
            console.error('Failed to find symbol definition:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Find symbol references
     * @param {string} workspacePath - Workspace path
     * @param {string} symbol - Symbol name
     * @param {'python'|'javascript'|'typescript'} language - Language
     * @returns {Promise<ApiResponse<{symbol: string, language: string, references: any[], count: number}>>}
     */
    static async findSymbolReferences(workspacePath, symbol, language) {
        try {
            const response = await apiClient.post(`${this.BASE}.find_symbol_references`, {
                workspace_path: workspacePath,
                symbol,
                language
            });
            return response;
        } catch (error) {
            console.error('Failed to find symbol references:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get call hierarchy for function
     * @param {string} filePath - File path
     * @param {string} functionName - Function name
     * @returns {Promise<ApiResponse<{hierarchy: any}>>}
     */
    static async getCallHierarchy(filePath, functionName) {
        try {
            const response = await apiClient.post(`${this.BASE}.get_call_hierarchy`, {
                file_path: filePath,
                function_name: functionName
            });
            return response;
        } catch (error) {
            console.error('Failed to get call hierarchy:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = { SymbolsAPI };
