const { execSync } = require('child_process');
const path = require('path');
const process = require('process');
const { Telegraf } = require('telegraf');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const botToken = process.env.TELEGRAM_BOT;
const chatId = process.env.CHAT_ID;
const thresholdLevel = Number(process.env.TRESHOLD_LEVEL);

if (!botToken) {
  throw new Error('TELEGRAM_BOT is not configured in the environment');
}

if (!chatId) {
  throw new Error('CHAT_ID is not configured in the environment');
}

if (Number.isNaN(thresholdLevel)) {
  throw new Error('TRESHOLD_LEVEL must be a valid number');
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

  return { totalKilobytes, availableKilobytes, freePercentage };
}

async function notifyIfThresholdReached() {
  const { totalKilobytes, availableKilobytes, freePercentage } = getDiskUsage('/');
  const roundedPercentage = freePercentage.toFixed(2);

  if (freePercentage <= 100 - thresholdLevel) {
    const message = [
      `📦 Free disk space alert`,
      `Path: /`,
      `Free: ${formatGigabytes(availableKilobytes)} GB`,
      `Total: ${formatGigabytes(totalKilobytes)} GB`,
      `Free percentage: ${roundedPercentage}%`,
      `Threshold: ${100 - thresholdLevel}%`
    ].join('\n');

    await bot.telegram.sendMessage(chatId, message);
    console.log(`Alert sent to chat ${chatId}. Free space at ${roundedPercentage}%`);
  } else {
    console.log(
      `No alert sent. Free space (${roundedPercentage}%) is below threshold (${thresholdLevel}%).`
    );
  }
}

notifyIfThresholdReached()
  .catch((error) => {
    console.error('Failed to check disk space or send alert:', error);
    process.exitCode = 1;
  });
