// Renders the clinic schedule table dynamically from clinic-schedule.json.
// Mirrors the structure/coloring previously produced by json_to_html.py at build time.

// Predefined high-visibility colors for doctors (same palette/order as json_to_html.py)
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

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const HIGHLIGHT_DAYS = ['tuesday', 'thursday'];

// Doctor -> color map, assigned in first-seen order to match the original output exactly.
const doctorColorMap = {};
let colorIndex = 0;

function getDoctorColor(name) {
    // Strip anything in parentheses, e.g. "임다은(초음파)" -> "임다은"
    const baseName = name.replace(/\(.*?\)/g, '').trim();
    if (!(baseName in doctorColorMap)) {
        doctorColorMap[baseName] = DOCTOR_COLORS[colorIndex % DOCTOR_COLORS.length];
        colorIndex += 1;
    }
    return doctorColorMap[baseName];
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatDoctorsHtml(doctors) {
    if (!doctors || doctors.length === 0) {
        return '';
    }
    return doctors
        .map((doc) => {
            const color = getDoctorColor(doc);
            const parenIdx = doc.indexOf('(');
            if (parenIdx !== -1 && doc.includes(')')) {
                const namePart = escapeHtml(doc.slice(0, parenIdx));
                const posPart = escapeHtml(doc.slice(parenIdx));
                return `<span style="color: ${color}; font-weight: 600;">${namePart}<span class="mobile-block">${posPart}</span></span>`;
            }
            return `<span style="color: ${color}; font-weight: 600;">${escapeHtml(doc)}</span>`;
        })
        .join('<br>');
}

function buildRow(rowClass, dept, timeLabelHtml, period, includeDeptCell) {
    const tr = document.createElement('tr');
    tr.className = rowClass;
    tr.setAttribute('data-dept', dept.dept_name);

    let cells = '';
    if (includeDeptCell) {
        cells += `<td class="dept-cell" rowspan="2">${escapeHtml(dept.dept_name)}</td>`;
    }
    cells += `<td class="time-cell">${timeLabelHtml}</td>`;
    for (const day of DAYS) {
        const docs = (dept.schedule && dept.schedule[day] && dept.schedule[day][period]) || [];
        const hc = HIGHLIGHT_DAYS.includes(day) ? ' highlight-col' : '';
        cells += `<td class="doctors${hc}">${formatDoctorsHtml(docs)}</td>`;
    }
    tr.innerHTML = cells;
    return tr;
}

function renderTable(departments) {
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = '';

    // IMPORTANT: iterate dept -> AM -> PM so color assignment order matches json_to_html.py
    for (const dept of departments) {
        const amRow = buildRow('am-row', dept, '오<span class="mobile-block"></span>전', 'am', true);
        const pmRow = buildRow('pm-row', dept, '오<span class="mobile-block"></span>후', 'pm', false);
        tbody.appendChild(amRow);
        tbody.appendChild(pmRow);
    }
}

function renderFilters(departments) {
    const container = document.getElementById('filter-container');
    container.innerHTML = '';
    for (const dept of departments) {
        const name = dept.dept_name;
        const label = document.createElement('label');
        label.className = 'filter-item';
        label.innerHTML =
            `<input type="checkbox" class="dept-checkbox" value="${escapeHtml(name)}" checked> ${escapeHtml(name)}`;
        container.appendChild(label);
    }
}

function setupFilterBehavior() {
    const checkboxes = document.querySelectorAll('.dept-checkbox');
    const rows = document.querySelectorAll('tr[data-dept]');
    const btnAll = document.getElementById('btn-select-all');
    const btnNone = document.getElementById('btn-select-none');

    function updateFilters() {
        const checkedDepts = Array.from(checkboxes)
            .filter((cb) => cb.checked)
            .map((cb) => cb.value);

        rows.forEach((row) => {
            const dept = row.getAttribute('data-dept');
            row.style.display =
                checkedDepts.length === 0 || checkedDepts.includes(dept) ? '' : 'none';
        });
    }

    checkboxes.forEach((cb) => cb.addEventListener('change', updateFilters));
    btnAll.addEventListener('click', () => {
        checkboxes.forEach((cb) => (cb.checked = true));
        updateFilters();
    });
    btnNone.addEventListener('click', () => {
        checkboxes.forEach((cb) => (cb.checked = false));
        updateFilters();
    });

    updateFilters();
}

function renderHeader(info) {
    if (!info) return;
    if (info.title) {
        document.title = info.title;
        document.getElementById('page-title').textContent = info.title;
    }
    if (info.last_updated) {
        document.getElementById('page-meta').textContent = `최종 업데이트: ${info.last_updated}`;
    }
}

async function init() {
    const status = document.getElementById('status-message');
    try {
        const res = await fetch('clinic-schedule.json', { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const departments = data.departments || [];

        renderHeader(data.schedule_info);
        renderTable(departments);
        renderFilters(departments);
        setupFilterBehavior();
        status.textContent = '';
    } catch (err) {
        status.textContent =
            `데이터를 불러오지 못했습니다: ${err.message}. (file://로 더블클릭해서 열면 브라우저 보안정책(CORS)으로 차단됩니다. 같은 폴더에서 "python3 -m http.server" 같은 정적 서버로 열어주세요.)`;
        console.error('Failed to load clinic-schedule.json', err);
    }
}

document.addEventListener('DOMContentLoaded', init);
