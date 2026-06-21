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