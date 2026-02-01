# Quick Setup Guide

## 1. Configure API URL

Open VS Code Settings and search for "Commutatus":

```json
{
  "commutatusTracker.apiUrl": "https://your-commutatus-instance.com"
}
```

## 2. Set API Token

Open Command Palette (Cmd+Shift+P) and run:
```
Task: Set API Token
```

Enter your Commutatus API token when prompted.

## 3. Start Using

- **Switch to a task branch** (e.g., `feature/TRIP-142`)
- **Status bar** will show: `🔖 TRIP-142`
- **Click status bar** to view task details
- **Add time** via Command Palette: `Task: Add Time Log`

## Time Entry Formats

- `90` - 90 minutes
- `1h` - 1 hour
- `1h 30m` - 1 hour 30 minutes  
- `01:30` - 1 hour 30 minutes

All entries are rounded to 15-minute intervals.

## Manual Task ID

If not on a task branch, set manually:
```
Task: Set Task ID
```

Enter format like: `TRIP-142`
