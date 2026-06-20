(function() {
    const STORAGE_KEY = 'transit_pass';
    const DEFAULTS_KEY = 'transit_pass_defaults';
    const THEME_KEY = 'transit_theme';

    const els = {
        startDate: document.getElementById('start-date'),
        passPrice: document.getElementById('pass-price'),
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

    function saveDefaults(price, tripPrice, type, duration) {
        localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ price, tripPrice, type, duration }));
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
        if (defaults.price) els.passPrice.value = defaults.price;
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

        bindEvents();
    }

    function bindEvents() {
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedType = btn.dataset.type;
            });
        });

        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedDays = parseInt(btn.dataset.days);
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

    function startPass() {
        const startDate = els.startDate.value;
        const price = parseFloat(els.passPrice.value);
        const tripPrice = parseFloat(els.tripPrice.value);

        if (!startDate) {
            alert('Выберите дату начала');
            return;
        }
        if (!price || price <= 0) {
            alert('Введите стоимость проездного');
            return;
        }
        if (!tripPrice || tripPrice <= 0) {
            alert('Введите цену за поездку');
            return;
        }

        const data = {
            pass: {
                startDate: startDate,
                duration: selectedDays,
                price: price,
                type: selectedType,
                active: true,
            },
            trips: {},
            log: [],
            config: {
                pricePerTrip: tripPrice,
            },
        };
        saveData(data);
        saveDefaults(price, tripPrice, selectedType, selectedDays);
        window.location.href = 'index.html';
    }

    init();
})();
