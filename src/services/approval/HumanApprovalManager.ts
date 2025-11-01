export enum ApprovalType {
    FILE_EDIT = 'file_edit',
    FILE_CREATE = 'file_create',
    FILE_DELETE = 'file_delete',
    COMMAND_EXECUTION = 'command_execution',
    BATCH_OPERATION = 'batch_operation',
    API_CALL = 'api_call'
}

export enum ApprovalStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    EXPIRED = 'expired'
}

export interface ApprovalRequest {
    id: string;
    type: ApprovalType;
    timestamp: number;
    status: ApprovalStatus;
    title: string;
    description: string;
    details: any;
    metadata: {
        filePath?: string;
        command?: string;
        riskLevel: 'low' | 'medium' | 'high';
        autoApprove?: boolean;
        expiresAt?: number;
    };
}

export interface ApprovalResponse {
    id: string;
    approved: boolean;
    timestamp: number;
    feedback?: string;
}

export interface ApprovalRule {
    id: string;
    name: string;
    type: ApprovalType;
    condition: (request: ApprovalRequest) => boolean;
    autoApprove: boolean;
    enabled: boolean;
}

export class HumanApprovalManager {
    private static instance: HumanApprovalManager;
    private pendingRequests: Map<string, ApprovalRequest>;
    private approvalHistory: ApprovalResponse[];
    private approvalRules: Map<string, ApprovalRule>;
    private onApprovalNeeded?: (request: ApprovalRequest) => void;
    private onApprovalResponded?: (response: ApprovalResponse) => void;

    private constructor() {
        this.pendingRequests = new Map();
        this.approvalHistory = [];
        this.approvalRules = new Map();
        this.loadApprovalRules();
    }

    public static getInstance(): HumanApprovalManager {
        if (!HumanApprovalManager.instance) {
            HumanApprovalManager.instance = new HumanApprovalManager();
        }
        return HumanApprovalManager.instance;
    }

    public setApprovalNeededCallback(callback: (request: ApprovalRequest) => void): void {
        this.onApprovalNeeded = callback;
    }

    public setApprovalRespondedCallback(callback: (response: ApprovalResponse) => void): void {
        this.onApprovalResponded = callback;
    }

    private loadApprovalRules(): void {
        // Default rules
        const defaultRules: ApprovalRule[] = [
            {
                id: 'auto_approve_read_only',
                name: 'Auto-approve read-only operations',
                type: ApprovalType.FILE_EDIT,
                condition: (req) => req.metadata.riskLevel === 'low',
                autoApprove: true,
                enabled: false
            },
            {
                id: 'auto_approve_small_edits',
                name: 'Auto-approve small file edits',
                type: ApprovalType.FILE_EDIT,
                condition: (req) => {
                    const details = req.details;
                    return details.linesChanged && details.linesChanged < 10;
                },
                autoApprove: true,
                enabled: false
            },
            {
                id: 'require_approval_deletions',
                name: 'Always require approval for deletions',
                type: ApprovalType.FILE_DELETE,
                condition: () => true,
                autoApprove: false,
                enabled: true
            },
            {
                id: 'require_approval_commands',
                name: 'Always require approval for command execution',
                type: ApprovalType.COMMAND_EXECUTION,
                condition: () => true,
                autoApprove: false,
                enabled: true
            }
        ];

        defaultRules.forEach(rule => this.approvalRules.set(rule.id, rule));
    }

    public async requestApproval(request: Omit<ApprovalRequest, 'id' | 'timestamp' | 'status'>): Promise<boolean> {
        const id = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullRequest: ApprovalRequest = {
            id,
            timestamp: Date.now(),
            status: ApprovalStatus.PENDING,
            ...request
        };

        // Check if any auto-approval rules match
        const matchingRule = this.findMatchingRule(fullRequest);
        if (matchingRule && matchingRule.autoApprove && matchingRule.enabled) {
            return this.autoApprove(fullRequest);
        }

        // Add to pending requests
        this.pendingRequests.set(id, fullRequest);

        // Notify UI
        if (this.onApprovalNeeded) {
            this.onApprovalNeeded(fullRequest);
        }

        // Wait for approval with timeout
        const timeout = fullRequest.metadata.expiresAt || 300000; // 5 minutes default
        return this.waitForApproval(id, timeout);
    }

    private findMatchingRule(request: ApprovalRequest): ApprovalRule | undefined {
        return Array.from(this.approvalRules.values()).find(
            rule => rule.enabled && rule.type === request.type && rule.condition(request)
        );
    }

    private async autoApprove(request: ApprovalRequest): Promise<boolean> {
        request.status = ApprovalStatus.APPROVED;
        const response: ApprovalResponse = {
            id: request.id,
            approved: true,
            timestamp: Date.now(),
            feedback: 'Auto-approved by rule'
        };
        this.approvalHistory.push(response);
        return true;
    }

    private waitForApproval(id: string, timeout: number): Promise<boolean> {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const request = this.pendingRequests.get(id);
                if (!request) {
                    clearInterval(checkInterval);
                    resolve(false);
                    return;
                }

                if (request.status === ApprovalStatus.APPROVED) {
                    clearInterval(checkInterval);
                    this.pendingRequests.delete(id);
                    resolve(true);
                } else if (request.status === ApprovalStatus.REJECTED) {
                    clearInterval(checkInterval);
                    this.pendingRequests.delete(id);
                    resolve(false);
                }
            }, 100);

            // Timeout
            setTimeout(() => {
                const request = this.pendingRequests.get(id);
                if (request && request.status === ApprovalStatus.PENDING) {
                    request.status = ApprovalStatus.EXPIRED;
                    clearInterval(checkInterval);
                    this.pendingRequests.delete(id);
                    resolve(false);
                }
            }, timeout);
        });
    }

    public approve(id: string, feedback?: string): void {
        const request = this.pendingRequests.get(id);
        if (request) {
            request.status = ApprovalStatus.APPROVED;
            const response: ApprovalResponse = {
                id,
                approved: true,
                timestamp: Date.now(),
                feedback
            };
            this.approvalHistory.push(response);
            if (this.onApprovalResponded) {
                this.onApprovalResponded(response);
            }
        }
    }

    public reject(id: string, feedback?: string): void {
        const request = this.pendingRequests.get(id);
        if (request) {
            request.status = ApprovalStatus.REJECTED;
            const response: ApprovalResponse = {
                id,
                approved: false,
                timestamp: Date.now(),
                feedback
            };
            this.approvalHistory.push(response);
            if (this.onApprovalResponded) {
                this.onApprovalResponded(response);
            }
        }
    }

    public getPendingRequests(): ApprovalRequest[] {
        return Array.from(this.pendingRequests.values());
    }

    public getApprovalHistory(limit?: number): ApprovalResponse[] {
        const history = [...this.approvalHistory].reverse();
        return limit ? history.slice(0, limit) : history;
    }

    public clearPendingRequests(): void {
        this.pendingRequests.clear();
    }

    public getApprovalRules(): ApprovalRule[] {
        return Array.from(this.approvalRules.values());
    }

    public updateApprovalRule(id: string, updates: Partial<ApprovalRule>): void {
        const rule = this.approvalRules.get(id);
        if (rule) {
            this.approvalRules.set(id, { ...rule, ...updates });
        }
    }

    public addApprovalRule(rule: ApprovalRule): void {
        this.approvalRules.set(rule.id, rule);
    }

    public deleteApprovalRule(id: string): void {
        this.approvalRules.delete(id);
    }

    public getStatistics() {
        const total = this.approvalHistory.length;
        const approved = this.approvalHistory.filter(r => r.approved).length;
        const rejected = this.approvalHistory.filter(r => !r.approved).length;
        const pending = this.pendingRequests.size;

        return {
            total,
            approved,
            rejected,
            pending,
            approvalRate: total > 0 ? (approved / total) * 100 : 0
        };
    }
}
