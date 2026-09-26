import { isValidElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { extractRenderVals, parseDcHtml, resolveAttrValue, substituteText, UnknownComponentError } from './dcParser';

// bundleLoader is never imported here: these are the pure parts of the
// .dc.html reader (docs/screens/README.md), tested without loading the real
// reference bundle. parseDcHtml builds a React *element tree* (it never
// renders it), so these tests inspect that tree's .type/.props directly
// rather than mounting it.

function setRegistry(registry: Record<string, unknown> | undefined) {
  (window as unknown as { Thinkerwell?: typeof registry }).Thinkerwell = registry;
}

/** The parsed screen always has exactly one top-level element (the outer wrapper div). */
function topLevel(raw: string) {
  const { element, ...rest } = parseDcHtml(raw);
  if (!isValidElement(element)) throw new Error('expected a single React element');
  const outerDiv = (element as ReactElement<{ children: unknown }>).props.children as ReactElement<{
    children: unknown;
  }>;
  return { outerDiv, ...rest };
}

describe('substituteText', () => {
  it('replaces every {{key}} with String(values[key])', () => {
    expect(substituteText('Hello {{name}}, you are {{age}}', { name: 'Amina', age: 12 })).toBe('Hello Amina, you are 12');
  });

  it('leaves an unknown {{key}} untouched', () => {
    expect(substituteText('{{missing}}', {})).toBe('{{missing}}');
  });
});

describe('resolveAttrValue', () => {
  it('returns the real type for an attribute that is exactly {{key}}', () => {
    const links = [{ label: 'Home' }];
    expect(resolveAttrValue('{{links}}', { links })).toBe(links); // same reference, not a copy
    expect(resolveAttrValue('{{count}}', { count: 3 })).toBe(3);
    expect(resolveAttrValue('{{yes}}', { yes: true })).toBe(true);
  });

  it('stringifies a {{key}} mixed with other text', () => {
    expect(resolveAttrValue('size-{{n}}', { n: 16 })).toBe('size-16');
  });

  it('falls back to the raw text (with substitution) when the key is unknown', () => {
    expect(resolveAttrValue('{{missing}}', {})).toBe('{{missing}}');
  });
});

describe('extractRenderVals', () => {
  it('evaluates the renderVals() script against a stub DCLogic', () => {
    const html = `<html><body><script data-dc-script>
      class Component extends DCLogic {
        renderVals() {
          return { m: '/images/mascot.png', mascotSize: 184, links: [{ label: 'Home', active: true }] };
        }
      }
    </script></body></html>`;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(extractRenderVals(doc)).toEqual({
      m: '/images/mascot.png',
      mascotSize: 184,
      links: [{ label: 'Home', active: true }],
    });
  });

  it('returns {} when there is no script', () => {
    const doc = new DOMParser().parseFromString('<html><body></body></html>', 'text/html');
    expect(extractRenderVals(doc)).toEqual({});
  });
});

describe('parseDcHtml', () => {
  it('converts <x-import> into the registry component, camelCases props, and drops <helmet> from the tree', () => {
    function SiteHeader() {
      return null;
    }
    setRegistry({ SiteHeader });

    const raw = `<!doctype html><html><body><x-dc>
      <helmet><style>body{background:var(--frame)}</style></helmet>
      <div style="width: 1280px; padding: 6px"><x-import component-from-global-scope="Thinkerwell.SiteHeader" logo-src="{{m}}" links="{{links}}">Hello {{label}}</x-import></div>
    </x-dc>
    <script data-dc-script>
      class Component extends DCLogic {
        renderVals() { return { m: '/images/m.png', links: [{ label: 'Home' }], label: 'Home' }; }
      }
    </script></body></html>`;

    const { outerDiv, values, helmetCss } = topLevel(raw);
    expect(values).toEqual({ m: '/images/m.png', links: [{ label: 'Home' }], label: 'Home' });
    expect(helmetCss).toBe('body{background:var(--frame)}');
    // The div's own style attribute became a style object, its width preserved.
    expect(outerDiv.props).toMatchObject({ style: { width: '1280px', padding: '6px' } });

    const imported = (outerDiv.props as { children: ReactElement<Record<string, unknown>> }).children;
    expect(imported.type).toBe(SiteHeader);
    expect(imported.props).toMatchObject({ logoSrc: '/images/m.png', links: [{ label: 'Home' }] });
    expect(imported.props.children).toBe('Hello Home');
  });

  it('throws UnknownComponentError for a component missing from the registry', () => {
    setRegistry({});
    const raw = `<!doctype html><html><body><x-dc><div><x-import component-from-global-scope="Thinkerwell.Nope"></x-import></div></x-dc></body></html>`;
    expect(() => parseDcHtml(raw)).toThrow(UnknownComponentError);
  });

  it('keeps an exact {{key}} attribute as its real array type, not a string', () => {
    function SiteHeader() {
      return null;
    }
    setRegistry({ SiteHeader });
    const raw = `<!doctype html><html><body><x-dc><div><x-import component-from-global-scope="Thinkerwell.SiteHeader" links="{{links}}"></x-import></div></x-dc>
    <script data-dc-script>class Component extends DCLogic { renderVals() { return { links: [{ label: 'Home' }] }; } }</script>
    </body></html>`;
    const { outerDiv } = topLevel(raw);
    const imported = (outerDiv.props as { children: ReactElement<{ links: unknown }> }).children;
    expect(Array.isArray(imported.props.links)).toBe(true);
    expect(imported.props.links).toEqual([{ label: 'Home' }]);
  });

  it('parses an x-import style attribute into a style object and keeps aria-* verbatim', () => {
    function SectionBadge() {
      return null;
    }
    setRegistry({ SectionBadge });
    const raw = `<!doctype html><html><body><x-dc><div><x-import component-from-global-scope="Thinkerwell.SectionBadge" style="flex-grow: 1" aria-label="Section">Badge</x-import></div></x-dc></body></html>`;
    const { outerDiv } = topLevel(raw);
    const imported = (outerDiv.props as { children: ReactElement<Record<string, unknown>> }).children;
    expect(imported.props).toMatchObject({ style: { flexGrow: '1' }, 'aria-label': 'Section' });
    expect(imported.props).not.toHaveProperty('ariaLabel');
  });

  it('converts a checked checkbox to defaultChecked (uncontrolled), not a controlled checked prop', () => {
    const raw = `<!doctype html><html><body><x-dc><div><label class="check" for="c1"><input id="c1" type="checkbox" checked="checked">Done</label></div></x-dc></body></html>`;
    const { outerDiv } = topLevel(raw);
    const label = (outerDiv.props as { children: ReactElement<{ children: ReactElement[] }> }).children;
    expect(label.props).toMatchObject({ className: 'check', htmlFor: 'c1' });
    const input = label.props.children[0];
    expect(input).toBeDefined();
    expect(input?.props).toMatchObject({ type: 'checkbox', defaultChecked: true });
    expect(input?.props).not.toHaveProperty('checked');
  });
});
