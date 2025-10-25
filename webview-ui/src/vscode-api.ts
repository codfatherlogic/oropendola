/**
 * VS Code API Singleton
 *
 * IMPORTANT: acquireVsCodeApi() can only be called ONCE per webview.
 * This module acquires it once and exports it for all other modules to use.
 */

declare function acquireVsCodeApi(): any

// Acquire the API once
const vscode = acquireVsCodeApi()

// Export the singleton instance
export default vscode
