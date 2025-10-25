/**
 * Code Actions Client
 *
 * Client for AI-powered code analysis and security features
 * Integrates with https://oropendola.ai/ code actions APIs
 *
 * Week 11: Advanced Code Actions - Phase 1
 */

import { BackendConfig, getInstance as getBackendConfig } from '../config/BackendConfig';
import {
    CodeAnalysisResult,
    CodeAnalysisOptions,
    CodeIssue,
    RefactoringSuggestion,
    SecurityVulnerability,
    CodeExplanation,
    AnalysisType
} from '../types';

export class CodeActionsClient {
    private static instance: CodeActionsClient;
    private backendConfig: BackendConfig;
    private csrfToken: string = '';
    private analysisCache: Map<string, CodeAnalysisResult> = new Map();

    private constructor() {
        this.backendConfig = getBackendConfig();
    }

    public static getInstance(): CodeActionsClient {
        if (!CodeActionsClient.instance) {
            CodeActionsClient.instance = new CodeActionsClient();
        }
        return CodeActionsClient.instance;
    }

    /**
     * Get CSRF token from backend configuration
     */
    private async getCsrfToken(): Promise<string> {
        if (this.csrfToken) {
            return this.csrfToken;
        }

        const token = await this.backendConfig.getCsrfToken();
        this.csrfToken = token;
        return token;
    }

    /**
     * Make API request to backend
     */
    private async makeRequest<T>(endpoint: string, data: any): Promise<T> {
        const baseUrl = this.backendConfig.getBaseUrl();
        const url = `${baseUrl}/api/method/ai_assistant.api.${endpoint}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Frappe-CSRF-Token': await this.getCsrfToken()
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        if (result.exc) {
            throw new Error(`Backend error: ${result.exc}`);
        }

        return result.message as T;
    }

    /**
     * Generate cache key for analysis
     */
    private getCacheKey(code: string, language: string, analysisTypes: AnalysisType[]): string {
        const hash = this.simpleHash(code);
        return `${language}-${analysisTypes.sort().join(',')}-${hash}`;
    }

    /**
     * Simple hash function for caching
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    /**
     * Analyze code for quality, security, and performance issues
     *
     * @param code - Code to analyze
     * @param language - Programming language
     * @param options - Analysis options
     * @returns Analysis result with issues and suggestions
     */
    public async analyzeCode(
        code: string,
        language: string,
        options: CodeAnalysisOptions = {}
    ): Promise<CodeAnalysisResult> {
        const analysisTypes = options.analysisTypes || ['quality', 'security', 'performance'];

        // Check cache first
        const cacheKey = this.getCacheKey(code, language, analysisTypes);
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey)!;
        }

        const result = await this.makeRequest<CodeAnalysisResult>('code_analyze', {
            code,
            language,
            analysis_types: analysisTypes,
            file_path: options.filePath,
            workspace_id: options.workspaceId
        });

        // Cache the result
        this.analysisCache.set(cacheKey, result);

        return result;
    }

    /**
     * Analyze a file from the filesystem
     *
     * @param filePath - Path to the file to analyze
     * @param options - Analysis options
     * @returns Analysis result
     */
    public async analyzeFile(
        filePath: string,
        options: CodeAnalysisOptions = {}
    ): Promise<CodeAnalysisResult> {
        const analysisTypes = options.analysisTypes || ['quality', 'security', 'performance'];

        const result = await this.makeRequest<CodeAnalysisResult>('code_analyze_file', {
            file_path: filePath,
            analysis_types: analysisTypes,
            workspace_id: options.workspaceId
        });

        return result;
    }

    /**
     * Get cached analysis result by ID
     *
     * @param analysisId - Analysis ID
     * @returns Analysis result
     */
    public async getAnalysis(analysisId: string): Promise<CodeAnalysisResult> {
        const result = await this.makeRequest<CodeAnalysisResult>('code_get_analysis', {
            analysis_id: analysisId
        });

        return result;
    }

    /**
     * Scan code for security vulnerabilities
     *
     * @param code - Code to scan
     * @param language - Programming language
     * @returns List of vulnerabilities found
     */
    public async scanSecurity(
        code: string,
        language: string
    ): Promise<{ success: boolean; vulnerabilities: SecurityVulnerability[] }> {
        const result = await this.makeRequest<{
            success: boolean;
            vulnerabilities: SecurityVulnerability[];
        }>('code_scan_security', {
            code,
            language
        });

        return result;
    }

    /**
     * Scan project dependencies for known vulnerabilities
     *
     * @param packageFilePath - Path to package file (package.json, requirements.txt, etc.)
     * @returns List of vulnerable packages
     */
    public async scanDependencies(
        packageFilePath: string
    ): Promise<{
        success: boolean;
        vulnerable_packages: Array<{
            package: string;
            version: string;
            vulnerability: SecurityVulnerability;
        }>;
    }> {
        const result = await this.makeRequest<{
            success: boolean;
            vulnerable_packages: Array<{
                package: string;
                version: string;
                vulnerability: SecurityVulnerability;
            }>;
        }>('code_scan_dependencies', {
            package_file_path: packageFilePath
        });

        return result;
    }

    /**
     * Get AI-powered refactoring suggestions
     *
     * @param code - Code to refactor
     * @param language - Programming language
     * @param refactorType - Type of refactoring (optional)
     * @returns List of refactoring suggestions
     */
    public async suggestRefactorings(
        code: string,
        language: string,
        refactorType?: string
    ): Promise<{ success: boolean; suggestions: RefactoringSuggestion[] }> {
        const result = await this.makeRequest<{
            success: boolean;
            suggestions: RefactoringSuggestion[];
        }>('code_suggest_refactor', {
            code,
            language,
            refactor_type: refactorType
        });

        return result;
    }

    /**
     * Get detailed explanation of code
     *
     * @param code - Code to explain
     * @param language - Programming language
     * @returns Code explanation
     */
    public async explainCode(
        code: string,
        language: string
    ): Promise<{ success: boolean; explanation: CodeExplanation }> {
        const result = await this.makeRequest<{
            success: boolean;
            explanation: CodeExplanation;
        }>('code_explain', {
            code,
            language
        });

        return result;
    }

    /**
     * Clear analysis cache
     */
    public clearCache(): void {
        this.analysisCache.clear();
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.analysisCache.size,
            keys: Array.from(this.analysisCache.keys())
        };
    }

    /**
     * Filter issues by severity
     */
    public filterIssuesBySeverity(
        issues: CodeIssue[],
        severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
    ): CodeIssue[] {
        return issues.filter(issue => issue.severity === severity);
    }

    /**
     * Get issue statistics
     */
    public getIssueStats(issues: CodeIssue[]): {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
        byType: Record<string, number>;
    } {
        const stats = {
            total: issues.length,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0,
            byType: {} as Record<string, number>
        };

        for (const issue of issues) {
            // Count by severity
            switch (issue.severity) {
                case 'critical':
                    stats.critical++;
                    break;
                case 'high':
                    stats.high++;
                    break;
                case 'medium':
                    stats.medium++;
                    break;
                case 'low':
                    stats.low++;
                    break;
                case 'info':
                    stats.info++;
                    break;
            }

            // Count by type
            const type = issue.issue_type || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        }

        return stats;
    }

    /**
     * Sort issues by severity (critical first)
     */
    public sortIssuesBySeverity(issues: CodeIssue[]): CodeIssue[] {
        const severityOrder = {
            'critical': 0,
            'high': 1,
            'medium': 2,
            'low': 3,
            'info': 4
        };

        return [...issues].sort((a, b) => {
            const severityA = severityOrder[a.severity] ?? 5;
            const severityB = severityOrder[b.severity] ?? 5;
            return severityA - severityB;
        });
    }
}

// Export singleton instance getter
export const getInstance = CodeActionsClient.getInstance;
