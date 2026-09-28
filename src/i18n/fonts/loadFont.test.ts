import { afterEach, describe, expect, it, vi } from 'vitest';

function fontLinks(): HTMLLinkElement[] {
  return [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][data-font="arabic"]')];
}

afterEach(() => {
  for (const link of fontLinks()) link.remove();
  vi.resetModules();
});

describe('loadFont', () => {
  it('adds nothing for the Latin fonts, which are always there', async () => {
    const { loadFont } = await import('./index');
    await loadFont('latin');
    expect(fontLinks()).toHaveLength(0);
  });

  it("adds the Arabic font's own stylesheet once", async () => {
    const { loadFont } = await import('./index');
    const first = loadFont('arabic');
    const again = loadFont('arabic');
    expect(again).toBe(first);
    const links = fontLinks();
    expect(links).toHaveLength(1);
    links[0]!.dispatchEvent(new Event('load'));
    await expect(first).resolves.toBeUndefined();
  });

  it("takes the stylesheet away if it can't be fetched, and tries again next time", async () => {
    const { loadFont } = await import('./index');
    const first = loadFont('arabic');
    fontLinks()[0]!.dispatchEvent(new Event('error'));
    await expect(first).resolves.toBeUndefined();
    expect(fontLinks()).toHaveLength(0);
    void loadFont('arabic');
    expect(fontLinks()).toHaveLength(1);
  });
});
