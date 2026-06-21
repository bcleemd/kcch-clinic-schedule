"""
ㅍ1.1
    동적 페이지로 변환 .. 
ㅍ1.0 
    단순한 표 형식으로 만 변환 
"""

import json
import os

def format_doctors_html(doctors):
    if not doctors:
        return ""
    return "<br>".join(doctors)

def main():
    json_path = "/Users/charlie/Codes/PJ_KCCH_ClinicSchedule/clinic-schedule-202601.json"
    project_dir = "/Users/charlie/Codes/PJ_KCCH_ClinicSchedule"
    html_path = os.path.join(project_dir, "index.html")
    css_path = os.path.join(project_dir, "style.css")
    js_path = os.path.join(project_dir, "script.js")
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    title = data['schedule_info']['title']
    last_updated = data['schedule_info']['last_updated']
    departments = data.get('departments', [])
    dept_names = [dept['dept_name'] for dept in departments]
    
    days = ["monday", "tuesday", "wednesday", "thursday", "friday"]

    # --- Generate CSS ---
    css_content = """
:root {
    --primary: #2563eb;
    --primary-light: #eff6ff;
    --bg: #f8fafc;
    --text: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --white: #ffffff;
    --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Outfit', 'Noto Sans KR', sans-serif;
    background-color: var(--bg);
    color: var(--text);
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
}

/* Top Panel */
.top-panel {
    background: linear-gradient(135deg, #1e293b 0%, #2563eb 100%);
    color: var(--white);
    padding: 1.5rem;
    text-align: center;
    box-shadow: var(--shadow);
    z-index: 20;
}

.top-panel h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.2rem;
}

.top-panel .meta {
    font-size: 0.9rem;
    opacity: 0.8;
}

/* Main Content Panel */
.main-panel {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background-color: var(--bg);
}

.table-container {
    background: var(--white);
    border-radius: 0.5rem;
    box-shadow: var(--shadow);
    overflow: hidden;
    border: 2px solid var(--text);
    max-width: 1300px;
    margin: 0 auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    text-align: center;
    border-spacing: 0;
    table-layout: fixed;
}

th {
    background-color: #f1f5f9;
    color: var(--text);
    font-weight: 600;
    padding: 1rem;
    font-size: 1rem;
    border-bottom: 3px solid var(--text);
    position: sticky;
    top: 0;
    z-index: 10;
}

/* Column widths */
th:nth-child(1) { width: 14%; }
th:nth-child(2) { width: 8%; }
th:nth-child(n+3) { width: 15.6%; }

td {
    padding: 0.8rem;
    border-bottom: 1px solid var(--border);
    font-size: 0.95rem;
    vertical-align: middle;
    word-break: keep-all;
}

tr:hover td {
    background-color: #f8fafc;
}

.dept-cell {
    font-weight: 700;
    background-color: #fdfdfd;
    color: var(--primary);
    border-right: 2px solid var(--text);
}

.time-cell {
    font-weight: 500;
    background-color: #fafafa;
    border-right: 2px solid var(--text);
}

.am-row td {
    background-color: var(--white);
}

.pm-row td {
    background-color: #f7fee7;
    border-bottom: 2px solid var(--text); /* Thick line between depts */
}

.am-row .time-cell { background-color: #f0fdf4; color: #166534; }
.pm-row .time-cell { background-color: #ecfdf5; color: #065f46; }

/* Tue/Thu Highlight */
.highlight-col { background-color: #f1f5f9 !important; }
.am-row .highlight-col { background-color: #f1f5f9 !important; }
.pm-row .highlight-col { background-color: #e2e8f0 !important; }

.doctors { color: #334155; }

/* Bottom Panel (Filters) */
.bottom-panel {
    background: var(--white);
    border-top: 1px solid var(--border);
    padding: 1rem 1.5rem;
    box-shadow: 0 -4px 6px -1px rgb(0 0 0 / 0.05);
    z-index: 20;
}

.filter-title {
    font-weight: 700;
    margin-bottom: 0.8rem;
    font-size: 1rem;
    color: var(--text);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.filter-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    max-height: 120px;
    overflow-y: auto;
}

.filter-item {
    display: flex;
    align-items: center;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    transition: background 0.2s;
}

.filter-item:hover {
    background-color: var(--primary-light);
}

.filter-item input {
    margin-right: 0.4rem;
    cursor: pointer;
}

.btn-all {
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
    border: 1px solid var(--primary);
    background: var(--white);
    color: var(--primary);
    border-radius: 4px;
    cursor: pointer;
}

.btn-all:hover {
    background: var(--primary);
    color: var(--white);
}

@media (max-width: 768px) {
    .top-panel h1 { font-size: 1.5rem; }
    th, td { padding: 0.5rem; font-size: 0.8rem; }
    .bottom-panel { padding: 0.5rem; }
}
"""

    # --- Generate JS ---
    js_content = """
document.addEventListener('DOMContentLoaded', () => {
    const checkboxes = document.querySelectorAll('.dept-checkbox');
    const rows = document.querySelectorAll('tr[data-dept]');
    const btnAll = document.getElementById('btn-select-all');
    const btnNone = document.getElementById('btn-select-none');

    function updateFilters() {
        const checkedDepts = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        rows.forEach(row => {
            const dept = row.getAttribute('data-dept');
            if (checkedDepts.length === 0 || checkedDepts.includes(dept)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateFilters);
    });

    btnAll.addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = true);
        updateFilters();
    });

    btnNone.addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = false);
        updateFilters();
    });

    // Initial Filter
    updateFilters();
});
"""

    # --- Generate HTML ---
    filter_html = ""
    for name in dept_names:
        filter_html += f"""
                <label class="filter-item">
                    <input type="checkbox" class="dept-checkbox" value="{name}" checked>
                    {name}
                </label>"""

    table_body_html = ""
    for dept in departments:
        name = dept['dept_name']
        schedule = dept['schedule']
        
        # AM Row
        highlight_am = ' highlight-col'
        table_body_html += f'<tr class="am-row" data-dept="{name}">\n'
        table_body_html += f'    <td class="dept-cell" rowspan="2">{name}</td>\n'
        table_body_html += f'    <td class="time-cell">오전</td>\n'
        for day in days:
            docs = format_doctors_html(schedule.get(day, {}).get('am', []))
            hc = highlight_am if day in ['tuesday', 'thursday'] else ''
            table_body_html += f'    <td class="doctors{hc}">{docs}</td>\n'
        table_body_html += '</tr>\n'
        
        # PM Row
        highlight_pm = ' highlight-col'
        table_body_html += f'<tr class="pm-row" data-dept="{name}">\n'
        table_body_html += f'    <td class="time-cell">오후</td>\n'
        for day in days:
            docs = format_doctors_html(schedule.get(day, {}).get('pm', []))
            hc = highlight_pm if day in ['tuesday', 'thursday'] else ''
            table_body_html += f'    <td class="doctors{hc}">{docs}</td>\n'
        table_body_html += '</tr>\n'

    html_content = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="top-panel">
        <h1>{title}</h1>
        <p class="meta">최종 업데이트: {last_updated}</p>
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
                <tbody>
{table_body_html}
                </tbody>
            </table>
        </div>
    </div>

    <div class="bottom-panel">
        <div class="filter-title">
            <span>진료과 필터</span>
            <div>
                <button id="btn-select-all" class="btn-all">전체 선택</button>
                <button id="btn-select-none" class="btn-all">전체 해제</button>
            </div>
        </div>
        <div class="filter-container">
{filter_html}
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
"""

    # --- Write Files ---
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(css_content.strip())
    
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js_content.strip())
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"Successfully generated:")
    print(f"  - {html_path}")
    print(f"  - {css_path}")
    print(f"  - {js_path}")

if __name__ == "__main__":
    main()
