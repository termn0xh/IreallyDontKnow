// termnh.com - Minimal shared JS

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
});

// Load and render projects from JSON
async function loadProjects() {
  const container = document.getElementById('projects-container');
  if (!container) return;
  
  try {
    const response = await fetch('/data/projects.json');
    const projects = await response.json();
    
    container.innerHTML = projects.map(project => `
      <article class="card">
        <h3 class="card-title">
          <a href="${project.github}" target="_blank" rel="noopener">${project.name}</a>
        </h3>
        <p class="card-desc">${project.description}</p>
        <div class="card-meta">
          ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          ${project.github ? `<a href="${project.github}" target="_blank" rel="noopener" class="tag">GitHub →</a>` : ''}
        </div>
      </article>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p>Projects loading...</p>';
  }
}

// Load and render playground items from JSON
async function loadPlayground() {
  const container = document.getElementById('playground-container');
  if (!container) return;
  
  try {
    const response = await fetch('/data/playground.json');
    const items = await response.json();
    
    container.innerHTML = items.map(item => `
      <a href="${item.url}" class="card playground-card ${item.featured ? 'playground-featured' : ''}">
        <span class="emoji">${item.emoji || '🎮'}</span>
        <div>
          <h3 class="card-title">${item.name}</h3>
          <p class="card-desc">${item.description}</p>
        </div>
      </a>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p>Loading experiments...</p>';
  }
}

// Initialize based on page
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  loadPlayground();
});
