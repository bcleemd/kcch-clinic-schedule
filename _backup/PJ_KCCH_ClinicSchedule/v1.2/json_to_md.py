import json

def format_doctors(doctors):
    if not doctors:
        return ""
    return ", ".join(doctors)

def main():
    json_path = "/Users/charlie/Codes/PJ_KCCH_ClinicSchedule/clinic-schedule-202601.json"
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    departments = data.get('departments', [])
    
    days = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    
    # Table header
    header = "| 진료과 | 오전/오후 | 월 | 화 | 수 | 목 | 금 |"
    separator = "| --- | --- | --- | --- | --- | --- | --- |"
    
    rows = [header, separator]
    
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
        
    print("\n".join(rows))

if __name__ == "__main__":
    main()
