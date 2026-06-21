(function() {
    const STORAGE_KEY = 'transit_pass';
    const DEFAULTS_KEY = 'transit_pass_defaults';
    const THEME_KEY = 'transit_theme';

    const els = {
        startDate: document.getElementById('start-date'),
        passPriceUniversal: document.getElementById('pass-price-universal'),
        passPriceSingle: document.getElementById('pass-price-single'),
        priceUniversal: document.getElementById('price-universal'),
        priceSingle: document.getElementById('price-single'),
        tripPrice: document.getElementById('trip-price'),
        btnStart: document.getElementById('btn-start'),
    };

    let selectedDays = 20;
    let selectedType = 'universal';

    function loadData() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
        } catch {
            return null;
        }
    }

    function saveData(d) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    }

    function loadDefaults() {
        try {
            return JSON.parse(localStorage.getItem(DEFAULTS_KEY)) || {};
        } catch {
            return {};
        }
    }

    function saveDefaults(data) {
        localStorage.setItem(DEFAULTS_KEY, JSON.stringify(data));
    }

    function today() {
        const d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function init() {
        els.startDate.value = today();
        initTheme();

        const defaults = loadDefaults();
        if (defaults.tripPrice) els.tripPrice.value = defaults.tripPrice;
        if (defaults.type) {
            selectedType = defaults.type;
            document.querySelectorAll('.type-btn').forEach(b => {
                b.classList.toggle('selected', b.dataset.type === selectedType);
            });
        }
        if (defaults.duration) {
            selectedDays = defaults.duration;
            document.querySelectorAll('.duration-btn').forEach(b => {
                b.classList.toggle('selected', parseInt(b.dataset.days) === selectedDays);
            });
        }

        updatePriceFields();
        bindEvents();
        updatePlan();
    }

    function updatePriceFields() {
        const isUniversal = selectedType === 'universal';
        els.priceUniversal.classList.toggle('hidden', !isUniversal);
        els.priceSingle.classList.toggle('hidden', isUniversal);

        const defaults = loadDefaults();
        if (isUniversal) {
            if (defaults.universalPrice) els.passPriceUniversal.value = defaults.universalPrice;
        } else {
            if (defaults.singlePrice) els.passPriceSingle.value = defaults.singlePrice;
        }
    }

    function bindEvents() {
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedType = btn.dataset.type;
                updatePriceFields();
            });
        });

        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedDays = parseInt(btn.dataset.days);
                updatePlan();
            });
        });

        els.btnStart.addEventListener('click', startPass);
    }

    function initTheme() {
        const saved = localStorage.getItem(THEME_KEY) || 'light';
        applyTheme(saved);
        document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('btn-theme').textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
    }

    function getHolidays(year) {
        const holidays = [
            `${year}-01-01`, `${year}-01-02`, `${year}-01-03`,
            `${year}-01-07`,
            `${year}-03-08`,
            `${year}-05-01`,
            `${year}-05-09`,
            `${year}-07-03`,
            `${year}-11-02`,
            `${year}-12-25`,
        ];
        return new Set(holidays);
    }

    function formatDateShort(d) {
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: '2-digit', year: 'numeric' });
    }

    function countUnprofitableDays(startDate, duration) {
        const holidays2026 = getHolidays(2026);
        let count = 0;
        for (let i = 0; i < duration; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dow = d.getDay();
            const dateStr = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');
            if (dow === 0 || dow === 6 || holidays2026.has(dateStr)) {
                count++;
            }
        }
        return count;
    }

    function findBestDates(duration) {
        const results = [];
        const todayDate = new Date();
        const maxOffset = Math.min(duration, 14);
        for (let offset = 1; offset <= maxOffset; offset++) {
            const d = new Date(todayDate);
            d.setDate(d.getDate() + offset);
            const unprofitable = countUnprofitableDays(d, duration);
            results.push({ date: new Date(d), unprofitable });
        }
        results.sort((a, b) => a.unprofitable - b.unprofitable || a.date - b.date);
        const seen = new Set();
        const unique = [];
        for (const item of results) {
            if (!seen.has(item.unprofitable)) {
                seen.add(item.unprofitable);
                unique.push(item);
            }
            if (unique.length >= 2) break;
        }
        return unique;
    }

    function updatePlan() {
        const durations = [10, 20, 30];
        const container = document.getElementById('plan-dates');
        container.innerHTML = durations.map(dur => {
            const isCurrent = dur === selectedDays;
            const dates = findBestDates(dur);
            const rows = dates.map((item, i) => {
                const label = i === 0 ? 'Лучше всего' : 'Хороший вариант';
                return `<div class="plan-row">
                    <span class="plan-label">${label}</span>
                    <span class="plan-date">${formatDateShort(item.date)}</span>
                    <span class="plan-count">${item.unprofitable} ${item.unprofitable === 1 ? 'выходной' : item.unprofitable < 5 ? 'выходных' : 'выходных'} (праздн.)</span>
                </div>`;
            }).join('');
            return `<div class="plan-section${isCurrent ? ' plan-current' : ''}">
                <div class="plan-section-title">${dur} дней${isCurrent ? ' ★' : ''}</div>
                ${rows}
            </div>`;
        }).join('');
    }

    init();
})();
