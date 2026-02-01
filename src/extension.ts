import * as vscode from 'vscode';
import { CommutatusApiClient } from './api/client';
import { SecretStorageAuthManager } from './auth/token';
import { GitBranchTaskResolver } from './task/resolver';
import { TaskWebviewProvider } from './webview/taskView';
import { addTimeLogCommand } from './commands/addTime';
import { setApiTokenCommand } from './commands/setToken';
import { setTaskIdCommand } from './commands/setTaskId';

/**
 * Extension activation entry point
 * Sets up all components and registers commands
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Commutatus Task Tracker extension is now active!');

  // Initialize core services
  const authManager = new SecretStorageAuthManager(context.secrets);
  const taskResolver = new GitBranchTaskResolver();
  const taskWebviewProvider = new TaskWebviewProvider(context.extensionUri);
  
  // Get API URL from configuration
  const config = vscode.workspace.getConfiguration('commutatusTracker');
  const apiUrl = config.get<string>('apiUrl', '');
  
  if (!apiUrl) {
    vscode.window.showWarningMessage(
      'Commutatus API URL not configured. Please set it in settings.',
      'Open Settings'
    ).then(selection => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'commutatusTracker.apiUrl');
      }
    });
    return;
  }

  const apiClient = new CommutatusApiClient(apiUrl);

  // Set up authentication token in API client when available
  authManager.getApiToken().then(token => {
    if (token) {
      apiClient.setAuthToken(token);
    }
  });

  // Register webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'commutatus-tracker-taskView',
      taskWebviewProvider
    )
  );

  // Register commands
  const commands = [
    vscode.commands.registerCommand('commutatus-tracker.addTimeLog', () => 
      addTimeLogCommand(context, apiClient, taskResolver, authManager)
    ),
    vscode.commands.registerCommand('commutatus-tracker.showTask', () => 
      taskWebviewProvider.showTaskWebview(apiClient, taskResolver, authManager)
    ),
    vscode.commands.registerCommand('commutatus-tracker.setApiToken', () => 
      setApiTokenCommand(authManager, apiClient)
    ),
    vscode.commands.registerCommand('commutatus-tracker.setTaskId', () => 
      setTaskIdCommand(taskResolver)
    )
  ];

  context.subscriptions.push(...commands);

  // Set up status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, 
    100
  );
  statusBarItem.command = 'commutatus-tracker.showTask';
  context.subscriptions.push(statusBarItem);

  // Update status bar with current task
  const updateStatusBar = async () => {
    try {
      const taskId = await taskResolver.getCurrentTaskId();
      if (taskId) {
        statusBarItem.text = `🔖 ${taskId}`;
        statusBarItem.tooltip = `Click to open task ${taskId}`;
        statusBarItem.show();
        
        // Set context for view visibility
        vscode.commands.executeCommand('setContext', 'commutatus-tracker.hasActiveTask', true);
      } else {
        statusBarItem.hide();
        vscode.commands.executeCommand('setContext', 'commutatus-tracker.hasActiveTask', false);
      }
    } catch (error) {
      console.error('Error updating status bar:', error);
      statusBarItem.hide();
    }
  };

  // Initial status bar update
  updateStatusBar();

  // Watch for git branch changes
  const gitWatcher = vscode.workspace.createFileSystemWatcher(
    '**/.git/HEAD'
  );
  
  gitWatcher.onDidChange(() => {
    updateStatusBar();
  });

  context.subscriptions.push(gitWatcher);

  // Watch for configuration changes
  const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('commutatusTracker.apiUrl')) {
      const newConfig = vscode.workspace.getConfiguration('commutatusTracker');
      const newApiUrl = newConfig.get<string>('apiUrl', '');
      if (newApiUrl) {
        // Recreate API client with new URL
        const newApiClient = new CommutatusApiClient(newApiUrl);
        authManager.getApiToken().then(token => {
          if (token) {
            newApiClient.setAuthToken(token);
          }
        });
      }
    }
  });

  context.subscriptions.push(configWatcher);

  // Initialize task webview provider with services
  taskWebviewProvider.initialize(apiClient, taskResolver, authManager);
}

/**
 * Extension deactivation
 */
export function deactivate() {
  console.log('Commutatus Task Tracker extension deactivated');
}
