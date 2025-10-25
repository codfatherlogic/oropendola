import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { EnhancedTodoPanel } from './components/EnhancedTodoPanel';
import { FileChangesPanel } from './components/FileChangesPanel';
import { useVSCode } from './hooks/useVSCode';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Message, TodoItem, FileChange, MessageType } from './types';

const App: React.FC = () => {
  const { postMessage, onMessage } = useVSCode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<'ask' | 'agent'>('agent');
  const [thinkingStatus, setThinkingStatus] = useState<string | undefined>();
  const [currentFile, setCurrentFile] = useState<string | undefined>();
  const [pendingCommand, setPendingCommand] = useState<{command: string, riskLevel: string} | null>(null);

  useEffect(() => {
    const cleanup = onMessage((message) => {
      console.log('Received message from extension:', message);

      switch (message.type as MessageType) {
        case 'addMessage':
          setMessages((prev) => [...prev, message.message]);
          setIsGenerating(false);
          break;

        case 'showTyping':
          setIsTyping(true);
          setIsGenerating(true);
          setThinkingStatus(message.status || 'Thinking...');
          setCurrentFile(message.currentFile);
          break;

        case 'hideTyping':
          setIsTyping(false);
          setIsGenerating(false);
          setThinkingStatus(undefined);
          setCurrentFile(undefined);
          break;

        case 'updateTodos':
          setTodos(message.todos || []);
          break;

        case 'fileChangeAdded':
          if (message.fileChange) {
            setFileChanges((prev) => [...prev, message.fileChange]);
          }
          break;

        case 'fileChangeUpdated':
          if (message.fileChange) {
            setFileChanges((prev) =>
              prev.map((fc) => (fc.path === message.fileChange.path ? message.fileChange : fc))
            );
          }
          break;

        case 'requestCommandConfirmation':
          setPendingCommand({
            command: message.command,
            riskLevel: message.riskLevel
          });
          break;

        case 'loginSuccess':
          // Handle login success
          break;

        case 'loginError':
          // Handle login error
          break;
      }
    });

    return cleanup;
  }, [onMessage]);

  const handleSendMessage = (text: string) => {
    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    setIsGenerating(true);

    // Send to extension
    postMessage({
      type: 'sendMessage',
      text
    });
  };

  const handleStopGeneration = () => {
    postMessage({ type: 'stopGeneration' });
    setIsTyping(false);
    setIsGenerating(false);
  };

  const handleNewChat = () => {
    postMessage({ type: 'newChat' });
    setMessages([]);
    setTodos([]);
  };

  const handleSettings = () => {
    postMessage({ type: 'openSettings' });
  };

  const handleSignOut = () => {
    postMessage({ type: 'logout' });
  };

  const handleModeChange = (newMode: 'ask' | 'agent') => {
    setMode(newMode);
    postMessage({
      type: 'switchMode',
      mode: newMode
    });
  };

  const handleAcceptPlan = (content: string) => {
    postMessage({
      type: 'acceptPlan',
      messageContent: content
    });
  };

  const handleRejectPlan = (content: string) => {
    postMessage({
      type: 'rejectPlan',
      messageContent: content
    });
  };

  const handleToggleTodo = (id: string) => {
    postMessage({
      type: 'toggleTodo',
      todoId: id
    });
  };

  const handleDeleteTodo = (id: string) => {
    postMessage({
      type: 'deleteTodo',
      todoId: id
    });
  };

  const handleClearTodos = () => {
    if (confirm('Clear all TODOs?')) {
      postMessage({ type: 'clearTodos' });
    }
  };

  const handleSyncTodos = () => {
    postMessage({ type: 'syncTodos' });
  };

  const handleAcceptFileChange = (path: string) => {
    postMessage({
      type: 'acceptFileChange',
      filePath: path
    });
  };

  const handleRejectFileChange = (path: string) => {
    postMessage({
      type: 'rejectFileChange',
      filePath: path
    });
  };

  const handleAddContext = () => {
    postMessage({ type: 'addContext' });
  };

  const handleConfirmCommand = () => {
    postMessage({
      type: 'commandConfirmationResponse',
      confirmed: true
    });
    setPendingCommand(null);
  };

  const handleCancelCommand = () => {
    postMessage({
      type: 'commandConfirmationResponse',
      confirmed: false
    });
    setPendingCommand(null);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      meta: true,
      handler: handleNewChat,
      description: 'New chat'
    },
    {
      key: 'Escape',
      handler: () => {
        if (isGenerating) {
          handleStopGeneration();
        } else if (pendingCommand) {
          handleCancelCommand();
        }
      },
      description: 'Stop generation or cancel command'
    },
    {
      key: 'k',
      meta: true,
      handler: () => {
        if (confirm('Clear all messages?')) {
          setMessages([]);
        }
      },
      description: 'Clear messages'
    }
  ]);

  return (
    <div className="roo-app-container">
      <Header
        onNewChat={handleNewChat}
        onSettings={handleSettings}
        onSignOut={handleSignOut}
      />
      <MessageList
        messages={messages}
        isTyping={isTyping}
        showEmptyState={messages.length === 0 && !isTyping}
        onAcceptPlan={handleAcceptPlan}
        onRejectPlan={handleRejectPlan}
        mode={mode}
      />
      {pendingCommand && (
        <div className="roo-command-panel">
          <div className="roo-command-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="roo-command-title">Run in terminal</span>
            {pendingCommand.riskLevel === 'high' && (
              <span className="roo-risk-badge roo-risk-high">Potential risks detected</span>
            )}
          </div>
          <div className="roo-command-preview">
            <code>{pendingCommand.command}</code>
          </div>
          <div className="roo-command-actions">
            <button className="roo-command-btn roo-command-run" onClick={handleConfirmCommand}>
              Run ⌘↵
            </button>
            <button className="roo-command-btn roo-command-cancel" onClick={handleCancelCommand}>
              Cancel ⌘⌫
            </button>
          </div>
        </div>
      )}
      <FileChangesPanel
        fileChanges={fileChanges}
        visible={fileChanges.length > 0}
        onAccept={handleAcceptFileChange}
        onReject={handleRejectFileChange}
      />
      <EnhancedTodoPanel
        todos={todos}
        visible={todos.length > 0}
        onToggle={handleToggleTodo}
        onDelete={handleDeleteTodo}
        onClear={handleClearTodos}
        onSync={handleSyncTodos}
        thinkingStatus={thinkingStatus}
      />
      <InputArea
        onSend={handleSendMessage}
        onStop={handleStopGeneration}
        isGenerating={isGenerating}
        mode={mode}
        onModeChange={handleModeChange}
        onAddContext={handleAddContext}
        currentFile={currentFile}
      />
    </div>
  );
};

export default App;
