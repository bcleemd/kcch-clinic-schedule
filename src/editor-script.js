/**
 * WYSIWYG Clinic Schedule Editor — File System Access API Version
 * No API calls. All file I/O is done directly via the browser File System Access API.
 */

// =====================================================================
// State
// =====================================================================
let scheduleData = null;
let doctorPool = new Set();
let dragSource = null;
let currentFileName = null;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// =====================================================================
// DOM References
// =====================================================================
const scheduleTitleInput = document.getElementById('schedule-title');
const scheduleYearInput = document.getElementById('schedule-year');
const scheduleMonthInput = document.getElementById('schedule-month');
const scheduleUpdatedInput = document.getElementById('schedule-updated');

const btnOpenFolder = document.getElementById('btn-open-folder');
const folderStatus = document.getElementById('folder-status');
const fileSelect = document.getElementById('file-select');
const btnLoadFile = document.getElementById('btn-load-file');
const btnSaveJson = document.getElementById('btn-save-json');
const btnBuildHtml = document.getElementById('btn-build-html');

const doctorPoolContainer = document.getElementById('doctor-pool');
const newDoctorNameInput = document.getElementById('new-doctor-name');
const btnAddDoctor = document.getElementById('btn-add-doctor');
const trashZone = document.getElementById('trash-zone');
const tableBody = document.getElementById('table-body');

// =====================================================================
// Toast Notification
// =====================================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-triangle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// =====================================================================
// Initialization
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadDefaultTemplate();
    scanScheduleFiles();
});

function setupEventListeners() {
    btnOpenFolder.addEventListener('click', openProjectFolder);
    btnLoadFile.addEventListener('click', () => {
        const selected = fileSelect.value;
        if (!selected) { showToast('불러올 파일을 선택하세요.', 'error'); return; }
        loadJsonFile(selected);
    });
    btnSaveJson.addEventListener('click', saveJsonFile);
    btnBuildHtml.addEventListener('click', buildAndSaveHtml);
    btnAddDoctor.addEventListener('click', addNewDoctorToPool);
    newDoctorNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addNewDoctorToPool();
    });

    // Trash Zone
    trashZone.addEventListener('dragover', (e) => { e.preventDefault(); trashZone.classList.add('drag-over'); });
    trashZone.addEventListener('dragleave', () => trashZone.classList.remove('drag-over'));
    trashZone.addEventListener('drop', (e) => {
        e.preventDefault();
        trashZone.classList.remove('drag-over');
        if (!dragSource || !scheduleData) return;
        const docName = dragSource.name;
        if (dragSource.type === 'grid') {
            scheduleData.departments[dragSource.deptIndex].schedule[dragSource.day][dragSource.time].splice(dragSource.docIndex, 1);
            renderSchedule();
            showToast(`'${docName}' 일정이 제거되었습니다.`, 'info');
        } else if (dragSource.type === 'pool') {
            if (docName === '일반') { showToast("'일반' 카드는 풀에서 제거할 수 없습니다.", 'error'); return; }
            doctorPool.delete(docName);
            rebuildDoctorPool();
            showToast(`'${docName}' 의사가 풀에서 삭제되었습니다.`, 'info');
        }
        dragSource = null;
    });
}

// =====================================================================
// Server API Integration — Auto Folder & File I/O
// =====================================================================
function openProjectFolder() {
    // "폴더 열기" 버튼 클릭 시 서버에서 다시 스캔하도록 매핑
    scanScheduleFiles();
}

async function scanScheduleFiles() {
    try {
        const res = await fetch('/api/files');
        const resData = await res.json();
        if (!resData.success) throw new Error(resData.error);

        const files = resData.files || [];
        const currentDir = resData.currentDir || '프로젝트 폴더';

        // Update Folder Status with Start Folder Name
        folderStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${currentDir}`;
        folderStatus.classList.add('connected');

        // Enable Controls
        fileSelect.disabled = false;
        btnLoadFile.disabled = false;
        btnSaveJson.disabled = false;
        btnBuildHtml.disabled = false;

        fileSelect.innerHTML = '<option value="">-- 파일 선택 --</option>';
        files.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            fileSelect.appendChild(opt);
        });

        // Determine default file to load
        const defaultFile = 'clinic-schedule.json';
        if (currentFileName && files.includes(currentFileName)) {
            fileSelect.value = currentFileName;
            await loadJsonFile(currentFileName);
        } else if (files.includes(defaultFile)) {
            fileSelect.value = defaultFile;
            await loadJsonFile(defaultFile);
        } else if (files.length > 0) {
            fileSelect.value = files[0];
            await loadJsonFile(files[0]);
        }
        showToast(`서버 폴더 '${currentDir}' 동기화 성공!`);
    } catch (err) {
        showToast('서버 연결 실패: ' + err.message, 'error');
        folderStatus.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> 연결 실패`;
        folderStatus.classList.remove('connected');
    }
}

async function loadJsonFile(fileName) {
    try {
        const res = await fetch(`/api/load?file=${encodeURIComponent(fileName)}`);
        const resData = await res.json();
        if (!resData.success) throw new Error(resData.error);

        scheduleData = resData.data;
        currentFileName = fileName;
        updateFormFields();
        rebuildDoctorPool();
        renderSchedule();
        showToast(`'${fileName}' 로드 완료!`, 'success');
    } catch (err) {
        showToast(`파일 로드 실패: ${err.message}`, 'error');
    }
}

async function saveJsonFile() {
    if (!scheduleData) { showToast('저장할 데이터가 없습니다.', 'error'); return; }
    syncMetadataFromFields();

    // 항상 현재 에디터가 작업 중이던 원본 파일명(기본값 clinic-schedule.json)으로 전송합니다.
    const fileName = currentFileName || 'clinic-schedule.json';

    try {
        const res = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName, data: scheduleData })
        });
        const resData = await res.json();
        if (!resData.success) throw new Error(resData.error);

        // currentFileName 대입을 생략하여 에디터가 작업하던 타겟을 고정 유지합니다.
        showToast('저장 완료! (clinic-schedule.json 및 연월 백업본 반영)', 'success');
        await scanScheduleFiles();
    } catch (err) {
        showToast(`저장 실패: ${err.message}`, 'error');
    }
}

async function buildAndSaveHtml() {
    if (!scheduleData || !currentFileName) { showToast('배포할 데이터가 없습니다. 먼저 저장하세요.', 'error'); return; }
    syncMetadataFromFields();

    showToast('GitHub에 데이터 배포 중...', 'info');
    try {
        const res = await fetch('/api/deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: currentFileName })
        });
        const resData = await res.json();
        if (!resData.success) throw new Error(resData.error);

        showToast('GitHub 배포 완료!', 'success');
    } catch (err) {
        showToast(`배포 실패: ${err.message}`, 'error');
    }
}

// =====================================================================
// Metadata Sync
// =====================================================================
function updateFormFields() {
    if (!scheduleData || !scheduleData.schedule_info) return;
    const info = scheduleData.schedule_info;
    scheduleTitleInput.value = info.title || '외래진료일정표';
    scheduleYearInput.value = info.year || 2026;
    scheduleMonthInput.value = info.month || 1;
    scheduleUpdatedInput.value = info.last_updated || '';
}

function syncMetadataFromFields() {
    if (!scheduleData) return;
    if (!scheduleData.schedule_info) scheduleData.schedule_info = {};
    scheduleData.schedule_info.title = scheduleTitleInput.value;
    scheduleData.schedule_info.year = parseInt(scheduleYearInput.value, 10);
    scheduleData.schedule_info.month = parseInt(scheduleMonthInput.value, 10);
    scheduleData.schedule_info.last_updated = scheduleUpdatedInput.value;
}

// =====================================================================
// Default Template
// =====================================================================
function loadDefaultTemplate() {
    scheduleData = {
        schedule_info: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            title: '외래진료일정표',
            last_updated: new Date().toISOString().split('T')[0]
        },
        departments: [
            { dept_name: '소화기내과', category: '내과', schedule: createEmptySchedule() },
            { dept_name: '호흡기내과', category: '내과', schedule: createEmptySchedule() }
        ]
    };
    updateFormFields();
    rebuildDoctorPool();
    renderSchedule();
}

function createEmptySchedule() {
    const s = {};
    DAYS.forEach(d => { s[d] = { am: [], pm: [] }; });
    return s;
}

// =====================================================================
// Doctor Pool
// =====================================================================
function rebuildDoctorPool() {
    doctorPool.clear();
    doctorPool.add('일반');
    if (scheduleData && scheduleData.departments) {
        scheduleData.departments.forEach(dept => {
            DAYS.forEach(day => {
                if (dept.schedule && dept.schedule[day]) {
                    ['am', 'pm'].forEach(time => {
                        (dept.schedule[day][time] || []).forEach(doc => {
                            if (doc && doc.trim()) doctorPool.add(doc.trim());
                        });
                    });
                }
            });
        });
    }
    renderDoctorPool();
}

function renderDoctorPool() {
    doctorPoolContainer.innerHTML = '';
    Array.from(doctorPool).sort((a, b) => a.localeCompare(b)).forEach(docName => {
        const card = document.createElement('div');
        card.className = 'doctor-card';
        card.draggable = true;
        card.innerHTML = `<i class="fa-solid fa-user-md"></i> ${docName}`;
        card.addEventListener('dragstart', (e) => {
            dragSource = { type: 'pool', name: docName };
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', docName);
            e.dataTransfer.effectAllowed = 'copyMove';
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        doctorPoolContainer.appendChild(card);
    });
}

function addNewDoctorToPool() {
    const name = newDoctorNameInput.value.trim();
    if (!name) { showToast('의사 이름을 입력하세요.', 'error'); return; }
    if (doctorPool.has(name)) { showToast('이미 풀에 존재합니다.', 'error'); return; }
    doctorPool.add(name);
    newDoctorNameInput.value = '';
    renderDoctorPool();
    showToast(`'${name}' 추가 완료!`, 'success');
}

// =====================================================================
// Schedule Grid — Render
// =====================================================================
function renderSchedule() {
    if (!scheduleData || !scheduleData.departments) return;
    tableBody.innerHTML = '';

    scheduleData.departments.forEach((dept, deptIndex) => {
        const deptName = dept.dept_name;

        // AM Row
        const amRow = document.createElement('tr');
        amRow.className = 'am-row';
        const deptCell = document.createElement('td');
        deptCell.className = 'dept-cell';
        deptCell.rowSpan = 2;
        deptCell.textContent = deptName;
        amRow.appendChild(deptCell);

        const amTime = document.createElement('td');
        amTime.className = 'time-cell';
        amTime.innerHTML = '오<span class="mobile-block"></span>전';
        amRow.appendChild(amTime);

        DAYS.forEach(day => {
            const td = document.createElement('td');
            if (['tuesday', 'thursday'].includes(day)) td.className = 'highlight-col';
            const dz = createDropzone(deptIndex, day, 'am');
            const docs = (dept.schedule && dept.schedule[day] && dept.schedule[day].am) || [];
            renderDoctorChips(dz, docs, deptIndex, day, 'am');
            td.appendChild(dz);
            amRow.appendChild(td);
        });
        tableBody.appendChild(amRow);

        // PM Row
        const pmRow = document.createElement('tr');
        pmRow.className = 'pm-row';
        const pmTime = document.createElement('td');
        pmTime.className = 'time-cell';
        pmTime.innerHTML = '오<span class="mobile-block"></span>후';
        pmRow.appendChild(pmTime);

        DAYS.forEach(day => {
            const td = document.createElement('td');
            if (['tuesday', 'thursday'].includes(day)) td.className = 'highlight-col';
            const dz = createDropzone(deptIndex, day, 'pm');
            const docs = (dept.schedule && dept.schedule[day] && dept.schedule[day].pm) || [];
            renderDoctorChips(dz, docs, deptIndex, day, 'pm');
            td.appendChild(dz);
            pmRow.appendChild(td);
        });
        tableBody.appendChild(pmRow);
    });
}

function createDropzone(deptIndex, day, time) {
    const dz = document.createElement('div');
    dz.className = 'dropzone';
    dz.dataset.deptIndex = deptIndex;
    dz.dataset.day = day;
    dz.dataset.time = time;

    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', (e) => {
        e.preventDefault();
        dz.classList.remove('drag-over');
        if (!dragSource || !scheduleData) return;

        const tDept = parseInt(dz.dataset.deptIndex, 10);
        const tDay = dz.dataset.day;
        const tTime = dz.dataset.time;
        const docName = dragSource.name;
        const isCopy = e.ctrlKey || e.metaKey || dragSource.type === 'pool';

        if (dragSource.type === 'grid') {
            if (dragSource.deptIndex === tDept && dragSource.day === tDay && dragSource.time === tTime) return;
            if (!isCopy) {
                scheduleData.departments[dragSource.deptIndex].schedule[dragSource.day][dragSource.time].splice(dragSource.docIndex, 1);
            }
        }

        if (!scheduleData.departments[tDept].schedule) scheduleData.departments[tDept].schedule = createEmptySchedule();
        if (!scheduleData.departments[tDept].schedule[tDay]) scheduleData.departments[tDept].schedule[tDay] = { am: [], pm: [] };
        scheduleData.departments[tDept].schedule[tDay][tTime].push(docName);

        renderSchedule();
        showToast(`'${docName}' 배치 완료.`);
        dragSource = null;
    });

    return dz;
}

function renderDoctorChips(container, docList, deptIndex, day, time) {
    container.innerHTML = '';
    docList.forEach((docName, index) => {
        const chip = document.createElement('div');
        chip.className = 'doctor-chip';
        chip.draggable = true;
        chip.innerHTML = `<span>${docName}</span><button class="btn-chip-delete" title="삭제"><i class="fa-solid fa-xmark"></i></button>`;

        chip.querySelector('.btn-chip-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            scheduleData.departments[deptIndex].schedule[day][time].splice(index, 1);
            renderSchedule();
            showToast(`'${docName}' 제거됨.`, 'info');
        });

        chip.addEventListener('dragstart', (e) => {
            dragSource = { type: 'grid', deptIndex, day, time, docIndex: index, name: docName };
            chip.classList.add('dragging');
            e.dataTransfer.setData('text/plain', docName);
            e.dataTransfer.effectAllowed = 'move';
        });
        chip.addEventListener('dragend', () => chip.classList.remove('dragging'));

        container.appendChild(chip);
    });
}

// =====================================================================
// HTML Viewer Generator (ported from json_to_html.py)
// =====================================================================
const DOCTOR_COLORS = [
    '#d97706', '#059669', '#7c3aed', '#db2777', '#2563eb',
    '#ea580c', '#0891b2', '#4f46e5', '#9333ea', '#0d9488',
    '#e11d48', '#475569'
];

function generateViewerFiles(data) {
    const colorMap = {};
    let colorIdx = 0;

    function getColor(name) {
        const base = name.replace(/\(.*?\)/g, '').trim();
        if (!(base in colorMap)) {
            colorMap[base] = DOCTOR_COLORS[colorIdx % DOCTOR_COLORS.length];
            colorIdx++;
        }
        return colorMap[base];
    }

    function fmtDocs(docs) {
        if (!docs || docs.length === 0) return '';
        return docs.map(doc => {
            const c = getColor(doc);
            if (doc.includes('(') && doc.includes(')')) {
                const np = doc.split('(', 1)[0];
                const pp = '(' + doc.split('(').slice(1).join('(');
                return `<span style="color: ${c}; font-weight: 600;">${np}<span class="mobile-block">${pp}</span></span>`;
            }
            return `<span style="color: ${c}; font-weight: 600;">${doc}</span>`;
        }).join('<br>');
    }

    const title = data.schedule_info.title;
    const lastUpdated = data.schedule_info.last_updated;
    const depts = data.departments || [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // --- CSS ---
    const cssContent = `:root {
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
    font-size: 1.25rem;
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
    border-bottom: 2px solid var(--text);
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
    .top-panel h1 { font-size: 1.15rem; }
    th, td { padding: 0.5rem; font-size: 0.8rem; }
    .bottom-panel { padding: 0.5rem; }
    .mobile-block { display: block; font-size: 0.85em; }
}`;

    // --- JS ---
    const jsContent = `document.addEventListener('DOMContentLoaded', () => {
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
});`;

    // --- Table Body HTML ---
    let tbody = '';
    depts.forEach(dept => {
        const name = dept.dept_name;
        const sched = dept.schedule || {};

        // AM
        tbody += `<tr class="am-row" data-dept="${name}">\n`;
        tbody += `    <td class="dept-cell" rowspan="2">${name}</td>\n`;
        tbody += `    <td class="time-cell">오<span class="mobile-block"></span>전</td>\n`;
        days.forEach(day => {
            const docs = fmtDocs((sched[day] || {}).am || []);
            const hc = ['tuesday', 'thursday'].includes(day) ? ' highlight-col' : '';
            tbody += `    <td class="doctors${hc}">${docs}</td>\n`;
        });
        tbody += '</tr>\n';

        // PM
        tbody += `<tr class="pm-row" data-dept="${name}">\n`;
        tbody += `    <td class="time-cell">오<span class="mobile-block"></span>후</td>\n`;
        days.forEach(day => {
            const docs = fmtDocs((sched[day] || {}).pm || []);
            const hc = ['tuesday', 'thursday'].includes(day) ? ' highlight-col' : '';
            tbody += `    <td class="doctors${hc}">${docs}</td>\n`;
        });
        tbody += '</tr>\n';
    });

    // --- Filter HTML ---
    let filterHtml = '';
    depts.forEach(dept => {
        filterHtml += `
                <label class="filter-item">
                    <input type="checkbox" class="dept-checkbox" value="${dept.dept_name}" checked>
                    ${dept.dept_name}
                </label>`;
    });

    // --- Full HTML ---
    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="top-panel">
        <h1>${title}</h1>
        <p class="meta">최종 업데이트: ${lastUpdated}</p>
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
${tbody}
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
${filterHtml}
        </div>
    </div>

    <script src="script.js"><\/script>
</body>
</html>
`;

    return { htmlContent, cssContent, jsContent };
}
