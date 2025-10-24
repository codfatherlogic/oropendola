export interface Message {
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp?: number;
  conversation_id?: string;
}

export interface TodoItem {
  id: string;
  content?: string;
  text?: string; // Support both content and text
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  activeForm: string;
  parentId?: string;
  level?: number;
  children?: TodoItem[];
  metadata?: {
    linesOfOutput?: number;
    filePath?: string;
    type?: string;
  };
}

export interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  status: 'generating' | 'applying' | 'applied' | 'failed';
}

export type MessageType =
  | 'addMessage'
  | 'showTyping'
  | 'hideTyping'
  | 'updateTodos'
  | 'fileChangeAdded'
  | 'fileChangeUpdated'
  | 'requestCommandConfirmation'
  | 'loginSuccess'
  | 'loginError';
