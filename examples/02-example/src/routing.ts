export type AppRoute = 'editor' | 'present';

export function readRoute(): AppRoute {
  return window.location.hash.startsWith('#/present') ? 'present' : 'editor';
}

export function writeRoute(route: AppRoute, slideId?: string): void {
  const hash =
    route === 'present'
      ? `#/present${slideId ? `/slide/${encodeURIComponent(slideId)}` : ''}`
      : '#/editor';
  window.history.pushState({}, '', `${import.meta.env.BASE_URL}${hash}`);
}
