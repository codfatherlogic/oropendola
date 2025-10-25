/**
 * Plugin Manager
 *
 * Manages plugin installation, uninstallation, and tracking
 * Integrates with VS Code extension API
 *
 * Week 8: Marketplace & Plugins - Phase 1
 */

import * as vscode from 'vscode';
import { InstalledPlugin, PluginInstallOptions } from '../types';

export class PluginManager {
    private static instance: PluginManager;
    private installedPlugins: Map<string, InstalledPlugin> = new Map();
    private extensionContext: vscode.ExtensionContext | null = null;

    private constructor() {}

    public static getInstance(): PluginManager {
        if (!PluginManager.instance) {
            PluginManager.instance = new PluginManager();
        }
        return PluginManager.instance;
    }

    /**
     * Initialize plugin manager
     */
    public initialize(context: vscode.ExtensionContext): void {
        this.extensionContext = context;
        this.loadInstalledPlugins();
    }

    /**
     * Load currently installed extensions
     */
    private loadInstalledPlugins(): void {
        const extensions = vscode.extensions.all;

        for (const extension of extensions) {
            // Skip built-in extensions
            if (extension.packageJSON.isBuiltin) {
                continue;
            }

            const plugin: InstalledPlugin = {
                id: extension.id,
                extensionId: extension.id,
                name: extension.packageJSON.name || extension.id,
                displayName: extension.packageJSON.displayName || extension.packageJSON.name,
                version: extension.packageJSON.version || '1.0.0',
                publisher: extension.packageJSON.publisher || 'unknown',
                enabled: extension.isActive,
                installedAt: new Date(), // VS Code doesn't provide install date
                path: extension.extensionPath
            };

            this.installedPlugins.set(plugin.id, plugin);
        }

        console.log(`Loaded ${this.installedPlugins.size} installed plugins`);
    }

    /**
     * Install a plugin
     */
    public async installPlugin(
        extensionId: string,
        options: PluginInstallOptions = {}
    ): Promise<{ success: boolean; message?: string }> {
        try {
            // Check if already installed
            if (this.isInstalled(extensionId)) {
                return {
                    success: false,
                    message: 'Extension is already installed'
                };
            }

            // Show progress
            return await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Installing ${extensionId}...`,
                    cancellable: false
                },
                async () => {
                    try {
                        // Install using VS Code command
                        await vscode.commands.executeCommand(
                            'workbench.extensions.installExtension',
                            extensionId
                        );

                        // Wait a bit for extension to be loaded
                        await this.sleep(1000);

                        // Reload installed plugins
                        this.loadInstalledPlugins();

                        // Track installation
                        await this.trackInstallation(extensionId, options);

                        return {
                            success: true,
                            message: `Successfully installed ${extensionId}`
                        };
                    } catch (error) {
                        console.error(`Failed to install ${extensionId}:`, error);
                        return {
                            success: false,
                            message: `Installation failed: ${error}`
                        };
                    }
                }
            );
        } catch (error) {
            console.error(`Install error for ${extensionId}:`, error);
            return {
                success: false,
                message: `Installation error: ${error}`
            };
        }
    }

    /**
     * Uninstall a plugin
     */
    public async uninstallPlugin(extensionId: string): Promise<{ success: boolean; message?: string }> {
        try {
            // Check if installed
            if (!this.isInstalled(extensionId)) {
                return {
                    success: false,
                    message: 'Extension is not installed'
                };
            }

            // Confirm uninstall
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to uninstall ${extensionId}?`,
                { modal: true },
                'Uninstall'
            );

            if (confirm !== 'Uninstall') {
                return {
                    success: false,
                    message: 'Uninstall cancelled'
                };
            }

            // Show progress
            return await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Uninstalling ${extensionId}...`,
                    cancellable: false
                },
                async () => {
                    try {
                        // Uninstall using VS Code command
                        await vscode.commands.executeCommand(
                            'workbench.extensions.uninstallExtension',
                            extensionId
                        );

                        // Remove from tracking
                        this.installedPlugins.delete(extensionId);
                        await this.trackUninstallation(extensionId);

                        return {
                            success: true,
                            message: `Successfully uninstalled ${extensionId}`
                        };
                    } catch (error) {
                        console.error(`Failed to uninstall ${extensionId}:`, error);
                        return {
                            success: false,
                            message: `Uninstall failed: ${error}`
                        };
                    }
                }
            );
        } catch (error) {
            console.error(`Uninstall error for ${extensionId}:`, error);
            return {
                success: false,
                message: `Uninstall error: ${error}`
            };
        }
    }

    /**
     * Enable a plugin
     */
    public async enablePlugin(extensionId: string): Promise<boolean> {
        try {
            await vscode.commands.executeCommand(
                'workbench.extensions.action.enableExtension',
                extensionId
            );

            const plugin = this.installedPlugins.get(extensionId);
            if (plugin) {
                plugin.enabled = true;
            }

            return true;
        } catch (error) {
            console.error(`Failed to enable ${extensionId}:`, error);
            return false;
        }
    }

    /**
     * Disable a plugin
     */
    public async disablePlugin(extensionId: string): Promise<boolean> {
        try {
            await vscode.commands.executeCommand(
                'workbench.extensions.action.disableExtension',
                extensionId
            );

            const plugin = this.installedPlugins.get(extensionId);
            if (plugin) {
                plugin.enabled = false;
            }

            return true;
        } catch (error) {
            console.error(`Failed to disable ${extensionId}:`, error);
            return false;
        }
    }

    /**
     * Check if plugin is installed
     */
    public isInstalled(extensionId: string): boolean {
        return this.installedPlugins.has(extensionId);
    }

    /**
     * Get installed plugin info
     */
    public getInstalledPlugin(extensionId: string): InstalledPlugin | null {
        return this.installedPlugins.get(extensionId) || null;
    }

    /**
     * Get all installed plugins
     */
    public getInstalledPlugins(): InstalledPlugin[] {
        return Array.from(this.installedPlugins.values());
    }

    /**
     * Get plugin count by category
     */
    public getPluginStats(): {
        total: number;
        enabled: number;
        disabled: number;
    } {
        const plugins = this.getInstalledPlugins();
        return {
            total: plugins.length,
            enabled: plugins.filter((p) => p.enabled).length,
            disabled: plugins.filter((p) => !p.enabled).length
        };
    }

    /**
     * Search installed plugins
     */
    public searchInstalledPlugins(query: string): InstalledPlugin[] {
        const queryLower = query.toLowerCase();
        return this.getInstalledPlugins().filter(
            (plugin) =>
                plugin.displayName.toLowerCase().includes(queryLower) ||
                plugin.name.toLowerCase().includes(queryLower) ||
                plugin.id.toLowerCase().includes(queryLower)
        );
    }

    /**
     * Track plugin installation (for future backend sync)
     */
    private async trackInstallation(
        extensionId: string,
        _options: PluginInstallOptions
    ): Promise<void> {
        // Future: Send to backend API with options
        // For now, just store locally
        if (this.extensionContext) {
            const tracked = this.extensionContext.globalState.get<string[]>('oropendola.installedPlugins', []);
            if (!tracked.includes(extensionId)) {
                tracked.push(extensionId);
                await this.extensionContext.globalState.update('oropendola.installedPlugins', tracked);
            }
        }
    }

    /**
     * Track plugin uninstallation
     */
    private async trackUninstallation(extensionId: string): Promise<void> {
        // Future: Send to backend API
        if (this.extensionContext) {
            const tracked = this.extensionContext.globalState.get<string[]>('oropendola.installedPlugins', []);
            const filtered = tracked.filter((id) => id !== extensionId);
            await this.extensionContext.globalState.update('oropendola.installedPlugins', filtered);
        }
    }

    /**
     * Sync installed plugins with backend (Phase 2)
     */
    public async syncWithBackend(): Promise<void> {
        // Phase 2: Implement backend sync
        console.log('Backend sync not implemented in Phase 1');
    }

    /**
     * Export installed plugins list
     */
    public exportPluginList(): string {
        const plugins = this.getInstalledPlugins().map((p) => ({
            id: p.id,
            version: p.version,
            enabled: p.enabled
        }));

        return JSON.stringify(plugins, null, 2);
    }

    /**
     * Import and install plugins from list
     */
    public async importPluginList(data: string): Promise<{
        installed: number;
        failed: number;
        errors: string[];
    }> {
        const result = {
            installed: 0,
            failed: 0,
            errors: [] as string[]
        };

        try {
            const plugins = JSON.parse(data) as Array<{ id: string; version?: string }>;

            for (const plugin of plugins) {
                if (!this.isInstalled(plugin.id)) {
                    const installResult = await this.installPlugin(plugin.id);
                    if (installResult.success) {
                        result.installed++;
                    } else {
                        result.failed++;
                        result.errors.push(`${plugin.id}: ${installResult.message}`);
                    }
                }
            }
        } catch (error) {
            result.errors.push(`Import failed: ${error}`);
        }

        return result;
    }

    /**
     * Open extension in VS Code
     */
    public async openExtension(extensionId: string): Promise<void> {
        await vscode.commands.executeCommand('extension.open', extensionId);
    }

    /**
     * Refresh plugin list
     */
    public refresh(): void {
        this.loadInstalledPlugins();
    }

    /**
     * Utility: Sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export function getInstance(): PluginManager {
    return PluginManager.getInstance();
}
