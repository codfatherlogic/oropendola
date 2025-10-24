import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { EnhancedTodoPanel } from './components/EnhancedTodoPanel';
import { useVSCode } from './hooks/useVSCode';
import { Message, TodoItem, MessageType } from './types';

const App: React.FC = () => {
  const { postMessage, onMessage } = useVSCode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<'ask' | 'agent'>('agent');
  const [thinkingStatus, setThinkingStatus] = useState<string | undefined>();

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
          break;

        case 'hideTyping':
          setIsTyping(false);
          setIsGenerating(false);
          setThinkingStatus(undefined);
          break;

        case 'updateTodos':
          setTodos(message.todos || []);
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

  return (
    <div className="app-container">
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
      />
    </div>
  );
};

export default App;
