# Dashboard Metrics Setup

This document describes the analytics/metrics system for the dashboard, including API endpoints and the dashboard page implementation.

## Overview

The metrics system tracks visitor analytics for your published knowledge base, including:
- Unique visitors
- Page views
- Sessions and visit duration
- Top pages, referrers, and countries
- Real-time active visitors

## Firestore Data Structure

```
Users/{uid}/knowledgebases/{selectedCompany}/
├── metrics/
│   ├── overallUniqueVisitors/byDates/{date} → { count }
│   ├── pageViews/dates_{pageId}/{date} → { count }
│   ├── sessions/dates_{pageId}/{date} → { count, totalDuration }
│   └── otherStats/
│       ├── countries/{countryName} → { count }
│       └── referrers/{referrerUrl} → { count }
└── liveVisitors/{sessionId} → { timestamp, page }
```

**Page IDs Format:**
- `index` - Home page
- `category_{categoryId}` - Category pages
- `article_{articleId}` - Article pages

## API Endpoints

### 1. `/api/metrics/overview` (GET)

**Purpose:** Get core analytics stats for a date range

**Query Parameters:**
- `uid` (required) - User ID
- `selectedCompany` (required) - Company/knowledge base ID
- `startDate` (required) - Start date in `yyyy-MM-dd` format
- `endDate` (required) - End date in `yyyy-MM-dd` format

**Response:**
```json
{
  "success": true,
  "data": {
    "uniqueVisitors": 107,
    "totalPageViews": 234,
    "totalSessions": 89,
    "averageVisitDuration": "2m 45s",
    "averageVisitDurationRaw": 165.5,
    "comparison": {
      "uniqueVisitors": "+15.3%",
      "totalPageViews": "-5.2%",
      "totalSessions": "+10.1%",
      "averageVisitDuration": "+2.3%"
    }
  }
}
```

**Comparison Logic:**
- Automatically calculates comparison with the previous period
- Previous period = same number of days immediately before the start date

### 2. `/api/metrics/chart` (GET)

**Purpose:** Get daily pageview data for charts

**Query Parameters:**
- `uid` (required)
- `selectedCompany` (required)
- `startDate` (required)
- `endDate` (required)
- `includePrevious` (optional) - Set to `true` to include previous period data

**Response:**
```json
{
  "success": true,
  "data": {
    "labels": ["2024-11-01", "2024-11-02", "2024-11-03"],
    "current": [12, 15, 8],
    "previous": [10, 13, 7]
  }
}
```

### 3. `/api/metrics/top-pages` (GET)

**Purpose:** Get most viewed pages

**Query Parameters:**
- `uid` (required)
- `selectedCompany` (required)
- `startDate` (required)
- `endDate` (required)
- `limit` (optional, default: 5) - Number of results to return

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "index",
      "link": "index/",
      "pageViews": 45,
      "percentage": "32.14%"
    },
    {
      "id": "article_abc123",
      "link": "getting-started",
      "pageViews": 38,
      "percentage": "27.14%"
    }
  ]
}
```

### 4. `/api/metrics/top-referrers` (GET)

**Purpose:** Get top traffic sources

**Query Parameters:**
- `uid` (required)
- `selectedCompany` (required)
- `limit` (optional, default: 5)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "Direct Traffic",
      "referrer": "Direct Traffic",
      "count": 107,
      "percentage": "65.24%"
    },
    {
      "id": "https://google.com/",
      "referrer": "https://google.com/",
      "count": 35,
      "percentage": "21.34%"
    }
  ]
}
```

### 5. `/api/metrics/top-countries` (GET)

**Purpose:** Get visitor distribution by country

**Query Parameters:**
- `uid` (required)
- `selectedCompany` (required)
- `limit` (optional, default: 5)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "Canada",
      "country": "Canada",
      "count": 83,
      "percentage": "45.11%"
    },
    {
      "id": "United States of America",
      "country": "United States of America",
      "count": 35,
      "percentage": "19.02%"
    }
  ]
}
```

### 6. `/api/metrics/live-visitors` (GET)

**Purpose:** Get real-time active visitors (last 15 seconds)

**Query Parameters:**
- `uid` (required)
- `selectedCompany` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 3,
    "visitors": [
      {
        "sessionId": "sess_123",
        "timestamp": "2024-11-08T10:30:45Z",
        "page": "/getting-started"
      },
      {
        "sessionId": "sess_456",
        "timestamp": "2024-11-08T10:30:50Z",
        "page": "/index"
      }
    ]
  }
}
```

## Dashboard Pages

### Root Page
**Location:** `app/(main)/[selectedCompany]/page.tsx`

Simple placeholder page with "AI Chat" welcome message.

### Analytics Dashboard
**Location:** `app/(main)/[selectedCompany]/dashboard/page.tsx`

**Features:**
- Real-time metrics display
- Date range selector (defaults to last 3 days)
- Auto-refresh for live visitors (every 10 seconds)
- Loading skeletons for better UX
- Comparison indicators (green for positive, red for negative)
- Responsive grid layout

**Key Components:**

1. **Analytics Overview Card**
   - Unique visitors with comparison (green/red indicators)
   - Total pageviews with comparison
   - Total sessions with comparison
   - Average visit duration with comparison
   - **Interactive line chart** showing daily pageviews (current vs previous period)

2. **Live Visitors Card**
   - Real-time count of active users
   - **Pulsing animation indicator**
   - Updates every 10 seconds

3. **Top Channels Table**
   - Traffic sources/referrers
   - Visitor counts
   - **Horizontal progress bars** (violet)

4. **Top Pages Table**
   - Most viewed pages
   - Pageview counts
   - **Horizontal progress bars** (sky blue)

5. **Top Countries Table**
   - Geographic distribution
   - Visitor counts per country
   - **Horizontal progress bars** (green)

**Dependencies:**
- `chart.js` - Chart rendering
- `react-chartjs-2` - React wrapper for Chart.js

## Usage Example

```typescript
// Fetch overview metrics for the last 7 days
const startDate = format(subDays(new Date(), 6), 'yyyy-MM-dd');
const endDate = format(new Date(), 'yyyy-MM-dd');

const response = await fetch(
  `/api/metrics/overview?uid=${userId}&selectedCompany=${companyId}&startDate=${startDate}&endDate=${endDate}`
);
const data = await response.json();

if (data.success) {
  console.log('Unique Visitors:', data.data.uniqueVisitors);
  console.log('Comparison:', data.data.comparison.uniqueVisitors);
}
```

## Performance Considerations

1. **Caching:** Consider implementing server-side caching (5-minute TTL) for expensive queries
2. **Batch Reads:** All endpoints use batch reads to minimize Firestore calls
3. **Date Range Limits:** Consider limiting max date range (e.g., 90 days) to prevent slow queries
4. **Pagination:** For large datasets, implement pagination on top pages/referrers/countries

## Future Enhancements

Potential additions for Phase 2:
- `/api/metrics/sessions-detail` - Detailed session breakdown
- `/api/metrics/export` - CSV export functionality
- Chart visualization with Chart.js or Recharts
- Advanced filtering options
- Custom date range presets (Today, Last 7 days, Last 30 days, etc.)
- Real-time updates using WebSockets or SSE

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing parameters)
- `500` - Internal Server Error

## Notes

- All date parameters use `yyyy-MM-dd` format (ISO 8601)
- Times are stored in milliseconds (duration) or ISO timestamps
- Percentages are formatted as strings with 2 decimal places
- Country and referrer data is cumulative (not date-ranged)
- Live visitors query uses 15-second threshold for "active"

