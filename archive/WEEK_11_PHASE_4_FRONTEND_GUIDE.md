# Week 11 Phase 4: Custom Code Actions - Frontend Integration Guide

## Overview

This guide shows how to integrate the 4 Custom Code Actions APIs into your VS Code extension frontend. This feature allows users to create their own AI-powered code analysis templates with custom prompts, parameters, and output formats.

**Backend Location**: `ai_assistant/core/custom_actions.py`
**API Endpoints**: 4 endpoints in `ai_assistant/api/__init__.py`
**Database**: 2 DocTypes (custom_code_action, custom_action_execution)
**Key Feature**: User-defined AI code analysis with prompt templates

---

## Table of Contents

1. [TypeScript Type Definitions](#typescript-type-definitions)
2. [API Client Setup](#api-client-setup)
3. [Custom Action Creator UI](#custom-action-creator-ui)
4. [Action Execution](#action-execution)
5. [Action Library Browser](#action-library-browser)
6. [Execution History](#execution-history)
7. [React Component Examples](#react-component-examples)
8. [Prompt Template Editor](#prompt-template-editor)
9. [VS Code Integration](#vs-code-integration)
10. [Best Practices](#best-practices)

---

## TypeScript Type Definitions

Create `src/types/customActions.ts`:

```typescript
// Custom Code Action
export interface CustomCodeAction {
  action_id: string;
  action_name: string;
  description: string;
  action_type: 'analysis' | 'transformation' | 'validation' | 'generation';
  language: string; // 'python', 'javascript', 'any', etc.
  prompt_template: string; // Must contain {{code}} placeholder
  parameters: ActionParameter[];
  output_format: 'json' | 'text' | 'markdown' | 'code';
  is_public: boolean;
  created_by: string;
  created_at: string;
  usage_count: number;
  average_rating?: number;
  tags?: string[];
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description: string;
  required: boolean;
  default_value?: any;
  options?: string[]; // For 'select' type
  validation?: string; // Regex pattern for validation
}

export interface CreateActionParams {
  action_name: string;
  description: string;
  action_type: 'analysis' | 'transformation' | 'validation' | 'generation';
  prompt_template: string;
  language?: string;
  parameters?: ActionParameter[];
  output_format?: 'json' | 'text' | 'markdown' | 'code';
  is_public?: boolean;
  tags?: string[];
}

// Action Execution
export interface ActionExecution {
  execution_id: string;
  action_id: string;
  action_name: string;
  input_code: string;
  input_language: string;
  custom_params?: Record<string, any>;
  output_result: string | Record<string, any>;
  execution_time_ms: number;
  status: 'success' | 'failed' | 'timeout';
  error_message?: string;
  tokens_used?: number;
  executed_by: string;
  executed_at: string;
  rating?: number; // 1-5 stars
  feedback?: string;
}

export interface ExecuteActionParams {
  action_id: string;
  code: string;
  language?: string;
  custom_params?: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  execution_id: string;
  output: string | Record<string, any>;
  execution_time_ms: number;
  tokens_used?: number;
  metadata?: Record<string, any>;
}

// Action Library
export interface ActionLibraryFilter {
  action_type?: 'analysis' | 'transformation' | 'validation' | 'generation';
  language?: string;
  is_public?: boolean;
  created_by?: string;
  search_query?: string;
  tags?: string[];
  min_rating?: number;
  sort_by?: 'created_at' | 'usage_count' | 'average_rating' | 'action_name';
  sort_order?: 'asc' | 'desc';
  limit?: number;
}

export interface ActionLibraryItem {
  action: CustomCodeAction;
  recent_executions: number;
  total_executions: number;
  average_rating: number;
  is_favorite?: boolean;
}

// Prompt Template Helpers
export interface PromptPlaceholder {
  name: string;
  description: string;
  required: boolean;
  example: string;
}

export const BUILT_IN_PLACEHOLDERS: PromptPlaceholder[] = [
  {
    name: '{{code}}',
    description: 'The code to analyze/transform (REQUIRED)',
    required: true,
    example: 'function add(a, b) { return a + b; }'
  },
  {
    name: '{{language}}',
    description: 'Programming language of the code',
    required: false,
    example: 'javascript'
  },
  {
    name: '{{file_path}}',
    description: 'File path (if available)',
    required: false,
    example: 'src/utils/math.js'
  },
  {
    name: '{{line_count}}',
    description: 'Number of lines in the code',
    required: false,
    example: '42'
  }
];
```

---

## API Client Setup

Create `src/services/customActions.ts`:

```typescript
import * as vscode from 'vscode';
import { getServerUrl } from '../config/settings';
import type {
  CustomCodeAction,
  CreateActionParams,
  ExecuteActionParams,
  ExecutionResult,
  ActionExecution,
  ActionLibraryFilter
} from '../types/customActions';

const BACKEND_URL = getServerUrl(); // https://oropendola.ai

export class CustomActionsService {
  private static instance: CustomActionsService;

  private constructor() {}

  public static getInstance(): CustomActionsService {
    if (!CustomActionsService.instance) {
      CustomActionsService.instance = new CustomActionsService();
    }
    return CustomActionsService.instance;
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
        throw new Error(`Custom Actions API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message || data;
    } catch (error) {
      console.error(`Custom Actions API call failed (${endpoint}):`, error);
      throw error;
    }
  }

  private async getAuthToken(): Promise<string> {
    const config = vscode.workspace.getConfiguration('oropendolaAI');
    return config.get<string>('authToken') || '';
  }

  /**
   * Create a new custom code action
   */
  async createAction(params: CreateActionParams): Promise<CustomCodeAction> {
    // Validate prompt template
    if (!params.prompt_template.includes('{{code}}')) {
      throw new Error('Prompt template must include {{code}} placeholder');
    }

    return await this.apiCall<CustomCodeAction>(
      'ai_assistant.api.custom_create_action',
      {
        ...params,
        parameters: params.parameters ? JSON.stringify(params.parameters) : undefined,
        tags: params.tags ? JSON.stringify(params.tags) : undefined
      }
    );
  }

  /**
   * Execute a custom action
   */
  async executeAction(params: ExecuteActionParams): Promise<ExecutionResult> {
    return await this.apiCall<ExecutionResult>(
      'ai_assistant.api.custom_execute_action',
      {
        ...params,
        custom_params: params.custom_params ? JSON.stringify(params.custom_params) : undefined
      }
    );
  }

  /**
   * List custom actions with filters
   */
  async listActions(filter?: ActionLibraryFilter): Promise<CustomCodeAction[]> {
    const result = await this.apiCall<{ actions: CustomCodeAction[] }>(
      'ai_assistant.api.custom_list_actions',
      filter || {}
    );
    return result.actions;
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(
    action_id?: string,
    limit: number = 50
  ): Promise<ActionExecution[]> {
    const result = await this.apiCall<{ executions: ActionExecution[] }>(
      'ai_assistant.api.custom_get_execution_history',
      { action_id, limit }
    );
    return result.executions;
  }

  /**
   * Update custom action
   */
  async updateAction(
    action_id: string,
    updates: Partial<CreateActionParams>
  ): Promise<CustomCodeAction> {
    return await this.apiCall<CustomCodeAction>(
      'ai_assistant.api.custom_update_action',
      { action_id, ...updates }
    );
  }

  /**
   * Delete custom action
   */
  async deleteAction(action_id: string): Promise<void> {
    await this.apiCall('ai_assistant.api.custom_delete_action', { action_id });
  }

  /**
   * Rate an execution
   */
  async rateExecution(
    execution_id: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    await this.apiCall('ai_assistant.api.custom_rate_execution', {
      execution_id,
      rating,
      feedback
    });
  }

  /**
   * Clone a public action
   */
  async cloneAction(action_id: string, new_name?: string): Promise<CustomCodeAction> {
    const original = await this.apiCall<CustomCodeAction>(
      'ai_assistant.api.custom_get_action',
      { action_id }
    );

    return await this.createAction({
      action_name: new_name || `${original.action_name} (Copy)`,
      description: original.description,
      action_type: original.action_type,
      prompt_template: original.prompt_template,
      language: original.language,
      parameters: original.parameters,
      output_format: original.output_format,
      is_public: false // Clones are private by default
    });
  }
}

// Export singleton instance
export const customActionsService = CustomActionsService.getInstance();
```

---

## Custom Action Creator UI

### Action Creator Webview

```typescript
import * as vscode from 'vscode';
import { customActionsService } from '../services/customActions';
import type { CreateActionParams, ActionParameter } from '../types/customActions';

export class CustomActionCreator {
  private panel: vscode.WebviewPanel | undefined;

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'customActionCreator',
      'Create Custom Code Action',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.webview.html = this.getWebviewContent();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'create':
            await this.handleCreate(message.data);
            break;
          case 'preview':
            await this.handlePreview(message.data);
            break;
          case 'validate':
            await this.handleValidate(message.data);
            break;
        }
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  private async handleCreate(data: CreateActionParams): Promise<void> {
    try {
      const action = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Creating Custom Action...',
          cancellable: false
        },
        async () => {
          return await customActionsService.createAction(data);
        }
      );

      vscode.window.showInformationMessage(
        `Custom action "${action.action_name}" created successfully!`
      );

      this.panel?.dispose();
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to create action: ${error.message}`);
    }
  }

  private async handlePreview(data: CreateActionParams): Promise<void> {
    // Show preview of how the prompt will look with sample code
    const sampleCode = 'function example() { return 42; }';
    const previewPrompt = this.replacePromptPlaceholders(
      data.prompt_template,
      sampleCode,
      'javascript'
    );

    this.panel?.webview.postMessage({
      command: 'showPreview',
      preview: previewPrompt
    });
  }

  private replacePromptPlaceholders(
    template: string,
    code: string,
    language: string
  ): string {
    return template
      .replace(/\{\{code\}\}/g, code)
      .replace(/\{\{language\}\}/g, language)
      .replace(/\{\{line_count\}\}/g, code.split('\n').length.toString());
  }

  private async handleValidate(data: CreateActionParams): Promise<void> {
    const errors: string[] = [];

    // Validate action name
    if (!data.action_name || data.action_name.trim().length < 3) {
      errors.push('Action name must be at least 3 characters');
    }

    // Validate prompt template
    if (!data.prompt_template.includes('{{code}}')) {
      errors.push('Prompt template must include {{code}} placeholder');
    }

    // Validate parameters
    if (data.parameters) {
      for (const param of data.parameters) {
        if (!param.name || !param.type) {
          errors.push(`Invalid parameter: ${JSON.stringify(param)}`);
        }
      }
    }

    this.panel?.webview.postMessage({
      command: 'validationResult',
      errors
    });
  }

  private getWebviewContent(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Create Custom Code Action</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    input, select, textarea {
      width: 100%;
      padding: 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
    }
    textarea {
      min-height: 150px;
      font-family: 'Courier New', monospace;
    }
    button {
      padding: 8px 16px;
      margin-right: 10px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .placeholder-help {
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textBlockQuote-border);
      padding: 10px;
      margin: 10px 0;
      font-size: 12px;
    }
    .placeholder-help code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 4px;
      border-radius: 2px;
    }
    .preview {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      padding: 15px;
      margin-top: 10px;
      white-space: pre-wrap;
      font-family: 'Courier New', monospace;
    }
    .error {
      color: var(--vscode-errorForeground);
      margin: 5px 0;
    }
    .parameter-row {
      display: grid;
      grid-template-columns: 2fr 1fr 3fr 100px 80px;
      gap: 10px;
      margin-bottom: 10px;
      align-items: end;
    }
    .parameter-row button {
      padding: 6px 10px;
    }
  </style>
</head>
<body>
  <h1>Create Custom Code Action</h1>

  <form id="actionForm">
    <div class="form-group">
      <label for="actionName">Action Name *</label>
      <input type="text" id="actionName" placeholder="e.g., Find Performance Issues" required>
    </div>

    <div class="form-group">
      <label for="description">Description *</label>
      <textarea id="description" placeholder="Describe what this action does..." required></textarea>
    </div>

    <div class="form-group">
      <label for="actionType">Action Type *</label>
      <select id="actionType" required>
        <option value="analysis">Analysis - Analyze code quality/issues</option>
        <option value="transformation">Transformation - Transform/refactor code</option>
        <option value="validation">Validation - Validate code correctness</option>
        <option value="generation">Generation - Generate new code</option>
      </select>
    </div>

    <div class="form-group">
      <label for="language">Programming Language</label>
      <select id="language">
        <option value="any">Any Language</option>
        <option value="python">Python</option>
        <option value="javascript">JavaScript</option>
        <option value="typescript">TypeScript</option>
        <option value="java">Java</option>
        <option value="go">Go</option>
        <option value="rust">Rust</option>
        <option value="cpp">C++</option>
      </select>
    </div>

    <div class="form-group">
      <label for="promptTemplate">AI Prompt Template *</label>
      <div class="placeholder-help">
        Available placeholders:
        <ul>
          <li><code>{{code}}</code> - The code to analyze (REQUIRED)</li>
          <li><code>{{language}}</code> - Programming language</li>
          <li><code>{{file_path}}</code> - File path if available</li>
          <li><code>{{line_count}}</code> - Number of lines</li>
        </ul>
        You can also define custom parameters below.
      </div>
      <textarea id="promptTemplate" placeholder="Example:&#10;Analyze the following {{language}} code for performance issues:&#10;&#10;{{code}}&#10;&#10;Focus on: {{focus_area}}&#10;&#10;Provide specific recommendations." required></textarea>
    </div>

    <div class="form-group">
      <label>Custom Parameters (optional)</label>
      <div id="parametersContainer"></div>
      <button type="button" class="secondary" onclick="addParameter()">+ Add Parameter</button>
    </div>

    <div class="form-group">
      <label for="outputFormat">Output Format</label>
      <select id="outputFormat">
        <option value="json">JSON - Structured data</option>
        <option value="markdown">Markdown - Formatted text</option>
        <option value="text">Plain Text</option>
        <option value="code">Code</option>
      </select>
    </div>

    <div class="form-group">
      <label>
        <input type="checkbox" id="isPublic">
        Make this action public (share with others)
      </label>
    </div>

    <div id="errors"></div>

    <div style="margin-top: 30px;">
      <button type="submit">Create Action</button>
      <button type="button" class="secondary" onclick="previewPrompt()">Preview Prompt</button>
      <button type="button" class="secondary" onclick="validateForm()">Validate</button>
    </div>

    <div id="preview" class="preview" style="display: none;"></div>
  </form>

  <script>
    const vscode = acquireVsCodeApi();

    let parameterCount = 0;

    function addParameter() {
      const container = document.getElementById('parametersContainer');
      const row = document.createElement('div');
      row.className = 'parameter-row';
      row.innerHTML = \`
        <input type="text" placeholder="Parameter name" class="param-name">
        <select class="param-type">
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="select">Select</option>
        </select>
        <input type="text" placeholder="Description" class="param-description">
        <label><input type="checkbox" class="param-required"> Required</label>
        <button type="button" onclick="removeParameter(this)">Remove</button>
      \`;
      container.appendChild(row);
      parameterCount++;
    }

    function removeParameter(button) {
      button.parentElement.remove();
      parameterCount--;
    }

    function getFormData() {
      const parameters = [];
      document.querySelectorAll('.parameter-row').forEach(row => {
        parameters.push({
          name: row.querySelector('.param-name').value,
          type: row.querySelector('.param-type').value,
          description: row.querySelector('.param-description').value,
          required: row.querySelector('.param-required').checked
        });
      });

      return {
        action_name: document.getElementById('actionName').value,
        description: document.getElementById('description').value,
        action_type: document.getElementById('actionType').value,
        language: document.getElementById('language').value,
        prompt_template: document.getElementById('promptTemplate').value,
        parameters: parameters.length > 0 ? parameters : undefined,
        output_format: document.getElementById('outputFormat').value,
        is_public: document.getElementById('isPublic').checked
      };
    }

    document.getElementById('actionForm').addEventListener('submit', (e) => {
      e.preventDefault();
      vscode.postMessage({
        command: 'create',
        data: getFormData()
      });
    });

    function previewPrompt() {
      vscode.postMessage({
        command: 'preview',
        data: getFormData()
      });
    }

    function validateForm() {
      vscode.postMessage({
        command: 'validate',
        data: getFormData()
      });
    }

    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;

      switch (message.command) {
        case 'showPreview':
          const preview = document.getElementById('preview');
          preview.textContent = message.preview;
          preview.style.display = 'block';
          break;

        case 'validationResult':
          const errorsDiv = document.getElementById('errors');
          if (message.errors.length > 0) {
            errorsDiv.innerHTML = message.errors.map(err =>
              \`<div class="error">⚠️ \${err}</div>\`
            ).join('');
          } else {
            errorsDiv.innerHTML = '<div style="color: var(--vscode-testing-iconPassed);">✅ Validation passed!</div>';
          }
          break;
      }
    });
  </script>
</body>
</html>`;
  }
}
```

---

## Action Execution

### Execute Custom Action

```typescript
import * as vscode from 'vscode';
import { customActionsService } from '../services/customActions';
import type { CustomCodeAction, ExecutionResult } from '../types/customActions';

export class ActionExecutor {
  /**
   * Execute action on current selection or entire file
   */
  static async executeOnEditor(action: CustomCodeAction): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found');
      return;
    }

    const document = editor.document;
    const selection = editor.selection;

    // Get code (selection or entire file)
    const code = selection.isEmpty
      ? document.getText()
      : document.getText(selection);

    const language = document.languageId;

    // Get custom parameters if defined
    const customParams = action.parameters && action.parameters.length > 0
      ? await this.promptForParameters(action.parameters)
      : undefined;

    if (customParams === null) {
      return; // User cancelled
    }

    // Execute action
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Executing "${action.action_name}"...`,
        cancellable: false
      },
      async () => {
        return await customActionsService.executeAction({
          action_id: action.action_id,
          code,
          language,
          custom_params: customParams
        });
      }
    );

    // Show results
    await this.showResults(action, result);

    // Prompt for rating
    await this.promptForRating(result.execution_id);
  }

  private static async promptForParameters(
    parameters: any[]
  ): Promise<Record<string, any> | null> {
    const params: Record<string, any> = {};

    for (const param of parameters) {
      if (param.type === 'select' && param.options) {
        const value = await vscode.window.showQuickPick(param.options, {
          placeHolder: param.description
        });
        if (value === undefined && param.required) {
          return null; // User cancelled
        }
        params[param.name] = value;
      } else if (param.type === 'boolean') {
        const value = await vscode.window.showQuickPick(['Yes', 'No'], {
          placeHolder: param.description
        });
        if (value === undefined && param.required) {
          return null;
        }
        params[param.name] = value === 'Yes';
      } else {
        const value = await vscode.window.showInputBox({
          prompt: param.description,
          placeHolder: param.default_value?.toString(),
          validateInput: (input) => {
            if (param.required && !input) {
              return 'This parameter is required';
            }
            if (param.type === 'number' && isNaN(Number(input))) {
              return 'Must be a number';
            }
            return null;
          }
        });

        if (value === undefined && param.required) {
          return null;
        }

        params[param.name] = param.type === 'number' ? Number(value) : value;
      }
    }

    return params;
  }

  private static async showResults(
    action: CustomCodeAction,
    result: ExecutionResult
  ): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'actionResult',
      `Results: ${action.action_name}`,
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    const output = typeof result.output === 'string'
      ? result.output
      : JSON.stringify(result.output, null, 2);

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
    }
    .metadata {
      background: var(--vscode-editor-inactiveSelectionBackground);
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .output {
      background: var(--vscode-editor-background);
      padding: 15px;
      border-radius: 4px;
      white-space: pre-wrap;
      font-family: 'Courier New', monospace;
    }
    ${action.output_format === 'markdown' ? `
      .output {
        white-space: normal;
        font-family: var(--vscode-font-family);
      }
    ` : ''}
  </style>
</head>
<body>
  <h1>${action.action_name}</h1>
  <p>${action.description}</p>

  <div class="metadata">
    <strong>Execution Time:</strong> ${result.execution_time_ms}ms<br>
    ${result.tokens_used ? `<strong>Tokens Used:</strong> ${result.tokens_used}<br>` : ''}
    <strong>Format:</strong> ${action.output_format}
  </div>

  <h2>Output</h2>
  <div class="output">${this.formatOutput(output, action.output_format)}</div>
</body>
</html>`;
  }

  private static formatOutput(output: string, format: string): string {
    switch (format) {
      case 'markdown':
        // In production, use a markdown renderer
        return output.replace(/\n/g, '<br>');
      case 'code':
        return `<code>${output}</code>`;
      case 'json':
        try {
          const parsed = JSON.parse(output);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return output;
        }
      default:
        return output;
    }
  }

  private static async promptForRating(execution_id: string): Promise<void> {
    const rating = await vscode.window.showQuickPick(
      ['⭐⭐⭐⭐⭐ Excellent', '⭐⭐⭐⭐ Good', '⭐⭐⭐ Average', '⭐⭐ Poor', '⭐ Very Poor', 'Skip'],
      { placeHolder: 'How would you rate this result?' }
    );

    if (!rating || rating === 'Skip') {
      return;
    }

    const ratingValue = 6 - ['⭐⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐', '⭐⭐', '⭐'].indexOf(rating.split(' ')[0]);

    const feedback = await vscode.window.showInputBox({
      prompt: 'Optional feedback',
      placeHolder: 'Any comments about the results?'
    });

    await customActionsService.rateExecution(execution_id, ratingValue, feedback);
  }
}
```

---

## Action Library Browser

### Library Browser Component

```tsx
import React, { useState, useEffect } from 'react';
import { customActionsService } from '../services/customActions';
import type { CustomCodeAction, ActionLibraryFilter } from '../types/customActions';

export const ActionLibrary: React.FC = () => {
  const [actions, setActions] = useState<CustomCodeAction[]>([]);
  const [filter, setFilter] = useState<ActionLibraryFilter>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActions();
  }, [filter]);

  const loadActions = async () => {
    setLoading(true);
    try {
      const result = await customActionsService.listActions(filter);
      setActions(result);
    } catch (error) {
      console.error('Failed to load actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (action: CustomCodeAction) => {
    // Trigger execution (implementation depends on your VS Code integration)
    vscode.postMessage({
      command: 'executeAction',
      action_id: action.action_id
    });
  };

  const handleClone = async (action: CustomCodeAction) => {
    try {
      await customActionsService.cloneAction(action.action_id);
      vscode.postMessage({ command: 'showMessage', text: 'Action cloned successfully!' });
      loadActions();
    } catch (error) {
      console.error('Failed to clone action:', error);
    }
  };

  return (
    <div className="action-library">
      <div className="library-header">
        <h2>Custom Code Actions Library</h2>
        <button onClick={() => vscode.postMessage({ command: 'createNew' })}>
          + Create New Action
        </button>
      </div>

      {/* Filters */}
      <div className="filters">
        <select
          value={filter.action_type || ''}
          onChange={(e) => setFilter({ ...filter, action_type: e.target.value as any })}
        >
          <option value="">All Types</option>
          <option value="analysis">Analysis</option>
          <option value="transformation">Transformation</option>
          <option value="validation">Validation</option>
          <option value="generation">Generation</option>
        </select>

        <select
          value={filter.language || ''}
          onChange={(e) => setFilter({ ...filter, language: e.target.value })}
        >
          <option value="">All Languages</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="java">Java</option>
        </select>

        <select
          value={filter.sort_by || 'created_at'}
          onChange={(e) => setFilter({ ...filter, sort_by: e.target.value as any })}
        >
          <option value="created_at">Recently Created</option>
          <option value="usage_count">Most Used</option>
          <option value="average_rating">Highest Rated</option>
          <option value="action_name">Name (A-Z)</option>
        </select>

        <input
          type="text"
          placeholder="Search actions..."
          onChange={(e) => setFilter({ ...filter, search_query: e.target.value })}
        />
      </div>

      {/* Actions Grid */}
      {loading ? (
        <div className="loading">Loading actions...</div>
      ) : (
        <div className="actions-grid">
          {actions.map((action) => (
            <div key={action.action_id} className="action-card">
              <div className="action-header">
                <h3>{action.action_name}</h3>
                <span className={`badge ${action.action_type}`}>
                  {action.action_type}
                </span>
              </div>

              <p className="description">{action.description}</p>

              <div className="action-meta">
                <span>🔤 {action.language === 'any' ? 'Any Language' : action.language}</span>
                <span>📊 Used {action.usage_count} times</span>
                {action.average_rating && (
                  <span>⭐ {action.average_rating.toFixed(1)}</span>
                )}
              </div>

              <div className="action-footer">
                <button onClick={() => handleExecute(action)}>Execute</button>
                {action.is_public && (
                  <button className="secondary" onClick={() => handleClone(action)}>
                    Clone
                  </button>
                )}
                <button className="secondary" onClick={() => {/* View details */}}>
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## Execution History

### History Viewer

```typescript
import * as vscode from 'vscode';
import { customActionsService } from '../services/customActions';
import type { ActionExecution } from '../types/customActions';

export class ExecutionHistoryViewer {
  static async show(action_id?: string): Promise<void> {
    const history = await customActionsService.getExecutionHistory(action_id, 50);

    const items = history.map(exec => ({
      label: `$(${exec.status === 'success' ? 'pass' : 'error'}) ${exec.action_name}`,
      description: new Date(exec.executed_at).toLocaleString(),
      detail: `${exec.execution_time_ms}ms | ${exec.status}`,
      execution: exec
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an execution to view details'
    });

    if (selected) {
      this.showExecutionDetails((selected as any).execution);
    }
  }

  private static showExecutionDetails(execution: ActionExecution): void {
    const panel = vscode.window.createWebviewPanel(
      'executionHistory',
      'Execution Details',
      vscode.ViewColumn.Beside,
      {}
    );

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .status-success { color: #28a745; }
    .status-failed { color: #dc3545; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${execution.action_name}</h1>
  <p class="status-${execution.status}">Status: ${execution.status.toUpperCase()}</p>

  <h2>Metadata</h2>
  <p><strong>Executed At:</strong> ${new Date(execution.executed_at).toLocaleString()}</p>
  <p><strong>Execution Time:</strong> ${execution.execution_time_ms}ms</p>
  <p><strong>Language:</strong> ${execution.input_language}</p>
  ${execution.tokens_used ? `<p><strong>Tokens Used:</strong> ${execution.tokens_used}</p>` : ''}
  ${execution.rating ? `<p><strong>Rating:</strong> ${'⭐'.repeat(execution.rating)}</p>` : ''}

  <h2>Input Code</h2>
  <pre><code>${execution.input_code}</code></pre>

  ${execution.status === 'success' ? `
    <h2>Output</h2>
    <pre><code>${typeof execution.output_result === 'string' ? execution.output_result : JSON.stringify(execution.output_result, null, 2)}</code></pre>
  ` : `
    <h2>Error</h2>
    <p class="status-failed">${execution.error_message}</p>
  `}
</body>
</html>`;
  }
}
```

---

## VS Code Integration

### Register Commands

```typescript
// In extension.ts
export function activate(context: vscode.ExtensionContext) {
  const customActionCreator = new CustomActionCreator();

  // Create new custom action
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'oropendolaAI.createCustomAction',
      () => customActionCreator.show()
    )
  );

  // Browse action library
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'oropendolaAI.browseActionLibrary',
      async () => {
        // Show webview with ActionLibrary component
      }
    )
  );

  // Execute custom action
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'oropendolaAI.executeCustomAction',
      async (action: CustomCodeAction) => {
        await ActionExecutor.executeOnEditor(action);
      }
    )
  );

  // View execution history
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'oropendolaAI.viewExecutionHistory',
      async () => {
        await ExecutionHistoryViewer.show();
      }
    )
  );
}
```

### Context Menu Integration

In `package.json`:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "oropendolaAI.createCustomAction",
        "title": "Oropendola AI: Create Custom Code Action"
      },
      {
        "command": "oropendolaAI.executeCustomAction",
        "title": "Oropendola AI: Execute Custom Action"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "oropendolaAI.executeCustomAction",
          "when": "editorHasSelection",
          "group": "oropendolaAI@1"
        }
      ]
    }
  }
}
```

---

## Best Practices

### 1. Prompt Template Validation

```typescript
function validatePromptTemplate(template: string): string[] {
  const errors: string[] = [];

  // Must include {{code}}
  if (!template.includes('{{code}}')) {
    errors.push('Template must include {{code}} placeholder');
  }

  // Check for invalid placeholders
  const placeholders = template.match(/\{\{([^}]+)\}\}/g) || [];
  const validPlaceholders = ['{{code}}', '{{language}}', '{{file_path}}', '{{line_count}}'];

  for (const placeholder of placeholders) {
    if (!validPlaceholders.includes(placeholder) && !placeholder.match(/\{\{\w+\}\}/)) {
      errors.push(`Invalid placeholder: ${placeholder}`);
    }
  }

  return errors;
}
```

### 2. Execution Timeout

```typescript
async function executeWithTimeout(
  action_id: string,
  code: string,
  timeout: number = 30000
): Promise<ExecutionResult> {
  return Promise.race([
    customActionsService.executeAction({ action_id, code }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Execution timeout')), timeout)
    )
  ]);
}
```

### 3. Rate Limiting

```typescript
class RateLimiter {
  private executionCount = 0;
  private resetTime = Date.now() + 60000; // 1 minute window

  canExecute(): boolean {
    if (Date.now() > this.resetTime) {
      this.executionCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    return this.executionCount < 10; // Max 10 executions per minute
  }

  recordExecution(): void {
    this.executionCount++;
  }
}
```

---

## Summary

This guide covers all 4 Week 11 Phase 4 Custom Actions APIs:

| API | Purpose | UI Component |
|-----|---------|--------------|
| create_action | Create custom action | Action Creator Webview |
| execute_action | Execute action | Execution UI + Results |
| list_actions | Browse library | Action Library Browser |
| get_execution_history | View history | History Viewer |

**Key Features Implemented:**
- Visual action creator with prompt template editor
- Parameter configuration UI
- Action library browser with filters
- Execution UI with custom parameter prompts
- Results viewer with multiple output formats
- Execution history with ratings
- Action cloning for public actions

**Estimated Integration Time**: 10-14 hours
- TypeScript types & services: 2-3 hours
- Action Creator UI: 3-4 hours
- Execution & Results UI: 2-3 hours
- Library Browser: 2-3 hours
- Testing & polish: 1-2 hours
