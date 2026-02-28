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
  private _panel?: vscode.WebviewPanel;
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
    
    // Refresh the sidebar view if it's already visible
    if (this._view) {
      this.refreshTaskData();
    }
  }

  /**
   * Called when the webview view is first created
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    _token: vscode.CancellationToken,
  ) {
    console.log('TaskWebviewProvider.resolveWebviewView called!');
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

    // Initial load - only refresh if services are available
    if (this.apiClient && this.taskResolver && this.authManager) {
      this.refreshTaskData();
    }
  }

  /**
   * Show task webview in a new tab
   */
  async showTaskWebview(apiClient: ApiClient, taskResolver: TaskResolver, authManager: AuthManager): Promise<void> {
    this.apiClient = apiClient;
    this.taskResolver = taskResolver;
    this.authManager = authManager;

    if (!this._panel) {
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

      this._panel = panel;
      await this.refreshTaskData();
    } else {
      // Focus existing panel
      this._panel.reveal();
    }
  }

  /**
   * Refresh task data and update webview
   */
  async refreshTaskData(): Promise<void> {
    if (!this.taskResolver || !this.authManager) {
      return;
    }

    if (!this.apiClient) {
      const configErrorHtml = this._getConfigErrorHtml();
      if (this._view) {
        this._view.webview.html = configErrorHtml;
      }
      if (this._panel) {
        this._panel.webview.html = configErrorHtml;
      }
      return;
    }

    try {
      const taskId = await this.taskResolver.getCurrentTaskId();
      
      if (!taskId) {
        const noTaskHtml = this._getNoTaskHtml();
        if (this._view) {
          this._view.webview.html = noTaskHtml;
        }
        if (this._panel) {
          this._panel.webview.html = noTaskHtml;
        }
        return;
      }

      const task = await this.apiClient.getTask(taskId);
      const taskHtml = this._getHtmlForTask(task);
      
      if (this._view) {
        this._view.webview.html = taskHtml;
      }
      if (this._panel) {
        this._panel.webview.html = taskHtml;
      }
    } catch (error) {
      console.error('Error refreshing task data:', error);
      const errorHtml = this._getErrorHtml(error instanceof Error ? error.message : 'Unknown error');
      
      if (this._view) {
        this._view.webview.html = errorHtml;
      }
      if (this._panel) {
        this._panel.webview.html = errorHtml;
      }
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
            .comment-item {
                margin-bottom: 10px;
                padding: 8px;
                background-color: var(--vscode-editor-background);
                border-left: 3px solid var(--vscode-textLink-foreground);
            }
            .comment-meta {
                font-size: 0.9em;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 5px;
            }
            .comment-message {
                font-size: 0.9em;
                margin-bottom: 5px;
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
            <div class="log-meta">Date: ${this._formatDate(log.date)}${log.note ? ` | Note: ${log.note}` : ''}</div>
        </div>
    `).join('');

    // Use logs or comments field, whichever is available
    const commentsHtml = task.comments?.map(log => `
        <div class="comment-item">
            <div class="comment-meta">${log.user} ${this._formatDateTime(log.created_at)}</div>
            <div class="comment-message">${log.message}</div>
        </div>
    `).join('');

    const taskMetaHtml = `
        ${task.status ? `<div class="task-meta"><strong>Status:</strong> ${this._formatStatus(task.status)}</div>` : ''}
        ${task.priority ? `<div class="task-meta"><strong>Priority:</strong> ${this._formatPriority(task.priority)}</div>` : ''}
        ${task.due_date ? `<div class="task-meta"><strong>Due:</strong> ${this._formatDate(task.due_date)}</div>` : ''}
        ${task.project_category_name ? `<div class="task-meta"><strong>Project:</strong> ${task.project_category_name}</div>` : ''}
        ${task.assignee_names ? `<div class="task-meta"><strong>Assignees:</strong> ${task.assignee_names}</div>` : ''}
        ${task.time_estimate ? `<div class="task-meta"><strong>Estimate:</strong> ${task.time_estimate}</div>` : ''}
    `;

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
                margin-bottom: 15px;
                white-space: pre-wrap;
            }
            .task-meta {
                font-size: 0.9em;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 5px;
            }
            .task-meta strong {
                color: var(--vscode-foreground);
            }
            .status-badge, .priority-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 0.8em;
                font-weight: bold;
                margin-right: 5px;
            }
            .status-to_do { background-color: #6c757d; color: white; }
            .status-in_progress { background-color: #007bff; color: white; }
            .status-completed { background-color: #28a745; color: white; }
            .priority-low { background-color: #28a745; color: white; }
            .priority-medium { background-color: #ffc107; color: black; }
            .priority-high { background-color: #dc3545; color: white; }
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
            ${taskMetaHtml ? `<div class="task-meta-section">${taskMetaHtml}</div>` : ''}
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
        
        ${(task?.comments?.length ?? 0 > 0) ? `
        <div class="section">
            <div class="section-title">Comments</div>
            ${commentsHtml}
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
   * Generate HTML for configuration error state
   */
  private _getConfigErrorHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Configuration Required</title>
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
                margin-right: 10px;
            }
            .button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <div class="error">
            <h3>Configuration Required</h3>
            <p>Commutatus API URL not configured.</p>
        </div>
        <div class="message">
            <p>Please configure the API URL in the extension settings to use the task tracker.</p>
        </div>
        <button class="button" onclick="openSettings()">⚙️ Open Settings</button>
        
        <script>
            const vscode = acquireVsCodeApi();
            
            function openSettings() {
                vscode.commands.executeCommand('workbench.action.openSettings', 'commutatusTracker.apiUrl');
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

  /**
   * Format status for display
   */
  private _formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format priority for display
   */
  private _formatPriority(priority: string): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  /**
   * Format date for display
   */
  private _formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Format date and time for display (for comments)
   */
  private _formatDateTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }
}
