import React, { useState, useEffect } from 'react';
import './HumanRelay.css';

interface ApprovalRequest {
    id: string;
    type: string;
    timestamp: number;
    status: string;
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

interface ApprovalResponse {
    id: string;
    approved: boolean;
    timestamp: number;
    feedback?: string;
}

interface BatchOperation {
    id: string;
    name: string;
    description: string;
    operations: any[];
    status: string;
    createdAt: number;
    progress: {
        total: number;
        completed: number;
        failed: number;
    };
}

interface TaskPlan {
    id: string;
    name: string;
    description: string;
    goal: string;
    steps: any[];
    status: string;
    createdAt: number;
    currentStepIndex: number;
    totalSteps: number;
    completedSteps: number;
    progress: number;
}

interface HumanRelayProps {
    vscode: any;
}

type ViewMode = 'approvals' | 'batch' | 'planning';

export const HumanRelay: React.FC<HumanRelayProps> = ({ vscode }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('approvals');
    const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
    const [approvalHistory, setApprovalHistory] = useState<ApprovalResponse[]>([]);
    const [activeBatch, setActiveBatch] = useState<BatchOperation | null>(null);
    const [batchHistory, setBatchHistory] = useState<BatchOperation[]>([]);
    const [activePlan, setActivePlan] = useState<TaskPlan | null>(null);
    const [planHistory, setPlanHistory] = useState<TaskPlan[]>([]);
    const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        // Load initial data
        vscode.postMessage({ type: 'getHumanRelayData' });

        // Listen for updates
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'humanRelayData':
                    setPendingApprovals(message.data.pendingApprovals || []);
                    setApprovalHistory(message.data.approvalHistory || []);
                    setActiveBatch(message.data.activeBatch);
                    setBatchHistory(message.data.batchHistory || []);
                    setActivePlan(message.data.activePlan);
                    setPlanHistory(message.data.planHistory || []);
                    break;
                case 'approvalUpdate':
                    setPendingApprovals(message.data.pendingApprovals || []);
                    break;
                case 'batchUpdate':
                    setActiveBatch(message.data.activeBatch);
                    break;
                case 'planUpdate':
                    setActivePlan(message.data.activePlan);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [vscode]);

    const handleApprove = (id: string) => {
        vscode.postMessage({
            type: 'approveRequest',
            data: { id, feedback }
        });
        setSelectedApproval(null);
        setFeedback('');
    };

    const handleReject = (id: string) => {
        vscode.postMessage({
            type: 'rejectRequest',
            data: { id, feedback }
        });
        setSelectedApproval(null);
        setFeedback('');
    };

    const handleBatchAction = (action: string) => {
        vscode.postMessage({
            type: 'batchAction',
            data: { action }
        });
    };

    const handlePlanAction = (action: string) => {
        vscode.postMessage({
            type: 'planAction',
            data: { action }
        });
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    };

    const getRiskLevelClass = (level: string) => {
        return `risk-level-${level}`;
    };

    const renderApprovalsView = () => {
        return (
            <div className="approvals-view">
                <div className="section-header">
                    <h2>Pending Approvals ({pendingApprovals.length})</h2>
                </div>

                {pendingApprovals.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">✓</div>
                        <p>No pending approvals</p>
                        <span className="empty-subtitle">All requests have been reviewed</span>
                    </div>
                ) : (
                    <div className="approvals-list">
                        {pendingApprovals.map(approval => (
                            <div
                                key={approval.id}
                                className={`approval-card ${getRiskLevelClass(approval.metadata.riskLevel)}`}
                                onClick={() => setSelectedApproval(approval)}
                            >
                                <div className="approval-header">
                                    <div className="approval-type">{approval.type}</div>
                                    <div className={`risk-badge ${getRiskLevelClass(approval.metadata.riskLevel)}`}>
                                        {approval.metadata.riskLevel.toUpperCase()} RISK
                                    </div>
                                </div>
                                <h3>{approval.title}</h3>
                                <p className="approval-description">{approval.description}</p>
                                {approval.metadata.filePath && (
                                    <div className="approval-path">
                                        <span className="path-icon">📄</span>
                                        {approval.metadata.filePath}
                                    </div>
                                )}
                                {approval.metadata.command && (
                                    <div className="approval-command">
                                        <span className="command-icon">$</span>
                                        <code>{approval.metadata.command}</code>
                                    </div>
                                )}
                                <div className="approval-footer">
                                    <span className="approval-time">{formatTimestamp(approval.timestamp)}</span>
                                    <div className="approval-actions">
                                        <button
                                            className="btn-reject"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReject(approval.id);
                                            }}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            className="btn-approve"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleApprove(approval.id);
                                            }}
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {approvalHistory.length > 0 && (
                    <div className="history-section">
                        <h3>Recent History</h3>
                        <div className="history-list">
                            {approvalHistory.slice(0, 10).map((response, index) => (
                                <div key={index} className="history-item">
                                    <span className={`status-icon ${response.approved ? 'approved' : 'rejected'}`}>
                                        {response.approved ? '✓' : '✗'}
                                    </span>
                                    <div className="history-details">
                                        <span className="history-status">
                                            {response.approved ? 'Approved' : 'Rejected'}
                                        </span>
                                        <span className="history-time">{formatTimestamp(response.timestamp)}</span>
                                    </div>
                                    {response.feedback && (
                                        <span className="history-feedback">{response.feedback}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {selectedApproval && (
                    <div className="modal-overlay" onClick={() => setSelectedApproval(null)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{selectedApproval.title}</h2>
                                <button className="modal-close" onClick={() => setSelectedApproval(null)}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="detail-row">
                                    <span className="detail-label">Type:</span>
                                    <span className="detail-value">{selectedApproval.type}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Risk Level:</span>
                                    <span className={`detail-value ${getRiskLevelClass(selectedApproval.metadata.riskLevel)}`}>
                                        {selectedApproval.metadata.riskLevel.toUpperCase()}
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Description:</span>
                                    <p className="detail-value">{selectedApproval.description}</p>
                                </div>
                                {selectedApproval.metadata.filePath && (
                                    <div className="detail-row">
                                        <span className="detail-label">File:</span>
                                        <code className="detail-value">{selectedApproval.metadata.filePath}</code>
                                    </div>
                                )}
                                {selectedApproval.details && (
                                    <div className="detail-row">
                                        <span className="detail-label">Details:</span>
                                        <pre className="detail-value">{JSON.stringify(selectedApproval.details, null, 2)}</pre>
                                    </div>
                                )}
                                <div className="feedback-section">
                                    <label htmlFor="feedback">Feedback (optional):</label>
                                    <textarea
                                        id="feedback"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Add notes or feedback..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn-secondary"
                                    onClick={() => handleReject(selectedApproval.id)}
                                >
                                    Reject
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={() => handleApprove(selectedApproval.id)}
                                >
                                    Approve
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderBatchView = () => {
        return (
            <div className="batch-view">
                <div className="section-header">
                    <h2>Batch Operations</h2>
                </div>

                {activeBatch ? (
                    <div className="active-batch">
                        <div className="batch-card">
                            <h3>{activeBatch.name}</h3>
                            <p className="batch-description">{activeBatch.description}</p>
                            <div className="batch-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${(activeBatch.progress.completed / activeBatch.progress.total) * 100}%`
                                        }}
                                    />
                                </div>
                                <div className="progress-stats">
                                    <span>{activeBatch.progress.completed} / {activeBatch.progress.total} operations</span>
                                    {activeBatch.progress.failed > 0 && (
                                        <span className="failed-count">{activeBatch.progress.failed} failed</span>
                                    )}
                                </div>
                            </div>
                            <div className="batch-operations">
                                <h4>Operations</h4>
                                <div className="operations-list">
                                    {activeBatch.operations.map((op, index) => (
                                        <div key={index} className={`operation-item status-${op.status}`}>
                                            <span className="operation-icon">
                                                {op.status === 'completed' && '✓'}
                                                {op.status === 'failed' && '✗'}
                                                {op.status === 'in_progress' && '⟳'}
                                                {op.status === 'pending' && '○'}
                                            </span>
                                            <div className="operation-details">
                                                <span className="operation-type">{op.type}</span>
                                                <span className="operation-path">{op.filePath}</span>
                                                {op.error && <span className="operation-error">{op.error}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="batch-actions">
                                {activeBatch.status === 'in_progress' && (
                                    <button className="btn-danger" onClick={() => handleBatchAction('cancel')}>
                                        Cancel Batch
                                    </button>
                                )}
                                {activeBatch.status === 'failed' && (
                                    <>
                                        <button className="btn-secondary" onClick={() => handleBatchAction('rollback')}>
                                            Rollback Changes
                                        </button>
                                        <button className="btn-primary" onClick={() => handleBatchAction('retry')}>
                                            Retry Failed
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <p>No active batch operation</p>
                        <span className="empty-subtitle">Batch operations will appear here when running</span>
                    </div>
                )}

                {batchHistory.length > 0 && (
                    <div className="history-section">
                        <h3>Batch History</h3>
                        <div className="batch-history-list">
                            {batchHistory.map(batch => (
                                <div key={batch.id} className="batch-history-item">
                                    <div className="batch-history-header">
                                        <h4>{batch.name}</h4>
                                        <span className={`batch-status status-${batch.status}`}>
                                            {batch.status}
                                        </span>
                                    </div>
                                    <p className="batch-history-description">{batch.description}</p>
                                    <div className="batch-history-stats">
                                        <span>{batch.progress.completed} / {batch.progress.total} completed</span>
                                        {batch.progress.failed > 0 && (
                                            <span className="failed-count">{batch.progress.failed} failed</span>
                                        )}
                                        <span className="batch-time">{formatTimestamp(batch.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderPlanningView = () => {
        return (
            <div className="planning-view">
                <div className="section-header">
                    <h2>Task Planning</h2>
                </div>

                {activePlan ? (
                    <div className="active-plan">
                        <div className="plan-card">
                            <h3>{activePlan.name}</h3>
                            <p className="plan-description">{activePlan.description}</p>
                            <div className="plan-goal">
                                <strong>Goal:</strong> {activePlan.goal}
                            </div>
                            <div className="plan-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${activePlan.progress}%` }}
                                    />
                                </div>
                                <div className="progress-stats">
                                    <span>{activePlan.completedSteps} / {activePlan.totalSteps} steps</span>
                                    <span>{activePlan.progress}%</span>
                                </div>
                            </div>
                            <div className="plan-steps">
                                <h4>Steps</h4>
                                <div className="steps-list">
                                    {activePlan.steps.map((step, index) => (
                                        <div key={step.id} className={`step-item status-${step.status}`}>
                                            <div className="step-number">{index + 1}</div>
                                            <div className="step-details">
                                                <h5>{step.title}</h5>
                                                <p>{step.description}</p>
                                                {step.error && (
                                                    <div className="step-error">{step.error}</div>
                                                )}
                                                {step.actualDuration && (
                                                    <span className="step-duration">
                                                        Duration: {formatDuration(step.actualDuration)}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`step-status-icon status-${step.status}`}>
                                                {step.status === 'completed' && '✓'}
                                                {step.status === 'failed' && '✗'}
                                                {step.status === 'in_progress' && '⟳'}
                                                {step.status === 'pending' && '○'}
                                                {step.status === 'blocked' && '⊘'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="plan-actions">
                                {activePlan.status === 'in_progress' && (
                                    <>
                                        <button className="btn-secondary" onClick={() => handlePlanAction('pause')}>
                                            Pause
                                        </button>
                                        <button className="btn-primary" onClick={() => handlePlanAction('nextStep')}>
                                            Next Step
                                        </button>
                                    </>
                                )}
                                {activePlan.status === 'pending' && (
                                    <button className="btn-primary" onClick={() => handlePlanAction('start')}>
                                        Start Plan
                                    </button>
                                )}
                                <button className="btn-danger" onClick={() => handlePlanAction('cancel')}>
                                    Cancel Plan
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <p>No active task plan</p>
                        <span className="empty-subtitle">Task plans will appear here when created</span>
                    </div>
                )}

                {planHistory.length > 0 && (
                    <div className="history-section">
                        <h3>Plan History</h3>
                        <div className="plan-history-list">
                            {planHistory.map(plan => (
                                <div key={plan.id} className="plan-history-item">
                                    <div className="plan-history-header">
                                        <h4>{plan.name}</h4>
                                        <span className={`plan-status status-${plan.status}`}>
                                            {plan.status}
                                        </span>
                                    </div>
                                    <p className="plan-history-description">{plan.description}</p>
                                    <div className="plan-history-stats">
                                        <span>{plan.completedSteps} / {plan.totalSteps} steps</span>
                                        <span>{plan.progress}%</span>
                                        <span className="plan-time">{formatTimestamp(plan.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="human-relay-container">
            <div className="relay-header">
                <h1>Human Relay</h1>
                <p className="relay-subtitle">Review and manage AI actions</p>
            </div>

            <div className="view-tabs">
                <button
                    className={`tab-button ${viewMode === 'approvals' ? 'active' : ''}`}
                    onClick={() => setViewMode('approvals')}
                >
                    <span className="tab-icon">✓</span>
                    Approvals
                    {pendingApprovals.length > 0 && (
                        <span className="tab-badge">{pendingApprovals.length}</span>
                    )}
                </button>
                <button
                    className={`tab-button ${viewMode === 'batch' ? 'active' : ''}`}
                    onClick={() => setViewMode('batch')}
                >
                    <span className="tab-icon">📦</span>
                    Batch Operations
                    {activeBatch && <span className="tab-indicator">●</span>}
                </button>
                <button
                    className={`tab-button ${viewMode === 'planning' ? 'active' : ''}`}
                    onClick={() => setViewMode('planning')}
                >
                    <span className="tab-icon">📋</span>
                    Task Planning
                    {activePlan && <span className="tab-indicator">●</span>}
                </button>
            </div>

            <div className="view-content">
                {viewMode === 'approvals' && renderApprovalsView()}
                {viewMode === 'batch' && renderBatchView()}
                {viewMode === 'planning' && renderPlanningView()}
            </div>
        </div>
    );
};
