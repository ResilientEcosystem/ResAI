# Memory Monitoring Guide

This guide explains how to monitor and receive alerts for high RAM usage in your Next.js development environment.

## Quick Start

### Option 1: Node.js Monitor (Recommended)

```bash
# Basic usage (default: 6GB threshold, checks every 30 seconds)
pnpm monitor:memory

# Custom threshold and interval
THRESHOLD_MB=8192 CHECK_INTERVAL=60 pnpm monitor:memory
```

### Option 2: Shell Script Monitor

```bash
# Basic usage
./scripts/monitor-memory.sh

# Custom configuration
THRESHOLD_MB=8192 CHECK_INTERVAL=60 ./scripts/monitor-memory.sh
```

## Configuration

### Environment Variables

- `THRESHOLD_MB`: Memory threshold in MB (default: 6144 = 6GB)
- `CHECK_INTERVAL`: Check interval in seconds (default: 30)
- `PROCESS_NAME`: Process name pattern to monitor (default: "next")

### Examples

```bash
# Monitor with 8GB threshold
THRESHOLD_MB=8192 pnpm monitor:memory

# Check every 10 seconds
CHECK_INTERVAL=10 pnpm monitor:memory

# Monitor specific process pattern
PROCESS_NAME="next-server" pnpm monitor:memory

# All options combined
THRESHOLD_MB=8192 CHECK_INTERVAL=60 PROCESS_NAME="next" pnpm monitor:memory
```

## How It Works

The monitor:
1. Checks memory usage of Next.js processes every N seconds
2. Displays color-coded status:
   - 🟢 Green: Below 80% of threshold
   - 🟡 Yellow: 80-100% of threshold
   - 🔴 Red: Exceeds threshold
3. Sends alerts when threshold is exceeded (with 5-minute cooldown)
4. Tracks peak memory usage

## Alert Methods

The monitor attempts to use these notification methods (in order):

1. **Linux**: `notify-send` (desktop notifications)
2. **macOS**: `osascript` (macOS notifications)

If neither is available, alerts are only shown in the console.

## Integration with Dev Server

### Run in Separate Terminal

```bash
# Terminal 1: Start dev server
pnpm dev

# Terminal 2: Start monitor
pnpm monitor:memory
```

### Run in Background

```bash
# Start monitor in background
pnpm monitor:memory > memory.log 2>&1 &

# View logs
tail -f memory.log

# Stop monitor
pkill -f monitor-memory-node
```

### Using Screen/Tmux

```bash
# Using screen
screen -S dev
pnpm dev
# Press Ctrl+A then D to detach

screen -S monitor
pnpm monitor:memory
# Press Ctrl+A then D to detach

# Reattach later
screen -r dev
screen -r monitor
```

## Recommended Thresholds

| System RAM | Recommended Threshold | Reason |
|------------|----------------------|--------|
| 8GB        | 6GB (6144MB)         | 75% - leaves room for OS |
| 16GB       | 12GB (12288MB)       | 75% - comfortable buffer |
| 32GB       | 24GB (24576MB)       | 75% - development safe |

## Troubleshooting

### No notifications appearing

- Install notification daemon:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install libnotify-bin
  
  # macOS (usually pre-installed)
  # Should work out of the box
  ```

### Monitor not finding processes

- Check if processes are running:
  ```bash
  ps aux | grep next
  ```
- Adjust `PROCESS_NAME` to match your process:
  ```bash
  PROCESS_NAME="node.*next" pnpm monitor:memory
  ```

### Too many alerts

- Increase `CHECK_INTERVAL` to check less frequently
- Increase `THRESHOLD_MB` if 6GB is too low for your workflow

## Advanced Usage

### Custom Alert Script

Create a custom alert script and use it:

```bash
# custom-alert.sh
#!/bin/bash
echo "Memory alert: $1 MB" | mail -s "Memory Alert" your-email@example.com
```

```bash
ALERT_COMMAND="./custom-alert.sh" ./scripts/monitor-memory.sh
```

### Integration with CI/CD

You can use the monitor in CI to fail builds on high memory:

```bash
# Exit with error code if memory exceeds threshold
THRESHOLD_MB=8192 node scripts/monitor-memory-node.js || exit 1
```

