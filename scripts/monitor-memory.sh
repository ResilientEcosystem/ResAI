#!/bin/bash

# Memory Monitor Script
# Monitors Next.js dev server memory usage and alerts when threshold is exceeded

# Configuration
THRESHOLD_MB=${THRESHOLD_MB:-6144}  # Default: 6GB (75% of 8GB)
CHECK_INTERVAL=${CHECK_INTERVAL:-30}  # Check every 30 seconds
ALERT_COMMAND=${ALERT_COMMAND:-"notify-send"}  # Notification command

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to get memory usage of Next.js processes
get_nextjs_memory() {
  # Find all Next.js related processes
  ps aux | grep -E "next|node.*next" | grep -v grep | awk '{sum+=$6} END {print sum/1024}'
}

# Function to send alert
send_alert() {
  local memory_mb=$1
  local threshold_mb=$2
  local message="⚠️ High Memory Usage Alert!\n\nMemory: ${memory_mb}MB\nThreshold: ${threshold_mb}MB\n\nNext.js dev server is using excessive memory."
  
  # Try different notification methods
  if command -v notify-send &> /dev/null; then
    notify-send -u critical "Memory Alert" "$message"
  elif command -v osascript &> /dev/null; then
    osascript -e "display notification \"$message\" with title \"Memory Alert\""
  fi
  
  # Also log to console
  echo -e "${RED}[ALERT]${NC} $message"
  
  # Play system sound if available
  if command -v paplay &> /dev/null; then
    paplay /usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga 2>/dev/null || true
  fi
}

# Function to print status
print_status() {
  local memory_mb=$1
  local threshold_mb=$2
  local percent=$((memory_mb * 100 / threshold_mb))
  
  if [ "$memory_mb" -gt "$threshold_mb" ]; then
    echo -e "${RED}[$(date +%H:%M:%S)] Memory: ${memory_mb}MB (${percent}% of threshold)${NC}"
  elif [ "$percent" -gt 80 ]; then
    echo -e "${YELLOW}[$(date +%H:%M:%S)] Memory: ${memory_mb}MB (${percent}% of threshold)${NC}"
  else
    echo -e "${GREEN}[$(date +%H:%M:%S)] Memory: ${memory_mb}MB (${percent}% of threshold)${NC}"
  fi
}

# Main monitoring loop
echo "Starting memory monitor..."
echo "Threshold: ${THRESHOLD_MB}MB"
echo "Check interval: ${CHECK_INTERVAL} seconds"
echo "Press Ctrl+C to stop"
echo ""

last_alert_time=0
ALERT_COOLDOWN=300  # 5 minutes between alerts

while true; do
  memory_mb=$(get_nextjs_memory | awk '{print int($1)}')
  
  if [ -n "$memory_mb" ] && [ "$memory_mb" != "0" ]; then
    print_status "$memory_mb" "$THRESHOLD_MB"
    
    # Check if threshold exceeded
    if [ "$memory_mb" -gt "$THRESHOLD_MB" ]; then
      current_time=$(date +%s)
      time_since_last_alert=$((current_time - last_alert_time))
      
      # Only alert if cooldown period has passed
      if [ "$time_since_last_alert" -gt "$ALERT_COOLDOWN" ]; then
        send_alert "$memory_mb" "$THRESHOLD_MB"
        last_alert_time=$current_time
      fi
    fi
  else
    echo "[$(date +%H:%M:%S)] No Next.js processes found"
  fi
  
  sleep "$CHECK_INTERVAL"
done

