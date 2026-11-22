import { expect, type Locator, type Page } from "@playwright/test";

export async function expectBlockReplay(page: Page, block: Locator) {
  await expect(block).toBeAttached();
  const top = await block.evaluate(element => element.getBoundingClientRect().top + scrollY);
  const position = async (fraction: number) => {
    await page.evaluate(({ top, fraction }) => scrollTo({ top: top - innerHeight * fraction, behavior: "instant" }), { top, fraction });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
  };
  await position(0.42);
  await expect(block).toHaveCSS("opacity", "1");
  await position(0.78);
  const partial = await block.evaluate(element => Number(getComputedStyle(element).opacity));
  expect(partial).toBeGreaterThan(0.2);
  expect(partial).toBeLessThan(0.8);
  await position(0.42);
  await expect(block).toHaveCSS("opacity", "1");
  await position(0.78);
  expect(await block.evaluate(element => Number(getComputedStyle(element).opacity))).toBeCloseTo(partial, 2);
}
