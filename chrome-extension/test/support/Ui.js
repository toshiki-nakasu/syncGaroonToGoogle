import fs from 'node:fs';

export class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.className = '';
    this.value = '';
    this.textContent = '';
    this.disabled = false;
    this.hidden = false;
    this.open = false;
    this.dataset = {};
  }
  append(...children) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }
  remove() {
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }
  focus() {
    this.focused = true;
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
  querySelectorAll(selector) {
    const matches = (element) =>
      selector.split(',').some((raw) => {
        const value = raw.trim();
        if (value.startsWith('.'))
          return element.className.split(' ').includes(value.slice(1));
        return element.tag === value;
      });
    const all = this.children.flatMap((child) => [
      child,
      ...child.querySelectorAll('*'),
    ]);
    return selector === '*' ? all : all.filter(matches);
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0];
  }
  dispatch(name, event = {}) {
    return this.listeners[name]?.({ preventDefault() {}, ...event });
  }
  async click() {
    if (!this.disabled) return this.dispatch('click');
  }
}

/** 実際のHTMLからID付き要素とフォームを読み込み、UIの操作を再現する。 */
export function loadDocument(url) {
  const html = fs.readFileSync(url, 'utf8');
  const elements = new Map();
  const formStart = html.indexOf('<form');
  const formEnd = html.indexOf('</form>');
  for (const match of html.matchAll(
    /<([a-z][a-z0-9-]*)\b[^>]*\bid="([^"]+)"[^>]*>/g,
  )) {
    const element = new Element(match[1]);
    element.id = match[2];
    element.hidden = /\bhidden\b/.test(match[0]);
    element.disabled = /\bdisabled\b/.test(match[0]);
    element.className = match[0].match(/\bclass="([^"]+)"/)?.[1] || '';
    elements.set(element.id, element);
    if (match.index > formStart && match.index < formEnd)
      elements.get('settings')?.append(element);
  }
  if (elements.has('settings'))
    elements.get('settings').append(new Element('button'));
  return {
    elements,
    document: {
      getElementById: (id) => elements.get(id),
      querySelector: (selector) => elements.get(selector.slice(1)),
      createElement: (tag) => new Element(tag),
    },
  };
}
