/**
 * termnh Desktop UI - Window Manager
 * Handles windows, dock, status bar, and interactions
 */

(function () {
    'use strict';

    // State
    let activeWindow = null;
    let openWindows = new Set();
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragOffset = { x: 0, y: 0 };
    let hasMoved = false;
    let windowZIndex = 100;
    let windowPositions = {};

    // Constants
    const STATUSBAR_HEIGHT = 32;
    const DOCK_HEIGHT = 86;
    const STAGGER_OFFSET = 30;

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        console.log('Desktop UI initialized');

        // Load saved state
        loadWindowPositions();
        loadWallpaper();

        // Setup components
        setupClock();
        setupWallpaperMenu();
        setupDock();
        setupWindows();
        setupKeyboard();

        // Update clock every minute
        setInterval(updateClock, 60000);
    }

    // ===================== CLOCK =====================
    function setupClock() {
        updateClock();
    }

    function updateClock() {
        const clockEl = document.getElementById('clock');
        if (!clockEl) return;

        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        clockEl.textContent = `${hours}:${mins}`;
    }

    // ===================== WALLPAPER =====================
    function setupWallpaperMenu() {
        const desktopBtn = document.getElementById('desktop-menu-btn');
        const menu = document.getElementById('wallpaper-menu');

        if (!desktopBtn || !menu) return;

        desktopBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('open');
        });

        // Close menu on outside click
        document.addEventListener('click', () => {
            menu.classList.remove('open');
        });

        // Wallpaper options
        menu.querySelectorAll('.wallpaper-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const wallpaper = btn.dataset.wallpaper;
                setWallpaper(wallpaper);
                menu.classList.remove('open');
            });
        });
    }

    function setWallpaper(name) {
        document.body.className = `wallpaper-${name}`;
        localStorage.setItem('termnh-wallpaper', name);
    }

    function loadWallpaper() {
        const saved = localStorage.getItem('termnh-wallpaper');
        if (saved) {
            document.body.className = `wallpaper-${saved}`;
        }
    }

    // ===================== DOCK =====================
    function setupDock() {
        const dockItems = document.querySelectorAll('.dock-item[data-window]');

        dockItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const windowId = item.dataset.window;
                toggleWindow(windowId);
            });

            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const windowId = item.dataset.window;
                    toggleWindow(windowId);
                }
            });
        });
    }

    function updateDockIndicators() {
        document.querySelectorAll('.dock-item[data-window]').forEach(item => {
            const windowId = item.dataset.window;
            item.classList.toggle('active', openWindows.has(windowId));
        });
    }

    // ===================== WINDOWS =====================
    function setupWindows() {
        const windows = document.querySelectorAll('.window');

        windows.forEach((win, index) => {
            const titlebar = win.querySelector('.window-titlebar');
            const closeBtn = win.querySelector('.window-btn-close');

            // Close button
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeWindow(win);
                });
            }

            // Dragging (desktop only)
            if (titlebar && !isMobile()) {
                titlebar.addEventListener('mousedown', (e) => startDrag(e, win));
            }

            // Focus on click
            win.addEventListener('mousedown', () => focusWindow(win));

            // Store initial position offset for staggering
            win.dataset.staggerIndex = index;
        });

        // Global drag events
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
    }

    function toggleWindow(windowId) {
        const win = document.getElementById(windowId);
        if (!win) return;

        if (openWindows.has(windowId)) {
            closeWindow(win);
        } else {
            openWindow(win);
        }
    }

    function openWindow(win) {
        const windowId = win.id;

        // Position window
        if (!isMobile()) {
            const saved = windowPositions[windowId];
            if (saved) {
                win.style.left = saved.x + 'px';
                win.style.top = saved.y + 'px';
            } else {
                // Stagger windows
                const index = parseInt(win.dataset.staggerIndex) || 0;
                const baseX = (window.innerWidth - 380) / 2;
                const baseY = (window.innerHeight - DOCK_HEIGHT - 300) / 2 + STATUSBAR_HEIGHT;
                win.style.left = (baseX + index * STAGGER_OFFSET) + 'px';
                win.style.top = (baseY + index * STAGGER_OFFSET) + 'px';
            }
        }

        win.classList.add('open');
        openWindows.add(windowId);
        focusWindow(win);
        updateDockIndicators();

        // Focus first focusable element
        const firstFocusable = win.querySelector('button, a, [tabindex="0"]');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 50);
        }
    }

    function closeWindow(win) {
        const windowId = win.id;

        // Save position
        if (!isMobile()) {
            const rect = win.getBoundingClientRect();
            windowPositions[windowId] = { x: rect.left, y: rect.top };
            saveWindowPositions();
        }

        win.classList.remove('open', 'focused');
        openWindows.delete(windowId);

        if (activeWindow === win) {
            activeWindow = null;
        }

        updateDockIndicators();

        // Return focus to dock item
        const dockItem = document.querySelector(`.dock-item[data-window="${windowId}"]`);
        if (dockItem) dockItem.focus();
    }

    function focusWindow(win) {
        // Remove focus from all windows
        document.querySelectorAll('.window.focused').forEach(w => {
            w.classList.remove('focused');
        });

        // Focus this window
        win.classList.add('focused');
        windowZIndex++;
        win.style.zIndex = windowZIndex;
        activeWindow = win;
    }

    // ===================== DRAGGING =====================
    function startDrag(e, win) {
        if (e.target.closest('.window-btn')) return;
        if (isMobile()) return;

        dragStart = { x: e.clientX, y: e.clientY };
        hasMoved = false;

        const rect = win.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;

        isDragging = true;
        activeWindow = win;
        focusWindow(win);

        win.querySelector('.window-titlebar').style.cursor = 'grabbing';
    }

    function onDrag(e) {
        if (!isDragging || !activeWindow) return;

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        // Movement threshold
        if (!hasMoved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        hasMoved = true;

        let x = e.clientX - dragOffset.x;
        let y = e.clientY - dragOffset.y;

        // Keep in bounds
        const maxX = window.innerWidth - activeWindow.offsetWidth;
        const maxY = window.innerHeight - DOCK_HEIGHT - activeWindow.offsetHeight;

        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(STATUSBAR_HEIGHT, Math.min(y, maxY));

        activeWindow.style.left = x + 'px';
        activeWindow.style.top = y + 'px';
    }

    function endDrag() {
        if (isDragging && activeWindow) {
            const titlebar = activeWindow.querySelector('.window-titlebar');
            if (titlebar) titlebar.style.cursor = 'grab';

            // Save position
            const rect = activeWindow.getBoundingClientRect();
            windowPositions[activeWindow.id] = { x: rect.left, y: rect.top };
            saveWindowPositions();
        }
        isDragging = false;
        hasMoved = false;
    }

    // ===================== KEYBOARD =====================
    function setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && activeWindow) {
                closeWindow(activeWindow);
            }
        });
    }

    // ===================== PERSISTENCE =====================
    function saveWindowPositions() {
        try {
            localStorage.setItem('termnh-window-positions', JSON.stringify(windowPositions));
        } catch (e) { }
    }

    function loadWindowPositions() {
        try {
            const saved = localStorage.getItem('termnh-window-positions');
            if (saved) {
                windowPositions = JSON.parse(saved);
            }
        } catch (e) { }
    }

    // ===================== UTILS =====================
    function isMobile() {
        return window.innerWidth <= 768;
    }
})();
