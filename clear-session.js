const vscode = require('vscode');

async function clearSession() {
    const config = vscode.workspace.getConfiguration('oropendola');
    await config.update('session.cookies', null, vscode.ConfigurationTarget.Global);
    await config.update('session.csrfToken', null, vscode.ConfigurationTarget.Global);
    await config.update('session.email', null, vscode.ConfigurationTarget.Global);
    console.log('✅ Session cleared');
}

module.exports = { clearSession };
