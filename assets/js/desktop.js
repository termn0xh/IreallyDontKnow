/**
 * Ubuntu GNOME Desktop - Clean Rebuild
 * Fully functional: windows, dock, menus, keyboard, touch
 */
(function () {
    'use strict';

    // ==========================================================================
    // STATE
    // ==========================================================================
    const state = {
        windows: {},
        focusedWindow: null,
        zIndex: 100,
        activitiesOpen: false,
        systemMenuOpen: false,
        calendarOpen: false,
        dragging: null
    };

    // ==========================================================================
    // DOM REFERENCES
    // ==========================================================================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {};

    function cacheDom() {
        dom.activitiesBtn = $('#activities-btn');
        dom.activitiesOverlay = $('#activities-overlay');
        dom.activitiesSearch = $('#activities-search');

        dom.clockBtn = $('#clock-btn');
        dom.clock = $('#clock');
        dom.calendarPopup = $('#calendar-popup');
        dom.calendarTitle = $('#calendar-title');
        dom.calendarDate = $('#calendar-date');
        dom.calendarDays = $('#calendar-days');

        dom.systemBtn = $('#system-btn');
        dom.systemMenu = $('#system-menu');

        dom.desktop = $('#desktop');
        dom.windows = $$('.window');
        dom.dockItems = $$('.dock-item[data-window]');
        dom.appItems = $$('.app-item[data-window]');
        dom.wpBtns = $$('.wp-btn');
    }

    // ==========================================================================
    // CLOCK & CALENDAR
    // ==========================================================================
    function updateClock() {
        const now = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const day = days[now.getDay()];
        const hours = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        dom.clock.textContent = `${day} ${hours}:${mins}`;
    }

    function updateCalendar() {
        const now = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        dom.calendarTitle.textContent = days[now.getDay()];
        dom.calendarDate.textContent = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

        // Build calendar grid
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = now.getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        let html = '';

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<span class="cal-day dim">${daysInPrevMonth - i}</span>`;
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const cls = i === today ? 'cal-day today' : 'cal-day';
            html += `<span class="${cls}">${i}</span>`;
        }

        // Next month days (fill to 42 total = 6 rows)
        const totalCells = 42;
        const remaining = totalCells - (firstDay + daysInMonth);
        for (let i = 1; i <= remaining; i++) {
            html += `<span class="cal-day dim">${i}</span>`;
        }

        dom.calendarDays.innerHTML = html;
    }

    // ==========================================================================
    // MENUS
    // ==========================================================================
    function closeAllMenus() {
        if (state.activitiesOpen) toggleActivities(false);
        if (state.systemMenuOpen) toggleSystemMenu(false);
        if (state.calendarOpen) toggleCalendar(false);
    }

    function toggleActivities(force) {
        state.activitiesOpen = force !== undefined ? force : !state.activitiesOpen;
        dom.activitiesOverlay.classList.toggle('open', state.activitiesOpen);
        dom.activitiesBtn.classList.toggle('active', state.activitiesOpen);
        dom.activitiesBtn.setAttribute('aria-expanded', state.activitiesOpen);

        if (state.activitiesOpen) {
            if (state.systemMenuOpen) toggleSystemMenu(false);
            if (state.calendarOpen) toggleCalendar(false);
            setTimeout(() => dom.activitiesSearch.focus(), 100);
        }
    }

    function toggleSystemMenu(force) {
        state.systemMenuOpen = force !== undefined ? force : !state.systemMenuOpen;
        dom.systemMenu.classList.toggle('open', state.systemMenuOpen);
        dom.systemBtn.classList.toggle('active', state.systemMenuOpen);
        dom.systemBtn.setAttribute('aria-expanded', state.systemMenuOpen);

        if (state.systemMenuOpen) {
            if (state.activitiesOpen) toggleActivities(false);
            if (state.calendarOpen) toggleCalendar(false);
        }
    }

    function toggleCalendar(force) {
        state.calendarOpen = force !== undefined ? force : !state.calendarOpen;
        dom.calendarPopup.classList.toggle('open', state.calendarOpen);
        dom.clockBtn.classList.toggle('active', state.calendarOpen);
        dom.clockBtn.setAttribute('aria-expanded', state.calendarOpen);

        if (state.calendarOpen) {
            if (state.activitiesOpen) toggleActivities(false);
            if (state.systemMenuOpen) toggleSystemMenu(false);
            updateCalendar();
        }
    }

    // ==========================================================================
    // WALLPAPER
    // ==========================================================================
    function setWallpaper(name) {
        document.body.className = `wp-${name}`;
        localStorage.setItem('termnh-wp', name);
        dom.wpBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.wp === name));
    }

    function loadWallpaper() {
        const saved = localStorage.getItem('termnh-wp') || 'ubuntu';
        setWallpaper(saved);
    }

    // ==========================================================================
    // WINDOWS
    // ==========================================================================
    function initWindows() {
        dom.windows.forEach(win => {
            const id = win.id;
            state.windows[id] = {
                el: win,
                isOpen: false,
                x: null,
                y: null
            };

            // Close button - CRITICAL: make it work reliably
            const closeBtn = win.querySelector('.window-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeWindow(id);
                });
                // Also handle Enter/Space for accessibility
                closeBtn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        closeWindow(id);
                    }
                });
            }

            // Focus on click
            win.addEventListener('mousedown', () => focusWindow(id));

            // Drag from header
            const header = win.querySelector('.window-header');
            if (header) {
                header.addEventListener('mousedown', (e) => startDrag(e, id));
                header.addEventListener('touchstart', (e) => startDrag(e, id), { passive: false });
            }
        });
    }

    function openWindow(id) {
        const win = state.windows[id];
        if (!win) return;

        win.el.classList.remove('closing');
        win.el.style.display = ''; // Reset display in case it was set to 'none'

        if (!win.isOpen) {
            win.isOpen = true;

            // Position in center if first open
            if (win.x === null) {
                const dRect = dom.desktop.getBoundingClientRect();
                win.x = Math.max(20, (dRect.width - 420) / 2);
                win.y = Math.max(20, (dRect.height - 300) / 2 - 40);
            }

            win.el.style.left = `${win.x}px`;
            win.el.style.top = `${win.y}px`;
            win.el.classList.add('open');
        }

        focusWindow(id);
        closeAllMenus();
        updateDock();
    }

    function closeWindow(id) {
        const win = state.windows[id];
        if (!win || !win.isOpen) return;

        win.isOpen = false;
        win.el.classList.remove('open');
        win.el.classList.add('closing');

        // Wait for animation
        setTimeout(() => {
            win.el.classList.remove('closing');
            win.el.style.display = 'none';
        }, 150);

        if (state.focusedWindow === id) {
            state.focusedWindow = null;
        }

        updateDock();
    }

    function closeActiveWindow() {
        if (state.focusedWindow) {
            closeWindow(state.focusedWindow);
        }
    }

    function focusWindow(id) {
        // Remove focus from all
        Object.values(state.windows).forEach(w => w.el.classList.remove('focused'));

        state.focusedWindow = id;
        state.zIndex++;

        const win = state.windows[id];
        win.el.classList.add('focused');
        win.el.style.zIndex = state.zIndex;
        win.el.focus();

        updateDock();
    }

    function updateDock() {
        dom.dockItems.forEach(item => {
            const id = item.dataset.window;
            const win = state.windows[id];

            item.classList.remove('active', 'focused');
            if (win && win.isOpen) {
                item.classList.add('active');
                if (state.focusedWindow === id) {
                    item.classList.add('focused');
                }
            }
        });
    }

    // ==========================================================================
    // WINDOW DRAGGING
    // ==========================================================================
    function startDrag(e, id) {
        // Don't drag if clicking close button
        if (e.target.closest('.window-controls')) return;

        e.preventDefault();

        const win = state.windows[id];
        const rect = win.el.getBoundingClientRect();
        const dRect = dom.desktop.getBoundingClientRect();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        state.dragging = {
            id,
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top,
            dRect
        };

        focusWindow(id);
    }

    function doDrag(e) {
        if (!state.dragging) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const win = state.windows[state.dragging.id];
        const dRect = state.dragging.dRect;

        let x = clientX - dRect.left - state.dragging.offsetX;
        let y = clientY - dRect.top - state.dragging.offsetY;

        // Bounds check (keep header visible)
        x = Math.max(-200, Math.min(dRect.width - 100, x));
        y = Math.max(0, Math.min(dRect.height - 40, y));

        win.x = x;
        win.y = y;
        win.el.style.left = `${x}px`;
        win.el.style.top = `${y}px`;
    }

    function endDrag() {
        state.dragging = null;
    }

    // ==========================================================================
    // EVENT LISTENERS
    // ==========================================================================
    function bindEvents() {
        // Top bar buttons
        dom.activitiesBtn.addEventListener('click', () => toggleActivities());
        dom.clockBtn.addEventListener('click', () => toggleCalendar());
        dom.systemBtn.addEventListener('click', () => toggleSystemMenu());

        // Dock items
        dom.dockItems.forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.window;
                if (state.windows[id]) {
                    openWindow(id);
                }
            });
            // Keyboard support
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const id = item.dataset.window;
                    if (state.windows[id]) {
                        openWindow(id);
                    }
                }
            });
        });

        // App grid items
        dom.appItems.forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.window;
                if (state.windows[id]) {
                    openWindow(id);
                    toggleActivities(false);
                }
            });
        });

        // Wallpaper buttons
        dom.wpBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                setWallpaper(btn.dataset.wp);
            });
        });

        // Global click to close menus
        document.addEventListener('click', (e) => {
            // Close system menu if clicking outside
            if (state.systemMenuOpen && !e.target.closest('.system-menu') && !e.target.closest('#system-btn')) {
                toggleSystemMenu(false);
            }
            // Close calendar if clicking outside
            if (state.calendarOpen && !e.target.closest('.calendar-popup') && !e.target.closest('#clock-btn')) {
                toggleCalendar(false);
            }
        });

        // ESC closes active window or menus
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (state.activitiesOpen) {
                    toggleActivities(false);
                } else if (state.systemMenuOpen) {
                    toggleSystemMenu(false);
                } else if (state.calendarOpen) {
                    toggleCalendar(false);
                } else if (state.focusedWindow) {
                    closeActiveWindow();
                }
            }
        });

        // Drag events
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', doDrag, { passive: false });
        document.addEventListener('touchend', endDrag);

        // Activities search filter (bonus)
        dom.activitiesSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = $$('.app-item');
            items.forEach(item => {
                const label = item.querySelector('.app-label').textContent.toLowerCase();
                item.style.display = label.includes(query) ? '' : 'none';
            });
        });
    }

    // ==========================================================================
    // INIT
    // ==========================================================================
    function init() {
        cacheDom();
        initWindows();
        bindEvents();
        loadWallpaper();
        updateClock();
        updateCalendar();
        setInterval(updateClock, 1000);

        console.log('Ubuntu GNOME Desktop initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
