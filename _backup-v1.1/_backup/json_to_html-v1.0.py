"""
ㅍ1.0 
    단순한 표 형식으로 만 변환 
"""


import json

def format_doctors_html(doctors):
    if not doctors:
        return ""
    return "<br>".join(doctors)

def main():
    json_path = "/Users/charlie/Codes/PJ_KCCH_ClinicSchedule/clinic-schedule-202601.json"
    html_path = "/Users/charlie/Codes/PJ_KCCH_ClinicSchedule/index.html"
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    title = data['schedule_info']['title']
    last_updated = data['schedule_info']['last_updated']
    departments = data.get('departments', [])
    
    days = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    
    html_template = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --primary: #2563eb;
            --primary-light: #eff6ff;
            --bg: #f8fafc;
            --text: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --white: #ffffff;
            --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: 'Outfit', 'Noto Sans KR', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 2rem 1rem;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}

        header {{
            text-align: center;
            margin-bottom: 3rem;
        }}

        h1 {{
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, #1e293b 0%, #2563eb 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}

        .meta {{
            color: var(--text-muted);
            font-size: 0.9rem;
        }}

        .table-container {{
            background: var(--white);
            border-radius: 1rem;
            box-shadow: var(--shadow);
            overflow: hidden;
            border: 2px solid var(--text);
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            text-align: center;
            border-spacing: 0;
            table-layout: fixed;
        }}

        th {{
            background-color: #f1f5f9;
            color: var(--text);
            font-weight: 600;
            padding: 1rem;
            font-size: 1rem;
            border-bottom: 3px solid var(--text);
            position: sticky;
            top: 0;
            z-index: 10;
        }}

        /* Column widths */
        th:nth-child(1) {{ width: 14%; }} /* 진료과 */
        th:nth-child(2) {{ width: 8%; }}  /* 구분 */
        th:nth-child(n+3) {{ width: 15.6%; }} /* 월~금 (78% / 5) */

        td {{
            padding: 1rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.95rem;
            vertical-align: middle;
            word-break: keep-all;
            overflow: hidden;
        }}

        tr:hover td {{
            background-color: #f8fafc;
        }}

        .dept-cell {{
            font-weight: 700;
            background-color: #fdfdfd;
            color: var(--primary);
            border-right: 2px solid var(--text);
            width: 140px;
        }}

        .time-cell {{
            font-weight: 500;
            color: var(--text-muted);
            background-color: #fafafa;
            border-right: 2px solid var(--text);
            width: 100px;
        }}

        .am-row td {{
            background-color: var(--white);
        }}

        .pm-row td {{
            background-color: #f7fee7; /* Very light lime/green for PM */
            border-bottom: 2px solid var(--text);
        }}

        .am-row .time-cell {{
            background-color: #f0fdf4;
            color: #166534;
        }}

        .pm-row .time-cell {{
            background-color: #ecfdf5;
            color: #065f46;
        }}

        /* Tue/Thu Highlight */
        .highlight-col {{
            background-color: #f1f5f9 !important; /* Light grey highlight */
        }}

        .am-row .highlight-col {{
            background-color: #f1f5f9 !important;
        }}

        .pm-row .highlight-col {{
            background-color: #e2e8f0 !important;
        }}

        .doctors {{
            font-weight: 400;
            color: #334155;
        }}

        @media (max-width: 768px) {{
            body {{
                padding: 1rem 0.5rem;
            }}
            h1 {{
                font-size: 1.8rem;
            }}
            th, td {{
                padding: 0.75rem 0.5rem;
                font-size: 0.85rem;
            }}
            .dept-cell {{
                width: 100px;
            }}
            .time-cell {{
                width: 60px;
            }}
        }}

        /* Badge for category if needed */
        .category-tag {{
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            border-radius: 9999px;
            background: var(--primary-light);
            color: var(--primary);
            margin-top: 0.5rem;
            display: inline-block;
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>{title}</h1>
            <p class="meta">최종 업데이트: {last_updated}</p>
        </header>

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
"""
    
    for dept in departments:
        dept_name = dept['dept_name']
        schedule = dept['schedule']
        
        # AM Row
        html_template += f"""
                    <tr class="am-row">
                        <td class="dept-cell" rowspan="2">{dept_name}</td>
                        <td class="time-cell">오전</td>
"""
        for day in days:
            doctors = format_doctors_html(schedule.get(day, {}).get('am', []))
            highlight_class = ' highlight-col' if day in ['tuesday', 'thursday'] else ''
            html_template += f'                        <td class="doctors{highlight_class}">{doctors}</td>\n'
        html_template += "                    </tr>"
        
        # PM Row
        html_template += f"""
                    <tr class="pm-row">
                        <td class="time-cell">오후</td>
"""
        for day in days:
            doctors = format_doctors_html(schedule.get(day, {}).get('pm', []))
            highlight_class = ' highlight-col' if day in ['tuesday', 'thursday'] else ''
            html_template += f'                        <td class="doctors{highlight_class}">{doctors}</td>\n'
        html_template += "                    </tr>"

    html_template += """
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
"""
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_template)
    print(f"Successfully generated {html_path}")

if __name__ == "__main__":
    main()
