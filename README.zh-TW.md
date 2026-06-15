[English](README.md) | 繁體中文

# line-weather-notify-tw

Google Apps Script × Google Calendar × 中央氣象署 → LINE 天氣提醒機器人

每天 20:00 自動推播「明天行程天氣 + 後天降雨預報」到你的 LINE，讓你決定明天要不要帶傘、穿什麼出門。

---

## 功能

**20:00 兩日預覽（notifyEvening）**
- 明天每筆 Google Calendar 行程，附上當下時段降雨機率與天氣 emoji
- 偵測戶外行程（依關鍵詞或地點欄位），自動附上該地點天氣
- 後天全日降雨概況（06/09/12/15/18/21 六個時段）
- 帶傘提醒自動判斷

**05:00 當天提醒（notifyMorning）**
- 和 20:00 格式相同，但改為今日行程

**週日 20:00 降雨週報（notifyWeekly）**
- 未來 7 天每日最高降雨機率

**自排觸發器**
- 不依賴 GAS 每小時觸發，用 `ScriptApp.newTrigger().timeBased().at()` 精準排程，精準度 ±1 分鐘

---

## 訊息範例

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

## 快速開始

### 第一步：了解 Google Apps Script（GAS）

GAS 是 Google 提供的免費雲端腳本執行環境，不需要架伺服器，直接在瀏覽器裡寫 JavaScript，可以存取 Google Calendar、Gmail、Drive 等服務，也可以呼叫外部 API。

部署這支程式只需要一個 Google 帳號，完全免費。

前往 [https://script.google.com](https://script.google.com) 建立新專案，把 `line_weather_notify.gs` 的內容貼上即可。

### 第二步：取得三個 API 憑證

#### 1. 中央氣象署 API Key（CWA）

1. 前往 [CWA 開放資料平台](https://opendata.cwa.gov.tw/userLogin)
2. 免費註冊帳號
3. 登入後進入「取得授權碼」頁面，複製 API Key
4. 格式：`CWA-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`

#### 2. LINE Messaging API（Channel Token + User ID）

LINE Bot 需要兩個值：Channel Access Token（傳訊用）和 User ID（收訊對象）。

**取得 Channel Access Token：**
1. 前往 [LINE Developers Console](https://developers.line.biz/)，登入你的 LINE 帳號
2. 建立新的 Provider（可填任意名稱）
3. 在 Provider 下建立 Messaging API Channel（填寫 Bot 名稱、圖示等）
4. 進入 Channel，切到「Messaging API」頁籤
5. 往下找「Channel access token」，點「Issue」取得 Token

**取得 User ID：**
1. 在同一個 Channel 設定頁，找「Your user ID」（你自己的 LINE User ID，格式 `Uxxxxxxxxxx`）
2. 或：在手機 LINE App 內把這個 Bot 加為好友，傳任意訊息給它，再到 LINE Developers Console 的 Webhook 查看 userId

**注意：** 免費方案每月有 200 則免費訊息，這支程式每天約 3 則（晨間 + 晚間 + 週日週報），不會超過限制。

#### 3. Google Calendar ID

通常就是你的 Gmail 信箱，例如 `you@gmail.com`。

確認方式：Google Calendar → 設定（齒輪）→ 選擇日曆 → 往下找「日曆 ID」。

### 第三步：在 GAS 設定 Script Properties

Script Properties 是 GAS 的加密鍵值儲存，相當於環境變數，不會出現在程式碼裡。

1. 開啟 GAS 編輯器
2. 左側齒輪（設定）→「指令碼屬性」
3. 點「新增屬性」，依序加入以下欄位：

| 屬性名稱 | 說明 | 範例 |
|---|---|---|
| `CWA_API_KEY` | 中央氣象署 API Key | `CWA-XXXXXXXX-...` |
| `LINE_CHANNEL_TOKEN` | LINE Channel Access Token | `xxxx...` |
| `LINE_USER_ID` | 你的 LINE User ID | `Uxxxxxxxxx` |
| `CALENDAR_ID` | Google Calendar ID | `you@gmail.com` |
| `DEFAULT_COUNTY` | 預設縣市（可選，見下方說明） | `臺北市` |
| `DEFAULT_DISTRICT` | 預設行政區（可選，見下方說明） | `中正區` |

### 第四步：設定預設地區

程式預設使用「臺北市中正區」作為每日天氣總覽的基準。這個地區代表「你家附近」，用於：
- 每日全日天氣概況（06/09/12/15/18/21）
- 無法解析具體地點的行程

**修改方式：** 在 Script Properties 設定 `DEFAULT_COUNTY` 和 `DEFAULT_DISTRICT`。

支援台灣全部 22 縣市。縣市對應的行政區需要是 CWA 資料涵蓋的鄉鎮市區名稱（一般行政區名稱皆可）。

### 第五步：啟動觸發器

在 GAS 編輯器，選擇 `setupTriggers` 函式，點執行。

這個函式會建立三個觸發器：
- 今晚 20:00（或明晚，若已過）
- 明早 05:00
- 下一個週日 20:00

之後每次觸發時，函式會自動排定下一次，不需要手動管理。

---

## 行程偵測邏輯

程式根據兩個條件判斷行程是否為「戶外行程」，並附上當地天氣：

1. **地點欄位不為空**：直接解析縣市與行政區
2. **行程標題含關鍵詞**：運動、飲食、採買、醫療、外出拜訪、活動演出等（詳見程式碼 `OUTDOOR_KEYWORDS`）

解析邏輯：
- 地點欄位 → 解析縣市+行政區
- 無法解析地點 → 從行程標題找縣市
- 都找不到 → 使用預設地區（無標籤，不顯示 `[縣市區]`）

---

## 限制

- 僅支援台灣 22 縣市（中央氣象署資料範圍）
- CWA 3小時降雨機率最多提供未來 3 天資料，後天天氣僅能顯示，無法附在行程上
- 需要建立 LINE Messaging API Channel（非 LINE Notify，Notify 已停止服務）
- GAS 環境限制：不支援 Node.js 套件，僅使用 GAS 原生 API

---

## 授權

MIT License
