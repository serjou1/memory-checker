const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const process = require('process');
const { Telegraf } = require('telegraf');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const botToken = process.env.TELEGRAM_BOT;
const chatId = process.env.CHAT_ID;
const diskThresholdLevel = Number(process.env.DISK_TRESHOLD_LEVEL || process.env.DISK_THRESHOLD_LEVEL || process.env.TRESHOLD_LEVEL);
const memoryThresholdLevel = Number(process.env.MEMORY_TRESHOLD_LEVEL || process.env.MEMORY_THRESHOLD_LEVEL || process.env.TRESHOLD_LEVEL);
const messageThreadId = process.env.MESSAGE_THREAD_ID
  ? Number(process.env.MESSAGE_THREAD_ID)
  : undefined;

if (!botToken) {
  throw new Error('TELEGRAM_BOT is not configured in the environment');
}

if (!chatId) {
  throw new Error('CHAT_ID is not configured in the environment');
}

if (Number.isNaN(diskThresholdLevel)) {
  throw new Error('Disk threshold must be a valid number');
}

if (Number.isNaN(memoryThresholdLevel)) {
  throw new Error('Memory threshold must be a valid number');
}

if (messageThreadId !== undefined && !Number.isSafeInteger(messageThreadId)) {
  throw new Error('MESSAGE_THREAD_ID must be a valid integer');
}

const bot = new Telegraf(botToken);

function formatGigabytes(kilobytes) {
  return (kilobytes / (1024 * 1024)).toFixed(2);
}

function getDiskUsage(targetPath = '/') {
  const dfOutput = execSync(`df -Pk ${targetPath}`).toString().trim().split('\n');
  const fields = dfOutput[dfOutput.length - 1].replace(/\s+/g, ' ').split(' ');

  const totalKilobytes = Number(fields[1]);
  const availableKilobytes = Number(fields[3]);

  if ([totalKilobytes, availableKilobytes].some((value) => Number.isNaN(value))) {
    throw new Error(`Unable to parse disk usage for path: ${targetPath}`);
  }

  const freePercentage = (availableKilobytes / totalKilobytes) * 100;
  const usedPercentage = 100 - freePercentage;

  return { totalKilobytes, availableKilobytes, freePercentage, usedPercentage };
}

function getMemoryUsage() {
  const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
  const values = Object.fromEntries(
    meminfo
      .split('\n')
      .map((line) => line.match(/^([^:]+):\s+(\d+)\s+kB$/))
      .filter(Boolean)
      .map((match) => [match[1], Number(match[2])])
  );

  const totalKilobytes = values.MemTotal;
  const availableKilobytes = values.MemAvailable;

  if ([totalKilobytes, availableKilobytes].some((value) => Number.isNaN(value))) {
    throw new Error('Unable to parse memory usage from /proc/meminfo');
  }

  const freePercentage = (availableKilobytes / totalKilobytes) * 100;
  const usedPercentage = 100 - freePercentage;

  return { totalKilobytes, availableKilobytes, freePercentage, usedPercentage };
}

async function sendAlert(message) {
  await bot.telegram.sendMessage(
    chatId,
    message,
    messageThreadId === undefined ? undefined : { message_thread_id: messageThreadId }
  );
}

async function notifyIfThresholdReached() {
  const disk = getDiskUsage('/');
  const memory = getMemoryUsage();
  const alerts = [];

  if (disk.usedPercentage >= diskThresholdLevel) {
    alerts.push([
      'Disk usage alert',
      'Path: /',
      `Used: ${disk.usedPercentage.toFixed(2)}%`,
      `Free: ${formatGigabytes(disk.availableKilobytes)} GB`,
      `Total: ${formatGigabytes(disk.totalKilobytes)} GB`,
      `Threshold: ${diskThresholdLevel}% used`
    ].join('\n'));
  }

  if (memory.usedPercentage >= memoryThresholdLevel) {
    alerts.push([
      'Memory usage alert',
      `Used: ${memory.usedPercentage.toFixed(2)}%`,
      `Available: ${formatGigabytes(memory.availableKilobytes)} GB`,
      `Total: ${formatGigabytes(memory.totalKilobytes)} GB`,
      `Threshold: ${memoryThresholdLevel}% used`
    ].join('\n'));
  }

  if (alerts.length === 0) {
    console.log(
      `No alert sent. Disk used ${disk.usedPercentage.toFixed(2)}% / threshold ${diskThresholdLevel}%. ` +
      `Memory used ${memory.usedPercentage.toFixed(2)}% / threshold ${memoryThresholdLevel}%.`
    );
    return;
  }

  await sendAlert(alerts.join('\n\n'));
  console.log(`Alert sent to chat ${chatId}. ${alerts.length} threshold(s) reached.`);
}

notifyIfThresholdReached()
  .catch((error) => {
    console.error('Failed to check disk/memory usage or send alert:', error);
    process.exitCode = 1;
  });
