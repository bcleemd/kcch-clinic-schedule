"""
Last Modified: 2026-06-20
Changes:
    - feat: support CLI argument and save markdown output to web_home directory
"""

import json
import sys
import os

def format_doctors(doctors):
    if not doctors:
        return ""
    return ", ".join(doctors)

def main():
    if len(sys.argv) < 2:
        print("Usage: uv run json_to_md.py <input_json_file>")
        return
    
    json_path = os.path.abspath(sys.argv[1])
    project_dir = os.path.dirname(os.path.abspath(__file__))
    web_home_dir = os.path.join(project_dir, "web_home")
    
    # Ensure web_home directory exists
    os.makedirs(web_home_dir, exist_ok=True)
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return
    
    json_filename = os.path.basename(json_path)
    md_filename = json_filename.replace('.json', '.md')
    md_path = os.path.join(web_home_dir, md_filename)
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    title = data.get('schedule_info', {}).get('title', '외래진료일정표')
    departments = data.get('departments', [])
    
    days = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    
    # Table header
    header = "| 진료과 | 오전/오후 | 월 | 화 | 수 | 목 | 금 |"
    separator = "| --- | --- | --- | --- | --- | --- | --- |"
    
    rows = [f"### {title}", "", header, separator]
    
    for dept in departments:
        dept_name = dept['dept_name']
        schedule = dept['schedule']
        
        # AM row
        am_row = [dept_name, "오전"]
        for day in days:
            am_row.append(format_doctors(schedule.get(day, {}).get('am', [])))
        rows.append("| " + " | ".join(am_row) + " |")
        
        # PM row
        pm_row = [dept_name, "오후"]
        for day in days:
            pm_row.append(format_doctors(schedule.get(day, {}).get('pm', [])))
        rows.append("| " + " | ".join(pm_row) + " |")
        
    md_content = "\n".join(rows) + "\n"
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
        
    print(f"Successfully generated:")
    print(f"  - {md_path}")

if __name__ == "__main__":
    main()
