# CLAUDE.md — line-weather-notify

This file is for AI assistants (Claude Code, Cursor, etc.) to understand the project before making changes.

## What this project does

A Google Apps Script that sends daily LINE messages combining Google Calendar events with Taiwan CWA weather forecasts. Three notification modes, all self-scheduling.

## Architecture

```
notifyEvening()  → buildDayPreviewLines(tomorrow) + buildWeatherOnlyLines([dayAfter, dayAfterAfter]) → combined LINE message
notifyMorning()  → runNotify(today) → buildDayPreviewLines(today) → LINE message
notifyWeekly()   → runWeeklyForecast() → fetchWeeklyForecast() → LINE message
```

Each entry function deletes its own trigger first, does its work, then schedules the next run. This is deliberate — it prevents duplicate triggers from accumulating if the function runs twice.

## Key functions

| Function | Purpose |
|---|---|
| `buildDayPreviewLines(apiKey, date, label)` | Returns string[] with full schedule + per-event weather. Used by both notifyEvening and notifyMorning. |
| `buildWeatherOnlyLines(apiKey, dates)` | Returns string[] with one compact line per day (weekly-style). `dates` is `[{date, label}, ...]`. Used for day-after/two-days-out section in notifyEvening. Calls `fetchWeeklyForecast` internally. |
| `buildHomePeriodUmbrella(weather)` | Returns a single umbrella reminder string based on home district rainfall. |
| `fetchWeatherBySlot(apiKey, dateStr, county, district)` | Calls CWA 3-day/3-hour dataset. Returns `{pop: {hour: value}, wx: {hour: value}}`. |
| `fetchWeeklyForecast(apiKey, county, district)` | Calls CWA 7-day/12-hour dataset (3-day ID + 2). Returns `{yyyy-MM-dd: {maxPop, wx}}`. |
| `parseLocation(text)` | Two-pass county+district extraction using string indexOf (not regex). Returns `{county, district, label}` or null. |
| `setupTriggers()` | Run once to bootstrap. After that, functions self-schedule. |

## Design decisions worth knowing

**Weather cache in buildDayPreviewLines:** `weatherCache` keyed by `county|district` prevents duplicate CWA API calls when multiple events are in the same area. Don't remove it.

**7-day dataset = 3-day ID + 2:** CWA assigns sequential dataset IDs. Taipei's 3-day dataset is `F-D0047-061`, so 7-day is `F-D0047-063`. The code derives this with `parseInt + 2`. This rule holds for all 22 counties.

**String indexOf, not regex for county matching:** The location text might be `116台灣臺北市文山區...`. Regex anchoring is tricky; indexOf + slice avoids partial match bugs. Pass 1 looks for county + immediately adjacent district. Pass 2 falls back to county-only.

**`_props` cached at module level:** `PropertiesService.getScriptProperties()` is called once and stored in `_props`. All property reads use `_props.getProperty(...)` to avoid repeated API calls.

## How to deploy (step by step)

1. Go to https://script.google.com → New project
2. Paste the contents of `line_weather_notify.gs`
3. In the editor, open Project Settings (gear icon on left) → Script Properties
4. Add these properties:

   | Key | Value |
   |---|---|
   | `CWA_API_KEY` | From https://opendata.cwa.gov.tw/userLogin |
   | `LINE_CHANNEL_TOKEN` | From LINE Developers Console → Messaging API Channel |
   | `LINE_USER_ID` | Your LINE User ID (format: Uxxxxxxxxxx) |
   | `CALENDAR_ID` | Your Google Calendar ID (usually your Gmail address) |
   | `DEFAULT_COUNTY` | Your home county, e.g. `臺北市` |
   | `DEFAULT_DISTRICT` | Your home district, e.g. `中正區` |

5. Select the `setupTriggers` function and click Run
6. Authorize the required Google permissions when prompted

## Customizing DEFAULT_COUNTY and DEFAULT_DISTRICT

This is the most important customization. It defines "home base" for:
- The full-day weather summary in every message
- Fallback weather when an event has no parseable location

The value must match a real CWA township name. All 22 Taiwan counties are supported. If you're unsure of your township name, check `COUNTY_DEFAULT_DISTRICT` in the code — it lists one default per county.

## What NOT to change

- Do not call `setupTriggers()` inside any of the notify functions. It is only for first-time setup.
- Do not add `.at()` triggers for specific times — the self-scheduling pattern handles this.
- Do not hardcode credentials in the script. Use Script Properties.

## Supported Taiwan counties

All 22 counties/cities in `COUNTY_TO_DATASET`. Dataset IDs follow CWA's official numbering (`F-D0047-001` to `F-D0047-085`, odd numbers, step 4).
