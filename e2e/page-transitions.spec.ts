import { test, expect, type Page } from '@playwright/test';

type Motion = { name: string; duration: number; pseudo: string | null };
declare global { interface Window { portfolioTransitions: Motion[][] } }

async function observeTransitions(page: Page) {
  await page.addInitScript(() => {
    window.portfolioTransitions = [];
    const native = document.startViewTransition?.bind(document);
    if (!native) return;
    document.startViewTransition = (...args: Parameters<typeof document.startViewTransition>) => {
      const transition = Reflect.apply(native, document, args) as ViewTransition;
      transition.ready.then(() => window.portfolioTransitions.push(document.getAnimations().map(animation => ({
        name: (animation as CSSAnimation).animationName || '',
        duration: Number(animation.effect?.getTiming().duration || 0),
        pseudo: (animation.effect as KeyframeEffect | null)?.pseudoElement || null,
      })))).catch(() => {}); // A newer navigation may legitimately replace an unfinished transition.
      return transition;
    };
  });
}

test('page navigation animates content once while the shell stays steady', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeTransitions(page);
  await page.goto('/v2');
  const nav = page.locator('nav').first();
  await expect(nav).toHaveCSS('opacity', '1');
  const before = await nav.boundingBox();
  await page.evaluate(() => { window.portfolioTransitions = []; });
  await nav.getByRole('link', { name: 'ABOUT', exact: true }).click();
  await expect(page).toHaveURL(/\/v2\/about$/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('ABOUT THOMAS PHAO');
  await expect.poll(() => page.evaluate(() => window.portfolioTransitions.flat().filter(a => a.name === 'v2-portfolio-page-enter').length)).toBeGreaterThan(0);
  await page.waitForTimeout(350);
  const motion = await page.evaluate(() => window.portfolioTransitions.flat());
  const entries = motion.filter(a => a.name === 'v2-portfolio-page-enter');
  expect(entries).toHaveLength(1);
  expect(entries[0].duration).toBeGreaterThan(0);
  expect(entries[0].duration).toBeLessThanOrEqual(240);
  expect(motion.some(a => a.pseudo?.includes('(root)') && a.name.includes('fade'))).toBe(false);
  const after = await nav.boundingBox();
  expect(after?.x).toBe(before?.x);
  expect(after?.y).toBe(before?.y);
  await expect(page.locator('[data-public-page]')).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/v2$/, { timeout: 15_000 });
  await expect(page.getByRole('link', { name: 'VIEW PROJECTS', exact: true })).toBeVisible();
});

test('quick successive navigation does not get trapped by a transition overlay', async ({ page }) => {
  await page.goto('/v2');
  const nav = page.locator('nav').first();
  await expect(nav).toHaveCSS('opacity', '1');
  for (const [label, path] of [['ABOUT', '/v2/about'], ['BLOG', '/v2/blog'], ['Home', '/v2']]) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 15_000 });
  }
  await expect(page.locator('[data-public-page]')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'VIEW PROJECTS', exact: true })).toBeVisible();
});

test('navigation respects reduced motion and works without the browser transition API', async ({ page, browser, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await observeTransitions(page);
  await page.goto('/v2');
  await page.locator('nav').first().getByRole('link', { name: 'ABOUT', exact: true }).click();
  await expect(page).toHaveURL(/\/v2\/about$/, { timeout: 15_000 });
  const movements = await page.evaluate(() => window.portfolioTransitions.flat().filter(a => a.name.startsWith('v2-portfolio-page-')));
  expect(movements.every(a => a.duration <= 1)).toBe(true);
  const context = await browser.newContext({ baseURL });
  try {
    await context.addInitScript(() => Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true }));
    const fallback = await context.newPage();
    await fallback.goto('/v2');
    await fallback.locator('nav').first().getByRole('link', { name: 'ABOUT', exact: true }).click();
    await expect(fallback).toHaveURL(/\/v2\/about$/, { timeout: 15_000 });
    await expect(fallback.getByRole('heading', { level: 1 })).toHaveAccessibleName('ABOUT THOMAS PHAO');
  } finally { await context.close(); }
});
