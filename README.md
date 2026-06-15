English | [繁體中文](README.zh-TW.md)

# line-weather-notify-tw

Google Apps Script × Google Calendar × Taiwan CWA API → LINE daily weather reminder

Automatically pushes tomorrow's schedule + weather to your LINE at 20:00 every night — so you know whether to bring an umbrella before you sleep.

> **Taiwan-only.** Uses the [Central Weather Administration (CWA)](https://opendata.cwa.gov.tw/) open data API, which covers all 22 Taiwan counties and cities.

---

## What it does

**20:00 — Two-day preview**
- Tomorrow's Google Calendar events, each with real-time rainfall probability and weather emoji
- Outdoor events (detected by location field or keywords) show weather for that specific location
- Day-after full-day rainfall at 6 time slots (06/09/12/15/18/21)
- Automatic umbrella reminder

**05:00 — Today reminder**
- Same format as the 20:00 message, for the current day

**Sunday 20:00 — Weekly forecast**
- 7-day max daily rainfall for your home district

**Self-scheduling triggers**
- No hourly cron needed. Uses `ScriptApp.newTrigger().timeBased().at()` for ±1 minute accuracy.

---

## Sample output

```
🌙 明日預覽
🌡 中正區
06☀️
09🌤️
12⛅
15🌦20%
18🌧55%
21🌧60%

🗓️ 6/18（三） 行程

☀️
09:00 健身

🌧55% [臺北市大安區]
14:30 下午茶 <> 朋友

18:00 線上讀書會
──────────
☂️ 晚上降雨率高，出門記得帶傘

══════════
📅 後天 6/19（四）
🌡 中正區
06☀️
09☀️
12⛅
15⛅
18☁️
21🌦25%
──────────
出門不用帶傘 ✅
```

---

## Requirements

- A Google account (Google Apps Script is free)
- A [LINE Developers](https://developers.line.biz/) account (free, 200 messages/month on free tier — well within daily usage)
- A [CWA open data](https://opendata.cwa.gov.tw/) account (free API key)

---

## Quick start

### 1. Get your credentials

**Taiwan CWA API Key**
1. Register at [https://opendata.cwa.gov.tw/userLogin](https://opendata.cwa.gov.tw/userLogin)
2. After login, go to "取得授權碼" (Get Authorization Code) and copy your key
3. Format: `CWA-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`

**LINE Messaging API**

You need two values: a Channel Access Token and your LINE User ID.

1. Go to [LINE Developers Console](https://developers.line.biz/) and sign in with your LINE account
2. Create a Provider, then create a **Messaging API** Channel inside it
3. In the Channel settings → Messaging API tab:
   - Click **Issue** under "Channel access token" to get your token
   - Find your **LINE User ID** (format: `Uxxxxxxxxxx`) listed on the same page
4. Add the bot as a friend on LINE (scan the QR code in the Channel settings)

Note: The free plan includes 200 messages/month. This bot sends ~3 messages/day, so you won't exceed the limit.

**Google Calendar ID**
Usually the same as your Gmail address (e.g. `you@gmail.com`). To confirm: Google Calendar → Settings → select your calendar → scroll to "Calendar ID".

### 2. Create a GAS project

Google Apps Script (GAS) is Google's free cloud scripting environment — no server needed, runs entirely in your browser.

1. Go to [https://script.google.com](https://script.google.com) → **New project**
2. Delete the default code, paste the contents of `line_weather_notify.gs`
3. Save the project (Ctrl+S)

### 3. Set Script Properties

Script Properties store credentials securely — they never appear in your code.

GAS editor → left sidebar gear icon (Project Settings) → **Script Properties** → Add property

| Property | Description | Example |
|---|---|---|
| `CWA_API_KEY` | Taiwan CWA API key | `CWA-XXXXXXXX-...` |
| `LINE_CHANNEL_TOKEN` | LINE Channel Access Token | `xxxx...` |
| `LINE_USER_ID` | Your LINE User ID | `Uxxxxxxxxx` |
| `CALENDAR_ID` | Google Calendar ID | `you@gmail.com` |
| `DEFAULT_COUNTY` | Your home county (optional) | `臺北市` |
| `DEFAULT_DISTRICT` | Your home district (optional) | `中正區` |

### 4. Set your home location

`DEFAULT_COUNTY` and `DEFAULT_DISTRICT` define your "home base" — used for the full-day weather summary and as a fallback when an event has no parseable location.

The default is `臺北市` / `中正區`. Change it to your actual neighborhood. All 22 Taiwan counties and their townships are supported. See `COUNTY_DEFAULT_DISTRICT` in the code for one suggested district per county.

### 5. Run the setup

In the GAS editor, select `setupTriggers` from the function dropdown and click **Run**. Authorize the required Google permissions when prompted.

This creates three triggers:
- Tonight at 20:00 (or tomorrow night if already past)
- Tomorrow morning at 05:00
- Next Sunday at 20:00

Each trigger reschedules itself automatically — no further maintenance needed.

---

## How location detection works

An event is treated as "outdoor" if:
1. Its **location field** is non-empty, or
2. Its **title** contains one of the keywords in `OUTDOOR_KEYWORDS` (sports, dining, shopping, medical visits, outings, events)

Location parsing:
- Location field → extract county + district (e.g. `臺北市大安區`)
- Location field has only county (e.g. `台南行` in title) → use that county's default district
- No parseable location → use `DEFAULT_DISTRICT` (no location label shown)

---

## Limitations

- Taiwan only — CWA API covers all 22 counties, no international support
- CWA 3-hour rainfall data covers up to 3 days ahead; the day-after section shows weather only, not per-event
- Requires LINE Messaging API (LINE Notify was discontinued)
- Runs on Google Apps Script — no Node.js packages

---

## AI deployment assistant

This project includes a [`CLAUDE.md`](CLAUDE.md) that AI coding assistants (Claude Code, Cursor, GitHub Copilot) can read to understand the architecture and deploy the project on your behalf.

If you use Claude Code, you can open this project directory and ask:
> "Read CLAUDE.md and help me deploy this LINE weather bot."

The AI will guide you through setting up Script Properties and running `setupTriggers()`.

---

## License

MIT
