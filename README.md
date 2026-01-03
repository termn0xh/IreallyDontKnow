# termnh.com

Personal site + lab/playground. Static, fast, no build step.

## Structure

```
/
├── index.html              # Homepage
├── CNAME                   # Custom domain config
├── sitemap.xml             # SEO sitemap
├── robots.txt              # SEO robots
├── favicon.ico             # Favicon
├── assets/
│   ├── css/style.css       # Design system
│   └── js/main.js          # Shared JavaScript
├── data/
│   ├── projects.json       # Project data
│   └── playground.json     # Playground items
├── pages/
│   ├── projects.html       # Projects gallery
│   ├── playground.html     # Fun experiments
│   ├── now.html            # What I'm up to
│   └── links.html          # Socials + contact
└── play/
    └── waste/              # "Waste Your Time" game
        ├── index.html
        ├── style.css
        └── script.js
```

## How to Update

### Projects

Edit `data/projects.json`:

```json
{
  "name": "Project Name",
  "description": "Short description",
  "tags": ["tag1", "tag2"],
  "github": "https://github.com/...",
  "url": "optional-live-link"
}
```

### Playground

Edit `data/playground.json`:

```json
{
  "name": "Experiment Name",
  "description": "What it does",
  "url": "/path/to/experiment/",
  "emoji": "🎮",
  "featured": true
}
```

### Now Page

Edit `pages/now.html` directly. Update the `Last updated:` date when you make changes.

### Adding New Playground Items

1. Create a new directory in `/play/` (e.g., `/play/newgame/`)
2. Add your HTML/CSS/JS files
3. Add an entry to `data/playground.json`

## Local Development

Just open `index.html` in a browser. For full functionality (JSON loading), use a local server:

```bash
python -m http.server 8000
# or
npx serve
```

## Deployment

Hosted on GitHub Pages. Push to `main` to deploy.

---

Built by [termnh](https://termnh.com)
