import test from 'node:test';
import assert from 'node:assert/strict';
import {linkCard} from '../src/components.js';

test('cards render text and email inertly, while links remain navigable', () => {
  const previous = globalThis.document;
  globalThis.document = {createElement(tag) { return {tag, children:[], attrs:{}, listeners:{}, append(...items){this.children.push(...items)}, prepend(...items){this.children.unshift(...items)}, setAttribute(k,v){this.attrs[k]=v}, addEventListener(k,v){this.listeners[k]=v}}; }};
  try {
    for (const payload of [{kind:'text',content:'<img src=x onerror=alert(1)>\nNotes'}, {kind:'email',content:'hello@example.com'}, {url:'https://example.com/'}]) {
      const item = {...payload,title:'Saved item',stack:'Inbox',savedAt:'2026-11-21',favorite:false};
      let copied;
      const card = linkCard(item,()=>{},()=>{},value=>{copied=value});
      const content = card.children[1];
      assert.equal(content.children[0].tag, payload.url ? 'a' : 'strong');
      assert.equal(content.children[0].href, payload.url);
      if (!payload.url) assert.equal(content.children[1].textContent,payload.content);
      card.children[2].children[0].listeners.click();
      assert.equal(copied,item);
    }
  } finally { globalThis.document = previous; }
});
