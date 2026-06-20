(function() {
    const STORAGE_KEY = 'transit_pass';
    const THEME_KEY = 'transit_theme';

    const els = {
        passExpiredBanner: document.getElementById('pass-expired-banner'),
        daysPassed: document.getElementById('days-passed'),
        daysTotal: document.getElementById('days-total'),
        progressFill: document.getElementById('progress-fill'),
        daysRemaining: document.getElementById('days-remaining'),
        todayTrips: document.getElementById('today-trips'),
        btnPlusGround: document.getElementById('btn-plus-ground'),
        btnPlusMetro: document.getElementById('btn-plus-metro'),
        totalTrips: document.getElementById('total-trips'),
        totalBreakdown: document.getElementById('total-breakdown'),
        calcPassPrice: document.getElementById('calc-pass-price'),
        calcRetailPrice: document.getElementById('calc-retail-price'),
        calcResultLabel: document.getElementById('calc-result-label'),
        calcResultValue: document.getElementById('calc-result-value'),
        btnUndo: document.getElementById('btn-undo'),
        passInfoText: document.getElementById('pass-info-text'),
    };

    let data = loadData();

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

    function today() {
        const d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function daysBetween(a, b) {
        const da = new Date(a);
        const db = new Date(b);
        return Math.floor((db - da) / 86400000);
    }

    function init() {
        if (!data || !data.pass || !data.pass.active) {
            window.location.href = 'setup.html';
            return;
        }
        initTheme();
        bindEvents();
        updateTrackScreen();
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

    function bindEvents() {
        els.btnPlusGround.addEventListener('click', () => addTrip('ground'));
        els.btnPlusMetro.addEventListener('click', () => addTrip('metro'));
        els.btnUndo.addEventListener('undo', undoLastTrip);
    }

    function formatMoney(amount) {
        return amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' BYN';
    }

    function ensureTripStructure(date) {
        if (!data.trips) data.trips = {};
        if (!(date in data.trips)) {
            if (data.pass.type === 'universal') {
                data.trips[date] = { ground: 0, metro: 0 };
            } else {
                data.trips[date] = 0;
            }
        }
    }

    function addTrip(type) {
        if (!data || !data.pass || !data.pass.active) return;
        const t = today();
        const start = data.pass.startDate;
        if (t < start) return;

        const endDate = getEndDate();
        if (t > endDate) return;

        ensureTripStructure(t);
        const isUniversal = data.pass.type === 'universal';

        if (isUniversal) {
            data.trips[t][type] = (data.trips[t][type] || 0) + 1;
        } else {
            data.trips[t] = (data.trips[t] || 0) + 1;
        }

        if (!data.log) data.log = [];
        data.log.push({
            date: t,
            type: isUniversal ? type : data.pass.type,
            ts: Date.now(),
        });

        saveData(data);
        updateTrackScreen();
    }

    function undoLastTrip() {
        if (!data || !data.log || data.log.length === 0) return;

        const last = data.log[data.log.length - 1];
        const date = last.date;
        const type = last.type;

        ensureTripStructure(date);
        const isUniversal = data.pass.type === 'universal';

        if (isUniversal) {
            if (data.trips[date][type] > 0) {
                data.trips[date][type]--;
            }
        } else {
            if (data.trips[date] > 0) {
                data.trips[date]--;
            }
        }

        data.log.pop();
        saveData(data);
        updateTrackScreen();
    }

    function getEndDate() {
        const start = new Date(data.pass.startDate);
        start.setDate(start.getDate() + data.pass.duration - 1);
        return start.getFullYear() + '-' +
            String(start.getMonth() + 1).padStart(2, '0') + '-' +
            String(start.getDate()).padStart(2, '0');
    }

    function getTodayCount() {
        const t = today();
        ensureTripStructure(t);
        const trip = data.trips[t];
        if (data.pass.type === 'universal') {
            return (trip.ground || 0) + (trip.metro || 0);
        }
        return trip;
    }

    function getTotalTrips() {
        let total = 0;
        let groundTotal = 0;
        let metroTotal = 0;

        for (const date in data.trips) {
            const trip = data.trips[date];
            if (data.pass.type === 'universal') {
                groundTotal += trip.ground || 0;
                metroTotal += trip.metro || 0;
            } else {
                total += trip;
            }
        }

        if (data.pass.type === 'universal') {
            return { total: groundTotal + metroTotal, ground: groundTotal, metro: metroTotal };
        }
        return { total, ground: 0, metro: 0 };
    }

    function updateTrackScreen() {
        if (!data || !data.pass) return;

        const t = today();
        const start = data.pass.startDate;
        const endDate = getEndDate();
        const daysPassed = Math.max(0, daysBetween(start, t) + 1);
        const daysTotal = data.pass.duration;
        const isExpired = t > endDate;
        const notStarted = t < start;
        const isUniversal = data.pass.type === 'universal';

        els.passExpiredBanner.classList.toggle('hidden', !isExpired);

        const shownDays = Math.min(daysPassed, daysTotal);
        els.daysPassed.textContent = shownDays;
        els.daysTotal.textContent = daysTotal;
        els.progressFill.style.width = Math.min(100, (shownDays / daysTotal) * 100) + '%';

        const typeLabels = { universal: 'Общий', ground: '🚌 Наземный', metro: '🚇 Метро' };
        const typeName = typeLabels[data.pass.type] || data.pass.type;
        els.passInfoText.textContent = `${typeName} (действует до ${formatDateShort(endDate)})`;

        if (isExpired) {
            els.daysRemaining.textContent = 'Проездной истёк';
        } else if (notStarted) {
            els.daysRemaining.textContent = `Начинается ${start}`;
        } else {
            const remaining = daysTotal - shownDays;
            els.daysRemaining.textContent = remaining > 0
                ? `Осталось ${remaining} дн.`
                : 'Последний день';
        }

        const todayTotal = getTodayCount();
        const totals = getTotalTrips();

        els.todayTrips.textContent = isUniversal ? todayTotal : (data.trips[t] || 0);
        els.totalTrips.textContent = totals.total;
        els.totalBreakdown.textContent = isUniversal
            ? `(🚌 наземный: ${totals.ground}, 🚇 метро: ${totals.metro})`
            : '';

        const disabled = isExpired || notStarted;
        if (isUniversal) {
            els.btnPlusGround.classList.remove('hidden');
            els.btnPlusMetro.classList.remove('hidden');
            els.btnPlusGround.disabled = disabled;
            els.btnPlusMetro.disabled = disabled;
        } else {
            els.btnPlusGround.classList.toggle('hidden', data.pass.type !== 'ground');
            els.btnPlusMetro.classList.toggle('hidden', data.pass.type !== 'metro');
            els.btnPlusGround.disabled = disabled;
            els.btnPlusMetro.disabled = disabled;
        }

        const passCost = data.pass.price;
        const retailCost = totals.total * data.config.pricePerTrip;
        const diff = retailCost - passCost;

        els.calcPassPrice.textContent = formatMoney(passCost);
        els.calcRetailPrice.textContent = formatMoney(retailCost);

        if (diff > 0) {
            els.calcResultLabel.textContent = 'Экономия';
            els.calcResultValue.textContent = '+' + formatMoney(diff);
            els.calcResultValue.parentElement.className = 'calc-row result positive';
        } else if (diff < 0) {
            els.calcResultLabel.textContent = 'Переплата';
            els.calcResultValue.textContent = formatMoney(diff);
            els.calcResultValue.parentElement.className = 'calc-row result negative';
        } else {
            els.calcResultLabel.textContent = 'Выход в ноль';
            els.calcResultValue.textContent = formatMoney(0);
            els.calcResultValue.parentElement.className = 'calc-row result neutral';
        }

        const hasLog = data.log && data.log.length > 0;
        els.btnUndo.classList.toggle('hidden', !hasLog);
    }

    function formatDateShort(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: '2-digit', year: 'numeric' });
    }

    init();
})();
