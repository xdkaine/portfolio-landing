import {test, expect, type Page} from '@playwright/test';

test.use({extraHTTPHeaders:{DNT:'1'}});

async function headlineStart(page: Page) {
  return page.locator('main h1').evaluate(element => {
    const reveal = element.closest('.scroll-reveal-content');
    const animation = reveal?.getAnimations().find(item => item instanceof CSSAnimation && item.animationName === 'v2-portfolio-reveal-headline');
    const transform = (animation?.effect as KeyframeEffect | null)?.getKeyframes()[0].transform;
    return typeof transform === 'string' ? new DOMMatrix(transform).m41 : 0;
  });
}

test('entrances follow menu direction and reverse for browser history', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/v2/blog');
  const nav = page.locator('nav').first();
  await expect(nav).toHaveCSS('opacity','1');
  await nav.getByRole('link',{name:'PROJECTS',exact:true}).click();
  await expect(page).toHaveURL(/\/v1\/projects$/, {timeout:15_000});
  await expect(page.locator('main')).toHaveAttribute('data-page-entry','from-right');
  expect(await headlineStart(page)).toBeGreaterThan(20);
  const headerScales = await page.locator('main header .scroll-reveal-content').evaluateAll(elements => elements.flatMap(element =>
    element.getAnimations().filter(animation => animation instanceof CSSAnimation && animation.animationName.startsWith('v2-portfolio-reveal-')).map(animation => {
      const transform = (animation.effect as KeyframeEffect).getKeyframes()[0].transform;
      return new DOMMatrix(typeof transform === 'string' ? transform : 'none').a;
    }),
  ));
  expect(headerScales.length).toBeGreaterThan(0);
  expect(headerScales.every(scale => scale === 1)).toBe(true);
  await nav.getByRole('link',{name:'BLOG',exact:true}).click();
  await expect(page).toHaveURL(/\/v1\/blog$/, {timeout:15_000});
  await expect(page.locator('main')).toHaveAttribute('data-page-entry','from-left');
  expect(await headlineStart(page)).toBeLessThan(-20);
  await page.goBack();
  await expect(page).toHaveURL(/\/v1\/projects$/, {timeout:15_000});
  await expect(page.locator('main')).toHaveAttribute('data-page-entry','from-right');
  await page.goForward();
  await expect(page).toHaveURL(/\/v1\/blog$/, {timeout:15_000});
  await expect(page.locator('main')).toHaveAttribute('data-page-entry','from-left');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('directional entrances also work without the native transition API', async ({page}) => {
  await page.addInitScript(()=>Object.defineProperty(document,'startViewTransition',{value:undefined,configurable:true}));
  await page.goto('/v2/blog');
  await page.locator('nav').first().getByRole('link',{name:'Home',exact:true}).click();
  await expect(page).toHaveURL(/\/v1$/, {timeout:15_000});
  await expect(page.locator('main')).toHaveAttribute('data-page-entry','from-right');
  expect(await headlineStart(page)).toBeGreaterThan(20);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('nav').first().getByRole('link',{name:'PROJECTS',exact:true}).click();
  await expect(page).toHaveURL(/\/v1\/projects$/, {timeout:15_000});
  await expect(page.locator('main')).toHaveAttribute('data-page-entry','from-left');
  expect(await headlineStart(page)).toBe(0);
});

test('public labels and metadata describe projects and blog posts', async ({page,request}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/v2');
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content',/transmissions?|case stud/i);
  const projects = page.getByRole('link',{name:/^View project:/});
  if (await projects.count()) await expect(projects.first()).toBeVisible();
  else await expect(page.getByText('New project write-ups are on the way.')).toBeVisible();
  for (const route of ['/v2','/v2/projects','/v2/blog','/v2/blog?q=__no_matching_post__']) {
    await page.goto(route);
    expect(await page.locator('main').innerText()).not.toMatch(/transmissions?|case studies|case study/i);
    expect(await page.title()).not.toMatch(/transmissions?|case studies|case study/i);
  }
  await page.goto('/v2/blog');
  await expect(page.getByPlaceholder('SEARCH BLOG POSTS')).toBeVisible();
  const post = page.locator('main a[href^="/v2/blog/"]').first();
  if (await post.count()) {
    await post.click();
    await expect(page).toHaveTitle(/\| Blog \| Thomas Phao$/);
    expect(await page.locator('main').innerText()).not.toMatch(/transmissions?/i);
  }
  const feed = await request.get('/v2/feed.xml');
  expect(feed.ok()).toBe(true);
  expect(await feed.text()).toContain('Blog posts</title>');
});
