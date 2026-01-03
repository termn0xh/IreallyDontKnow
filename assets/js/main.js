/**
 * termnh.com Desktop UI
 * Simple window manager - click icons to open panels
 */

(function () {
    'use strict';

    let activeWindow = null;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragOffset = { x: 0, y: 0 };
    let hasMoved = false;
    let windowZIndex = 100;

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Query elements AFTER DOM is ready
        const overlay = document.getElementById('overlay');
        const windows = document.querySelectorAll('.window');
        const icons = document.querySelectorAll('.icon[data-window]');

        // Debug
        console.log('Desktop UI: Found', icons.length, 'icons and', windows.length, 'windows');

        // Icon clicks and keyboard
        icons.forEach(icon => {
            icon.addEventListener('click', handleIconClick);
            icon.addEventListener('touchend', handleIconTouch);
            icon.addEventListener('keydown', handleIconKeydown);
        });

        // Window controls
        windows.forEach(win => {
            const titlebar = win.querySelector('.window-titlebar');
            const closeBtn = win.querySelector('.window-close');

            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeWindow(win, icons);
                });
            }

            // Dragging on desktop (titlebar only)
            if (titlebar && !isMobile()) {
                titlebar.addEventListener('mousedown', (e) => startDrag(e, win));
            }

            // Click inside window brings to front
            win.addEventListener('mousedown', () => bringToFront(win));
        });

        // Global events
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', () => endDrag(icons));
        document.addEventListener('keydown', (e) => handleKeydown(e, icons));

        if (overlay) {
            overlay.addEventListener('click', () => {
                if (activeWindow) closeWindow(activeWindow, icons);
            });
        }
    }

    function handleIconClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const windowId = this.dataset.window;
        if (windowId) openWindow(windowId);
    }

    function handleIconTouch(e) {
        e.preventDefault();
        const windowId = this.dataset.window;
        if (windowId) openWindow(windowId);
    }

    function handleIconKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const windowId = this.dataset.window;
            if (windowId) openWindow(windowId);
        }
    }

    function isMobile() {
        return window.innerWidth <= 640;
    }

    function openWindow(windowId) {
        const win = document.getElementById(windowId);
        if (!win) {
            console.error('Window not found:', windowId);
            return;
        }

        // Position on desktop
        if (!isMobile()) {
            win.style.left = '50%';
            win.style.top = '50%';
            win.style.transform = 'translate(-50%, -50%)';
        }

        win.classList.remove('closing');
        win.classList.add('open');
        bringToFront(win);
        activeWindow = win;

        // Overlay on mobile
        const overlay = document.getElementById('overlay');
        if (isMobile() && overlay) {
            overlay.classList.add('active');
        }

        // Focus close button
        const closeBtn = win.querySelector('.window-close');
        if (closeBtn) {
            setTimeout(() => closeBtn.focus(), 50);
        }
    }

    function closeWindow(win, icons) {
        if (!win) return;

        const overlay = document.getElementById('overlay');
        win.classList.add('closing');
        if (overlay) overlay.classList.remove('active');

        const windowId = win.id;

        setTimeout(() => {
            win.classList.remove('open', 'closing');
            win.style.transform = '';
            if (activeWindow === win) activeWindow = null;

            // Return focus
            const icon = document.querySelector(`.icon[data-window="${windowId}"]`);
            if (icon) icon.focus();
        }, 150);
    }

    function bringToFront(win) {
        windowZIndex++;
        win.style.zIndex = windowZIndex;
        activeWindow = win;
    }

    // Dragging (desktop only, titlebar only)
    function startDrag(e, win) {
        if (e.target.closest('.window-close')) return;
        if (isMobile()) return;

        dragStart = { x: e.clientX, y: e.clientY };
        hasMoved = false;

        const rect = win.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;

        // Remove centering transform before dragging
        win.style.transform = '';
        win.style.left = rect.left + 'px';
        win.style.top = rect.top + 'px';

        isDragging = true;
        activeWindow = win;
        bringToFront(win);
    }

    function onDrag(e) {
        if (!isDragging || !activeWindow) return;

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        // Only start dragging if moved more than 5px (prevents click blocking)
        if (!hasMoved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        hasMoved = true;

        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;

        const maxX = window.innerWidth - activeWindow.offsetWidth;
        const maxY = window.innerHeight - activeWindow.offsetHeight;

        activeWindow.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        activeWindow.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    }

    function endDrag(icons) {
        isDragging = false;
        hasMoved = false;
    }

    function handleKeydown(e, icons) {
        if (e.key === 'Escape' && activeWindow) {
            closeWindow(activeWindow, icons);
        }
    }
})();
