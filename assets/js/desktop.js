/**
 * Ubuntu GNOME Desktop UI - High Fidelity Logic
 */

(function () {
    'use strict';

    // ==================== STATE ====================
    const state = {
        windows: {},
        focusedWindow: null,
        zIndex: 100,
        activitiesOpen: false,
        systemMenuOpen: false,
        calendarOpen: false,
        contextMenuOpen: false,
        dragState: null
    };

    // ==================== DOM ELEMENTS ====================
    const elements = {};

    function cacheElements() {
        elements.activitiesBtn = document.getElementById('activities-btn');
        elements.activitiesOverlay = document.getElementById('activities-overlay');

        elements.clockBtn = document.getElementById('clock-btn');
        elements.calendarDropdown = document.getElementById('calendar-dropdown');

        elements.systemTrayBtn = document.getElementById('system-tray-btn');
        elements.systemDropdown = document.getElementById('system-dropdown');

        elements.contextMenu = document.getElementById('context-menu');

        elements.desktop = document.getElementById('desktop');
        elements.dock = document.querySelector('.dock');
        elements.windows = document.querySelectorAll('.window');

        elements.clock = document.getElementById('clock');

        // Feature toggles
        elements.qsBtns = document.querySelectorAll('.qs-btn');
        elements.wpPreviews = document.querySelectorAll('.wp-preview');
    }

    // ==================== DATE & TIME ====================
    function updateTime() {
        const now = new Date();
        // Format: "Jan 3 16:00" or similar Ubuntu style
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[now.getMonth()];
        const date = now.getDate();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');

        elements.clock.textContent = `${month} ${date} ${hours}:${minutes}`;
    }

    // ==================== MENUS & OVERLAYS ====================

    function closeAllMenus() {
        if (state.activitiesOpen) toggleActivities();
        if (state.systemMenuOpen) toggleSystemMenu();
        if (state.calendarOpen) toggleCalendar();
        if (state.contextMenuOpen) closeContextMenu();
    }

    function toggleActivities() {
        state.activitiesOpen = !state.activitiesOpen;
        elements.activitiesOverlay.classList.toggle('active', state.activitiesOpen);
        elements.activitiesBtn.classList.toggle('active', state.activitiesOpen);

        if (state.activitiesOpen) {
            if (state.systemMenuOpen) toggleSystemMenu();
            if (state.calendarOpen) toggleCalendar();
            if (state.contextMenuOpen) closeContextMenu();
            // Focus search
            const input = elements.activitiesOverlay.querySelector('input');
            if (input) setTimeout(() => input.focus(), 50);
        }
    }

    function toggleSystemMenu() {
        state.systemMenuOpen = !state.systemMenuOpen;
        elements.systemDropdown.classList.toggle('active', state.systemMenuOpen);
        elements.systemTrayBtn.classList.toggle('active', state.systemMenuOpen);
        elements.aboutWindow?.classList.remove('focused'); // unfocus windows

        if (state.systemMenuOpen) {
            if (state.activitiesOpen) toggleActivities();
            if (state.calendarOpen) toggleCalendar();
            if (state.contextMenuOpen) closeContextMenu();
        }
    }

    function toggleCalendar() {
        state.calendarOpen = !state.calendarOpen;
        elements.calendarDropdown.classList.toggle('active', state.calendarOpen);
        elements.clockBtn.classList.toggle('active', state.calendarOpen);

        if (state.calendarOpen) {
            if (state.activitiesOpen) toggleActivities();
            if (state.systemMenuOpen) toggleSystemMenu();
            if (state.contextMenuOpen) closeContextMenu();
        }
    }

    function openContextMenu(x, y) {
        closeAllMenus();
        state.contextMenuOpen = true;

        // Bounds check
        const menuWidth = 200;
        const menuHeight = 280;
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;

        if (x + menuWidth > winWidth) x = winWidth - menuWidth - 5;
        if (y + menuHeight > winHeight) y = winHeight - menuHeight - 5;

        elements.contextMenu.style.left = `${x}px`;
        elements.contextMenu.style.top = `${y}px`;
        elements.contextMenu.classList.add('active');
    }

    function closeContextMenu() {
        state.contextMenuOpen = false;
        elements.contextMenu.classList.remove('active');
    }

    // ==================== QUICK SETTINGS LOGIC ====================
    function initQuickSettings() {
        elements.qsBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent menu close
                btn.classList.toggle('active');
                // Visual feedback only
            });
        });

        elements.wpPreviews.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const theme = btn.dataset.wallpaper;
                setWallpaper(theme);
                elements.wpPreviews.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    function setWallpaper(name) {
        document.body.className = `wallpaper-${name}`;
        localStorage.setItem('termnh-wallpaper', name);
    }

    // ==================== WINDOWS ====================
    function initWindows() {
        elements.windows.forEach(win => {
            state.windows[win.id] = { el: win, isOpen: false, position: null };

            // Dragging
            const header = win.querySelector('.window-header');
            header.addEventListener('mousedown', (e) => {
                if (!e.target.closest('.window-controls')) {
                    startDrag(e, win.id);
                }
            });
            header.addEventListener('touchstart', (e) => {
                if (!e.target.closest('.window-controls')) {
                    startDrag(e, win.id);
                }
            }, { passive: false });

            // Focus on click
            win.addEventListener('mousedown', () => focusWindow(win.id));

            // Close button
            const closeBtn = win.querySelector('.close-btn');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeWindow(win.id);
            });
        });
    }

    function openWindow(id) {
        const win = state.windows[id];
        if (!win) return;

        // Reset animation classes
        win.el.classList.remove('closing');

        if (!win.isOpen) {
            win.isOpen = true;
            win.el.style.display = 'flex'; // triggers flex layout
            setTimeout(() => win.el.classList.add('open'), 10); // trigger animation

            // Center if no position
            if (!win.position) {
                const dRect = elements.desktop.getBoundingClientRect();
                const w = 400; const h = 300;
                win.position = {
                    x: Math.max(20, (dRect.width - w) / 2),
                    y: Math.max(40, (dRect.height - h) / 2 - 50)
                };
                win.el.style.width = `${w}px`;
                win.el.style.height = `${h}px`;
                win.el.style.left = `${win.position.x}px`;
                win.el.style.top = `${win.position.y}px`;
            }
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
        }, 200);

        if (state.focusedWindow === id) state.focusedWindow = null;
        updateDock();
    }

    function focusWindow(id) {
        state.focusedWindow = id;
        state.zIndex++;
        // Lower others
        Object.values(state.windows).forEach(w => w.el.classList.remove('focused'));

        const win = state.windows[id];
        win.el.classList.add('focused');
        win.el.style.zIndex = state.zIndex;
        updateDock();
    }

    function updateDock() {
        document.querySelectorAll('.dock-item[data-window]').forEach(item => {
            const id = item.dataset.window;
            const win = state.windows[id];

            item.classList.remove('active', 'focused');
            if (win && win.isOpen) {
                item.classList.add('active');
                if (state.focusedWindow === id) item.classList.add('focused');
            }
        });
    }

    // ==================== DRAGGING ====================
    function startDrag(e, id) {
        // Basic drag logic (simplified for implementation plan speed)
        const win = state.windows[id];
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = win.el.getBoundingClientRect();
        const dRect = elements.desktop.getBoundingClientRect();

        state.dragState = {
            id,
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };

        e.preventDefault();
    }

    function doDrag(e) {
        if (!state.dragState) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const win = state.windows[state.dragState.id];
        const dRect = elements.desktop.getBoundingClientRect();

        let x = clientX - dRect.left - state.dragState.offsetX;
        let y = clientY - dRect.top - state.dragState.offsetY;

        win.position = { x, y };
        win.el.style.left = `${x}px`;
        win.el.style.top = `${y}px`;
    }

    function endDrag() {
        state.dragState = null;
    }

    // ==================== INIT ====================
    function init() {
        cacheElements();
        initWindows();
        initQuickSettings();
        updateTime();
        setInterval(updateTime, 1000);

        // Bind main events
        elements.activitiesBtn.addEventListener('click', toggleActivities);
        elements.systemTrayBtn.addEventListener('click', toggleSystemMenu);
        elements.clockBtn.addEventListener('click', toggleCalendar);

        // Dock clicks
        document.querySelectorAll('.dock-item[data-window]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.window;
                const win = state.windows[id];
                if (win.isOpen && state.focusedWindow === id) {
                    // closeWindow(id); // Ubuntu behavior: click to focus, click again does nothing or minimizes. Let's do nothing (keep focused).
                    // Actually, many users expect minimize. 
                    // Let's implement minimize check: if focused, minimize (close visually).
                    // closeWindow(id);
                } else {
                    openWindow(id);
                }
            });
        });

        // App Grid clicks
        document.querySelectorAll('.app-grid-item[data-window]').forEach(btn => {
            btn.addEventListener('click', () => {
                openWindow(btn.dataset.window);
                toggleActivities();
            });
        });

        // Global clicks to close menus
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.topbar') && !e.target.closest('.calendar-dropdown') && !e.target.closest('.system-dropdown')) {
                closeAllMenus();
            }
        });

        // Context Menu
        document.addEventListener('contextmenu', (e) => {
            // Show only on desktop background or unhandled areas
            if (e.target === elements.desktop || e.target === document.body) {
                e.preventDefault();
                openContextMenu(e.clientX, e.clientY);
            }
        });

        // Global keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllMenus();
        });

        // Drag listeners
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', doDrag, { passive: false });
        document.addEventListener('touchend', endDrag);

        // Initial wallpaper
        const savedWp = localStorage.getItem('termnh-wallpaper') || 'ubuntu';
        setWallpaper(savedWp);

        console.log('Ubuntu Exact Fidelity initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
