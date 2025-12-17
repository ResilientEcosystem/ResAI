#!/usr/bin/env node

/**
 * Memory Monitor for Next.js Dev Server
 * Monitors memory usage and sends alerts when thresholds are exceeded
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  thresholdMB: parseInt(process.env.THRESHOLD_MB || '6144', 10), // Default 6GB
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '30', 10) * 1000, // 30 seconds
  alertCooldown: 5 * 60 * 1000, // 5 minutes between alerts
  processName: process.env.PROCESS_NAME || 'next', // Process name to monitor
};

let lastAlertTime = 0;
let peakMemory = 0;

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  reset: '\x1b[0m',
};

/**
 * Get memory usage of processes matching the pattern
 */
async function getProcessMemory(processName) {
  try {
    // Get memory usage in KB, sum all matching processes
    const { stdout } = await execAsync(
      `ps aux | grep -E "${processName}" | grep -v grep | awk '{sum+=\\$6} END {print sum}'`
    );
    const memoryKB = parseInt(stdout.trim(), 10);
    return isNaN(memoryKB) ? 0 : Math.round(memoryKB / 1024); // Convert to MB
  } catch (error) {
    return 0;
  }
}

/**
 * Send alert notification
 */
function sendAlert(memoryMB, thresholdMB) {
  const message = `⚠️ High Memory Usage Alert!\n\nMemory: ${memoryMB}MB\nThreshold: ${thresholdMB}MB\nPeak: ${peakMemory}MB\n\nNext.js dev server is using excessive memory.`;

  // Try different notification methods
  const commands = [
    // Linux (notify-send)
    `notify-send -u critical "Memory Alert" "${message.replace(/\n/g, ' ')}"`,
    // macOS
    `osascript -e 'display notification "${message.replace(/"/g, '\\"')}" with title "Memory Alert"'`,
  ];

  commands.forEach((cmd) => {
    exec(cmd, (error) => {
      // Silently fail if command not available
    });
  });

  // Console alert
  console.log(`${colors.red}[ALERT]${colors.reset} ${message}`);
}

/**
 * Print status with color coding
 */
function printStatus(memoryMB, thresholdMB) {
  const percent = Math.round((memoryMB / thresholdMB) * 100);
  const timestamp = new Date().toLocaleTimeString();

  if (memoryMB > thresholdMB) {
    console.log(
      `${colors.red}[${timestamp}] Memory: ${memoryMB}MB (${percent}% of ${thresholdMB}MB threshold)${colors.reset}`
    );
  } else if (percent > 80) {
    console.log(
      `${colors.yellow}[${timestamp}] Memory: ${memoryMB}MB (${percent}% of ${thresholdMB}MB threshold)${colors.reset}`
    );
  } else {
    console.log(
      `${colors.green}[${timestamp}] Memory: ${memoryMB}MB (${percent}% of ${thresholdMB}MB threshold)${colors.reset}`
    );
  }

  // Track peak memory
  if (memoryMB > peakMemory) {
    peakMemory = memoryMB;
  }
}

/**
 * Main monitoring loop
 */
async function monitor() {
  console.log('Starting memory monitor...');
  console.log(`Threshold: ${CONFIG.thresholdMB}MB`);
  console.log(`Check interval: ${CONFIG.checkInterval / 1000} seconds`);
  console.log(`Monitoring processes: ${CONFIG.processName}`);
  console.log('Press Ctrl+C to stop\n');

  while (true) {
    const memoryMB = await getProcessMemory(CONFIG.processName);

    if (memoryMB > 0) {
      printStatus(memoryMB, CONFIG.thresholdMB);

      // Check if threshold exceeded
      if (memoryMB > CONFIG.thresholdMB) {
        const now = Date.now();
        const timeSinceLastAlert = now - lastAlertTime;

        // Only alert if cooldown period has passed
        if (timeSinceLastAlert > CONFIG.alertCooldown) {
          sendAlert(memoryMB, CONFIG.thresholdMB);
          lastAlertTime = now;
        }
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] No matching processes found`);
    }

    await new Promise((resolve) => setTimeout(resolve, CONFIG.checkInterval));
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\nMonitoring stopped. Peak memory: ${peakMemory}MB`);
  process.exit(0);
});

// Start monitoring
monitor().catch((error) => {
  console.error('Monitor error:', error);
  process.exit(1);
});

