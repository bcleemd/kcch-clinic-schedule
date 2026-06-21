# 외래진료일정표 뷰어 구현 플랜

> 이 문서는 `clinic-schedule.json` 데이터를 브라우저에서 직접 읽어 동적으로 렌더링하는
> 뷰어 웹앱을 처음부터 다시 구현할 때 사용하는 기준 문서입니다.

---

## 1. 목표

- 기존 `json_to_html.py`가 빌드 시점에 데이터를 HTML에 직접 내장하던 방식을 폐기
- 브라우저 로딩 시 `clinic-schedule.json`을 `fetch()`로 읽어 동적으로 표·필터를 생성
- 데이터를 바꾸면 JSON만 교체하면 되고, HTML/JS/CSS는 그대로 유지

---

## 2. 파일 구성

```
프로젝트 루트/
├── index.html              ← 데이터 없는 셸 (tbody, filter 컨테이너만 있음)
├── style.css               ← 스타일 (컬럼 교대색, AM/PM 행 구분색 포함)
├── script.js               ← fetch + 동적 렌더링 로직
├── clinic-schedule.json    ← 데이터 원본
├── favicon.ico             ← 병원 로고 아이콘 (Pillow로 생성)
└── index-embedded-backup.html  ← 기존 데이터 내장형 HTML 백업
```

---

## 3. index.html 구조

데이터 없는 순수 셸. `<tbody id="schedule-body">`와
`<div id="filter-container">`는 비워 두고 script.js가 채운다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>외래진료일정표</title>
    <link rel="icon" href="favicon.ico">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="top-panel">
        <h1 id="page-title">외래진료일정표</h1>
        <p class="meta" id="page-meta">최종 업데이트: -</p>
    </div>

    <div class="main-panel">
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>진료과</th>
                        <th>구분</th>
                        <th>월</th>
                        <th class="highlight-col">화</th>
                        <th>수</th>
                        <th class="highlight-col">목</th>
                        <th>금</th>
                    </tr>
                </thead>
                <tbody id="schedule-body"></tbody>
            </table>
        </div>
        <p id="status-message" class="status-message"></p>
    </div>

    <div class="bottom-panel">
        <div class="filter-title">
            <span>진료과 필터</span>
            <div>
                <button id="btn-select-all" class="btn-all">전체 선택</button>
                <button id="btn-select-none" class="btn-all">전체 해제</button>
            </div>
        </div>
        <div class="filter-container" id="filter-container"></div>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

---

## 4. script.js 로직

### 4.1 의사 색상 팔레트

`json_to_html.py`와 **동일한 순서**로 정의해야 기존 화면과 색상이 일치한다.

```js
const DOCTOR_COLORS = [
    '#d97706', // Amber
    '#059669', // Emerald
    '#7c3aed', // Violet
    '#db2777', // Pink
    '#2563eb', // Blue
    '#ea580c', // Orange
    '#0891b2', // Cyan
    '#4f46e5', // Indigo
    '#9333ea', // Purple
    '#0d9488', // Teal
    '#e11d48', // Rose
    '#475569', // Slate
];
```

### 4.2 색상 배정 규칙

- 의사 이름에서 괄호 안 텍스트 제거 후 base name 추출
  - 예: `"임다은(초음파)"` → `"임다은"`
- base name 기준으로 첫 등장 순서대로 팔레트에서 순차 배정
- **순회 순서: 진료과 순 → 오전 → 오후** (이 순서를 지켜야 색상 일치)

```js
const doctorColorMap = {};
let colorIndex = 0;

function getDoctorColor(name) {
    const baseName = name.replace(/\(.*?\)/g, '').trim();
    if (!(baseName in doctorColorMap)) {
        doctorColorMap[baseName] = DOCTOR_COLORS[colorIndex % DOCTOR_COLORS.length];
        colorIndex += 1;
    }
    return doctorColorMap[baseName];
}
```

### 4.3 의사 셀 HTML 생성

괄호 부분(전임의, 초음파 등)은 `<span class="mobile-block">`으로 감싸 모바일에서 줄바꿈.

```js
function formatDoctorsHtml(doctors) {
    if (!doctors || doctors.length === 0) return '';
    return doctors.map((doc) => {
        const color = getDoctorColor(doc);
        const parenIdx = doc.indexOf('(');
        if (parenIdx !== -1 && doc.includes(')')) {
            const namePart = escapeHtml(doc.slice(0, parenIdx));
            const posPart  = escapeHtml(doc.slice(parenIdx));
            return `<span style="color: ${color}; font-weight: 600;">${namePart}<span class="mobile-block">${posPart}</span></span>`;
        }
        return `<span style="color: ${color}; font-weight: 600;">${escapeHtml(doc)}</span>`;
    }).join('<br>');
}
```

### 4.4 테이블 렌더링

진료과마다 AM 행 → PM 행 순서로 생성. dept-cell은 AM 행에만 `rowspan="2"`.

```js
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const HIGHLIGHT_DAYS = ['tuesday', 'thursday'];

function buildRow(rowClass, dept, timeLabelHtml, period, includeDeptCell) {
    const tr = document.createElement('tr');
    tr.className = rowClass;
    tr.setAttribute('data-dept', dept.dept_name);

    let cells = '';
    if (includeDeptCell)
        cells += `<td class="dept-cell" rowspan="2">${escapeHtml(dept.dept_name)}</td>`;
    cells += `<td class="time-cell">${timeLabelHtml}</td>`;

    for (const day of DAYS) {
        const docs = (dept.schedule?.[day]?.[period]) || [];
        const hc = HIGHLIGHT_DAYS.includes(day) ? ' highlight-col' : '';
        cells += `<td class="doctors${hc}">${formatDoctorsHtml(docs)}</td>`;
    }
    tr.innerHTML = cells;
    return tr;
}

function renderTable(departments) {
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = '';
    for (const dept of departments) {
        tbody.appendChild(buildRow('am-row', dept, '오<span class="mobile-block"></span>전', 'am', true));
        tbody.appendChild(buildRow('pm-row', dept, '오<span class="mobile-block"></span>후', 'pm', false));
    }
}
```

### 4.5 진입점 (fetch)

```js
async function init() {
    const status = document.getElementById('status-message');
    try {
        const res = await fetch('clinic-schedule.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // 헤더 업데이트
        if (data.schedule_info?.title) {
            document.title = data.schedule_info.title;
            document.getElementById('page-title').textContent = data.schedule_info.title;
        }
        if (data.schedule_info?.last_updated)
            document.getElementById('page-meta').textContent = `최종 업데이트: ${data.schedule_info.last_updated}`;

        renderTable(data.departments || []);
        renderFilters(data.departments || []);
        setupFilterBehavior();
        status.textContent = '';
    } catch (err) {
        status.textContent = `데이터를 불러오지 못했습니다: ${err.message}. (file://로 직접 열면 CORS 차단됩니다. python3 -m http.server 등으로 실행하세요.)`;
    }
}
document.addEventListener('DOMContentLoaded', init);
```

---

## 5. style.css 핵심 색상 규칙

### 5.1 요일 컬럼 교대색 + 오전/오후 행 구분

| | 월·수·금 | 화·목 (`highlight-col`) |
|---|---|---|
| **오전(AM)** | `#ffffff` (흰색) | `#d4dae3` (중간 회색) |
| **오후(PM)** | `#e8eef6` (연파랑) | `#b8c8e0` (진한 파랑) |

```css
.am-row td { background-color: #ffffff; }
.pm-row td {
    background-color: #e8eef6;
    border-bottom: 2px solid var(--text);
}

.am-row .time-cell { background-color: #f1f5f9; color: #1e293b; }
.pm-row .time-cell { background-color: #d8e2f0; color: #1e3a8a; }

.highlight-col            { background-color: #d4dae3 !important; }
.am-row .highlight-col    { background-color: #d4dae3 !important; }
.pm-row .highlight-col    { background-color: #b8c8e0 !important; }
```

### 5.2 에러 메시지

```css
.status-message {
    max-width: 1300px;
    margin: 1rem auto 0;
    text-align: center;
    color: #dc2626;
    font-size: 0.9rem;
}
```

---

## 6. favicon.ico 생성 (Pillow)

파란 원 + 흰색 십자. 16/32/48/64px 멀티사이즈 ICO.

```python
from PIL import Image, ImageDraw

def make_hospital_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = size * 0.04
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=(37, 99, 235, 255)  # #2563eb
    )
    cx, cy = size / 2, size / 2
    arm_w, arm_l = size * 0.22, size * 0.52
    draw.rectangle([cx - arm_l/2, cy - arm_w/2, cx + arm_l/2, cy + arm_w/2], fill=(255,255,255,255))
    draw.rectangle([cx - arm_w/2, cy - arm_l/2, cx + arm_w/2, cy + arm_l/2], fill=(255,255,255,255))
    return img

sizes = [16, 32, 48, 64]
images = [make_hospital_icon(s) for s in sizes]
images[0].save("favicon.ico", format="ICO",
               sizes=[(s,s) for s in sizes], append_images=images[1:])
```

---

## 7. 실행 방법

`file://`로 더블클릭하면 브라우저 CORS 정책으로 `fetch`가 차단된다.
반드시 정적 서버로 열어야 한다.

```bash
# Python 간이 서버
cd /path/to/KCCH-ClinicSchedule
python3 -m http.server 8000
# → http://localhost:8000/

# 또는 기존 Node 서버
npm run dev
# → http://127.0.0.1:5060/
```

---

## 8. clinic-schedule.json 구조

```json
{
  "schedule_info": {
    "year": 2026,
    "month": 1,
    "title": "외래진료일정표",
    "last_updated": "2026-01-06"
  },
  "departments": [
    {
      "dept_name": "소화기내과",
      "category": "내과",
      "schedule": {
        "monday":    { "am": ["김진", "박수철"], "pm": ["김진", "신수영(전임의)"] },
        "tuesday":   { "am": ["박수철", "김슬지"], "pm": ["김연주"] },
        "wednesday": { "am": ["박수철", "김연주"], "pm": ["박수철", "김슬지"] },
        "thursday":  { "am": ["박수철", "김진", "김연주"], "pm": ["김연주"] },
        "friday":    { "am": ["김진"], "pm": ["김슬지", "김태수(전임의)"] }
      }
    }
  ]
}
```

- 의사 이름에 괄호로 직함/클리닉 표기 가능: `"이름(전임의)"`, `"이름(초음파)"`
- 진료 없는 시간대는 빈 배열 `[]`
