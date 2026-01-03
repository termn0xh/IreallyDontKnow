/**
 * Ubuntu GNOME Desktop UI
 * Handles Activities overlay, window management, dock interactions, and system menu
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
        dragState: null
    };

    // ==================== DOM ELEMENTS ====================
    const elements = {};

    function cacheElements() {
        elements.activitiesBtn = document.getElementById('activities-btn');
        elements.activitiesOverlay = document.getElementById('activities-overlay');
        elements.systemTrayBtn = document.getElementById('system-tray-btn');
        elements.systemDropdown = document.getElementById('system-dropdown');
        elements.clock = document.getElementById('clock');
        elements.desktop = document.getElementById('desktop');
        elements.dock = document.querySelector('.dock');
        elements.dockItems = document.querySelectorAll('.dock-item[data-window]');
        elements.appGridItems = document.querySelectorAll('.app-grid-item[data-window]');
        elements.windows = document.querySelectorAll('.window');
        elements.wallpaperOptions = document.querySelectorAll('.wallpaper-option');
    }

    // ==================== CLOCK ====================
    function updateClock() {
        const now = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const day = days[now.getDay()];
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        elements.clock.textContent = `${day} ${hours}:${minutes}`;
    }

    // ==================== ACTIVITIES OVERLAY ====================
    function openActivities() {
        state.activitiesOpen = true;
        elements.activitiesOverlay.classList.add('active');
        elements.activitiesBtn.classList.add('active');
        elements.activitiesBtn.setAttribute('aria-expanded', 'true');
        // Focus search input
        const searchInput = elements.activitiesOverlay.querySelector('input');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }

    function closeActivities() {
        state.activitiesOpen = false;
        elements.activitiesOverlay.classList.remove('active');
        elements.activitiesBtn.classList.remove('active');
        elements.activitiesBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleActivities() {
        if (state.activitiesOpen) {
            closeActivities();
        } else {
            closeSystemMenu();
            openActivities();
        }
    }

    // ==================== SYSTEM MENU ====================
    function openSystemMenu() {
        state.systemMenuOpen = true;
        elements.systemDropdown.classList.add('active');
        elements.systemTrayBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSystemMenu() {
        state.systemMenuOpen = false;
        elements.systemDropdown.classList.remove('active');
        elements.systemTrayBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleSystemMenu() {
        if (state.systemMenuOpen) {
            closeSystemMenu();
        } else {
            closeActivities();
            openSystemMenu();
        }
    }

    // ==================== WALLPAPER ====================
    function setWallpaper(name) {
        document.body.className = `wallpaper-${name}`;
        localStorage.setItem('termnh-wallpaper', name);

        // Update selected state
        elements.wallpaperOptions.forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.wallpaper === name);
        });
    }

    function loadWallpaper() {
        const saved = localStorage.getItem('termnh-wallpaper') || 'ubuntu';
        setWallpaper(saved);
    }

    // ==================== WINDOWS ====================
    function initWindow(windowEl) {
        const id = windowEl.id;
        state.windows[id] = {
            el: windowEl,
            isOpen: false,
            position: null
        };
    }

    function openWindow(windowId) {
        const win = state.windows[windowId];
        if (!win) return;

        if (!win.isOpen) {
            win.isOpen = true;
            win.el.classList.add('open');

            // Position window if not already positioned
            if (!win.position) {
                const desktop = elements.desktop;
                const rect = desktop.getBoundingClientRect();
                const winWidth = 420;
                const winHeight = 280;
                const x = Math.max(20, (rect.width - winWidth) / 2);
                const y = Math.max(20, (rect.height - winHeight) / 3);

                win.position = { x, y };
                win.el.style.left = `${x}px`;
                win.el.style.top = `${y}px`;
                win.el.style.width = `${winWidth}px`;
                win.el.style.height = `${winHeight}px`;
            }

            // Update dock indicator
            updateDockIndicators();
        }

        focusWindow(windowId);
        closeActivities();
    }

    function closeWindow(windowId) {
        const win = state.windows[windowId];
        if (!win) return;

        win.isOpen = false;
        win.el.classList.remove('open', 'focused');

        // Update state
        if (state.focusedWindow === windowId) {
            state.focusedWindow = null;
        }

        updateDockIndicators();
    }

    function focusWindow(windowId) {
        const win = state.windows[windowId];
        if (!win || !win.isOpen) return;

        // Unfocus previous
        if (state.focusedWindow && state.focusedWindow !== windowId) {
            const prevWin = state.windows[state.focusedWindow];
            if (prevWin) {
                prevWin.el.classList.remove('focused');
            }
        }

        // Focus current
        state.focusedWindow = windowId;
        state.zIndex++;
        win.el.style.zIndex = state.zIndex;
        win.el.classList.add('focused');

        updateDockIndicators();
    }

    function updateDockIndicators() {
        elements.dockItems.forEach(item => {
            const windowId = item.dataset.window;
            const win = state.windows[windowId];

            item.classList.remove('active', 'focused');

            if (win && win.isOpen) {
                item.classList.add('active');
                if (state.focusedWindow === windowId) {
                    item.classList.add('focused');
                }
            }
        });
    }

    // ==================== WINDOW DRAGGING ====================
    function startDrag(e, windowId) {
        const win = state.windows[windowId];
        if (!win) return;

        // Check if mobile (no drag on mobile)
        if (window.innerWidth <= 768) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = win.el.getBoundingClientRect();

        state.dragState = {
            windowId,
            startX: clientX,
            startY: clientY,
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };

        focusWindow(windowId);

        e.preventDefault();
    }

    function doDrag(e) {
        if (!state.dragState) return;

        const win = state.windows[state.dragState.windowId];
        if (!win) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calculate new position relative to desktop
        const desktop = elements.desktop;
        const desktopRect = desktop.getBoundingClientRect();

        let x = clientX - desktopRect.left - state.dragState.offsetX;
        let y = clientY - desktopRect.top - state.dragState.offsetY;

        // Constrain within desktop bounds (with some padding)
        x = Math.max(-100, Math.min(x, desktopRect.width - 100));
        y = Math.max(0, Math.min(y, desktopRect.height - 50));

        win.position = { x, y };
        win.el.style.left = `${x}px`;
        win.el.style.top = `${y}px`;
    }

    function endDrag() {
        state.dragState = null;
    }

    // ==================== EVENT HANDLERS ====================
    function handleDockClick(e) {
        const item = e.target.closest('.dock-item[data-window]');
        if (!item) return;

        const windowId = item.dataset.window;
        const win = state.windows[windowId];

        if (win && win.isOpen) {
            // If open and focused, minimize (close for now)
            if (state.focusedWindow === windowId) {
                closeWindow(windowId);
            } else {
                focusWindow(windowId);
            }
        } else {
            openWindow(windowId);
        }
    }

    function handleAppGridClick(e) {
        const item = e.target.closest('.app-grid-item[data-window]');
        if (!item) return;

        const windowId = item.dataset.window;
        openWindow(windowId);
    }

    function handleWindowClick(e) {
        const windowEl = e.target.closest('.window');
        if (!windowEl) return;

        const windowId = windowEl.id;

        // Check for close button click
        if (e.target.closest('.close-btn')) {
            closeWindow(windowId);
            return;
        }

        // Check for header click (drag start)
        const header = e.target.closest('.window-header');
        if (header && !e.target.closest('.window-controls')) {
            startDrag(e, windowId);
            return;
        }

        // Otherwise just focus
        focusWindow(windowId);
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') {
            if (state.activitiesOpen) {
                closeActivities();
            } else if (state.systemMenuOpen) {
                closeSystemMenu();
            } else if (state.focusedWindow) {
                closeWindow(state.focusedWindow);
            }
        }
    }

    function handleOutsideClick(e) {
        // Close system menu if clicking outside
        if (state.systemMenuOpen && !e.target.closest('.system-menu')) {
            closeSystemMenu();
        }

        // Close activities if clicking on overlay background
        if (state.activitiesOpen && e.target === elements.activitiesOverlay) {
            closeActivities();
        }
    }

    // ==================== INITIALIZATION ====================
    function bindEvents() {
        // Activities
        elements.activitiesBtn.addEventListener('click', toggleActivities);

        // System menu
        elements.systemTrayBtn.addEventListener('click', toggleSystemMenu);

        // Wallpaper options
        elements.wallpaperOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                setWallpaper(opt.dataset.wallpaper);
            });
        });

        // Dock items
        elements.dock.addEventListener('click', handleDockClick);

        // App grid items
        elements.activitiesOverlay.addEventListener('click', handleAppGridClick);

        // Window interactions
        document.addEventListener('mousedown', handleWindowClick);
        document.addEventListener('touchstart', handleWindowClick, { passive: false });

        // Dragging
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('touchmove', doDrag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);

        // Keyboard
        document.addEventListener('keydown', handleKeydown);

        // Outside clicks
        document.addEventListener('click', handleOutsideClick);

        // Clock update
        setInterval(updateClock, 1000);
    }

    function init() {
        cacheElements();

        // Initialize windows
        elements.windows.forEach(win => initWindow(win));

        // Load saved wallpaper
        loadWallpaper();

        // Initial clock update
        updateClock();

        // Bind all events
        bindEvents();

        console.log('Desktop UI initialized');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
