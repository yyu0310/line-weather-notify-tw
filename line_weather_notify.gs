// 日程天氣提醒 — LINE Messaging API
// v1.11.0
// 20:00 明日行程天氣推播 + 後天・大後天精簡預覽；05:00 當天行程提醒；週日 20:00 本週 7 天降雨預告
// 自排觸發器（.at()），精準度 ±1 分鐘

const OUTDOOR_KEYWORDS = [
  // 運動
  '跑步', '跑', '晨跑', '健跑', '慢跑', '騎車', '騎行', '單車', '腳踏車',
  '游泳', '籃球', '羽毛球', '羽球', '排球', '匹克球', '網球', '桌球',
  '運動', '健身', '爬山', '健行', '散步',
  // 飲食社交
  '吃飯', '午餐', '晚餐', '早餐', '咖啡', '餐廳', '聚餐', '飯局', '下午茶', '聚',
  // 採買
  '市場', '採買', '採購', 'Costco', 'costco',
  // 醫療出行
  '回診', '門診', '看診', '醫院',
  // 外出拜訪
  '拜訪', '見面', '外出', '出門', '參觀', '參加', '出差', '學長',
  // 活動演出
  '活動', '演講', '論壇', '展覽', '演唱會', '演唱', '比賽', '典禮', '婚禮', '喜宴',
  '入場', '專場', '看展',
];

// 台灣各縣市 → CWA 鄉鎮天氣預報 Dataset ID（3天/3小時降雨機率版本）
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

// 輸入縣市名 → CWA 標準縣市名（含簡稱/台/臺混用）
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

// 只知道縣市、沒有具體鄉鎮時的預設查詢區
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

const _props           = PropertiesService.getScriptProperties();
const DEFAULT_COUNTY   = _props.getProperty('DEFAULT_COUNTY')   || '臺北市';
const DEFAULT_DISTRICT = _props.getProperty('DEFAULT_DISTRICT') || '文山區';
const CALENDAR_ID      = _props.getProperty('CALENDAR_ID');

function isOutdoor(event) {
  if (event.getLocation()) return true;
  const title = event.getTitle();
  return OUTDOOR_KEYWORDS.some(kw => title.includes(kw));
}

// 從字串解析地點，回傳 {county, district, label} 或 null
// label 為 null 表示使用預設，不在訊息顯示標籤
// 注意：不用 regex 匹配縣市，避免「台灣臺北市」被誤匹配為「灣臺北市」
function parseLocation(text) {
  if (!text) return null;

  const sortedAliases = Object.entries(COUNTY_ALIASES).sort((a, b) => b[0].length - a[0].length);

  // Pass 1：找「已知縣市名 + 緊接的鄉鎮市區」（如「臺北市文山區」）
  for (const [alias, county] of sortedAliases) {
    const idx = text.indexOf(alias);
    if (idx === -1) continue;
    const afterCounty    = text.slice(idx + alias.length);
    const districtMatch  = afterCounty.match(/^([^\s]{1,4}[區鄉鎮市])/);
    if (districtMatch && COUNTY_TO_DATASET[county]) {
      return { county, district: districtMatch[1], label: county + districtMatch[1] };
    }
  }

  // Pass 2：只找到縣市名（如「台南行」），用該縣市預設鄉鎮
  for (const [alias, county] of sortedAliases) {
    if (text.includes(alias)) {
      const district = COUNTY_DEFAULT_DISTRICT[county];
      if (district) return { county, district, label: county };
    }
  }

  return null;
}

// 取得事件的天氣查詢地點：location 欄位 → 標題 → 預設文山區
function getWeatherLocation(event) {
  const fromLocation = parseLocation(event.getLocation());
  if (fromLocation) return fromLocation;

  const fromTitle = parseLocation(event.getTitle());
  if (fromTitle) return fromTitle;

  return { county: DEFAULT_COUNTY, district: DEFAULT_DISTRICT, label: null };
}

// 天氣現象字串 → emoji（雨況已由 pop 處理，這裡只處理非雨天）
function wxToEmoji(wx) {
  if (!wx) return '';
  if (wx.includes('雨') || wx.includes('雷')) return '';
  if (wx.includes('晴') && wx.includes('多雲')) return '🌤️';
  if (wx.includes('晴')) return '☀️';
  if (wx.includes('多雲')) return '⛅';
  if (wx.includes('陰')) return '☁️';
  return '';
}

// ── 入口函式：每日 20:00 推播明日行程天氣 + 後天純天氣預覽 ──
function notifyEvening() {
  Logger.log('=== 日程天氣提醒 v1.11.0 notifyEvening START ===');
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'notifyEvening')
    .forEach(t => ScriptApp.deleteTrigger(t));

  const lineToken  = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_TOKEN');
  const lineUserId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  const apiKey     = PropertiesService.getScriptProperties().getProperty('CWA_API_KEY');

  if (!lineToken || !lineUserId || !apiKey) {
    Logger.log('=== 日程天氣提醒 v1.11.0 === 缺少 LINE_CHANNEL_TOKEN、LINE_USER_ID 或 CWA_API_KEY');
    return;
  }

  const tomorrow    = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, 'Asia/Taipei', 'yyyy-MM-dd');
  const dayMap      = { Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六' };
  const dayEn       = Utilities.formatDate(tomorrow, 'Asia/Taipei', 'EEE');
  const tomorrowDisplay = Utilities.formatDate(tomorrow, 'Asia/Taipei', 'M/d') + '（' + (dayMap[dayEn] || dayEn) + '）';

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterAfter = new Date();
  dayAfterAfter.setDate(dayAfterAfter.getDate() + 3);

  const daily          = fetchWeeklyForecast(apiKey, DEFAULT_COUNTY, DEFAULT_DISTRICT);
  const tomorrowExtras = daily[tomorrowStr] || {};
  const tomorrowLines  = buildDayPreviewLines(apiKey, tomorrow, '🌙 明日預覽', tomorrowExtras);
  const dayAfterLines  = buildWeatherOnlyLines(apiKey, [dayAfter, dayAfterAfter], daily);
  const combined = tomorrowLines.concat(['', '══════════'], dayAfterLines).join('\n');

  sendLineMessage(lineToken, lineUserId, combined);
  Logger.log('notifyEvening 已推播兩日預覽');

  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(20, 0, 0, 0);
  ScriptApp.newTrigger('notifyEvening').timeBased().at(next).create();
  Logger.log('下次 notifyEvening 已排定：' + next);
}


// ── 入口函式：05:00 推播當天提醒 ──────────────────────────────
function notifyMorning() {
  Logger.log('=== 日程天氣提醒 v1.11.0 notifyMorning START ===');
  runNotify(new Date(), '☀️ 今日提醒');
  scheduleNextTrigger('notifyMorning', 5, 0);
}

// ── 入口函式：週日 20:00 推播本週 7 天降雨預告 ─────────────────
function notifyWeekly() {
  Logger.log('=== 日程天氣提醒 v1.11.0 notifyWeekly START ===');
  runWeeklyForecast();
  scheduleNextWeeklyTrigger();
}

// ── 自排觸發器：結束後排定下一次執行（每日）──────────────────────
function scheduleNextTrigger(fnName, hour, minute) {
  minute = (minute === undefined) ? 0 : minute;
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === fnName)
    .forEach(t => ScriptApp.deleteTrigger(t));

  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(hour, minute, 0, 0);

  ScriptApp.newTrigger(fnName)
    .timeBased()
    .at(next)
    .create();

  Logger.log('下次 ' + fnName + ' 已排定：' + next);
}

// ── 自排觸發器：結束後排定下一個週日 20:00 ───────────────────────
function scheduleNextWeeklyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'notifyWeekly')
    .forEach(t => ScriptApp.deleteTrigger(t));

  const next = new Date();
  const daysUntilSunday = (7 - next.getDay()) % 7 || 7;
  next.setDate(next.getDate() + daysUntilSunday);
  next.setHours(20, 0, 0, 0);

  ScriptApp.newTrigger('notifyWeekly')
    .timeBased()
    .at(next)
    .create();

  Logger.log('下次 notifyWeekly 已排定：' + next);
}

// ── runNotify：發送單日預覽（供 notifyMorning 呼叫）───────────────
function runNotify(targetDate, label) {
  const lineToken  = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_TOKEN');
  const lineUserId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  const apiKey     = PropertiesService.getScriptProperties().getProperty('CWA_API_KEY');

  if (!lineToken || !lineUserId || !apiKey) {
    Logger.log('=== 日程天氣提醒 v1.11.0 === 缺少 LINE_CHANNEL_TOKEN、LINE_USER_ID 或 CWA_API_KEY');
    return;
  }

  const dateStr = Utilities.formatDate(targetDate, 'Asia/Taipei', 'yyyy-MM-dd');
  const daily   = fetchWeeklyForecast(apiKey, DEFAULT_COUNTY, DEFAULT_DISTRICT);
  const extras  = daily[dateStr] || {};
  const lines   = buildDayPreviewLines(apiKey, targetDate, label, extras);
  sendLineMessage(lineToken, lineUserId, lines.join('\n'));

  const dayMap        = { Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六' };
  const dayEn         = Utilities.formatDate(targetDate, 'Asia/Taipei', 'EEE');
  const targetDisplay = Utilities.formatDate(targetDate, 'Asia/Taipei', 'M/d') + '（' + (dayMap[dayEn] || dayEn) + '）';
  Logger.log('已推播：' + targetDisplay);
}

// ── buildDayPreviewLines：單日完整預覽（含行程），供 runNotify / notifyEvening 使用 ──
function buildDayPreviewLines(apiKey, targetDate, label, extras) {
  extras = extras || {};
  const targetStr     = Utilities.formatDate(targetDate, 'Asia/Taipei', 'yyyy-MM-dd');
  const dayMap        = { Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六' };
  const dayEn         = Utilities.formatDate(targetDate, 'Asia/Taipei', 'EEE');
  const targetDisplay = Utilities.formatDate(targetDate, 'Asia/Taipei', 'M/d') + '（' + (dayMap[dayEn] || dayEn) + '）';
  const targetStart   = new Date(targetStr + 'T00:00:00+08:00');
  const targetEnd     = new Date(targetStr + 'T23:59:59+08:00');

  // 永遠抓文山區天氣，作為每日天氣總覽的基礎
  const homeWeather = fetchWeatherBySlot(apiKey, targetStr, DEFAULT_COUNTY, DEFAULT_DISTRICT);
  const homeSummary = buildHomeWeatherSummary(homeWeather);

  const headerLines = [label, '🏠 ' + DEFAULT_DISTRICT];
  if (extras.uvIndex != null) {
    headerLines.push('🔆 UV ' + extras.uvIndex + ' ' + (extras.uvExposureLevel || '') + ' ' + uvAdvice(extras.uvIndex));
  }
  if (extras.minFeelsLike != null && extras.maxFeelsLike != null) {
    headerLines.push('🌡 體感 ' + extras.minFeelsLike + '–' + extras.maxFeelsLike + '°C');
  } else if (extras.maxFeelsLike != null) {
    headerLines.push('🌡 體感最高 ' + extras.maxFeelsLike + '°C');
  } else if (extras.minFeelsLike != null) {
    headerLines.push('🌡 體感最低 ' + extras.minFeelsLike + '°C');
  }
  headerLines.push(homeSummary);

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

  // 預先建立天氣快取（key = county|district，避免相同地點重複打 API）
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

// ── buildWeatherOnlyLines：後天・大後天精簡預覽（weekly 同款單行格式，不含行程）──
// dates: Date[]
function buildWeatherOnlyLines(apiKey, dates, preloadedDaily) {
  const dayMap = { Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六' };
  const daily  = preloadedDaily || fetchWeeklyForecast(apiKey, DEFAULT_COUNTY, DEFAULT_DISTRICT);
  return dates.map(date => {
    const dateStr    = Utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd');
    const dayEn      = Utilities.formatDate(date, 'Asia/Taipei', 'EEE');
    const displayStr = Utilities.formatDate(date, 'Asia/Taipei', 'M/d') + '（' + (dayMap[dayEn] || dayEn) + '）';
    const info       = daily[dateStr];
    let entry;
    if (!info) {
      entry = '—';
    } else {
      const { maxPop, wx } = info;
      if (maxPop > 30)      entry = '🌧 ' + maxPop + '%';
      else if (maxPop > 15) entry = '🌦 ' + maxPop + '%';
      else                  entry = (wxToEmoji(wx) || '☀️');
    }
    return displayStr + entry;
  });
}

// ── buildHomePeriodUmbrella：根據文山區全日降雨率判斷帶傘提醒 ──
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

// 文山區全日時段天氣總覽（06~21 每 3 小時一格）
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
// ── 本週 7 天降雨預告（週日 20:05 推播）─────────────────────────
function runWeeklyForecast() {
  const lineToken  = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_TOKEN');
  const lineUserId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  const apiKey     = PropertiesService.getScriptProperties().getProperty('CWA_API_KEY');
  if (!lineToken || !lineUserId || !apiKey) {
    Logger.log('notifyWeekly: 缺少必要設定');
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
    if (!info) {
      lines.push(displayStr + '（' + dayZh + '）—');
      continue;
    }

    const { maxPop, wx } = info;
    let entry;
    if (maxPop > 30)      entry = '🌧 ' + maxPop + '%';
    else if (maxPop > 15) entry = '🌦 ' + maxPop + '%';
    else                  entry = (wxToEmoji(wx) || '☀️');

    lines.push(displayStr + '（' + dayZh + '）' + entry);
  }

  sendLineMessage(lineToken, lineUserId, lines.join('\n'));
  Logger.log('已推播本週降雨預告');
}

function uvAdvice(idx) {
  if (idx <= 2)  return '不需防護';
  if (idx <= 5)  return '帽子、防曬乳';
  if (idx <= 7)  return '戶外活動需防護';
  if (idx <= 10) return '10點後避暴曬';
  return '避免戶外';
}

// 抓 7 天預報（逐 12 小時版，datasetId = 3 天版 +2）
// 回傳 { 'yyyy-MM-dd': { maxPop, wx, maxFeelsLike, minFeelsLike, uvIndex } }
function fetchWeeklyForecast(apiKey, county, district) {
  const base      = COUNTY_TO_DATASET[county] || COUNTY_TO_DATASET[DEFAULT_COUNTY];
  const num       = parseInt(base.replace('F-D0047-', ''));
  const datasetId = 'F-D0047-' + String(num + 2).padStart(3, '0');

  const url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/' + datasetId
    + '?Authorization=' + apiKey
    + '&locationName=' + encodeURIComponent(district)
    + '&elementName=' + encodeURIComponent('天氣現象,降雨機率,12小時降雨機率,最高體感溫度,最低體感溫度,紫外線指數');

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data     = JSON.parse(response.getContentText());
  if (data.success !== 'true') return {};

  const locations = (data.records.Locations || [{}])[0].Location;
  if (!locations) return {};
  const location = locations.find(l => l.LocationName === district);
  if (!location) return {};

  const elMap = {};
  location.WeatherElement.forEach(e => { elMap[e.ElementName] = e.Time; });
  Logger.log('fetchWeeklyForecast elementNames: ' + Object.keys(elMap).join(', '));
  ['最高體感溫度', '最低體感溫度', '紫外線指數'].forEach(n => {
    if (elMap[n] && elMap[n][0]) Logger.log(n + ' 首筆 ElementValue keys: ' + JSON.stringify(Object.keys(elMap[n][0].ElementValue[0] || {})));
  });

  const daily = {};

  // 7 天版欄位名為「12小時降雨機率」，3 天版為「降雨機率」，兩者都試
  (elMap['12小時降雨機率'] || elMap['降雨機率'] || []).forEach(t => {
    const dt   = new Date(t.StartTime);
    const date = Utilities.formatDate(dt, 'Asia/Taipei', 'yyyy-MM-dd');
    const val  = parseInt((t.ElementValue[0] || {}).ProbabilityOfPrecipitation);
    if (isNaN(val)) return;
    if (!daily[date]) daily[date] = { maxPop: 0, wx: null, maxFeelsLike: null, minFeelsLike: null, uvIndex: null, uvExposureLevel: null };
    if (val > daily[date].maxPop) daily[date].maxPop = val;
  });

  // 只取白天（06:00）時段的天氣現象作代表
  (elMap['天氣現象'] || []).forEach(t => {
    const dt   = new Date(t.StartTime);
    const date = Utilities.formatDate(dt, 'Asia/Taipei', 'yyyy-MM-dd');
    const hour = parseInt(Utilities.formatDate(dt, 'Asia/Taipei', 'HH'));
    if (hour !== 6) return;
    const wx = (t.ElementValue[0] || {}).Weather;
    if (!daily[date]) daily[date] = { maxPop: 0, wx: null, maxFeelsLike: null, minFeelsLike: null, uvIndex: null, uvExposureLevel: null };
    if (wx) daily[date].wx = wx;
  });

  // 最高體感溫度（取每日最大值）
  (elMap['最高體感溫度'] || []).forEach(t => {
    const dt   = new Date(t.StartTime);
    const date = Utilities.formatDate(dt, 'Asia/Taipei', 'yyyy-MM-dd');
    const val  = parseInt(Object.values(t.ElementValue[0] || {})[0]);
    if (isNaN(val)) return;
    if (!daily[date]) daily[date] = { maxPop: 0, wx: null, maxFeelsLike: null, minFeelsLike: null, uvIndex: null, uvExposureLevel: null };
    if (daily[date].maxFeelsLike === null || val > daily[date].maxFeelsLike) daily[date].maxFeelsLike = val;
  });

  // 最低體感溫度（取每日最小值）
  (elMap['最低體感溫度'] || []).forEach(t => {
    const dt   = new Date(t.StartTime);
    const date = Utilities.formatDate(dt, 'Asia/Taipei', 'yyyy-MM-dd');
    const val  = parseInt(Object.values(t.ElementValue[0] || {})[0]);
    if (isNaN(val)) return;
    if (!daily[date]) daily[date] = { maxPop: 0, wx: null, maxFeelsLike: null, minFeelsLike: null, uvIndex: null, uvExposureLevel: null };
    if (daily[date].minFeelsLike === null || val < daily[date].minFeelsLike) daily[date].minFeelsLike = val;
  });

  // 紫外線指數（取每日最大值；同步記錄 CWA 官方等級文字）
  (elMap['紫外線指數'] || []).forEach(t => {
    const dt    = new Date(t.StartTime);
    const date  = Utilities.formatDate(dt, 'Asia/Taipei', 'yyyy-MM-dd');
    const obj   = t.ElementValue[0] || {};
    const val   = parseInt(obj.UVIndex);
    if (isNaN(val)) return;
    if (!daily[date]) daily[date] = { maxPop: 0, wx: null, maxFeelsLike: null, minFeelsLike: null, uvIndex: null, uvExposureLevel: null };
    if (daily[date].uvIndex === null || val > daily[date].uvIndex) {
      daily[date].uvIndex         = val;
      daily[date].uvExposureLevel = obj.UVExposureLevel || null;
    }
  });

  return daily;
}

function fetchWeatherBySlot(apiKey, dateStr, county, district) {
  const datasetId = COUNTY_TO_DATASET[county] || COUNTY_TO_DATASET[DEFAULT_COUNTY];
  const url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/' + datasetId
    + '?Authorization=' + apiKey
    + '&locationName=' + encodeURIComponent(district)
    + '&elementName=' + encodeURIComponent('3小時降雨機率,天氣現象');

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

// slotSize: pop 用 3，wx 用 6
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

// ── 初次設定：執行一次即可，之後由自排觸發器接力 ──────────────
function setupTriggers() {
  // 清除所有舊觸發器
  ['notifyEveningSnapshot', 'notifyEveningCheck', 'notifyEvening', 'notifyMorning', 'notifyWeekly', 'notifyDailySchedule'].forEach(fn => {
    ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === fn)
      .forEach(t => ScriptApp.deleteTrigger(t));
  });

  const now = new Date();

  // 今晚 20:00（若已過則排到明晚）
  const evening = new Date(now);
  evening.setHours(20, 0, 0, 0);
  if (evening <= now) evening.setDate(evening.getDate() + 1);
  ScriptApp.newTrigger('notifyEvening').timeBased().at(evening).create();

  // 明早 05:00
  const morning = new Date(now);
  morning.setDate(morning.getDate() + 1);
  morning.setHours(5, 0, 0, 0);
  ScriptApp.newTrigger('notifyMorning').timeBased().at(morning).create();

  // 下一個週日 20:00
  const sunday = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  sunday.setDate(sunday.getDate() + daysUntilSunday);
  sunday.setHours(20, 0, 0, 0);
  ScriptApp.newTrigger('notifyWeekly').timeBased().at(sunday).create();

  Logger.log('觸發器設定完成：\n  notifyEvening @ ' + evening + '\n  notifyMorning @ ' + morning + '\n  notifyWeekly @ ' + sunday);
}

// 測試所有天氣顯示情境，在 Logger 確認 emoji 與訊息格式
function debugTestWeatherDisplay() {
  const cases = [
    { title: '晨跑',    pop: 70,  wx: '陰短暫雨',  expect: '🌧70%' },
    { title: '晨跑',    pop: 25,  wx: '多雲短暫雨', expect: '🌦25%' },
    { title: '晨跑',    pop: 10,  wx: '晴',         expect: '☀️' },
    { title: '晨跑',    pop: 10,  wx: '晴時多雲',   expect: '🌤️' },
    { title: '晨跑',    pop: 10,  wx: '多雲',        expect: '⛅' },
    { title: '晨跑',    pop: 10,  wx: '多雲時陰',   expect: '⛅' },
    { title: '晨跑',    pop: 10,  wx: '陰',          expect: '☁️' },
    { title: '晨跑',    pop: 10,  wx: null,          expect: '（無天氣資料）' },
    { title: '線上會議', pop: null, wx: null,         expect: '（室內，不顯示）' },
  ];

  const lines = ['=== debugTestWeatherDisplay (v1.11.0) ==='];
  cases.forEach(c => {
    let display;
    if (c.pop === null) {
      display = c.title + '（室內事件）';
    } else if (c.pop > 30) {
      display = c.title + ' 🌧' + c.pop + '%';
    } else if (c.pop > 15) {
      display = c.title + ' 🌦' + c.pop + '%';
    } else {
      const emoji = wxToEmoji(c.wx);
      display = c.title + (emoji ? ' ' + emoji : '');
    }
    lines.push('[期望: ' + c.expect + '] → ' + display);
  });
  Logger.log(lines.join('\n'));
}

// 印出 Locations[0] 所有頂層欄位名，確認 issueTime 欄位存在
function debugCheckIssueTime() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CWA_API_KEY');
  const url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/' + COUNTY_TO_DATASET[DEFAULT_COUNTY]
    + '?Authorization=' + apiKey
    + '&locationName=' + encodeURIComponent(DEFAULT_DISTRICT)
    + '&elementName=' + encodeURIComponent('3小時降雨機率');

  const data = JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText());
  const loc0 = (data.records.Locations || [{}])[0];
  Logger.log('Locations[0] 所有欄位: ' + JSON.stringify(Object.keys(loc0)));
  Logger.log('issueTime: ' + loc0.issueTime);
}

// 測試地點解析邏輯（貼上事件的 location 欄位或標題，確認解析結果）
function debugTestLocationParsing() {
  const cases = [
    '台南市東區民族路三段1號',
    '宜蘭縣礁溪鄉',
    '高雄市左營區',
    '台南行',
    '宜蘭出差',
    '台北市信義區',
    '116台灣臺北市文山區木柵路三段96號B1',          // 應為 臺北市文山區（非中正區）
    'World Gym Express 台北木柵店\n116台灣臺北市文山區木柵路三段96號B1', // 同上
    '',
    null,
  ];

  const lines = ['=== debugTestLocationParsing ==='];
  cases.forEach(text => {
    const result = parseLocation(text);
    if (result) {
      lines.push(JSON.stringify(text) + ' → ' + result.county + ' ' + result.district + ' label=' + result.label);
    } else {
      lines.push(JSON.stringify(text) + ' → null（使用預設文山區）');
    }
  });
  Logger.log(lines.join('\n'));
}

// 執行後在 Logger 查看近 30 天事件標題，貼給 CC 歸納戶外關鍵詞
function debugListRecentEvents() {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const start    = new Date();
  start.setDate(start.getDate() - 30);
  const events   = calendar.getEvents(start, new Date());

  const output = events.map(e =>
    e.getTitle() + (e.getLocation() ? ' [地點: ' + e.getLocation() + ']' : '')
  );
  Logger.log('近 30 天事件（' + events.length + ' 筆）：\n' + output.join('\n'));
}
