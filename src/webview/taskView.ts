import * as vscode from 'vscode';
import { ApiClient, AuthManager, TaskResolver, Task } from '../types';
import { formatMinutes } from '../utils/time';

/**
 * Webview provider for displaying task details
 * Shows task information, logs, and time logs in a clean, read-only format
 */
export class TaskWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'commutatus-tracker-taskView';
  
  private _view?: vscode.WebviewView;
  private apiClient?: ApiClient;
  private taskResolver?: TaskResolver;
  private authManager?: AuthManager;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * Initialize provider with services
   */
  initialize(apiClient: ApiClient, taskResolver: TaskResolver, authManager: AuthManager): void {
    this.apiClient = apiClient;
    this.taskResolver = taskResolver;
    this.authManager = authManager;
  }

  /**
   * Called when the webview view is first created
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'refresh':
          await this.refreshTaskData();
          break;
        case 'addTimeLog':
          await this.handleAddTimeLog();
          break;
        case 'ready':
          await this.refreshTaskData();
          break;
      }
    });

    // Initial load
    this.refreshTaskData();
  }

  /**
   * Show task webview in a new tab
   */
  async showTaskWebview(apiClient: ApiClient, taskResolver: TaskResolver, authManager: AuthManager): Promise<void> {
    this.apiClient = apiClient;
    this.taskResolver = taskResolver;
    this.authManager = authManager;

    if (!this._view) {
      // If no panel exists, create one
      const panel = vscode.window.createWebviewPanel(
        TaskWebviewProvider.viewType,
        'Task Details',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [this._extensionUri]
        }
      );

      panel.webview.html = this._getHtmlForWebview(panel.webview);

      panel.webview.onDidReceiveMessage(async (data) => {
        switch (data.type) {
          case 'refresh':
            await this.refreshTaskData();
            break;
          case 'addTimeLog':
            await this.handleAddTimeLog();
            break;
        }
      });

      this._view = panel as any;
      await this.refreshTaskData();
    } else {
      // Focus existing panel
      this._view.show();
    }
  }

  /**
   * Refresh task data and update webview
   */
  private async refreshTaskData(): Promise<void> {
    if (!this._view || !this.apiClient || !this.taskResolver || !this.authManager) {
      return;
    }

    try {
      const taskId = await this.taskResolver.getCurrentTaskId();
      if (!taskId) {
        this._view.webview.html = this._getNoTaskHtml();
        return;
      }

      const task = await this.apiClient.getTask(taskId);
      this._view.webview.html = this._getHtmlForTask(task);
    } catch (error) {
      console.error('Error refreshing task data:', error);
      this._view.webview.html = this._getErrorHtml(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle add time log request from webview
   */
  private async handleAddTimeLog(): Promise<void> {
    if (!this.taskResolver || !this.apiClient) {
      return;
    }

    const taskId = await this.taskResolver.getCurrentTaskId();
    if (!taskId) {
      vscode.window.showErrorMessage('No active task found');
      return;
    }

    // Delegate to the add time log command
    vscode.commands.executeCommand('commutatus-tracker.addTimeLog');
  }

  /**
   * Generate HTML for webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Details</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
                line-height: 1.4;
            }
            .header {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .task-id {
                font-size: 1.2em;
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
                margin-bottom: 5px;
            }
            .task-title {
                font-size: 1.1em;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .task-description {
                margin-bottom: 20px;
                white-space: pre-wrap;
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                font-weight: bold;
                margin-bottom: 10px;
                color: var(--vscode-textLink-foreground);
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 5px;
            }
            .log-item, .time-log-item {
                margin-bottom: 10px;
                padding: 8px;
                background-color: var(--vscode-editor-background);
                border-left: 3px solid var(--vscode-textLink-foreground);
            }
            .log-meta {
                font-size: 0.9em;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 5px;
            }
            .time-log-duration {
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
            .button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                margin-right: 10px;
                margin-bottom: 10px;
            }
            .button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .error {
                color: var(--vscode-errorForeground);
                background-color: var(--vscode-inputValidation-errorBackground);
                padding: 10px;
                border-radius: 3px;
                margin-bottom: 20px;
            }
            .loading {
                text-align: center;
                padding: 20px;
                color: var(--vscode-descriptionForeground);
            }
        </style>
    </head>
    <body>
        <div id="content" class="loading">Loading task details...</div>
        
        <script>
            const vscode = acquireVsCodeApi();
            
            // Notify extension that webview is ready
            window.addEventListener('load', () => {
                vscode.postMessage({ type: 'ready' });
            });
            
            // Handle refresh button
            function refresh() {
                vscode.postMessage({ type: 'refresh' });
            }
            
            // Handle add time log button
            function addTimeLog() {
                vscode.postMessage({ type: 'addTimeLog' });
            }
        </script>
    </body>
    </html>`;
  }

  /**
   * Generate HTML for task display
   */
  private _getHtmlForTask(task: Task): string {
    const timeLogsHtml = task.time_logs.map(log => `
        <div class="time-log-item">
            <div class="time-log-duration">${formatMinutes(log.minutes)}</div>
            <div class="log-meta">Date: ${log.date}${log.note ? ` | Note: ${log.note}` : ''}</div>
        </div>
    `).join('');

    const logsHtml = task.logs.map(log => `
        <div class="log-item">
            <div class="log-meta">${log.created_at} - ${log.user}</div>
            <div>${log.message}</div>
        </div>
    `).join('');

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Details - ${task.id}</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
                line-height: 1.4;
            }
            .header {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .task-id {
                font-size: 1.2em;
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
                margin-bottom: 5px;
            }
            .task-title {
                font-size: 1.1em;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .task-description {
                margin-bottom: 20px;
                white-space: pre-wrap;
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                font-weight: bold;
                margin-bottom: 10px;
                color: var(--vscode-textLink-foreground);
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 5px;
            }
            .log-item, .time-log-item {
                margin-bottom: 10px;
                padding: 8px;
                background-color: var(--vscode-editor-background);
                border-left: 3px solid var(--vscode-textLink-foreground);
            }
            .log-meta {
                font-size: 0.9em;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 5px;
            }
            .time-log-duration {
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
            .button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                margin-right: 10px;
                margin-bottom: 10px;
            }
            .button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .actions {
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="task-id">${task.id}</div>
            <div class="task-title">${task.title}</div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
        </div>
        
        <div class="actions">
            <button class="button" onclick="refresh()">🔄 Refresh</button>
            <button class="button" onclick="addTimeLog()">⏱️ Add Time Log</button>
        </div>
        
        ${task.time_logs.length > 0 ? `
        <div class="section">
            <div class="section-title">Time Logs</div>
            ${timeLogsHtml}
        </div>
        ` : ''}
        
        ${task.logs.length > 0 ? `
        <div class="section">
            <div class="section-title">Activity Logs</div>
            ${logsHtml}
        </div>
        ` : ''}
        
        <script>
            const vscode = acquireVsCodeApi();
            
            function refresh() {
                vscode.postMessage({ type: 'refresh' });
            }
            
            function addTimeLog() {
                vscode.postMessage({ type: 'addTimeLog' });
            }
        </script>
    </body>
    </html>`;
  }

  /**
   * Generate HTML for no task state
   */
  private _getNoTaskHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>No Active Task</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
                line-height: 1.4;
                text-align: center;
            }
            .message {
                margin-bottom: 20px;
                color: var(--vscode-descriptionForeground);
            }
            .button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                cursor: pointer;
            }
            .button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <div class="message">
            <h3>No Active Task</h3>
            <p>No task ID could be detected from the current git branch.</p>
            <p>Please switch to a task branch or set a task ID manually.</p>
        </div>
        <button class="button" onclick="setTaskId()">Set Task ID</button>
        
        <script>
            const vscode = acquireVsCodeApi();
            
            function setTaskId() {
                vscode.commands.executeCommand('commutatus-tracker.setTaskId');
            }
        </script>
    </body>
    </html>`;
  }

  /**
   * Generate HTML for error state
   */
  private _getErrorHtml(errorMessage: string): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
                line-height: 1.4;
            }
            .error {
                color: var(--vscode-errorForeground);
                background-color: var(--vscode-inputValidation-errorBackground);
                padding: 15px;
                border-radius: 3px;
                margin-bottom: 20px;
            }
            .button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                margin-right: 10px;
            }
            .button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <div class="error">
            <h3>Error Loading Task</h3>
            <p>${errorMessage}</p>
        </div>
        <button class="button" onclick="refresh()">🔄 Retry</button>
        
        <script>
            const vscode = acquireVsCodeApi();
            
            function refresh() {
                vscode.postMessage({ type: 'refresh' });
            }
        </script>
    </body>
    </html>`;
  }
}
