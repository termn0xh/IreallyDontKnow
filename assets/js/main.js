/**
 * termnh.com — Desktop Window Manager
 * Handles window dragging, opening/closing, keyboard navigation, and focus trapping
 */

(function () {
    'use strict';

    // State
    let activeWindow = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let windowZIndex = 100;

    // DOM Elements
    const overlay = document.getElementById('overlay');
    const windows = document.querySelectorAll('.window');
    const icons = document.querySelectorAll('.icon[data-window]');

    // Initialize
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        // Icon clicks
        icons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                const windowId = icon.dataset.window;
                openWindow(windowId);
            });

            icon.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const windowId = icon.dataset.window;
                    openWindow(windowId);
                }
            });
        });

        // Window controls
        windows.forEach(win => {
            const titlebar = win.querySelector('.window-titlebar');
            const closeBtn = win.querySelector('.window-close');

            // Close button
            closeBtn.addEventListener('click', () => closeWindow(win));

            // Dragging (desktop only)
            if (!isMobile()) {
                titlebar.addEventListener('mousedown', (e) => startDrag(e, win));
            }

            // Bring to front on click
            win.addEventListener('mousedown', () => bringToFront(win));
        });

        // Global listeners
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('keydown', handleGlobalKeydown);
        overlay.addEventListener('click', closeActiveWindow);
    }

    function isMobile() {
        return window.innerWidth <= 640;
    }

    function openWindow(windowId) {
        const win = document.getElementById(windowId);
        if (!win) return;

        // Center window on desktop
        if (!isMobile()) {
            const rect = win.getBoundingClientRect();
            const width = rect.width || 400;
            const height = rect.height || 300;
            win.style.left = `${(window.innerWidth - width) / 2}px`;
            win.style.top = `${(window.innerHeight - height) / 2}px`;
        }

        win.classList.remove('closing');
        win.classList.add('open');
        bringToFront(win);
        activeWindow = win;

        // Show overlay on mobile
        if (isMobile()) {
            overlay.classList.add('active');
        }

        // Focus first focusable element
        const firstFocusable = win.querySelector('button, a, [tabindex="0"]');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    function closeWindow(win) {
        if (!win) return;

        win.classList.add('closing');
        overlay.classList.remove('active');

        setTimeout(() => {
            win.classList.remove('open', 'closing');
            if (activeWindow === win) {
                activeWindow = null;
            }
            // Return focus to the icon that opened this window
            const iconSelector = `.icon[data-window="${win.id}"]`;
            const icon = document.querySelector(iconSelector);
            if (icon) {
                icon.focus();
            }
        }, 150);
    }

    function closeActiveWindow() {
        if (activeWindow) {
            closeWindow(activeWindow);
        }
    }

    function bringToFront(win) {
        windowZIndex++;
        win.style.zIndex = windowZIndex;
        activeWindow = win;
    }

    // Dragging
    function startDrag(e, win) {
        if (e.target.closest('.window-close')) return;

        isDragging = true;
        activeWindow = win;
        bringToFront(win);

        const rect = win.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;

        win.querySelector('.window-titlebar').style.cursor = 'grabbing';
    }

    function onDrag(e) {
        if (!isDragging || !activeWindow) return;

        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;

        // Keep window in bounds
        const maxX = window.innerWidth - activeWindow.offsetWidth;
        const maxY = window.innerHeight - activeWindow.offsetHeight;

        activeWindow.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        activeWindow.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    }

    function endDrag() {
        if (isDragging && activeWindow) {
            const titlebar = activeWindow.querySelector('.window-titlebar');
            if (titlebar) {
                titlebar.style.cursor = 'grab';
            }
        }
        isDragging = false;
    }

    // Keyboard handling
    function handleGlobalKeydown(e) {
        // ESC closes active window
        if (e.key === 'Escape' && activeWindow) {
            closeWindow(activeWindow);
            return;
        }

        // Focus trapping in open window
        if (activeWindow && activeWindow.classList.contains('open')) {
            trapFocus(e, activeWindow);
        }
    }

    function trapFocus(e, container) {
        if (e.key !== 'Tab') return;

        const focusables = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    // Handle resize (reposition windows on mobile/desktop switch)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (isMobile()) {
                overlay.classList.toggle('active', activeWindow !== null);
            } else {
                overlay.classList.remove('active');
            }
        }, 100);
    });
})();
