export enum TaskStepType {
    FILE_OPERATION = 'file_operation',
    COMMAND_EXECUTION = 'command_execution',
    API_CALL = 'api_call',
    USER_INPUT = 'user_input',
    VALIDATION = 'validation',
    DECISION = 'decision'
}

export enum TaskStepStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
    SKIPPED = 'skipped',
    BLOCKED = 'blocked'
}

export interface TaskStep {
    id: string;
    type: TaskStepType;
    title: string;
    description: string;
    status: TaskStepStatus;
    dependencies: string[]; // IDs of steps that must complete first
    estimatedDuration?: number; // In milliseconds
    actualDuration?: number;
    startedAt?: number;
    completedAt?: number;
    result?: any;
    error?: string;
    metadata?: Record<string, any>;
}

export interface TaskPlan {
    id: string;
    name: string;
    description: string;
    goal: string;
    steps: TaskStep[];
    status: TaskStepStatus;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    currentStepIndex: number;
    totalSteps: number;
    completedSteps: number;
    progress: number; // 0-100
}

export interface PlanningContext {
    userRequest: string;
    currentFiles?: string[];
    workspaceInfo?: any;
    constraints?: string[];
    preferences?: Record<string, any>;
}

export class TaskPlanner {
    private static instance: TaskPlanner;
    private activePlan: TaskPlan | null;
    private planHistory: TaskPlan[];
    private onPlanUpdate?: (plan: TaskPlan) => void;
    private onStepComplete?: (step: TaskStep) => void;

    private constructor() {
        this.activePlan = null;
        this.planHistory = [];
    }

    public static getInstance(): TaskPlanner {
        if (!TaskPlanner.instance) {
            TaskPlanner.instance = new TaskPlanner();
        }
        return TaskPlanner.instance;
    }

    public setPlanUpdateCallback(callback: (plan: TaskPlan) => void): void {
        this.onPlanUpdate = callback;
    }

    public setStepCompleteCallback(callback: (step: TaskStep) => void): void {
        this.onStepComplete = callback;
    }

    public createPlan(name: string, description: string, goal: string): TaskPlan {
        const plan: TaskPlan = {
            id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            goal,
            steps: [],
            status: TaskStepStatus.PENDING,
            createdAt: Date.now(),
            currentStepIndex: 0,
            totalSteps: 0,
            completedSteps: 0,
            progress: 0
        };

        this.activePlan = plan;
        return plan;
    }

    public addStep(step: Omit<TaskStep, 'id' | 'status'>): void {
        if (!this.activePlan) {
            throw new Error('No active plan. Create a plan first.');
        }

        const taskStep: TaskStep = {
            id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: TaskStepStatus.PENDING,
            ...step
        };

        this.activePlan.steps.push(taskStep);
        this.activePlan.totalSteps++;
        this.updateProgress();
    }

    public addSteps(steps: Omit<TaskStep, 'id' | 'status'>[]): void {
        steps.forEach(step => this.addStep(step));
    }

    public async executePlan(): Promise<boolean> {
        if (!this.activePlan) {
            throw new Error('No active plan to execute.');
        }

        this.activePlan.status = TaskStepStatus.IN_PROGRESS;
        this.activePlan.startedAt = Date.now();
        this.notifyPlanUpdate();

        let allSuccessful = true;

        // Execute steps in order, respecting dependencies
        while (this.activePlan.currentStepIndex < this.activePlan.steps.length) {
            const step = this.activePlan.steps[this.activePlan.currentStepIndex];

            // Check if dependencies are met
            if (!this.areDependenciesMet(step)) {
                step.status = TaskStepStatus.BLOCKED;
                allSuccessful = false;
                break;
            }

            try {
                await this.executeStep(step);
                step.status = TaskStepStatus.COMPLETED;
                this.activePlan.completedSteps++;

                if (this.onStepComplete) {
                    this.onStepComplete(step);
                }
            } catch (error) {
                step.status = TaskStepStatus.FAILED;
                step.error = error instanceof Error ? error.message : String(error);
                allSuccessful = false;
                break;
            }

            this.activePlan.currentStepIndex++;
            this.updateProgress();
        }

        this.activePlan.status = allSuccessful ? TaskStepStatus.COMPLETED : TaskStepStatus.FAILED;
        this.activePlan.completedAt = Date.now();
        this.planHistory.push(this.activePlan);
        this.activePlan = null;

        return allSuccessful;
    }

    private areDependenciesMet(step: TaskStep): boolean {
        if (!this.activePlan) return false;

        return step.dependencies.every(depId => {
            const depStep = this.activePlan!.steps.find(s => s.id === depId);
            return depStep && depStep.status === TaskStepStatus.COMPLETED;
        });
    }

    private async executeStep(step: TaskStep): Promise<void> {
        step.status = TaskStepStatus.IN_PROGRESS;
        step.startedAt = Date.now();
        this.notifyPlanUpdate();

        // Simulate step execution (this would be replaced with actual execution logic)
        await new Promise(resolve => setTimeout(resolve, 100));

        step.completedAt = Date.now();
        step.actualDuration = step.completedAt - step.startedAt;
    }

    public async executeNextStep(): Promise<boolean> {
        if (!this.activePlan) {
            throw new Error('No active plan.');
        }

        if (this.activePlan.currentStepIndex >= this.activePlan.steps.length) {
            return false; // No more steps
        }

        const step = this.activePlan.steps[this.activePlan.currentStepIndex];

        if (!this.areDependenciesMet(step)) {
            step.status = TaskStepStatus.BLOCKED;
            return false;
        }

        try {
            await this.executeStep(step);
            step.status = TaskStepStatus.COMPLETED;
            this.activePlan.completedSteps++;

            if (this.onStepComplete) {
                this.onStepComplete(step);
            }

            this.activePlan.currentStepIndex++;
            this.updateProgress();
            return true;
        } catch (error) {
            step.status = TaskStepStatus.FAILED;
            step.error = error instanceof Error ? error.message : String(error);
            return false;
        }
    }

    public skipStep(stepId: string): void {
        if (!this.activePlan) return;

        const step = this.activePlan.steps.find(s => s.id === stepId);
        if (step && step.status === TaskStepStatus.PENDING) {
            step.status = TaskStepStatus.SKIPPED;
            this.updateProgress();
        }
    }

    public retryStep(stepId: string): void {
        if (!this.activePlan) return;

        const step = this.activePlan.steps.find(s => s.id === stepId);
        if (step && step.status === TaskStepStatus.FAILED) {
            step.status = TaskStepStatus.PENDING;
            step.error = undefined;
            this.updateProgress();
        }
    }

    public updateStepStatus(stepId: string, status: TaskStepStatus): void {
        if (!this.activePlan) return;

        const step = this.activePlan.steps.find(s => s.id === stepId);
        if (step) {
            step.status = status;
            this.updateProgress();
        }
    }

    private updateProgress(): void {
        if (!this.activePlan) return;

        const total = this.activePlan.totalSteps;
        const completed = this.activePlan.completedSteps;
        this.activePlan.progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        this.notifyPlanUpdate();
    }

    private notifyPlanUpdate(): void {
        if (this.activePlan && this.onPlanUpdate) {
            this.onPlanUpdate(this.activePlan);
        }
    }

    public getActivePlan(): TaskPlan | null {
        return this.activePlan;
    }

    public getPlanHistory(limit?: number): TaskPlan[] {
        const history = [...this.planHistory].reverse();
        return limit ? history.slice(0, limit) : history;
    }

    public cancelActivePlan(): void {
        if (this.activePlan) {
            this.activePlan.status = TaskStepStatus.FAILED;
            this.planHistory.push(this.activePlan);
            this.activePlan = null;
        }
    }

    public clearHistory(): void {
        this.planHistory = [];
    }

    public getEstimatedDuration(): number {
        if (!this.activePlan) return 0;

        return this.activePlan.steps.reduce((total, step) => {
            return total + (step.estimatedDuration || 0);
        }, 0);
    }

    public getRemainingDuration(): number {
        if (!this.activePlan) return 0;

        const remainingSteps = this.activePlan.steps.slice(this.activePlan.currentStepIndex);
        return remainingSteps.reduce((total, step) => {
            return total + (step.estimatedDuration || 0);
        }, 0);
    }

    public getStatistics() {
        const total = this.planHistory.length;
        const completed = this.planHistory.filter(p => p.status === TaskStepStatus.COMPLETED).length;
        const failed = this.planHistory.filter(p => p.status === TaskStepStatus.FAILED).length;

        const totalSteps = this.planHistory.reduce((sum, p) => sum + p.totalSteps, 0);
        const completedSteps = this.planHistory.reduce((sum, p) => sum + p.completedSteps, 0);

        const avgDuration = this.planHistory.length > 0
            ? this.planHistory.reduce((sum, p) => {
                return sum + ((p.completedAt || Date.now()) - p.createdAt);
            }, 0) / this.planHistory.length
            : 0;

        return {
            totalPlans: total,
            completedPlans: completed,
            failedPlans: failed,
            totalSteps,
            completedSteps,
            successRate: total > 0 ? (completed / total) * 100 : 0,
            avgDuration: Math.round(avgDuration)
        };
    }

    // AI-powered plan generation (would integrate with AI service)
    public async generatePlan(context: PlanningContext): Promise<TaskPlan> {
        const plan = this.createPlan(
            'AI Generated Plan',
            `Plan for: ${context.userRequest}`,
            context.userRequest
        );

        // This would call an AI service to generate steps
        // For now, we'll create a simple example
        this.addSteps([
            {
                type: TaskStepType.FILE_OPERATION,
                title: 'Analyze requirements',
                description: 'Parse and understand user requirements',
                dependencies: [],
                estimatedDuration: 1000
            },
            {
                type: TaskStepType.FILE_OPERATION,
                title: 'Plan implementation',
                description: 'Break down into implementation steps',
                dependencies: [],
                estimatedDuration: 2000
            },
            {
                type: TaskStepType.FILE_OPERATION,
                title: 'Execute changes',
                description: 'Make necessary file changes',
                dependencies: [],
                estimatedDuration: 5000
            },
            {
                type: TaskStepType.VALIDATION,
                title: 'Validate changes',
                description: 'Ensure changes meet requirements',
                dependencies: [],
                estimatedDuration: 2000
            }
        ]);

        return plan;
    }
}
