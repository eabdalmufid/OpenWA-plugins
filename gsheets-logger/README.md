# Google Sheets Logger

Logs every emitted WhatsApp message event to a Google Sheet via a Google service account.

## What it logs

One row per event, with columns:

```
timestamp | sessionId | event | direction | chatId | from | to | senderName | isGroup | type | body | messageId | ackStatus | error
```

Events captured: `message:received`, `message:sent`, `message:failed`. (`message:ack` is registered for
forward-compatibility but is not emitted by OpenWA 0.5.x, so it produces no rows yet.)

## Setup

1. **Create a Google Cloud project** and enable the **Google Sheets API**.
2. **Create a service account** and download its **JSON key**.
3. **Create your spreadsheet**, then **share it** with the service account's `client_email` as **Editor**.
4. Note the spreadsheet **ID** from the URL: `https://docs.google.com/spreadsheets/d/<ID>/edit`.

## Install

```bash
node package.mjs gsheets-logger    # produces gsheets-logger.zip

curl -X POST "https://your-openwa-host/plugins/install" \
  -H "X-API-Key: <ADMIN_API_KEY>" -F "file=@gsheets-logger.zip"

curl -X PUT "https://your-openwa-host/plugins/gsheets-logger/config" \
  -H "X-API-Key: <ADMIN_API_KEY>" -H "Content-Type: application/json" \
  -d '{ "config": { "spreadsheetId": "<ID>", "serviceAccountJson": "<paste JSON>", "sheetTab": "Logs" } }'

curl -X POST "https://your-openwa-host/plugins/gsheets-logger/enable" \
  -H "X-API-Key: <ADMIN_API_KEY>"
```

## Config reference

| Key | Required | Default | Description |
| --- | -------- | ------- | ----------- |
| `serviceAccountJson` | yes | — | Full service-account key JSON (stored as a secret) |
| `spreadsheetId` | yes | — | Spreadsheet ID from its URL |
| `sheetTab` | no | `Logs` | Target tab name |
| `flushIntervalSec` | no | `5` | Seconds between flushes |
| `flushBatchSize` | no | `20` | Flush early once this many rows are buffered |

## Security

Message content is treated as untrusted. Cells are neutralized against CSV/Sheets formula injection: any
value whose first character is `=`, `-`, `+`, or `@` is prefixed with a single quote (`'`) so Google
Sheets renders it as plain text rather than evaluating it as a formula.

## Notes

- Rows are buffered and flushed in batches; on a Sheets error they are retained and retried. The buffer is
  capped at 5000 rows (oldest dropped past the cap, with a warning).
- Requires the target sheet's first tab/`sheetTab` to exist. Append uses `valueInputOption=RAW`.
