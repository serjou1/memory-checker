# Memory Checker

Simple Node.js script that monitors free disk space on the root filesystem and sends a Telegram message when the free percentage crosses a configured threshold. Messages are sent using the [Telegraf](https://telegraf.js.org/) library.

## Configuration

Copy `.env.example` to `.env` and set your values:

```
TELEGRAM_BOT=your-telegram-bot-token
CHAT_ID=chat-id-to-notify
TRESHOLD_LEVEL=75
```

- **TELEGRAM_BOT**: Token for your Telegram bot.
- **CHAT_ID**: Chat ID that should receive alerts.
- **TRESHOLD_LEVEL**: Free disk percentage threshold that triggers an alert. An alert is sent when free space is greater than or equal to this value.

## Usage

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the check manually:

   ```bash
   npm run check-space
   ```

3. Install a cron job to run every 5 minutes:

   ```bash
   ./setup-cron.sh
   ```

The cron job changes into the project directory, runs `node index.js`, and logs output to `cron.log` in the same directory.

The script checks the root path (`/`). If free space meets or exceeds the threshold, a Telegram message is sent with total and free disk space details.
