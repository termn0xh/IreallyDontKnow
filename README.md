# termnh.com

Personal desktop-style homepage. Click icons, drag windows, explore.

## Structure

```
/
├── index.html              # Desktop homepage
├── assets/
│   ├── css/style.css       # Styles
│   └── js/main.js          # Window manager logic
├── play/
│   └── waste/              # "Waste Your Time" game
├── CNAME                   # Custom domain
├── favicon.ico
├── robots.txt
└── sitemap.xml
```

## URL Paths

| URL | What it is |
|-----|------------|
| `/` | Desktop homepage |
| `/play/waste/` | Waste Your Time game |

## How to Edit Content

All content is in `index.html`:

### About Window
Find `id="about-window"` and edit the content inside `.window-content`.

### Now Window
Find `id="now-window"` and update:
- The `<li>` items for current activities
- The "Last updated" date in `.meta-text`

### Links Window
Find `id="links-window"` and edit the `<a class="link-item">` elements.

### Playground Window
Find `id="playground-window"` and add/edit `<a class="playground-item">` elements.

## Adding New Playground Pages

1. Create a folder in `/play/` (e.g., `/play/newgame/`)
2. Add your HTML/CSS/JS files
3. Add a link in the Playground window:

```html
<a href="/play/newgame/" class="playground-item">
  <span class="emoji">🎲</span>
  <div>
    <strong>Game Name</strong>
    <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-muted);">Description</p>
  </div>
</a>
```

## Local Development

Open `index.html` in a browser. For best results, use a local server:

```bash
python3 -m http.server 8080
```

## Keyboard Navigation

- **Tab**: Navigate between icons
- **Enter/Space**: Open window
- **Escape**: Close active window
- **Tab** (in window): Cycle through focusable elements

---

## Icon Attribution

Desktop icons (`/assets/icons/`) are custom SVGs inspired by the [Yaru icon theme](https://github.com/ubuntu/yaru) (Ubuntu's default icon set). Licensed under CC-BY-SA 4.0 / GPL-3.0.

---

Built by [termnh](https://termnh.com)
