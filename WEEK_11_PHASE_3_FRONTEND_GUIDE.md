# Week 11 Phase 3: Advanced Code Analysis - Frontend Integration Guide

## Overview

This guide shows how to integrate the 6 advanced code analysis APIs into your VS Code extension frontend. These APIs provide deep code quality insights including performance analysis, complexity metrics, style checking, and vulnerability scanning.

**Backend Location**: `ai_assistant/core/code_actions.py` (extended functions)
**API Endpoints**: 6 endpoints in `ai_assistant/api/__init__.py`
**Features**: Performance, Complexity, Style, Vulnerabilities, Improvements, Quality Comparison

---

## Table of Contents

1. [TypeScript Type Definitions](#typescript-type-definitions)
2. [API Client Setup](#api-client-setup)
3. [Performance Analysis](#performance-analysis)
4. [Complexity Analysis](#complexity-analysis)
5. [Style Checking](#style-checking)
6. [Vulnerability Scanning](#vulnerability-scanning)
7. [Code Improvements](#code-improvements)
8. [Quality Comparison](#quality-comparison)
9. [React Component Examples](#react-component-examples)
10. [VS Code Integration](#vs-code-integration)
11. [Best Practices](#best-practices)

---

## TypeScript Type Definitions

Create `src/types/codeAnalysis.ts`:

```typescript
// Performance Analysis
export interface PerformanceIssue {
  type: string;
  line?: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact_estimate?: string; // e.g., "O(n²) → O(n log n)"
}

export interface PerformanceAnalysis {
  success: boolean;
  language: string;
  performance_score: number; // 0-100
  bottlenecks: PerformanceIssue[];
  time_complexity: {
    overall: string; // e.g., "O(n²)"
    breakdown: Array<{
      function_name: string;
      complexity: string;
      line_start: number;
      line_end: number;
    }>;
  };
  space_complexity: {
    overall: string;
    memory_usage_estimate: string;
  };
  optimizations: Array<{
    type: string;
    description: string;
    impact: string; // e.g., "30% faster"
    code_suggestion?: string;
  }>;
  best_practices: Array<{
    category: string;
    recommendation: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

// Complexity Analysis
export interface ComplexityMetric {
  function_name: string;
  line_start: number;
  line_end: number;
  cyclomatic_complexity: number;
  cognitive_complexity: number;
  nesting_depth: number;
  parameter_count: number;
  lines_of_code: number;
  complexity_rating: 'simple' | 'moderate' | 'complex' | 'very_complex';
}

export interface ComplexityAnalysis {
  success: boolean;
  language: string;
  overall_complexity: number; // Average cyclomatic complexity
  overall_cognitive_complexity: number;
  complexity_rating: 'simple' | 'moderate' | 'complex' | 'very_complex';
  maintainability_index: number; // 0-100, higher is better
  functions: ComplexityMetric[];
  recommendations: Array<{
    function_name: string;
    issue: string;
    suggestion: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  summary: {
    total_functions: number;
    simple_functions: number;
    moderate_functions: number;
    complex_functions: number;
    very_complex_functions: number;
  };
}

// Style Checking
export interface StyleViolation {
  line: number;
  column?: number;
  rule_id: string;
  rule_name: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  category: string; // e.g., "formatting", "naming", "best-practices"
  auto_fixable: boolean;
  suggested_fix?: string;
}

export interface StyleAnalysis {
  success: boolean;
  language: string;
  style_guide: string; // e.g., "PEP8", "Google", "Airbnb"
  compliance_score: number; // 0-100
  violations: StyleViolation[];
  summary: {
    total_violations: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    auto_fixable_count: number;
  };
  categories: Record<string, number>; // Category → violation count
}

// Vulnerability Scanning
export interface VulnerabilityIssue {
  id: string;
  line: number;
  column?: number;
  vulnerability_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  cwe_id?: string; // Common Weakness Enumeration ID
  owasp_category?: string; // OWASP Top 10 category
  cvss_score?: number; // 0-10
  exploitability: 'low' | 'medium' | 'high';
  impact: string;
  remediation: string;
  code_snippet?: string;
  references?: string[];
}

export interface VulnerabilityAnalysis {
  success: boolean;
  language: string;
  security_score: number; // 0-100
  vulnerabilities: VulnerabilityIssue[];
  summary: {
    total_vulnerabilities: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
  };
  owasp_breakdown: Record<string, number>; // OWASP category → count
  recommendations: string[];
}

// Code Improvements
export interface CodeImprovement {
  category: string; // 'performance', 'readability', 'maintainability', 'security'
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  line_start?: number;
  line_end?: number;
  current_code?: string;
  suggested_code?: string;
  rationale: string;
}

export interface ImprovementsAnalysis {
  success: boolean;
  language: string;
  overall_quality_score: number; // 0-100
  improvements: CodeImprovement[];
  summary: {
    total_suggestions: number;
    critical_count: number;
    high_priority_count: number;
    medium_priority_count: number;
    low_priority_count: number;
  };
  categories: Record<string, number>;
}

// Quality Comparison
export interface CodeQualityMetrics {
  performance_score: number;
  complexity_score: number;
  style_score: number;
  security_score: number;
  overall_score: number;
  lines_of_code: number;
  comment_ratio: number;
  test_coverage?: number;
}

export interface QualityComparison {
  success: boolean;
  code1_metrics: CodeQualityMetrics;
  code2_metrics: CodeQualityMetrics;
  comparison: {
    performance_diff: number; // Positive = code1 better
    complexity_diff: number;
    style_diff: number;
    security_diff: number;
    overall_diff: number;
  };
  winner: {
    overall: 'code1' | 'code2' | 'tie';
    performance: 'code1' | 'code2' | 'tie';
    complexity: 'code1' | 'code2' | 'tie';
    style: 'code1' | 'code2' | 'tie';
    security: 'code1' | 'code2' | 'tie';
  };
  analysis: string;
  recommendations: string[];
}
```

---

## API Client Setup

Create `src/services/codeAnalysis.ts`:

```typescript
import * as vscode from 'vscode';
import { getServerUrl } from '../config/settings';
import type {
  PerformanceAnalysis,
  ComplexityAnalysis,
  StyleAnalysis,
  VulnerabilityAnalysis,
  ImprovementsAnalysis,
  QualityComparison
} from '../types/codeAnalysis';

const BACKEND_URL = getServerUrl(); // https://oropendola.ai

export class CodeAnalysisService {
  private static instance: CodeAnalysisService;

  private constructor() {}

  public static getInstance(): CodeAnalysisService {
    if (!CodeAnalysisService.instance) {
      CodeAnalysisService.instance = new CodeAnalysisService();
    }
    return CodeAnalysisService.instance;
  }

  private async apiCall<T>(
    endpoint: string,
    params: Record<string, any>
  ): Promise<T> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/method/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`Code Analysis API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message || data;
    } catch (error) {
      console.error(`Code Analysis API call failed (${endpoint}):`, error);
      throw error;
    }
  }

  private async getAuthToken(): Promise<string> {
    const config = vscode.workspace.getConfiguration('oropendolaAI');
    return config.get<string>('authToken') || '';
  }

  /**
   * Analyze code performance and detect bottlenecks
   */
  async checkPerformance(
    code: string,
    language: string,
    filePath?: string
  ): Promise<PerformanceAnalysis> {
    return await this.apiCall<PerformanceAnalysis>(
      'ai_assistant.api.code_check_performance',
      { code, language, file_path: filePath }
    );
  }

  /**
   * Analyze code complexity (cyclomatic, cognitive)
   */
  async checkComplexity(
    code: string,
    language: string,
    filePath?: string
  ): Promise<ComplexityAnalysis> {
    return await this.apiCall<ComplexityAnalysis>(
      'ai_assistant.api.code_check_complexity',
      { code, language, file_path: filePath }
    );
  }

  /**
   * Check style guide compliance
   */
  async checkStyle(
    code: string,
    language: string,
    styleGuide: string = 'standard'
  ): Promise<StyleAnalysis> {
    return await this.apiCall<StyleAnalysis>(
      'ai_assistant.api.code_check_style',
      { code, language, style_guide: styleGuide }
    );
  }

  /**
   * Scan for security vulnerabilities
   */
  async checkVulnerabilities(
    code: string,
    language: string,
    filePath?: string
  ): Promise<VulnerabilityAnalysis> {
    return await this.apiCall<VulnerabilityAnalysis>(
      'ai_assistant.api.code_check_vulnerabilities',
      { code, language, file_path: filePath }
    );
  }

  /**
   * Get comprehensive improvement suggestions
   */
  async suggestImprovements(
    code: string,
    language: string,
    focus?: string[]
  ): Promise<ImprovementsAnalysis> {
    return await this.apiCall<ImprovementsAnalysis>(
      'ai_assistant.api.code_suggest_improvements',
      { code, language, focus_areas: focus }
    );
  }

  /**
   * Compare quality of two code snippets
   */
  async compareQuality(
    code1: string,
    code2: string,
    language: string
  ): Promise<QualityComparison> {
    return await this.apiCall<QualityComparison>(
      'ai_assistant.api.code_compare_quality',
      { code1, code2, language }
    );
  }

  /**
   * Run comprehensive analysis (all checks)
   */
  async runComprehensiveAnalysis(
    code: string,
    language: string,
    filePath?: string
  ): Promise<{
    performance: PerformanceAnalysis;
    complexity: ComplexityAnalysis;
    style: StyleAnalysis;
    vulnerabilities: VulnerabilityAnalysis;
  }> {
    const [performance, complexity, style, vulnerabilities] = await Promise.all([
      this.checkPerformance(code, language, filePath),
      this.checkComplexity(code, language, filePath),
      this.checkStyle(code, language),
      this.checkVulnerabilities(code, language, filePath)
    ]);

    return { performance, complexity, style, vulnerabilities };
  }
}

// Export singleton instance
export const codeAnalysisService = CodeAnalysisService.getInstance();
```

---

## Performance Analysis

### Performance Analysis Panel

```typescript
import * as vscode from 'vscode';
import { codeAnalysisService } from '../services/codeAnalysis';
import type { PerformanceAnalysis } from '../types/codeAnalysis';

export class PerformanceAnalyzer {
  /**
   * Analyze currently active editor
   */
  static async analyzeActiveEditor(): Promise<PerformanceAnalysis | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found');
      return null;
    }

    const document = editor.document;
    const code = document.getText();
    const language = document.languageId;
    const filePath = document.uri.fsPath;

    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing Performance...',
        cancellable: false
      },
      async () => {
        return await codeAnalysisService.checkPerformance(code, language, filePath);
      }
    );
  }

  /**
   * Analyze selected code
   */
  static async analyzeSelection(): Promise<PerformanceAnalysis | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const selection = editor.selection;
    const code = editor.document.getText(selection);

    if (!code) {
      vscode.window.showWarningMessage('No code selected');
      return null;
    }

    const language = editor.document.languageId;

    return await codeAnalysisService.checkPerformance(code, language);
  }

  /**
   * Display performance results in webview
   */
  static showResults(analysis: PerformanceAnalysis): void {
    const panel = vscode.window.createWebviewPanel(
      'performanceAnalysis',
      'Performance Analysis',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = this.getWebviewContent(analysis);
  }

  private static getWebviewContent(analysis: PerformanceAnalysis): string {
    const scoreColor = analysis.performance_score >= 80 ? '#4caf50' :
                       analysis.performance_score >= 60 ? '#ff9800' : '#f44336';

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .score { font-size: 48px; font-weight: bold; color: ${scoreColor}; }
    .section { margin: 20px 0; }
    .bottleneck {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 10px;
      margin: 10px 0;
    }
    .optimization {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 10px;
      margin: 10px 0;
    }
    .severity-critical { border-left-color: #dc3545; background: #f8d7da; }
    .severity-high { border-left-color: #fd7e14; }
    .severity-medium { border-left-color: #ffc107; }
    .severity-low { border-left-color: #17a2b8; background: #d1ecf1; }
  </style>
</head>
<body>
  <h1>Performance Analysis Results</h1>

  <div class="section">
    <h2>Overall Score</h2>
    <div class="score">${analysis.performance_score}/100</div>
  </div>

  <div class="section">
    <h2>Time Complexity</h2>
    <p><strong>Overall:</strong> ${analysis.time_complexity.overall}</p>
    <h3>Function Breakdown:</h3>
    ${analysis.time_complexity.breakdown.map(fn => `
      <div>
        <strong>${fn.function_name}</strong> (lines ${fn.line_start}-${fn.line_end}): ${fn.complexity}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>Space Complexity</h2>
    <p><strong>Overall:</strong> ${analysis.space_complexity.overall}</p>
    <p><strong>Memory Usage:</strong> ${analysis.space_complexity.memory_usage_estimate}</p>
  </div>

  ${analysis.bottlenecks.length > 0 ? `
    <div class="section">
      <h2>Performance Bottlenecks (${analysis.bottlenecks.length})</h2>
      ${analysis.bottlenecks.map(issue => `
        <div class="bottleneck severity-${issue.severity}">
          <strong>${issue.type}</strong> ${issue.line ? `(Line ${issue.line})` : ''}
          <p>${issue.description}</p>
          ${issue.impact_estimate ? `<p><em>Impact: ${issue.impact_estimate}</em></p>` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${analysis.optimizations.length > 0 ? `
    <div class="section">
      <h2>Optimization Suggestions (${analysis.optimizations.length})</h2>
      ${analysis.optimizations.map(opt => `
        <div class="optimization">
          <strong>${opt.type}</strong>
          <p>${opt.description}</p>
          <p><strong>Expected Impact:</strong> ${opt.impact}</p>
          ${opt.code_suggestion ? `<pre><code>${opt.code_suggestion}</code></pre>` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${analysis.best_practices.length > 0 ? `
    <div class="section">
      <h2>Best Practices</h2>
      ${analysis.best_practices.map(bp => `
        <div>
          <strong>[${bp.priority.toUpperCase()}] ${bp.category}</strong>
          <p>${bp.recommendation}</p>
        </div>
      `).join('')}
    </div>
  ` : ''}
</body>
</html>`;
  }
}
```

### VS Code Command Registration

```typescript
// In your extension.ts activation function
export function activate(context: vscode.ExtensionContext) {
  // Register performance analysis command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'oropendolaAI.analyzePerformance',
      async () => {
        const result = await PerformanceAnalyzer.analyzeActiveEditor();
        if (result) {
          PerformanceAnalyzer.showResults(result);
        }
      }
    )
  );

  // Register context menu item for selection
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'oropendolaAI.analyzeSelectionPerformance',
      async () => {
        const result = await PerformanceAnalyzer.analyzeSelection();
        if (result) {
          PerformanceAnalyzer.showResults(result);
        }
      }
    )
  );
}
```

---

## Complexity Analysis

### Complexity Analyzer

```typescript
import * as vscode from 'vscode';
import { codeAnalysisService } from '../services/codeAnalysis';
import type { ComplexityAnalysis, ComplexityMetric } from '../types/codeAnalysis';

export class ComplexityAnalyzer {
  static async analyzeActiveEditor(): Promise<ComplexityAnalysis | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const code = editor.document.getText();
    const language = editor.document.languageId;

    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing Code Complexity...',
        cancellable: false
      },
      async () => {
        return await codeAnalysisService.checkComplexity(code, language);
      }
    );
  }

  /**
   * Create CodeLens items for complex functions
   */
  static createComplexityCodeLenses(
    document: vscode.TextDocument,
    analysis: ComplexityAnalysis
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];

    for (const func of analysis.functions) {
      if (func.complexity_rating === 'complex' || func.complexity_rating === 'very_complex') {
        const range = new vscode.Range(
          func.line_start - 1,
          0,
          func.line_start - 1,
          0
        );

        const lens = new vscode.CodeLens(range, {
          title: `⚠️ Complexity: ${func.cyclomatic_complexity} (${func.complexity_rating})`,
          command: 'oropendolaAI.showComplexityDetails',
          arguments: [func]
        });

        codeLenses.push(lens);
      }
    }

    return codeLenses;
  }

  /**
   * Show detailed complexity info
   */
  static showComplexityDetails(metric: ComplexityMetric): void {
    const message = `
**${metric.function_name}**

Cyclomatic Complexity: ${metric.cyclomatic_complexity}
Cognitive Complexity: ${metric.cognitive_complexity}
Nesting Depth: ${metric.nesting_depth}
Parameters: ${metric.parameter_count}
Lines of Code: ${metric.lines_of_code}

Rating: ${metric.complexity_rating.toUpperCase()}

${metric.complexity_rating === 'very_complex' ?
  '⚠️ Consider refactoring this function to reduce complexity.' :
  metric.complexity_rating === 'complex' ?
  'ℹ️ This function may benefit from simplification.' :
  '✅ Complexity is acceptable.'}
    `.trim();

    vscode.window.showInformationMessage(message, { modal: true });
  }

  /**
   * Add diagnostic warnings for complex functions
   */
  static createComplexityDiagnostics(
    document: vscode.TextDocument,
    analysis: ComplexityAnalysis
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const func of analysis.functions) {
      if (func.cyclomatic_complexity > 10) {
        const range = new vscode.Range(
          func.line_start - 1,
          0,
          func.line_end - 1,
          1000
        );

        const severity = func.cyclomatic_complexity > 20 ?
          vscode.DiagnosticSeverity.Warning :
          vscode.DiagnosticSeverity.Information;

        const diagnostic = new vscode.Diagnostic(
          range,
          `High cyclomatic complexity (${func.cyclomatic_complexity}). Consider refactoring.`,
          severity
        );

        diagnostic.source = 'Oropendola AI - Complexity Analysis';
        diagnostics.push(diagnostic);
      }
    }

    return diagnostics;
  }
}
```

---

## Style Checking

### Style Checker with Quick Fixes

```typescript
import * as vscode from 'vscode';
import { codeAnalysisService } from '../services/codeAnalysis';
import type { StyleAnalysis, StyleViolation } from '../types/codeAnalysis';

export class StyleChecker {
  private static diagnosticCollection: vscode.DiagnosticCollection;

  static initialize(context: vscode.ExtensionContext): void {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('oropendolaAI-style');
    context.subscriptions.push(this.diagnosticCollection);

    // Auto-check on save
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('oropendolaAI');
        if (config.get<boolean>('styleCheckOnSave', false)) {
          await this.checkDocument(document);
        }
      })
    );
  }

  static async checkDocument(document: vscode.TextDocument): Promise<StyleAnalysis | null> {
    const code = document.getText();
    const language = document.languageId;

    // Get style guide preference from settings
    const config = vscode.workspace.getConfiguration('oropendolaAI');
    const styleGuide = config.get<string>('styleGuide', 'standard');

    const analysis = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Checking Code Style...',
        cancellable: false
      },
      async () => {
        return await codeAnalysisService.checkStyle(code, language, styleGuide);
      }
    );

    if (analysis) {
      this.updateDiagnostics(document, analysis);
    }

    return analysis;
  }

  private static updateDiagnostics(
    document: vscode.TextDocument,
    analysis: StyleAnalysis
  ): void {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const violation of analysis.violations) {
      const line = Math.max(0, violation.line - 1);
      const column = violation.column ? violation.column - 1 : 0;

      const range = new vscode.Range(
        line,
        column,
        line,
        column + 100 // Approximate end
      );

      const severity = violation.severity === 'error' ?
        vscode.DiagnosticSeverity.Error :
        violation.severity === 'warning' ?
        vscode.DiagnosticSeverity.Warning :
        vscode.DiagnosticSeverity.Information;

      const diagnostic = new vscode.Diagnostic(
        range,
        `[${violation.rule_id}] ${violation.message}`,
        severity
      );

      diagnostic.source = 'Oropendola AI - Style Check';
      diagnostic.code = violation.rule_id;

      // Add suggested fix as related information
      if (violation.suggested_fix) {
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(document.uri, range),
            `Suggested fix: ${violation.suggested_fix}`
          )
        ];
      }

      diagnostics.push(diagnostic);
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Code Action Provider for auto-fixes
   */
  static provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source === 'Oropendola AI - Style Check') {
        // Check if auto-fixable
        if (diagnostic.relatedInformation && diagnostic.relatedInformation.length > 0) {
          const fix = new vscode.CodeAction(
            'Apply suggested style fix',
            vscode.CodeActionKind.QuickFix
          );

          fix.diagnostics = [diagnostic];
          fix.isPreferred = true;

          // Add edit to apply fix
          // (In real implementation, you'd parse the suggested_fix)
          fix.edit = new vscode.WorkspaceEdit();

          actions.push(fix);
        }
      }
    }

    return actions;
  }
}
```

---

## Vulnerability Scanning

### Security Scanner

```typescript
import * as vscode from 'vscode';
import { codeAnalysisService } from '../services/codeAnalysis';
import type { VulnerabilityAnalysis, VulnerabilityIssue } from '../types/codeAnalysis';

export class SecurityScanner {
  static async scanActiveEditor(): Promise<VulnerabilityAnalysis | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const code = editor.document.getText();
    const language = editor.document.languageId;
    const filePath = editor.document.uri.fsPath;

    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Scanning for Vulnerabilities...',
        cancellable: false
      },
      async () => {
        return await codeAnalysisService.checkVulnerabilities(code, language, filePath);
      }
    );
  }

  /**
   * Show vulnerability report
   */
  static showReport(analysis: VulnerabilityAnalysis): void {
    const panel = vscode.window.createWebviewPanel(
      'securityReport',
      'Security Scan Results',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = this.getReportHTML(analysis);
  }

  private static getReportHTML(analysis: VulnerabilityAnalysis): string {
    const scoreColor = analysis.security_score >= 80 ? '#4caf50' :
                       analysis.security_score >= 60 ? '#ff9800' : '#f44336';

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .score { font-size: 48px; font-weight: bold; color: ${scoreColor}; }
    .vulnerability {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    }
    .severity-critical { border-left: 5px solid #dc3545; background: #f8d7da; }
    .severity-high { border-left: 5px solid #fd7e14; background: #fff3cd; }
    .severity-medium { border-left: 5px solid #ffc107; background: #fff8e1; }
    .severity-low { border-left: 5px solid #28a745; background: #d4edda; }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      margin: 0 5px;
    }
    .badge-critical { background: #dc3545; color: white; }
    .badge-high { background: #fd7e14; color: white; }
    .badge-medium { background: #ffc107; color: black; }
    .badge-low { background: #28a745; color: white; }
    code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Security Scan Results</h1>

  <div class="section">
    <h2>Security Score</h2>
    <div class="score">${analysis.security_score}/100</div>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <p>Total Vulnerabilities: <strong>${analysis.summary.total_vulnerabilities}</strong></p>
    <p>
      <span class="badge badge-critical">${analysis.summary.critical_count} Critical</span>
      <span class="badge badge-high">${analysis.summary.high_count} High</span>
      <span class="badge badge-medium">${analysis.summary.medium_count} Medium</span>
      <span class="badge badge-low">${analysis.summary.low_count} Low</span>
    </p>
  </div>

  ${analysis.vulnerabilities.length > 0 ? `
    <div class="section">
      <h2>Vulnerabilities (${analysis.vulnerabilities.length})</h2>
      ${analysis.vulnerabilities.map(vuln => `
        <div class="vulnerability severity-${vuln.severity}">
          <h3>${vuln.title} <span class="badge badge-${vuln.severity}">${vuln.severity.toUpperCase()}</span></h3>
          <p><strong>Line ${vuln.line}</strong> | Type: ${vuln.vulnerability_type}</p>
          <p>${vuln.description}</p>

          ${vuln.cwe_id ? `<p><strong>CWE ID:</strong> ${vuln.cwe_id}</p>` : ''}
          ${vuln.owasp_category ? `<p><strong>OWASP Category:</strong> ${vuln.owasp_category}</p>` : ''}
          ${vuln.cvss_score ? `<p><strong>CVSS Score:</strong> ${vuln.cvss_score}/10</p>` : ''}

          <p><strong>Exploitability:</strong> ${vuln.exploitability}</p>
          <p><strong>Impact:</strong> ${vuln.impact}</p>

          <div style="background: #e7f3ff; padding: 10px; border-radius: 4px; margin-top: 10px;">
            <strong>🔧 Remediation:</strong>
            <p>${vuln.remediation}</p>
          </div>

          ${vuln.code_snippet ? `
            <div style="margin-top: 10px;">
              <strong>Vulnerable Code:</strong>
              <pre><code>${vuln.code_snippet}</code></pre>
            </div>
          ` : ''}

          ${vuln.references && vuln.references.length > 0 ? `
            <div style="margin-top: 10px;">
              <strong>References:</strong>
              <ul>
                ${vuln.references.map(ref => `<li><a href="${ref}">${ref}</a></li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : '<p style="color: #4caf50; font-size: 18px;">✅ No vulnerabilities detected!</p>'}

  ${analysis.recommendations.length > 0 ? `
    <div class="section">
      <h2>Recommendations</h2>
      <ul>
        ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
  ` : ''}
</body>
</html>`;
  }

  /**
   * Create security diagnostics
   */
  static createSecurityDiagnostics(
    document: vscode.TextDocument,
    analysis: VulnerabilityAnalysis
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const vuln of analysis.vulnerabilities) {
      const line = Math.max(0, vuln.line - 1);
      const range = new vscode.Range(line, 0, line, 1000);

      const severity = vuln.severity === 'critical' || vuln.severity === 'high' ?
        vscode.DiagnosticSeverity.Error :
        vuln.severity === 'medium' ?
        vscode.DiagnosticSeverity.Warning :
        vscode.DiagnosticSeverity.Information;

      const diagnostic = new vscode.Diagnostic(
        range,
        `[SECURITY] ${vuln.title}: ${vuln.description}`,
        severity
      );

      diagnostic.source = 'Oropendola AI - Security';
      diagnostic.code = vuln.cwe_id || vuln.id;

      diagnostics.push(diagnostic);
    }

    return diagnostics;
  }
}
```

---

## Code Improvements

### Improvements Suggester

```typescript
import * as vscode from 'vscode';
import { codeAnalysisService } from '../services/codeAnalysis';
import type { ImprovementsAnalysis, CodeImprovement } from '../types/codeAnalysis';

export class ImprovementsSuggester {
  static async suggestForActiveEditor(
    focusAreas?: string[]
  ): Promise<ImprovementsAnalysis | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const code = editor.document.getText();
    const language = editor.document.languageId;

    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating Improvement Suggestions...',
        cancellable: false
      },
      async () => {
        return await codeAnalysisService.suggestImprovements(code, language, focusAreas);
      }
    );
  }

  /**
   * Show improvements in quick pick
   */
  static async showImprovementsQuickPick(analysis: ImprovementsAnalysis): Promise<void> {
    const items: vscode.QuickPickItem[] = analysis.improvements.map(imp => ({
      label: `$(${this.getPriorityIcon(imp.priority)}) ${imp.category}`,
      description: imp.priority.toUpperCase(),
      detail: imp.description,
      improvement: imp
    } as any));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an improvement to view details',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (selected && (selected as any).improvement) {
      this.showImprovementDetails((selected as any).improvement);
    }
  }

  private static getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'lightbulb';
      default: return 'circle-outline';
    }
  }

  private static showImprovementDetails(improvement: CodeImprovement): void {
    const panel = vscode.window.createWebviewPanel(
      'improvementDetail',
      `Improvement: ${improvement.category}`,
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .priority-${improvement.priority} {
      color: ${improvement.priority === 'critical' ? '#dc3545' :
               improvement.priority === 'high' ? '#fd7e14' :
               improvement.priority === 'medium' ? '#ffc107' : '#28a745'};
      font-weight: bold;
    }
    pre { background: #f4f4f4; padding: 15px; border-radius: 4px; overflow-x: auto; }
    .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  </style>
</head>
<body>
  <h1>${improvement.category}</h1>
  <p class="priority-${improvement.priority}">Priority: ${improvement.priority.toUpperCase()}</p>

  <h2>Description</h2>
  <p>${improvement.description}</p>

  <h2>Expected Impact</h2>
  <p>${improvement.impact}</p>

  <h2>Rationale</h2>
  <p>${improvement.rationale}</p>

  ${improvement.current_code && improvement.suggested_code ? `
    <h2>Code Comparison</h2>
    <div class="comparison">
      <div>
        <h3>Current Code</h3>
        <pre><code>${improvement.current_code}</code></pre>
      </div>
      <div>
        <h3>Suggested Code</h3>
        <pre><code>${improvement.suggested_code}</code></pre>
      </div>
    </div>
  ` : ''}

  ${improvement.line_start ? `
    <p><em>Lines ${improvement.line_start}-${improvement.line_end || improvement.line_start}</em></p>
  ` : ''}
</body>
</html>`;
  }
}
```

---

## Quality Comparison

### Code Comparator

```typescript
import * as vscode from 'vscode';
import { codeAnalysisService } from '../services/codeAnalysis';
import type { QualityComparison } from '../types/codeAnalysis';

export class CodeComparator {
  /**
   * Compare two code snippets
   */
  static async compareCode(): Promise<void> {
    // Get first code snippet
    const code1 = await vscode.window.showInputBox({
      prompt: 'Enter first code snippet or select from editor',
      placeHolder: 'Paste code here...',
      ignoreFocusOut: true
    });

    if (!code1) return;

    // Get second code snippet
    const code2 = await vscode.window.showInputBox({
      prompt: 'Enter second code snippet for comparison',
      placeHolder: 'Paste code here...',
      ignoreFocusOut: true
    });

    if (!code2) return;

    // Get language
    const language = await vscode.window.showInputBox({
      prompt: 'Enter programming language',
      value: 'python',
      placeHolder: 'python, javascript, java, etc.'
    });

    if (!language) return;

    const comparison = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Comparing Code Quality...',
        cancellable: false
      },
      async () => {
        return await codeAnalysisService.compareQuality(code1, code2, language);
      }
    );

    if (comparison) {
      this.showComparisonReport(comparison);
    }
  }

  private static showComparisonReport(comparison: QualityComparison): void {
    const panel = vscode.window.createWebviewPanel(
      'codeComparison',
      'Code Quality Comparison',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .comparison-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0; }
    .metric-card {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      text-align: center;
    }
    .score { font-size: 36px; font-weight: bold; }
    .winner { background: #d4edda; border-color: #28a745; }
    .loser { background: #f8d7da; border-color: #dc3545; }
    .tie { background: #fff3cd; border-color: #ffc107; }
    .diff-positive { color: #28a745; }
    .diff-negative { color: #dc3545; }
  </style>
</head>
<body>
  <h1>Code Quality Comparison</h1>

  <div class="section">
    <h2>Overall Winner: ${comparison.winner.overall.toUpperCase()}</h2>
    <p><strong>Overall Score Difference:</strong>
      <span class="${comparison.comparison.overall_diff >= 0 ? 'diff-positive' : 'diff-negative'}">
        ${comparison.comparison.overall_diff >= 0 ? '+' : ''}${comparison.comparison.overall_diff.toFixed(1)}
      </span>
    </p>
  </div>

  <div class="comparison-grid">
    <div><strong>Metric</strong></div>
    <div><strong>Code 1</strong></div>
    <div><strong>Code 2</strong></div>

    <div>Overall Score</div>
    <div class="${comparison.winner.overall === 'code1' ? 'winner' : comparison.winner.overall === 'tie' ? 'tie' : 'loser'}">
      <div class="score">${comparison.code1_metrics.overall_score}</div>
    </div>
    <div class="${comparison.winner.overall === 'code2' ? 'winner' : comparison.winner.overall === 'tie' ? 'tie' : 'loser'}">
      <div class="score">${comparison.code2_metrics.overall_score}</div>
    </div>

    <div>Performance</div>
    <div class="metric-card ${comparison.winner.performance === 'code1' ? 'winner' : ''}">
      ${comparison.code1_metrics.performance_score}
    </div>
    <div class="metric-card ${comparison.winner.performance === 'code2' ? 'winner' : ''}">
      ${comparison.code2_metrics.performance_score}
    </div>

    <div>Complexity</div>
    <div class="metric-card ${comparison.winner.complexity === 'code1' ? 'winner' : ''}">
      ${comparison.code1_metrics.complexity_score}
    </div>
    <div class="metric-card ${comparison.winner.complexity === 'code2' ? 'winner' : ''}">
      ${comparison.code2_metrics.complexity_score}
    </div>

    <div>Style</div>
    <div class="metric-card ${comparison.winner.style === 'code1' ? 'winner' : ''}">
      ${comparison.code1_metrics.style_score}
    </div>
    <div class="metric-card ${comparison.winner.style === 'code2' ? 'winner' : ''}">
      ${comparison.code2_metrics.style_score}
    </div>

    <div>Security</div>
    <div class="metric-card ${comparison.winner.security === 'code1' ? 'winner' : ''}">
      ${comparison.code1_metrics.security_score}
    </div>
    <div class="metric-card ${comparison.winner.security === 'code2' ? 'winner' : ''}">
      ${comparison.code2_metrics.security_score}
    </div>
  </div>

  <div class="section">
    <h2>Analysis</h2>
    <p>${comparison.analysis}</p>
  </div>

  ${comparison.recommendations.length > 0 ? `
    <div class="section">
      <h2>Recommendations</h2>
      <ul>
        ${comparison.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
  ` : ''}
</body>
</html>`;
  }
}
```

---

## React Component Examples

### Comprehensive Analysis Dashboard

```tsx
import React, { useState, useEffect } from 'react';
import { codeAnalysisService } from '../services/codeAnalysis';

export const CodeAnalysisDashboard: React.FC<{ code: string; language: string }> = ({
  code,
  language
}) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    runAnalysis();
  }, [code, language]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await codeAnalysisService.runComprehensiveAnalysis(
        code,
        language
      );
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="analysis-loading">Running comprehensive analysis...</div>;
  }

  if (!analysis) {
    return <div className="analysis-error">No analysis data available</div>;
  }

  return (
    <div className="code-analysis-dashboard">
      {/* Score Summary */}
      <div className="score-summary">
        <div className="score-card">
          <h3>Performance</h3>
          <div className={`score score-${getScoreClass(analysis.performance.performance_score)}`}>
            {analysis.performance.performance_score}
          </div>
        </div>
        <div className="score-card">
          <h3>Maintainability</h3>
          <div className={`score score-${getScoreClass(analysis.complexity.maintainability_index)}`}>
            {analysis.complexity.maintainability_index}
          </div>
        </div>
        <div className="score-card">
          <h3>Style</h3>
          <div className={`score score-${getScoreClass(analysis.style.compliance_score)}`}>
            {analysis.style.compliance_score}
          </div>
        </div>
        <div className="score-card">
          <h3>Security</h3>
          <div className={`score score-${getScoreClass(analysis.vulnerabilities.security_score)}`}>
            {analysis.vulnerabilities.security_score}
          </div>
        </div>
      </div>

      {/* Critical Issues */}
      {analysis.vulnerabilities.summary.critical_count > 0 && (
        <div className="critical-alert">
          ⚠️ {analysis.vulnerabilities.summary.critical_count} critical security vulnerabilities found!
        </div>
      )}

      {/* Detailed Sections */}
      <div className="analysis-sections">
        <PerformanceSection data={analysis.performance} />
        <ComplexitySection data={analysis.complexity} />
        <StyleSection data={analysis.style} />
        <SecuritySection data={analysis.vulnerabilities} />
      </div>
    </div>
  );
};

function getScoreClass(score: number): string {
  if (score >= 80) return 'good';
  if (score >= 60) return 'medium';
  return 'poor';
}
```

---

## Best Practices

### 1. Caching Analysis Results

```typescript
class AnalysisCache {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private TTL = 5 * 60 * 1000; // 5 minutes

  get(code: string, language: string): any | null {
    const key = this.getKey(code, language);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.result;
    }

    return null;
  }

  set(code: string, language: string, result: any): void {
    const key = this.getKey(code, language);
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  private getKey(code: string, language: string): string {
    return `${language}:${code.substring(0, 100)}`; // Simple hash
  }
}
```

### 2. Debounced Analysis

```typescript
import { debounce } from 'lodash';

const debouncedAnalysis = debounce(
  async (code: string, language: string) => {
    return await codeAnalysisService.runComprehensiveAnalysis(code, language);
  },
  2000 // Wait 2 seconds after typing stops
);
```

### 3. Background Analysis

```typescript
// Run analysis in background without blocking UI
async function analyzeInBackground(
  document: vscode.TextDocument
): Promise<void> {
  const code = document.getText();
  const language = document.languageId;

  // Don't await - fire and forget
  codeAnalysisService.runComprehensiveAnalysis(code, language)
    .then(result => {
      // Update diagnostics when ready
      updateDiagnostics(document, result);
    })
    .catch(error => {
      console.error('Background analysis failed:', error);
    });
}
```

---

## Summary

This guide covers all 6 Week 11 Phase 3 APIs:

| API | Purpose | UI Integration |
|-----|---------|----------------|
| check_performance | Performance analysis | WebView panel, CodeLens |
| check_complexity | Complexity metrics | Diagnostics, CodeLens |
| check_style | Style compliance | Diagnostics, Quick fixes |
| check_vulnerabilities | Security scanning | WebView report, Diagnostics |
| suggest_improvements | AI suggestions | Quick pick, WebView |
| compare_quality | Code comparison | Side-by-side comparison |

**Estimated Integration Time**: 8-12 hours
- TypeScript types & services: 2-3 hours
- VS Code commands & providers: 3-4 hours
- WebView UIs: 2-3 hours
- Testing & polish: 1-2 hours
