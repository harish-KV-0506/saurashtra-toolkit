// Where the project lives on GitHub. When the site is served from GitHub Pages
// (https://OWNER.github.io/REPO/) the address is detected automatically. For any other host,
// edit FALLBACK_REPO once after you create the repository.
export const FALLBACK_REPO = 'YOUR-USERNAME/saurashtra-toolkit';

export function repoSlug(loc = globalThis.location) {
  if (loc && loc.hostname && loc.hostname.endsWith('.github.io')) {
    const owner = loc.hostname.split('.')[0];
    const repo = loc.pathname.split('/')[1];
    return `${owner}/${repo || `${owner}.github.io`}`;
  }
  return FALLBACK_REPO;
}

export const repoUrl = (loc) => `https://github.com/${repoSlug(loc)}`;

export function issueUrl(template, title = '', loc) {
  const q = new URLSearchParams({ template });
  if (title) q.set('title', title);
  return `${repoUrl(loc)}/issues/new?${q}`;
}
