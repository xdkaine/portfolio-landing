import { test, expect, type Locator, type Page } from '@playwright/test';

async function opacity(locator: Locator) {
  return locator.evaluate(element => {
    let value = 1;
    for (let node: Element | null = element; node; node = node.parentElement) value *= Number(getComputedStyle(node).opacity);
    return value;
  });
}

async function renderScroll(page: Page, top: number, viewportFraction: number) {
  await page.evaluate(({ top, viewportFraction }) => scrollTo({ top: top - innerHeight * viewportFraction, behavior: 'instant' }), { top, viewportFraction });
  // Flush scroll measurement/rendering without advancing an animation timer.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
}

test('Home reveals follow scroll position, pause with scrolling, and finish without a stagger queue', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/v1');
  await expect(page.locator('nav').first()).toHaveCSS('opacity', '1');
  await page.evaluate(() => document.fonts.ready);
  const heading = page.getByRole('heading', { name: 'BEHIND THE PROJECTS', exact: true });
  const top = await heading.evaluate(element => {
    const target = element.closest('[data-scroll-reveal]') ?? element;
    return target.getBoundingClientRect().top + scrollY;
  });
  await renderScroll(page, top, 0.90);
  const early = await heading.evaluate(element => {
    const reveal = element.closest('.scroll-reveal-content')!;
    const style = getComputedStyle(reveal);
    return { opacity: Number(style.opacity), y: new DOMMatrix(style.transform).m42, clip: style.clipPath };
  });
  expect(early.opacity).toBeGreaterThan(0.1);
  expect(early.opacity).toBeLessThan(0.22);
  expect(early.y).toBeGreaterThan(45);
  expect(early.clip).not.toBe('none');
  await renderScroll(page, top, 0.78);
  const partial = await opacity(heading);
  expect(partial).toBeGreaterThan(0.25);
  expect(partial).toBeLessThan(0.75);
  await page.waitForTimeout(400); // A stationary viewport must hold the reveal rather than completing it on a timer.
  expect(Math.abs(await opacity(heading) - partial)).toBeLessThan(0.015);
  await renderScroll(page, top, 0.42);
  expect(await opacity(heading)).toBeGreaterThan(0.99);
  await renderScroll(page, top, 0.78);
  expect(Math.abs(await opacity(heading) - partial)).toBeLessThan(0.015);
  await renderScroll(page, top, 1.04);
  expect(await opacity(heading)).toBeLessThan(0.01);
  await renderScroll(page, top, 0.42);
  expect(await opacity(heading)).toBeGreaterThan(0.99);
});

test('About story blocks rewind without changing document layout or mounting new content', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/v1/about');
  await page.evaluate(() => document.fonts.ready);
  const block = page.locator('[aria-label="About me"] .article-prose > [data-story-reveal]').first();
  await expect(block).toBeAttached();
  const before = await block.evaluate(element => ({ top: element.getBoundingClientRect().top + scrollY, height: element.getBoundingClientRect().height, text: element.textContent }));
  await renderScroll(page, before.top, 0.78);
  const partial = await opacity(block);
  expect(partial).toBeGreaterThan(0.2);
  expect(partial).toBeLessThan(0.8);
  await page.waitForTimeout(150);
  expect(await opacity(block)).toBeCloseTo(partial, 2);
  await renderScroll(page, before.top, 0.42);
  expect(await opacity(block)).toBe(1);
  await renderScroll(page, before.top, 1.04);
  expect(await opacity(block)).toBe(0);
  await renderScroll(page, before.top, 0.78);
  expect(await opacity(block)).toBeCloseTo(partial, 2);
  expect(await block.evaluate(element => ({ top: element.getBoundingClientRect().top + scrollY, height: element.getBoundingClientRect().height, text: element.textContent }))).toEqual(before);
});

test('the last reveal finishes smoothly with the remaining document scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/v1');
  await page.evaluate(() => document.fonts.ready);
  const last = page.locator('[data-scroll-reveal]').last();
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight - innerHeight - 8, behavior: 'instant' }));
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
  expect(await opacity(last)).toBeGreaterThan(0.9);
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect.poll(() => opacity(last)).toBe(1);
});

test('public page headings use the Blog entrance treatment on initial loading', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let reference: { name: string; duration: string; easing: string } | undefined;
  for (const route of ['/v1/blog', '/v1', '/v1/projects', '/v1/about', '/v1/contact']) {
    await page.goto(route);
    const treatment = await page.locator('main h1').evaluate(element => {
      for (let node: Element | null = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.animationName !== 'none') return { name: style.animationName, duration: style.animationDuration, easing: style.animationTimingFunction };
      }
      return { name: 'none', duration: '0s', easing: 'none' };
    });
    expect(treatment.name).not.toBe('none');
    reference ??= treatment;
    expect(treatment).toEqual(reference);
  }
});

test('reduced motion keeps Home content fully visible before and after scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/v1');
  const heading = page.getByRole('heading', { name: 'BEHIND THE PROJECTS', exact: true });
  expect(await opacity(heading)).toBe(1);
  await heading.scrollIntoViewIfNeeded();
  expect(await opacity(heading)).toBe(1);
});

test('navigation from a scrolled page still runs the heading entrance after the route resets', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/v1');
  for (const [label, path, title] of [
    ['ABOUT', '/v1/about', 'ABOUT THOMAS PHAO'],
    ['BLOG', '/v1/blog', 'Blog'],
    ['Home', '/v1', 'Thomas Phao — Builder & Developer'],
    ['PROJECTS', '/v1/projects', 'PROJECTS'],
  ]) {
    await page.evaluate(() => scrollTo({ top: 800, behavior: 'instant' }));
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.locator('nav').first().getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 15_000 });
    await expect(page.locator('main h1')).toHaveAccessibleName(title);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect.poll(() => page.locator('main h1').evaluate(element => {
      let node: Element | null = element;
      while (node && !node.classList.contains('scroll-reveal-content')) node = node.parentElement;
      return node?.getAnimations().some(animation => animation instanceof CSSAnimation && animation.animationName === 'portfolio-reveal-headline');
    })).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  }
});

test('reveal content stays readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, extraHTTPHeaders: { DNT: '1' } });
  try {
    const page = await context.newPage();
    for (const route of ['/v1', '/v1/blog', '/v1/about']) {
      await page.goto(route);
      await expect.poll(() => opacity(page.locator('main h1'))).toBe(1);
    }
  } finally { await context.close(); }
});

test('keyboard focus makes a scroll-revealed action immediately readable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.goto('/v1');
  await expect(page.locator('nav').first()).toHaveCSS('opacity', '1');
  const action = page.getByRole('link', { name: 'More about me', exact: true });
  await action.focus();
  await expect(action).toBeFocused();
  await expect.poll(() => opacity(action)).toBe(1);
  const top = await action.evaluate(element => element.closest('[data-scroll-reveal]')!.getBoundingClientRect().top + scrollY);
  await renderScroll(page, top, 1.04);
  expect(await opacity(action)).toBe(1);
  await page.locator('nav').first().getByRole('link', { name: 'Home', exact: true }).focus();
  await expect.poll(() => opacity(action)).toBeLessThan(0.01);
});
