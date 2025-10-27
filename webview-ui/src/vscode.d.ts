/**
 * VS Code Webview API Types
 */

export interface VSCodeAPI {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

declare global {
  interface Window {
    vscode: VSCodeAPI;
  }
  function acquireVsCodeApi(): VSCodeAPI;
}

export {};
