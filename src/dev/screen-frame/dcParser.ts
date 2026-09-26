// Dev only: turns one docs/screens/*.dc.html file's markup into a React
// element tree, run against the ORIGINAL reference bundle (window.Thinkerwell).
// See docs/screens/README.md for the file format this reads.
import { createElement, Fragment, type ReactNode } from 'react';
import { getReferenceRegistry } from './bundleLoader';

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;
const EXACT_PLACEHOLDER_RE = /^\{\{(\w+)\}\}$/;

/** Replaces every {{key}} in a string with String(values[key]); unknown keys are left as-is. */
export function substituteText(text: string, values: Record<string, unknown>): string {
  return text.replace(PLACEHOLDER_RE, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

/**
 * Resolves one attribute's raw text. An attribute whose whole value is
 * exactly "{{key}}" gets that value's real type (number, boolean, array,
 * object); anything else is a string with {{key}} substrings replaced.
 */
export function resolveAttrValue(raw: string, values: Record<string, unknown>): unknown {
  const exact = EXACT_PLACEHOLDER_RE.exec(raw.trim());
  const key = exact?.[1];
  if (key !== undefined && Object.prototype.hasOwnProperty.call(values, key)) {
    return values[key];
  }
  return substituteText(raw, values);
}

function toCamelCase(kebab: string): string {
  return kebab.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

// HTML parsing (DOMParser, text/html) lowercases every attribute name, which
// loses the required case for a handful of SVG attributes that are camelCase
// in the spec itself (not kebab-case, so there's no general rule to recover
// them). The .dc.html screens only use viewBox today; the rest are listed for
// safety if a future screen adds one.
const SVG_ATTR_FIXUPS: Record<string, string> = {
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
  patterntransform: 'patternTransform',
  gradienttransform: 'gradientTransform',
  patternunits: 'patternUnits',
  patterncontentunits: 'patternContentUnits',
  gradientunits: 'gradientUnits',
  spreadmethod: 'spreadMethod',
};

function parseInlineStyle(styleText: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const declaration of styleText.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    const prop = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!prop || !value) continue;
    // Custom properties (--frame) keep their name; everything else is kebab -> camel.
    const camel = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    out[camel] = value;
  }
  return out;
}

function attrsForImport(el: Element, values: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'component-from-global-scope') continue;
    if (attr.name === 'style') {
      // A component prop named `style` is a React style object, same as on
      // a plain HTML element — never the raw CSS-text string the attribute
      // holds, which would throw ("style prop expects a mapping").
      props.style = parseInlineStyle(substituteText(attr.value, values));
      continue;
    }
    if (attr.name === 'class') {
      props.className = resolveAttrValue(attr.value, values);
      continue;
    }
    // aria-* and data-* are DOM attribute names, not component props to
    // camelCase (a component forwarding them via a rest spread expects
    // `aria-label`, not the unknown prop `ariaLabel`).
    if (attr.name.startsWith('aria-') || attr.name.startsWith('data-')) {
      props[attr.name] = resolveAttrValue(attr.value, values);
      continue;
    }
    props[toCamelCase(attr.name)] = resolveAttrValue(attr.value, values);
  }
  return props;
}

function attrsForHtml(el: Element, values: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'style') {
      props.style = parseInlineStyle(substituteText(attr.value, values));
      continue;
    }
    if (attr.name === 'checked' && el.tagName === 'INPUT') {
      // An uncontrolled default, not a controlled `checked` with no onChange.
      props.defaultChecked = true;
      continue;
    }
    if (attr.name === 'class') {
      props.className = resolveAttrValue(attr.value, values);
      continue;
    }
    if (attr.name === 'for') {
      props.htmlFor = resolveAttrValue(attr.value, values);
      continue;
    }
    const name = SVG_ATTR_FIXUPS[attr.name] ?? attr.name;
    props[name] = resolveAttrValue(attr.value, values);
  }
  return props;
}

/** Import-path "Thinkerwell.SiteHeader" -> registry key "SiteHeader". */
function componentNameFrom(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1] ?? path;
}

export class UnknownComponentError extends Error {
  constructor(public readonly path: string) {
    super(`Unknown component: ${path || '(none)'}. It may not be in the reference bundle, or the bundle failed to load.`);
    this.name = 'UnknownComponentError';
  }
}

let keySeed = 0;

function convertNode(node: ChildNode, values: Record<string, unknown>): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    return text.trim() ? substituteText(text, values) : null;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const key = `dc-${(keySeed += 1)}`;
  const children = convertChildren(el, values);

  if (tag === 'x-import') {
    const path = el.getAttribute('component-from-global-scope') ?? '';
    const name = componentNameFrom(path);
    const registry = getReferenceRegistry();
    const Component = registry?.[name];
    if (!Component) throw new UnknownComponentError(path);
    return createElement(Component, { key, ...attrsForImport(el, values) }, ...children);
  }

  return createElement(tag, { key, ...attrsForHtml(el, values) }, ...children);
}

/**
 * An element's children, converted and with whitespace-only text nodes
 * dropped (the .dc.html source is indented like HTML, not JSX, so a lot of
 * "children" are really just formatting). Keeps a screen's usual single
 * wrapper element a single child, not a 1-item array hiding among nulls.
 */
function convertChildren(el: Element, values: Record<string, unknown>): ReactNode[] {
  return Array.from(el.childNodes)
    .map((child) => convertNode(child, values))
    .filter((child) => child !== null);
}

/**
 * Evaluates the screen's `<script type="text/x-dc" data-dc-script>` body
 * (`class Component extends DCLogic { renderVals() { return {...}; } }`)
 * against a stub DCLogic base class and returns the plain object it makes.
 */
export function extractRenderVals(doc: Document): Record<string, unknown> {
  const script = doc.querySelector('script[data-dc-script]');
  const body = script?.textContent?.trim();
  if (!body) return {};
  // The script text is this repo's own docs/screens source, not user input.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- see above.
  const factory = new Function('DCLogic', `${body}\nreturn new Component().renderVals();`) as (
    base: new () => object,
  ) => unknown;
  const values = factory(class DCLogic {});
  return values && typeof values === 'object' ? (values as Record<string, unknown>) : {};
}

export interface ParsedScreen {
  element: ReactNode;
  values: Record<string, unknown>;
  /** The screen's <helmet><style> body (its page background), if it has one. */
  helmetCss: string;
}

/**
 * Parses one .dc.html file's <x-dc> content (its <helmet> is dropped — the
 * app self-hosts fonts and sets its own page background) into a React tree
 * built from window.Thinkerwell, the ORIGINAL reference bundle.
 */
export function parseDcHtml(raw: string): ParsedScreen {
  keySeed = 0;
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const values = extractRenderVals(doc);
  const dc = doc.querySelector('x-dc');
  if (!dc) throw new Error('No <x-dc> element found in this screen.');

  const contentNodes = Array.from(dc.childNodes).filter(
    (node) => !(node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'helmet'),
  );
  // Whitespace between <helmet> and the wrapper <div> (or after it, before
  // </x-dc>) is a real text-node sibling that converts to null; drop it so a
  // screen's usual single wrapper div stays a single child, not a 1-item
  // array hiding among nulls.
  const children = contentNodes.map((node) => convertNode(node, values)).filter((node) => node !== null);
  const element = createElement(Fragment, null, ...children);
  const helmetCss = dc.querySelector('helmet style')?.textContent?.trim() ?? '';
  return { element, values, helmetCss };
}
