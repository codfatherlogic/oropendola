import * as vscode from 'vscode';

export interface PromptVariable {
    name: string;
    description: string;
    defaultValue: string;
}

export interface ModeTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    systemPrompt: string;
    variables: PromptVariable[];
    temperature: number;
    maxTokens: number;
    enabled: boolean;
    isBuiltIn: boolean;
}

export class PromptManager {
    private static instance: PromptManager;
    private modes: Map<string, ModeTemplate>;
    private currentMode: string;

    private constructor() {
        this.modes = new Map();
        this.currentMode = 'code';
        this.loadBuiltInModes();
        this.loadCustomModes();
    }

    public static getInstance(): PromptManager {
        if (!PromptManager.instance) {
            PromptManager.instance = new PromptManager();
        }
        return PromptManager.instance;
    }

    private loadBuiltInModes(): void {
        const builtInModes: ModeTemplate[] = [
            {
                id: 'code',
                name: 'Code Mode',
                description: 'General purpose coding assistance',
                icon: '💻',
                systemPrompt: `You are an expert software engineer helping with code development.
Focus on writing clean, efficient, and maintainable code.
Provide detailed explanations and follow best practices.

Available context:
- Current file: {current_file}
- Selected code: {selected_code}
- Workspace: {workspace_path}`,
                variables: [
                    { name: 'current_file', description: 'Currently open file', defaultValue: '' },
                    { name: 'selected_code', description: 'Selected code snippet', defaultValue: '' },
                    { name: 'workspace_path', description: 'Workspace root path', defaultValue: '' }
                ],
                temperature: 0.7,
                maxTokens: 4096,
                enabled: true,
                isBuiltIn: true
            },
            {
                id: 'debug',
                name: 'Debug Mode',
                description: 'Debugging and troubleshooting assistance',
                icon: '🐛',
                systemPrompt: `You are a debugging expert helping to identify and fix code issues.
Analyze errors, suggest fixes, and explain the root cause.
Focus on systematic problem-solving approaches.

Current context:
- Error message: {error_message}
- Stack trace: {stack_trace}
- Current file: {current_file}`,
                variables: [
                    { name: 'error_message', description: 'Error or exception message', defaultValue: '' },
                    { name: 'stack_trace', description: 'Stack trace or error details', defaultValue: '' },
                    { name: 'current_file', description: 'File being debugged', defaultValue: '' }
                ],
                temperature: 0.5,
                maxTokens: 4096,
                enabled: true,
                isBuiltIn: true
            },
            {
                id: 'documentation',
                name: 'Documentation Mode',
                description: 'Generate and improve documentation',
                icon: '📚',
                systemPrompt: `You are a technical documentation expert.
Create clear, comprehensive documentation including:
- Function/class descriptions
- Parameter explanations
- Usage examples
- Best practices

Context:
- Code to document: {code_to_document}
- Documentation style: {doc_style}`,
                variables: [
                    { name: 'code_to_document', description: 'Code that needs documentation', defaultValue: '' },
                    { name: 'doc_style', description: 'Documentation style (JSDoc, Docstring, etc.)', defaultValue: 'JSDoc' }
                ],
                temperature: 0.6,
                maxTokens: 4096,
                enabled: true,
                isBuiltIn: true
            },
            {
                id: 'review',
                name: 'Code Review Mode',
                description: 'Review code for quality and issues',
                icon: '🔍',
                systemPrompt: `You are an experienced code reviewer.
Review code for:
- Code quality and maintainability
- Potential bugs and edge cases
- Performance issues
- Security vulnerabilities
- Best practices adherence

Provide constructive feedback with specific suggestions.

Code to review: {code_to_review}`,
                variables: [
                    { name: 'code_to_review', description: 'Code to be reviewed', defaultValue: '' }
                ],
                temperature: 0.6,
                maxTokens: 4096,
                enabled: true,
                isBuiltIn: true
            },
            {
                id: 'test',
                name: 'Test Mode',
                description: 'Generate and improve tests',
                icon: '🧪',
                systemPrompt: `You are a testing expert specializing in unit and integration tests.
Generate comprehensive tests that cover:
- Happy path scenarios
- Edge cases
- Error conditions
- Boundary conditions

Use the appropriate testing framework for the language.

Code to test: {code_to_test}
Test framework: {test_framework}`,
                variables: [
                    { name: 'code_to_test', description: 'Code that needs tests', defaultValue: '' },
                    { name: 'test_framework', description: 'Testing framework to use', defaultValue: 'Jest' }
                ],
                temperature: 0.7,
                maxTokens: 4096,
                enabled: true,
                isBuiltIn: true
            },
            {
                id: 'refactor',
                name: 'Refactor Mode',
                description: 'Refactor and improve existing code',
                icon: '♻️',
                systemPrompt: `You are a refactoring expert helping improve code quality.
Focus on:
- Improving code structure and organization
- Reducing complexity
- Eliminating code smells
- Maintaining functionality while improving design

Code to refactor: {code_to_refactor}
Refactoring goals: {refactoring_goals}`,
                variables: [
                    { name: 'code_to_refactor', description: 'Code to be refactored', defaultValue: '' },
                    { name: 'refactoring_goals', description: 'Specific refactoring objectives', defaultValue: '' }
                ],
                temperature: 0.6,
                maxTokens: 4096,
                enabled: true,
                isBuiltIn: true
            },
            {
                id: 'explain',
                name: 'Explain Mode',
                description: 'Explain code and concepts',
                icon: '💡',
                systemPrompt: `You are an expert at explaining complex code and technical concepts.
Break down code into understandable explanations:
- What the code does
- How it works
- Why certain approaches are used
- Potential improvements

Use clear language and provide examples when helpful.

Code to explain: {code_to_explain}`,
                variables: [
                    { name: 'code_to_explain', description: 'Code to be explained', defaultValue: '' }
                ],
                temperature: 0.7,
                maxTokens: 4096,
                enabled: true,
                isBuiltIn: true
            },
            {
                id: 'architecture',
                name: 'Architecture Mode',
                description: 'Design system architecture',
                icon: '🏗️',
                systemPrompt: `You are a software architect with expertise in system design.
Help design and improve system architecture:
- Component structure
- Design patterns
- Scalability considerations
- Technology choices
- Trade-offs analysis

Project context: {project_context}
Requirements: {requirements}`,
                variables: [
                    { name: 'project_context', description: 'Project background and constraints', defaultValue: '' },
                    { name: 'requirements', description: 'Architectural requirements', defaultValue: '' }
                ],
                temperature: 0.7,
                maxTokens: 4096,
                enabled: true,
                isBuiltIn: true
            }
        ];

        builtInModes.forEach(mode => this.modes.set(mode.id, mode));
    }

    private loadCustomModes(): void {
        const config = vscode.workspace.getConfiguration('oropendola');
        const customModes = config.get<ModeTemplate[]>('prompts.customModes', []);

        customModes.forEach(mode => {
            if (!mode.isBuiltIn) {
                this.modes.set(mode.id, mode);
            }
        });
    }

    public getAllModes(): ModeTemplate[] {
        return Array.from(this.modes.values());
    }

    public getEnabledModes(): ModeTemplate[] {
        return Array.from(this.modes.values()).filter(mode => mode.enabled);
    }

    public getMode(id: string): ModeTemplate | undefined {
        return this.modes.get(id);
    }

    public getCurrentMode(): ModeTemplate {
        return this.modes.get(this.currentMode) || this.modes.get('code')!;
    }

    public setCurrentMode(id: string): void {
        if (this.modes.has(id)) {
            this.currentMode = id;
        }
    }

    public addCustomMode(mode: ModeTemplate): void {
        mode.isBuiltIn = false;
        this.modes.set(mode.id, mode);
        this.saveCustomModes();
    }

    public updateMode(id: string, updates: Partial<ModeTemplate>): void {
        const mode = this.modes.get(id);
        if (mode && !mode.isBuiltIn) {
            const updated = { ...mode, ...updates };
            this.modes.set(id, updated);
            this.saveCustomModes();
        }
    }

    public deleteMode(id: string): void {
        const mode = this.modes.get(id);
        if (mode && !mode.isBuiltIn) {
            this.modes.delete(id);
            this.saveCustomModes();
        }
    }

    public duplicateMode(id: string, newName: string): void {
        const mode = this.modes.get(id);
        if (mode) {
            const newId = `custom_${Date.now()}`;
            const duplicated: ModeTemplate = {
                ...mode,
                id: newId,
                name: newName,
                isBuiltIn: false
            };
            this.modes.set(newId, duplicated);
            this.saveCustomModes();
        }
    }

    private saveCustomModes(): void {
        const customModes = Array.from(this.modes.values()).filter(mode => !mode.isBuiltIn);
        const config = vscode.workspace.getConfiguration('oropendola');
        config.update('prompts.customModes', customModes, vscode.ConfigurationTarget.Global);
    }

    public renderPrompt(modeId: string, variables: Record<string, string>): string {
        const mode = this.modes.get(modeId);
        if (!mode) {
            return '';
        }

        let prompt = mode.systemPrompt;

        // Replace variables
        Object.entries(variables).forEach(([key, value]) => {
            const pattern = new RegExp(`\\{${key}\\}`, 'g');
            prompt = prompt.replace(pattern, value);
        });

        // Replace remaining variables with defaults
        mode.variables.forEach(variable => {
            const pattern = new RegExp(`\\{${variable.name}\\}`, 'g');
            if (!variables[variable.name]) {
                prompt = prompt.replace(pattern, variable.defaultValue);
            }
        });

        return prompt;
    }

    public exportMode(id: string): string {
        const mode = this.modes.get(id);
        if (!mode) {
            throw new Error('Mode not found');
        }

        return JSON.stringify(mode, null, 2);
    }

    public exportAllModes(): string {
        const allModes = Array.from(this.modes.values());
        return JSON.stringify(allModes, null, 2);
    }

    public importMode(jsonString: string): void {
        try {
            const mode: ModeTemplate = JSON.parse(jsonString);

            // Validate mode structure
            if (!mode.id || !mode.name || !mode.systemPrompt) {
                throw new Error('Invalid mode structure');
            }

            // Generate new ID if importing built-in mode
            if (mode.isBuiltIn) {
                mode.id = `custom_${Date.now()}`;
                mode.isBuiltIn = false;
            }

            this.modes.set(mode.id, mode);
            this.saveCustomModes();
        } catch (error) {
            throw new Error(`Failed to import mode: ${error}`);
        }
    }

    public importModes(jsonString: string): void {
        try {
            const modes: ModeTemplate[] = JSON.parse(jsonString);

            if (!Array.isArray(modes)) {
                throw new Error('Invalid modes array');
            }

            modes.forEach(mode => {
                if (mode.isBuiltIn) {
                    mode.id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    mode.isBuiltIn = false;
                }
                this.modes.set(mode.id, mode);
            });

            this.saveCustomModes();
        } catch (error) {
            throw new Error(`Failed to import modes: ${error}`);
        }
    }

    public resetToDefaults(): void {
        // Remove all custom modes
        const customModeIds = Array.from(this.modes.values())
            .filter(mode => !mode.isBuiltIn)
            .map(mode => mode.id);

        customModeIds.forEach(id => this.modes.delete(id));
        this.saveCustomModes();

        // Reset current mode to code
        this.currentMode = 'code';
    }
}
