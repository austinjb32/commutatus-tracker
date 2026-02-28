# Commutatus Task Tracker

A VS Code extension for integrating with Commutatus task tracking via API. Features manual time entry with automatic task ID detection from git branches.

## Features

- **Automatic Task ID Detection**: Extracts task IDs from git branch names (e.g., `NCP-2`, `TRIP-142`)
- **Manual Time Entry**: Log time with flexible input formats (90, 1h, 1h 30m, 01:30)
- **Time Rounding**: Automatically rounds time to nearest 15 minutes with confirmation
- **Commit Integration**: Manual command to log time for last commit with commit message as default note
- **Task View Panel**: Shows current task details in activity bar
- **Status Bar**: Displays current task ID in status bar
- **Workspace Storage**: Task IDs stored per workspace (not in settings files)

## Installation

1. Install the extension from VS Code Marketplace
2. Reload VS Code
3. Set up your API token and configure the extension

## Configuration

### Required Setup

1. **Set API Token**:
   - Open Command Palette (Cmd+Shift+P on Mac, Ctrl+Shift+P on Windows/Linux)
   - Type "Task: Set API Token" and press Enter
   - Enter your Commutatus API token when prompted
   - Press Enter to save the token
   - You should see a confirmation message "API token saved successfully"

2. **Configure API URL** (if not using default):
   - Open VS Code Settings (Cmd+, on Mac, File → Preferences → Settings on Windows/Linux)
   - Search for "Commutatus" in the search bar
   - Find "Commutatus Tracker › Api Url"
   - Enter your API endpoint (e.g., `https://api.yourcompany.com`)
   - Settings are saved automatically

### Optional Settings

- **Commutatus Tracker › Api Url**: Base URL for the Commutatus API (default: `https://api.commutatus.com`)

## Usage

### Automatic Task Detection

The extension automatically detects task IDs from your git branch name:
- Branch `NCP-2` → Task ID `NCP-2`
- Branch `feature/NCP-2` → Task ID `NCP-2`
- Branch `bugfix/TRIP-142-query` → Task ID `TRIP-142`

### Manual Time Logging

1. Open Command Palette (Cmd+Shift+P)
2. Run "Task: Add Time Log"
3. Enter what you worked on (note/description)
4. Enter time spent (e.g., `30m`, `1h`, `1h 30m`, `01:30`)
5. Confirm to log the time

### Commit Time Logging

To log time for your most recent commit:

1. Open Command Palette (Cmd+Shift+P)
2. Run "Task: Log Time for Last Commit"
3. The commit message will be pre-filled as the note
4. Enter time spent and confirm

### Time Input Formats

- **Minutes**: `90` (90 minutes)
- **Hours**: `1h` (1 hour)
- **Hours and Minutes**: `1h 30m` (1 hour 30 minutes)
- **Time Format**: `01:30` (1 hour 30 minutes)

### Task View Panel

- Located in the Activity Bar with clock icon
- Shows current task details
- Refreshes automatically when switching branches

### Status Bar

- Shows current task ID when detected
- Click to open the Task View panel
- Updates automatically when switching git branches

## Environment Variables

You can override the default API URL using environment variables:

```bash
export API_URL="https://api.yourcompany.com"
```

Restart VS Code after setting the environment variable.

## Development

### Building

```bash
npm run compile
```

### Watching for Changes

```bash
npm run watch
```

### Packaging

```bash
npm run package
```

## Requirements

- VS Code 1.106.0 or higher
- Git repository (for automatic task ID detection)
- Commutatus API access

## Troubleshooting

### Task ID Not Detected

- Ensure you're in a git repository
- Check that your branch name contains a task ID in format `[A-Z]+-\d+`
- Try manually setting task ID using "Task: Set Task ID" command

### API Token Issues

- Verify your API token is valid
- Check that the API URL is correct
- Ensure you have network access to the API endpoint

### Time Logging Not Working

- Make sure you have a current task ID set
- Verify your API token is configured
- Check the VS Code developer console for error messages

## License

This extension is part of the Commutatus ecosystem.

## Support

For issues and support, please contact the Commutatus team.
