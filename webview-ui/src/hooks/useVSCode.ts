import { useCallback } from 'react';

// Get VS Code API instance (singleton)
const vscode = acquireVsCodeApi();

export interface MessageHandler {
  (message: any): void;
}

export const useVSCode = () => {
  const postMessage = useCallback((message: any) => {
    vscode.postMessage(message);
  }, []);

  const onMessage = useCallback((handler: MessageHandler) => {
    const listener = (event: MessageEvent) => {
      handler(event.data);
    };

    window.addEventListener('message', listener);

    return () => {
      window.removeEventListener('message', listener);
    };
  }, []);

  return {
    postMessage,
    onMessage,
    getState: vscode.getState,
    setState: vscode.setState
  };
};
