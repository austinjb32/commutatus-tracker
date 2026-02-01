# Commutatus Task Tracker - Implementation Documentation

## Overview

This is a production-quality VS Code extension that integrates with the Commutatus task tracking website via API. The extension follows strict security and design principles, focusing on manual time entry only with read-only task display.

## Architecture

### Core Components

```
src/
├── extension.ts          # Main entry point and service orchestration
├── types.ts              # TypeScript interfaces and type definitions
├── utils/
│   └── time.ts           # Time parsing and validation utilities
├── api/
│   └── client.ts         # API client for task data fetching
├── auth/
│   └── token.ts          # Secure token storage using SecretStorage
├── task/
│   └── resolver.ts       # Git branch to task ID resolution
├── webview/
│   └── taskView.ts       # Task details webview UI
└── commands/
    ├── addTime.ts        # Manual time entry command
    ├── setToken.ts       # API token configuration
    └── setTaskId.ts      # Manual task ID setting
```

## Key Features

### 1. Task Detection (Git Branch Integration)

- **Automatic Detection**: Extracts task IDs from git branch names using regex `[A-Z]+-\d+`
- **Supported Formats**: `TRIP-142`, `feature/TRIP-142`, `bugfix/TRIP-142-query`
- **Fallback**: Caches task ID per workspace if branch detection fails
- **Manual Override**: Users can manually set task ID via command palette

### 2. Read-Only Task Display

- **Webview UI**: Clean, responsive interface using VS Code theming
- **Task Information**: ID, title, description, activity logs, time logs
- **Real-time Updates**: Refreshes on git branch changes and manual refresh
- **Error Handling**: Graceful error states with retry functionality

### 3. Manual Time Entry (Mandatory)

- **Input Formats**: 
  - `90` (minutes)
  - `1h`, `2h` (hours)
  - `1h 30m` (hours + minutes)
  - `01:30` (HH:MM format)
- **Validation**: 
  - Rounds to nearest 15 minutes
  - Rejects entries > 8 hours
  - Confirms entries ≥ 4 hours
- **Security**: Explicit user action required, no automatic tracking

### 4. Authentication & Security

- **Token Storage**: Uses VS Code SecretStorage for secure API token storage
- **No Keystroke Capture**: No background monitoring or automatic actions
- **Explicit Actions**: All operations require user initiation
- **Error Handling**: Clear error messages without exposing sensitive data

## API Integration

### Expected Endpoints

```
GET  /api/tasks/{TASK_ID}
Response: {
  "id": "TRIP-142",
  "title": "Optimize billing query",
  "description": "...",
  "logs": [...],
  "time_logs": [
    { "date": "2026-01-30", "minutes": 90 }
  ]
}

POST /api/tasks/{TASK_ID}/time_logs
Request: {
  "minutes": 90,
  "note": "Query optimization"
}
```

### Error Handling

- **401**: Invalid API token
- **404**: Task not found
- **400**: Invalid time log data
- **Network**: Connection failures with retry prompts

## User Experience

### Status Bar Integration

- **Display**: `🔖 TRIP-142` when active task detected
- **Click Action**: Opens task details panel
- **Auto-hide**: When no task is detected
- **Context-aware**: Updates on git branch changes

### Command Palette Commands

- `Task: Add Time Log` - Manual time entry
- `Task: Show Current Task` - Open task panel
- `Task: Set API Token` - Configure authentication
- `Task: Set Task ID` - Manual task ID override

### Webview Features

- **Responsive Design**: Adapts to panel size
- **VS Code Theming**: Uses editor color scheme
- **Interactive Elements**: Refresh and add time buttons
- **Information Hierarchy**: Clear separation of task info, logs, and time logs

## Configuration

### Settings

```json
{
  "commutatusTracker.apiUrl": "https://your-commutatus-instance.com"
}
```

### Workspace Settings

- Task ID is cached per workspace
- API token stored globally in secure storage
- Configuration changes trigger automatic re-initialization

## Security Considerations

### What We DON'T Do

- ❌ No automatic time tracking
- ❌ No background timers
- ❌ No keystroke capture
- ❌ No file monitoring
- ❌ No automatic status changes
- ❌ No automatic comments
- ❌ No modifying logs except manual time entry

### What We DO

- ✅ Secure token storage using VS Code SecretStorage
- ✅ Explicit user actions only
- ✅ Read-only task display
- ✅ Manual time entry with confirmation
- ✅ Clear error messages
- ✅ Git branch-based task detection (read-only)

## Development Notes

### TypeScript Configuration

- Strict type checking enabled
- No implicit any types
- Proper error handling with try-catch
- Interface-driven design

### Code Organization

- Single responsibility principle
- Dependency injection pattern
- Clear separation of concerns
- Comprehensive error handling

### Testing Considerations

- Modular design enables unit testing
- Mockable interfaces for API client
- Isolated utility functions
- Error path testing

## Deployment

### Build Process

```bash
npm run compile    # TypeScript compilation
npm run package   # Production build
npm run test      # Run tests
```

### Extension Packaging

- Uses esbuild for fast compilation
- Generates single `dist/extension.js` file
- Includes all dependencies
- Ready for VS Code Marketplace

## Future Enhancements (Non-Goals for MVP)

The current implementation intentionally excludes these features to maintain simplicity and security:

- Automatic time tracking
- Background timers
- Git commit integration
- Task status management
- Automatic comments
- Advanced reporting

These could be considered for future versions with proper security reviews and user consent mechanisms.

## Troubleshooting

### Common Issues

1. **"API URL not configured"** - Set `commutatusTracker.apiUrl` in settings
2. **"No active task found"** - Switch to task branch or set task ID manually
3. **"API token not configured"** - Use "Task: Set API Token" command
4. **"Task not found"** - Verify task ID exists in Commutatus

### Debug Information

Extension logs to VS Code developer console:
- Task detection attempts
- API request/response details
- Error stack traces (sanitized)

## Conclusion

This implementation provides a secure, production-ready VS Code extension that integrates with Commutatus task tracking while maintaining strict security principles. The code is modular, well-typed, and follows VS Code extension best practices.
