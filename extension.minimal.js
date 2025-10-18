const vscode = require('vscode');

/**
 * Extension activation
 */
function activate(context) {
    console.log('🐦 Minimal Oropendola Extension is now active!');

    // Simple test command
    const testCommand = vscode.commands.registerCommand('oropendola.test', () => {
        vscode.window.showInformationMessage('🎉 Test command works!');
    });
    context.subscriptions.push(testCommand);

    // Simple login command
    const loginCommand = vscode.commands.registerCommand('oropendola.login', () => {
        vscode.window.showInformationMessage('🔑 Login command works!');
    });
    context.subscriptions.push(loginCommand);

    console.log('✅ Commands registered successfully');
}

/**
 * Extension deactivation
 */
function deactivate() {
    console.log('🐦 Oropendola Extension deactivated');
}

module.exports = {
    activate,
    deactivate
};
