// LINE Weather Reminder — Google Apps Script
// v1.9.0
// Sends daily LINE messages with schedule + weather from Taiwan CWA API
// Three modes: 20:00 two-day preview, 05:00 today reminder, Sunday 20:00 weekly forecast
// Self-scheduling triggers (.at()), accuracy ±1 minute

// ─────────────────────────────────────────────
//  REQUIRED SETUP: Script Properties
//  GAS Editor → Project Settings (gear icon) → Script Properties
//
//  Required:
//    CWA_API_KEY         — Taiwan CWA open data API key
//    LINE_CHANNEL_TOKEN  — LINE Messaging API Channel Access Token
//    LINE_USER_ID        — LINE User ID to receive messages
//    CALENDAR_ID         — Your Google Calendar ID (usually your Gmail address)
//
//  Optional (override defaults):
//    DEFAULT_COUNTY      — e.g. 臺北市 (default)
//    DEFAULT_DISTRICT    — e.g. 中正區 (default)
//
//  See README.md for step-by-step instructions to get each credential.
// ─────────────────────────────────────────────

const _props = PropertiesService.getScriptProperties();

const DEFAULT_COUNTY   = _props.getProperty('DEFAULT_COUNTY')   || '臺北市';
const DEFAULT_DISTRICT = _props.getProperty('DEFAULT_DISTRICT') || '中正區';
const CALENDAR_ID      = _props.getProperty('CALENDAR_ID')      || '';

const OUTDOOR_KEYWORDS = [
  // Sports
  '跑步', '跑', '晨跑', '健跑', '慢跑', '騎車', '騎行', '單車', '腳踏車',
  '游泳', '籃球', '羽毛球', '羽球', '排球', '匹克球', '網球', '桌球',
  '運動', '健身', '爬山', '健行', '散步',
  // Dining & social
  '吃飯', '午餐', '晚餐', '早餐', '咖啡', '餐廳', '聚餐', '飯局', '下午茶', '聚',
  // Shopping
  '市場', '採買', '採購', 'Costco', 'costco',
  // Medical
  '回診', '門診', '看診', '醫院',
  // Visits & outings
  '拜訪', '見面', '外出', '出門', '參觀', '參加', '出差', '學長',
  // Events
  '活動', '演講', '論壇', '展覽', '演唱會', '演唱', '比賽', '典禮', '婚禮', '喜宴',
  '入場', '專場', '看展',
];

// Taiwan counties → CWA township weather dataset IDs (3-day / 3-hour rainfall)
const COUNTY_TO_DATASET = {
  '宜蘭縣': 'F-D0047-001',
  '桃園市': 'F-D0047-005',
  '新竹縣': 'F-D0047-009',
  '苗栗縣': 'F-D0047-013',
  '彰化縣': 'F-D0047-017',
  '南投縣': 'F-D0047-021',
  '雲林縣': 'F-D0047-025',
  '嘉義縣': 'F-D0047-029',
  '屏東縣': 'F-D0047-033',
  '臺東縣': 'F-D0047-037',
  '花蓮縣': 'F-D0047-041',
  '澎湖縣': 'F-D0047-045',
  '基隆市': 'F-D0047-049',
  '新竹市': 'F-D0047-053',
  '嘉義市': 'F-D0047-057',
  '臺北市': 'F-D0047-061',
  '高雄市': 'F-D0047-065',
  '新北市': 'F-D0047-069',
  '臺中市': 'F-D0047-073',
  '臺南市': 'F-D0047-077',
  '連江縣': 'F-D0047-081',
  '金門縣': 'F-D0047-085',
};

// Input county name → CWA canonical county name (handles simplified / traditional variants)
const COUNTY_ALIASES = {
  '台北': '臺北市', '臺北': '臺北市', '台北市': '臺北市', '臺北市': '臺北市',
  '新北': '新北市', '新北市': '新北市',
  '桃園': '桃園市', '桃園市': '桃園市',
  '台中': '臺中市', '臺中': '臺中市', '台中市': '臺中市', '臺中市': '臺中市',
  '台南': '臺南市', '臺南': '臺南市', '台南市': '臺南市', '臺南市': '臺南市',
  '高雄': '高雄市', '高雄市': '高雄市',
  '基隆': '基隆市', '基隆市': '基隆市',
  '新竹市': '新竹市', '新竹縣': '新竹縣', '新竹': '新竹市',
  '苗栗': '苗栗縣', '苗栗縣': '苗栗縣',
  '彰化': '彰化縣', '彰化縣': '彰化縣',
  '南投': '南投縣', '南投縣': '南投縣',
  '雲林': '雲林縣', '雲林縣': '雲林縣',
  '嘉義市': '嘉義市', '嘉義縣': '嘉義縣', '嘉義': '嘉義市',
  '屏東': '屏東縣', '屏東縣': '屏東縣',
  '宜蘭': '宜蘭縣', '宜蘭縣': '宜蘭縣',
  '花蓮': '花蓮縣', '花蓮縣': '花蓮縣',
  '台東': '臺東縣', '臺東': '臺東縣', '台東縣': '臺東縣', '臺東縣': '臺東縣',
  '澎湖': '澎湖縣', '澎湖縣': '澎湖縣',
  '金門': '金門縣', '金門縣': '金門縣',
  '連江': '連江縣', '馬祖': '連江縣',
};

// Default township when only county is known
const COUNTY_DEFAULT_DISTRICT = {
  '臺北市': '中正區', '新北市': '板橋區', '桃園市': '桃園區',
  '臺中市': '西區',   '臺南市': '中西區', '高雄市': '前金區',
  '基隆市': '仁愛區', '新竹市': '東區',   '新竹縣': '竹北市',
  '苗栗縣': '苗栗市', '彰化縣': '彰化市', '南投縣': '南投市',
  '雲林縣': '斗六市', '嘉義市': '西區',   '嘉義縣': '太保市',
  '屏東縣': '屏東市', '宜蘭縣': '宜蘭市', '花蓮縣': '花蓮市',
  '臺東縣': '台東市', '澎湖縣': '馬公市', '金門縣': '金城鎮',
  '連江縣': '南竿鄉',
};

function isOutdoor(event) {
  if (event.getLocation()) return true;
  const title = event.getTitle();
  return OUTDOOR_KEYWORDS.some(kw => title.includes(kw));
}

// Parse a location string, return {county, district, label} or null.
// Uses string indexOf (not regex) to avoid partial match issues like 「台灣臺北市」→「灣臺北市」
function parseLocation(text) {
  if (!text) return null;

  const sortedAliases = Object.entries(COUNTY_ALIASES).sort((a, b) => b[0].length - a[0].length);

  // Pass 1: county + district together (e.g. 臺北市文山區)
  for (const [alias, county] of sortedAliases) {
    const idx = text.indexOf(alias);
    if (idx === -1) continue;
    const afterCounty   = text.slice(idx + alias.length);
    const districtMatch = afterCounty.match(/^([^\s]{1,4}[區鄉鎮市])/);
    if (districtMatch && COUNTY_TO_DATASET[county]) {
      return { county, district: districtMatch[1], label: county + districtMatch[1] };
    }
  }

  // Pass 2: county only (e.g. 台南行) → use county default district
  for (const [alias, county] of sortedAliases) {
    if (text.includes(alias)) {
      const district = COUNTY_DEFAULT_DISTRICT[county];
      if (district) return { county, district, label: county };
    }
  }

  return null;
}

// Get weather query location for an event: location field → title → DEFAULT_DISTRICT
function getWeatherLocation(event) {
  const fromLocation = parseLocation(event.getLocation());
  if (fromLocation) return fromLocation;

  const fromTitle = parseLocation(event.getTitle());
  if (fromTitle) return fromTitle;

  return { county: DEFAULT_COUNTY, district: DEFAULT_DISTRICT, label: null };
}

// Weather description string → emoji (rain already handled by pop; this covers non-rain conditions)
function wxToEmoji(wx) {
  if (!wx) return '';
  if (wx.includes('雨') || wx.includes('雷')) return '';
  if (wx.includes('晴') && wx.includes('多雲')) return '🌤️';
  if (wx.includes('晴')) return '☀️';
  if (wx.includes('多雲')) return '⛅';
  if (wx.includes('陰')) return '☁️';
  return '';
}

// ── Entry: 20:00 — tomorrow schedule + weather, plus day-after weather preview ──
function notifyEvening() {
  Logger.log('=== LINE Weather Reminder v1.9.0 notifyEvening START ===');
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'notifyEvening')
    .forEach(t => ScriptApp.deleteTrigger(t));

  const lineToken  = _props.getProperty('LINE_CHANNEL_TOKEN');
  const lineUserId = _props.getProperty('LINE_USER_ID');
  const apiKey     = _props.getProperty('CWA_API_KEY');

  if (!lineToken || !lineUserId || !apiKey) {
    Logger.log('Missing required Script Properties. See README for setup instructions.');
    return;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  const tomorrowLines = buildDayPreviewLines(apiKey, tomorrow, '🌙 明日預覽');
  const dayAfterLines = buildWeatherOnlyLines(apiKey, dayAfter);
  const combined      = tomorrowLines.concat(['', '══════════'], dayAfterLines).join('\n');

  sendLineMessage(lineToken, lineUserId, combined);
  Logger.log('notifyEvening sent two-day preview');

  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(20, 0, 0, 0);
  ScriptApp.newTrigger('notifyEvening').timeBased().at(next).create();
  Logger.log('Next notifyEvening scheduled: ' + next);
}

// ── Entry: 05:00 — today schedule reminder ──
function notifyMorning() {
  Logger.log('=== LINE Weather Reminder v1.9.0 notifyMorning START ===');
  runNotify(new Date(), '☀️ 今日提醒');
  scheduleNextTrigger('notifyMorning', 5, 0);
}

// ── Entry: Sunday 20:00 — 7-day rainfall forecast ──
function notifyWeekly() {
  Logger.log('=== LINE Weather Reminder v1.9.0 notifyWeekly START ===');
  runWeeklyForecast();
  scheduleNextWeeklyTrigger();
}

// ── Self-scheduling: reschedule same function for tomorrow ──
function scheduleNextTrigger(fnName, hour, minute) {
  minute = (minute === undefined) ? 0 : minute;
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === fnName)
    .forEach(t => ScriptApp.deleteTrigger(t));

  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(hour, minute, 0, 0);
  ScriptApp.newTrigger(fnName).timeBased().at(next).create();
  Logger.log('Next ' + fnName + ' scheduled: ' + next);
}

// ── Self-scheduling: reschedule notifyWeekly for next Sunday 20:00 ──
function scheduleNextWeeklyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'notifyWeekly')
    .forEach(t => ScriptApp.deleteTrigger(t));

  const next = new Date();
  const daysUntilSunday = (7 - next.getDay()) % 7 || 7;
  next.setDate(next.getDate() + daysUntilSunday);
  next.setHours(20, 0, 0, 0);
  ScriptApp.newTrigger('notifyWeekly').timeBased().at(next).create();
  Logger.log('Next notifyWeekly scheduled: ' + next);
}

// ── Sends a single-day preview (used by notifyMorning) ──
function runNotify(targetDate, label) {
  const lineToken  = _props.getProperty('LINE_CHANNEL_TOKEN');
  const lineUserId = _props.getProperty('LINE_USER_ID');
  const apiKey     = _props.getProperty('CWA_API_KEY');

  if (!lineToken || !lineUserId || !apiKey) {
    Logger.log('Missing required Script Properties. See README for setup instructions.');
    return;
  }

  const lines = buildDayPreviewLines(apiKey, targetDate, label);
  sendLineMessage(lineToken, lineUserId, lines.join('\n'));

  const dayMap        = { Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六' };
  const dayEn         = Utilities.formatDate(targetDate, 'Asia/Taipei', 'EEE');
  const targetDisplay = Utilities.formatDate(targetDate, 'Asia/Taipei', 'M/d') + '（' + (dayMap[dayEn] || dayEn) + '）';
  Logger.log('Sent preview for: ' + targetDisplay);
}

// ── Build full single-day preview lines (schedule + per-event weather) ──
function buildDayPreviewLines(apiKey, targetDate, label) {
  const targetStr     = Utilities.formatDate(targetDate, 'Asia/Taipei', 'yyyy-MM-dd');
  const dayMap        = { Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六' };
  const dayEn         = Utilities.formatDate(targetDate, 'Asia/Taipei', 'EEE');
  const targetDisplay = Utilities.formatDate(targetDate, 'Asia/Taipei', 'M/d') + '（' + (dayMap[dayEn] || dayEn) + '）';
  const targetStart   = new Date(targetStr + 'T00:00:00+08:00');
  const targetEnd     = new Date(targetStr + 'T23:59:59+08:00');

  const homeWeather = fetchWeatherBySlot(apiKey, targetStr, DEFAULT_COUNTY, DEFAULT_DISTRICT);
  const homeSummary = buildHomeWeatherSummary(homeWeather);
  const headerLines = [label, '🌡 ' + DEFAULT_DISTRICT, homeSummary];

  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const events = calendar.getEvents(targetStart, targetEnd)
    .sort((a, b) => {
      const aTime = a.isAllDayEvent() ? -1 : a.getStartTime().getTime();
      const bTime = b.isAllDayEvent() ? -1 : b.getStartTime().getTime();
      return aTime - bTime;
    });

  if (events.length === 0) {
    return headerLines.concat(['', '🗓️ ' + targetDisplay + ' 無行程', '──────────', buildHomePeriodUmbrella(homeWeather)]);
  }

  // Weather cache to avoid duplicate API calls for the same location
  const weatherCache = {};
  weatherCache[DEFAULT_COUNTY + '|' + DEFAULT_DISTRICT] = homeWeather;
  events.forEach(event => {
    if (!isOutdoor(event) || event.isAllDayEvent()) return;
    const loc = getWeatherLocation(event);
    const key = loc.county + '|' + loc.district;
    if (!weatherCache[key]) {
      weatherCache[key] = fetchWeatherBySlot(apiKey, targetStr, loc.county, loc.district);
    }
  });

  const lines         = headerLines.concat(['', '🗓️ ' + targetDisplay + ' 行程']);
  const umbrellaTimes = [];

  events.forEach(event => {
    lines.push('');
    const title    = event.getTitle();
    const isAllDay = event.isAllDayEvent();
    const timeStr  = isAllDay
      ? '全天'
      : Utilities.formatDate(event.getStartTime(), 'Asia/Taipei', 'HH:mm');

    if (isOutdoor(event) && !isAllDay) {
      const loc     = getWeatherLocation(event);
      const key     = loc.county + '|' + loc.district;
      const weather = weatherCache[key] || { pop: {}, wx: {} };
      const hour    = parseInt(Utilities.formatDate(event.getStartTime(), 'Asia/Taipei', 'HH'));
      const pop     = getAtSlot(weather.pop, hour, 3);
      const wxEmoji = wxToEmoji(getAtSlot(weather.wx, hour, 6));
      const locTag  = loc.label ? ' [' + loc.label + ']' : '';

      let weatherLine;
      if (pop !== null && pop > 30) {
        weatherLine = '🌧' + pop + '%' + locTag;
        umbrellaTimes.push(timeStr + (loc.label ? '(' + loc.label + ')' : ''));
      } else if (pop !== null && pop > 15) {
        weatherLine = '🌦' + pop + '%' + locTag;
      } else {
        const info = (wxEmoji || '') + locTag;
        weatherLine = info.trim() || null;
      }
      if (weatherLine) lines.push(weatherLine);
      lines.push(timeStr + ' ' + title);
    } else {
      lines.push(timeStr + ' ' + title);
    }
  });

  lines.push('──────────');
  if (umbrellaTimes.length > 0) {
    lines.push('☂️ 帶傘提醒：' + umbrellaTimes.join(', '));
  } else {
    lines.push(buildHomePeriodUmbrella(homeWeather));
  }

  return lines;
}

// ── Build weather-only lines for day-after (no schedule) ──
function buildWeatherOnlyLines(apiKey, targetDate) {
  const dateStr    = Utilities.formatDate(targetDate, 'Asia/Taipei', 'yyyy-MM-dd');
  const dayMap     = { Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六' };
  const dayEn      = Utilities.formatDate(targetDate, 'Asia/Taipei', 'EEE');
  const displayStr = Utilities.formatDate(targetDate, 'Asia/Taipei', 'M/d') + '（' + (dayMap[dayEn] || dayEn) + '）';

  const weather = fetchWeatherBySlot(apiKey, dateStr, DEFAULT_COUNTY, DEFAULT_DISTRICT);
  const lines   = ['📅 後天 ' + displayStr, '🌡 ' + DEFAULT_DISTRICT, buildHomeWeatherSummary(weather)];
  lines.push('──────────');
  lines.push(buildHomePeriodUmbrella(weather));
  return lines;
}

// ── Build umbrella reminder based on home district rainfall ──
function buildHomePeriodUmbrella(weather) {
  const HOUR_TO_PERIOD = { 6: '早上', 9: '早上', 12: '下午', 15: '下午', 18: '晚上', 21: '晚上' };
  const homeRainHours  = [6, 9, 12, 15, 18, 21].filter(h => {
    const pop = getAtSlot(weather.pop, h, 3);
    return pop !== null && pop > 30;
  });
  const homePeriods   = [...new Set(homeRainHours.map(h => HOUR_TO_PERIOD[h]))];
  const homePeriodStr = homePeriods.length === 3 ? '全天' : homePeriods.join('');
  return homePeriods.length > 0
    ? '☂️ ' + homePeriodStr + '降雨率高，出門記得帶傘'
    : '出門不用帶傘 ✅';
}

// Full-day weather summary for home district (06–21, every 3 hours)
function buildHomeWeatherSummary(weather) {
  const slots = [6, 9, 12, 15, 18, 21];
  return slots.map(hour => {
    const pop     = getAtSlot(weather.pop, hour, 3);
    const wxEmoji = wxToEmoji(getAtSlot(weather.wx, hour, 6));
    const label   = String(hour).padStart(2, '0');
    if (pop !== null && pop > 30) return label + '🌧' + pop + '%';
    if (pop !== null && pop > 15) return label + '🌦' + pop + '%';
    return label + (wxEmoji || '—');
  }).join('\n');
}

// ── Weekly 7-day rainfall forecast (Sunday 20:00) ──
function runWeeklyForecast() {
  const lineToken  = _props.getProperty('LINE_CHANNEL_TOKEN');
  const lineUserId = _props.getProperty('LINE_USER_ID');
  const apiKey     = _props.getProperty('CWA_API_KEY');
  if (!lineToken || !lineUserId || !apiKey) {
    Logger.log('notifyWeekly: missing required Script Properties');
    return;
  }

  const daily  = fetchWeeklyForecast(apiKey, DEFAULT_COUNTY, DEFAULT_DISTRICT);
  const dayMap = { Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六' };
  const lines  = ['📅 本週降雨預告', '🌡 ' + DEFAULT_DISTRICT + '（未來 7 天）', ''];

  for (let i = 1; i <= 7; i++) {
    const d          = new Date();
    d.setDate(d.getDate() + i);
    const dateStr    = Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
    const displayStr = Utilities.formatDate(d, 'Asia/Taipei', 'M/d');
    const dayZh      = dayMap[Utilities.formatDate(d, 'Asia/Taipei', 'EEE')] || '';

    const info = daily[dateStr];
    if (!info) { lines.push(displayStr + '（' + dayZh + '）—'); continue; }

    const { maxPop, wx } = info;
    let entry;
    if (maxPop > 30)      entry = '🌧 ' + maxPop + '%';
    else if (maxPop > 15) entry = '🌦 ' + maxPop + '%';
    else                  entry = (wxToEmoji(wx) || '☀️');

    lines.push(displayStr + '（' + dayZh + '）' + entry);
  }

  sendLineMessage(lineToken, lineUserId, lines.join('\n'));
  Logger.log('Sent weekly rainfall forecast');
}

// Fetch 7-day forecast (12-hour slots, datasetId = 3-day ID + 2)
// Returns { 'yyyy-MM-dd': { maxPop: number, wx: string|null } }
function fetchWeeklyForecast(apiKey, county, district) {
  const base      = COUNTY_TO_DATASET[county] || COUNTY_TO_DATASET[DEFAULT_COUNTY];
  const num       = parseInt(base.replace('F-D0047-', ''));
  const datasetId = 'F-D0047-' + String(num + 2).padStart(3, '0');

  const url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/' + datasetId
    + '?Authorization=' + apiKey
    + '&locationName=' + encodeURIComponent(district)
    + '&elementName=' + encodeURIComponent('天氣現象,降雨機率,12小時降雨機率');

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data     = JSON.parse(response.getContentText());
  if (data.success !== 'true') return {};

  const locations = (data.records.Locations || [{}])[0].Location;
  if (!locations) return {};
  const location = locations.find(l => l.LocationName === district);
  if (!location) return {};

  const elMap = {};
  location.WeatherElement.forEach(e => { elMap[e.ElementName] = e.Time; });
  Logger.log('fetchWeeklyForecast elements: ' + Object.keys(elMap).join(', '));

  const daily = {};

  // 7-day API uses 「12小時降雨機率」; 3-day uses 「降雨機率」 — try both
  (elMap['12小時降雨機率'] || elMap['降雨機率'] || []).forEach(t => {
    const dt   = new Date(t.StartTime);
    const date = Utilities.formatDate(dt, 'Asia/Taipei', 'yyyy-MM-dd');
    const val  = parseInt((t.ElementValue[0] || {}).ProbabilityOfPrecipitation);
    if (isNaN(val)) return;
    if (!daily[date]) daily[date] = { maxPop: 0, wx: null };
    if (val > daily[date].maxPop) daily[date].maxPop = val;
  });

  // Use 06:00 slot as representative weather for each day
  (elMap['天氣現象'] || []).forEach(t => {
    const dt   = new Date(t.StartTime);
    const date = Utilities.formatDate(dt, 'Asia/Taipei', 'yyyy-MM-dd');
    const hour = parseInt(Utilities.formatDate(dt, 'Asia/Taipei', 'HH'));
    if (hour !== 6) return;
    const wx = (t.ElementValue[0] || {}).Weather;
    if (!daily[date]) daily[date] = { maxPop: 0, wx: null };
    if (wx) daily[date].wx = wx;
  });

  return daily;
}

function fetchWeatherBySlot(apiKey, dateStr, county, district) {
  const datasetId = COUNTY_TO_DATASET[county] || COUNTY_TO_DATASET[DEFAULT_COUNTY];
  const url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/' + datasetId
    + '?Authorization=' + apiKey
    + '&locationName=' + encodeURIComponent(district)
    + '&elementName=' + encodeURIComponent('3小時降雨機率,天氣現象');

  Logger.log('fetchWeatherBySlot: ' + county + ' ' + district + ' ' + dateStr);
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(response.getContentText());
  if (data.success !== 'true') return { pop: {}, wx: {} };

  const location = data.records.Locations[0].Location.find(l => l.LocationName === district);
  if (!location) return { pop: {}, wx: {} };

  const elMap = {};
  location.WeatherElement.forEach(e => { elMap[e.ElementName] = e.Time; });

  function parseToMap(times, valueKey) {
    const map = {};
    (times || []).forEach(t => {
      const dt   = new Date(t.StartTime || t.DataTime);
      const date = Utilities.formatDate(dt, 'Asia/Taipei', 'yyyy-MM-dd');
      if (date !== dateStr) return;
      const hour = parseInt(Utilities.formatDate(dt, 'Asia/Taipei', 'HH'));
      const val  = t.ElementValue[0][valueKey];
      if (val !== undefined && val !== '') map[hour] = val;
    });
    return map;
  }

  return {
    pop: parseToMap(elMap['3小時降雨機率'], 'ProbabilityOfPrecipitation'),
    wx:  parseToMap(elMap['天氣現象'],       'Weather'),
  };
}

// slotSize: 3 for pop, 6 for wx
function getAtSlot(map, hour, slotSize) {
  const slotHour = Math.floor(hour / slotSize) * slotSize;
  return map[slotHour] !== undefined ? map[slotHour] : null;
}

function sendLineMessage(token, userId, message) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: message }],
    }),
    muteHttpExceptions: true,
  });
}

// ── First-time setup: run once to create all triggers ──
function setupTriggers() {
  ['notifyEvening', 'notifyMorning', 'notifyWeekly'].forEach(fn => {
    ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === fn)
      .forEach(t => ScriptApp.deleteTrigger(t));
  });

  const now = new Date();

  // 20:00 today (or tomorrow if already past)
  const evening = new Date(now);
  evening.setHours(20, 0, 0, 0);
  if (evening <= now) evening.setDate(evening.getDate() + 1);
  ScriptApp.newTrigger('notifyEvening').timeBased().at(evening).create();

  // 05:00 tomorrow
  const morning = new Date(now);
  morning.setDate(morning.getDate() + 1);
  morning.setHours(5, 0, 0, 0);
  ScriptApp.newTrigger('notifyMorning').timeBased().at(morning).create();

  // Next Sunday 20:00
  const sunday = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  sunday.setDate(sunday.getDate() + daysUntilSunday);
  sunday.setHours(20, 0, 0, 0);
  ScriptApp.newTrigger('notifyWeekly').timeBased().at(sunday).create();

  Logger.log('Triggers set:\n  notifyEvening @ ' + evening + '\n  notifyMorning @ ' + morning + '\n  notifyWeekly @ ' + sunday);
}

// ── Debug: test location parsing logic ──
function debugTestLocationParsing() {
  const cases = [
    '台南市東區民族路三段1號',
    '宜蘭縣礁溪鄉',
    '高雄市左營區',
    '台南行',
    '宜蘭出差',
    '台北市信義區',
    '116台灣臺北市文山區木柵路三段96號B1',
    'World Gym Express 台北木柵店\n116台灣臺北市文山區木柵路三段96號B1',
    '', null,
  ];
  const lines = ['=== debugTestLocationParsing ==='];
  cases.forEach(text => {
    const result = parseLocation(text);
    lines.push(result
      ? JSON.stringify(text) + ' → ' + result.county + ' ' + result.district + ' label=' + result.label
      : JSON.stringify(text) + ' → null (using DEFAULT_DISTRICT)');
  });
  Logger.log(lines.join('\n'));
}

// ── Debug: list recent 30-day events to tune OUTDOOR_KEYWORDS ──
function debugListRecentEvents() {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const start    = new Date();
  start.setDate(start.getDate() - 30);
  const events   = calendar.getEvents(start, new Date());
  const output   = events.map(e => e.getTitle() + (e.getLocation() ? ' [loc: ' + e.getLocation() + ']' : ''));
  Logger.log('Events in last 30 days (' + events.length + '):\n' + output.join('\n'));
}
