import * as vscode from 'vscode';
import { CommutatusApiClient } from './api/client';
import { SecretStorageAuthManager } from './auth/token';
import { GitBranchTaskResolver } from './task/resolver';
import { TaskWebviewProvider } from './webview/taskView';
import { addTimeLogCommand } from './commands/addTime';
import { commitTimeLogCommand } from './commands/commitTimeLog';
import { setApiTokenCommand } from './commands/setToken';
import { setTaskIdCommand } from './commands/setTaskId';
import { API_BASE_URL } from './config/constants';

const exec = require('child_process').exec;
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Get the last commit message
 */
async function getLastCommitMessage(): Promise<string | null> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return null;
    }

    const { stdout } = await execAsync('git log -1 --pretty=format:%s', {
      cwd: workspaceFolder
    });
    return stdout.trim() || null;
  } catch (error) {
    return null;
  }
}

/**
 * Extension activation entry point
 * Sets up all components and registers commands
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Commutatus Task Tracker extension is now active!');

  // Initialize core services
  const authManager = new SecretStorageAuthManager(context.secrets);
  const taskResolver = new GitBranchTaskResolver(context);
  const taskWebviewProvider = new TaskWebviewProvider(context.extensionUri);
  
  console.log('Registering webview provider...');
  // Register webview provider first (do this early so the view is always available)
  try {
    const webviewRegistration = vscode.window.registerWebviewViewProvider(
      'commutatus-tracker-taskView',
      taskWebviewProvider
    );
    context.subscriptions.push(webviewRegistration);
    console.log('Webview provider registered successfully!');
  } catch (error) {
    console.error('Failed to register webview provider:', error);
    vscode.window.showErrorMessage(`Failed to register webview provider: ${error}`);
  }
  
  // Use global API URL constant
  const apiClient = new CommutatusApiClient(API_BASE_URL);

  // Set up authentication token in API client when available
  authManager.getApiToken().then(token => {
    if (token) {
      apiClient.setAuthToken(token);
    }
  });

  // Register commands
  const commands = [
    vscode.commands.registerCommand('commutatus-tracker.addTimeLog', () => 
      addTimeLogCommand(context, apiClient, taskResolver, authManager)
    ),
    vscode.commands.registerCommand('commutatus-tracker.logCommitTime', async () => {
      // Get the last commit message to use as default note
      const commitMessage = await getLastCommitMessage();
      console.log(`Manual trigger - Commit message: ${commitMessage}`);
      await commitTimeLogCommand(context, apiClient, taskResolver, authManager, commitMessage || undefined);
    }),
    vscode.commands.registerCommand('commutatus-tracker.showTask', () => 
      vscode.commands.executeCommand('workbench.view.extension.commutatus-tracker')
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
  statusBarItem.command = 'workbench.view.extension.commutatus-tracker';
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

  // Watch for git branch changes using VS Code Git API (for task ID detection only)
  const gitExtension = vscode.extensions.getExtension('vscode.git');
  let currentBranch = '';
  let branchChangeTimeout: NodeJS.Timeout | undefined;
  
  const updateCurrentBranch = async () => {
    try {
      if (gitExtension && gitExtension.isActive) {
        const git = gitExtension.exports.getAPI(1);
        const repositories = git.repositories;
        if (repositories.length > 0) {
          const repo = repositories[0];
          const newBranch = repo.state.HEAD?.name || '';
          
          // Check for branch change
          if (newBranch !== currentBranch && newBranch) {
            currentBranch = newBranch;
            
            // Clear any existing timeout
            if (branchChangeTimeout) {
              clearTimeout(branchChangeTimeout);
            }
            
            await updateStatusBar();
            await taskWebviewProvider.refreshTaskData();
          }
        }
      }
    } catch (error) {
      console.error('Error checking git branch:', error);
    }
  };

  // Initial branch check
  updateCurrentBranch();

  // Set up git state change listener if git extension is available
  const setupGitListener = (git: any) => {
    if (git.repositories.length > 0) {
      const repo = git.repositories[0];
      
      const disposable = repo.state.onDidChange(() => {
        updateCurrentBranch();
      });
      
      context.subscriptions.push(disposable);
    } else {
      // Listen for when repositories are added
      const repoDisposable = git.onDidOpenRepository((repo: any) => {
        const stateDisposable = repo.state.onDidChange(() => {
          updateCurrentBranch();
        });
        context.subscriptions.push(stateDisposable);
      });
      context.subscriptions.push(repoDisposable);
    }
  };

  if (gitExtension) {
    if (gitExtension.isActive) {
      const git = gitExtension.exports.getAPI(1);
      setupGitListener(git);
    } else {
      // Wait for git extension to activate
      gitExtension.activate().then(() => {
        const git = gitExtension.exports.getAPI(1);
        setupGitListener(git);
      });
    }
  }

  // Initialize task webview provider with services
  taskWebviewProvider.initialize(apiClient, taskResolver, authManager);

  // Auto-show sidebar view if there's an active task on startup
  // Wait for VS Code to be fully loaded and extension to be ready
  setTimeout(async () => {
    try {
      const taskId = await taskResolver.getCurrentTaskId();
      if (taskId) {
        // Just focus the sidebar view - the webview should be automatically populated
        vscode.commands.executeCommand('workbench.view.extension.commutatus-tracker');
      }
    } catch (error) {
      console.error('Error checking for active task on startup:', error);
    }
  }, 2000); // Increased delay to ensure everything is loaded
}

/**
 * Extension deactivation
 */
export function deactivate() {
  console.log('Commutatus Task Tracker extension deactivated');
}
