import React, { useState } from 'react';
import './Welcome.css';

interface WelcomeProps {
    vscode: any;
    onComplete: () => void;
}

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    icon: string;
    action?: string;
    actionLabel?: string;
}

export const Welcome: React.FC<WelcomeProps> = ({ vscode, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [showWelcome, setShowWelcome] = useState(true);

    const onboardingSteps: OnboardingStep[] = [
        {
            id: 'welcome',
            title: 'Welcome to Oropendola AI Assistant',
            description: 'Your intelligent coding companion powered by Claude. Get started with AI-assisted development, powerful automation, and team collaboration.',
            icon: '🎉',
        },
        {
            id: 'features',
            title: 'Core Features',
            description: 'Oropendola provides AI-powered code generation, intelligent conversations, and 8 specialized modes for different tasks.',
            icon: '✨',
        },
        {
            id: 'modes',
            title: 'AI Modes',
            description: '8 built-in modes: Code, Debug, Documentation, Review, Test, Refactor, Explain, and Architecture. Switch modes based on your task.',
            icon: '🎯',
            action: 'openModes',
            actionLabel: 'View Modes'
        },
        {
            id: 'tools',
            title: 'Enhanced Tools',
            description: 'Access 8 powerful tools: File operations, command execution, web search, and more. All with intelligent error handling.',
            icon: '🛠️',
        },
        {
            id: 'settings',
            title: 'Customize Your Experience',
            description: 'Configure model settings, tool preferences, UI options, and workspace behavior with 36 comprehensive settings.',
            icon: '⚙️',
            action: 'openSettings',
            actionLabel: 'Open Settings'
        },
        {
            id: 'advanced',
            title: 'Advanced Features',
            description: 'Unlock browser automation, cloud sync, human approval workflows, batch operations, and semantic code search.',
            icon: '🚀',
        },
        {
            id: 'collaboration',
            title: 'Team Collaboration',
            description: 'Create organizations, invite team members, share workspaces, and sync settings across devices.',
            icon: '👥',
            action: 'openOrganizations',
            actionLabel: 'Setup Organization'
        },
        {
            id: 'ready',
            title: 'You\'re All Set!',
            description: 'Start a conversation, explore features, or check out the documentation. Need help? Press F1 and search for "Oropendola".',
            icon: '🎊',
        }
    ];

    const handleNext = () => {
        if (currentStep < onboardingSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = () => {
        vscode.postMessage({ type: 'completeOnboarding' });
        setShowWelcome(false);
        onComplete();
    };

    const handleAction = (action: string) => {
        vscode.postMessage({ type: 'onboardingAction', data: { action } });
    };

    const currentStepData = onboardingSteps[currentStep];

    if (!showWelcome) {
        return null;
    }

    return (
        <div className="welcome-overlay">
            <div className="welcome-container">
                <div className="welcome-header">
                    <div className="welcome-logo">
                        <span className="logo-icon">🦜</span>
                        <span className="logo-text">Oropendola</span>
                    </div>
                    <button className="close-button" onClick={handleSkip}>×</button>
                </div>

                <div className="welcome-content">
                    <div className="step-indicator">
                        <div className="step-icon">{currentStepData.icon}</div>
                    </div>

                    <h1 className="step-title">{currentStepData.title}</h1>
                    <p className="step-description">{currentStepData.description}</p>

                    {currentStepData.action && (
                        <button
                            className="action-button"
                            onClick={() => handleAction(currentStepData.action!)}
                        >
                            {currentStepData.actionLabel}
                        </button>
                    )}

                    {currentStep === 1 && (
                        <div className="feature-grid">
                            <div className="feature-card">
                                <div className="feature-icon">💬</div>
                                <div className="feature-title">Conversations</div>
                                <div className="feature-desc">Natural AI interactions</div>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">⏱️</div>
                                <div className="feature-title">Checkpoints</div>
                                <div className="feature-desc">Time travel through conversations</div>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">🔧</div>
                                <div className="feature-title">Tools</div>
                                <div className="feature-desc">8 enhanced tools</div>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">🔍</div>
                                <div className="feature-title">Code Search</div>
                                <div className="feature-desc">Semantic search with AI</div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="modes-grid">
                            <div className="mode-chip">💻 Code</div>
                            <div className="mode-chip">🐛 Debug</div>
                            <div className="mode-chip">📚 Docs</div>
                            <div className="mode-chip">🔍 Review</div>
                            <div className="mode-chip">🧪 Test</div>
                            <div className="mode-chip">♻️ Refactor</div>
                            <div className="mode-chip">💡 Explain</div>
                            <div className="mode-chip">🏗️ Architecture</div>
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="advanced-features-list">
                            <div className="advanced-feature">
                                <span className="feature-check">✓</span>
                                <span>Browser Automation with Puppeteer</span>
                            </div>
                            <div className="advanced-feature">
                                <span className="feature-check">✓</span>
                                <span>Cloud Sync & Multi-device Support</span>
                            </div>
                            <div className="advanced-feature">
                                <span className="feature-check">✓</span>
                                <span>Human Approval Workflows</span>
                            </div>
                            <div className="advanced-feature">
                                <span className="feature-check">✓</span>
                                <span>Batch File Operations</span>
                            </div>
                            <div className="advanced-feature">
                                <span className="feature-check">✓</span>
                                <span>Task Planning System</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="welcome-footer">
                    <div className="progress-dots">
                        {onboardingSteps.map((_, index) => (
                            <div
                                key={index}
                                className={`dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                                onClick={() => setCurrentStep(index)}
                            />
                        ))}
                    </div>

                    <div className="welcome-actions">
                        <button
                            className="nav-button secondary"
                            onClick={handleSkip}
                        >
                            Skip Tour
                        </button>

                        <div className="nav-buttons">
                            {currentStep > 0 && (
                                <button
                                    className="nav-button"
                                    onClick={handlePrevious}
                                >
                                    ← Previous
                                </button>
                            )}
                            <button
                                className="nav-button primary"
                                onClick={handleNext}
                            >
                                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next →'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
