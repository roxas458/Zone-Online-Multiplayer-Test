'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const renderer = require('../public/js/systems/map-renderer');
const root = path.resolve(__dirname, '..');

test('4.61.15 renderer isolates NPC markers into a dedicated SVG layer', () => {
  const svg = renderer.renderSvg({ npcMarkers: '<g data-npc-id="npc-1"/>', markers: '<g id="artifact"/>' });
  assert.match(svg, /data-map-layer="npc-markers"><g data-npc-id="npc-1"\/><\/g>/);
  assert.match(svg, /data-map-layer="markers"><g id="artifact"\/><\/g>/);
});

test('4.61.15 map renderer reconciles NPC markers by stable NPC id', () => {
  const source = fs.readFileSync(path.join(root, 'public/js/systems/map-renderer.js'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(source, /function patchKeyedNpcLayer\(currentLayer, nextLayer\)/);
  assert.match(source, /node\.outerHTML !== nextNode\.outerHTML/);
  assert.match(source, /currentLayer\.removeChild\(node\)/);
  assert.match(source, /key === 'npc-markers'/);
  assert.match(game, /let overlays='',npcOverlays=''/);
  assert.match(game, /npcMarkers:npcOverlays,dynamicMarkers:dynamicOverlays\+meDot,markers:overlays/);
  assert.ok(game.includes('npcOverlays+=[...squadBuckets.values()].map'));
  assert.match(game, /npcOverlays\+=living\.map/);
});

test('4.61.15 browser loads the keyed NPC map renderer before game.js', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(html.indexOf('/js/systems/map-renderer.js') < html.indexOf('/js/game.js'));
  assert.match(html, /map-renderer\.js\?v=4\.61\.31/);
});

test('4.61.15 keyed NPC reconciliation retains unchanged nodes and patches only changed ids', () => {
  class Node {
    constructor(id, markup) { this.id = id; this.outerHTML = markup; this.parentNode = null; }
    getAttribute(name) { return name === 'data-npc-id' ? this.id : null; }
  }
  class Layer {
    constructor(nodes = []) { this.children = nodes; this.children.forEach(node => { node.parentNode = this; }); }
    insertBefore(node, anchor) {
      if (node.parentNode === this) this.children.splice(this.children.indexOf(node), 1);
      else node.parentNode = this;
      const index = anchor ? this.children.indexOf(anchor) : this.children.length;
      this.children.splice(index < 0 ? this.children.length : index, 0, node);
    }
    replaceChild(next, previous) {
      const index = this.children.indexOf(previous);
      this.children[index] = next; next.parentNode = this; previous.parentNode = null;
    }
    removeChild(node) {
      this.children.splice(this.children.indexOf(node), 1); node.parentNode = null;
    }
  }
  const oldA = new Node('a', '<g data-npc-id="a" x="1"/>');
  const oldB = new Node('b', '<g data-npc-id="b" x="1"/>');
  const current = new Layer([oldA, oldB]);
  const nextA = new Node('a', '<g data-npc-id="a" x="1"/>');
  const nextB = new Node('b', '<g data-npc-id="b" x="2"/>');
  const nextC = new Node('c', '<g data-npc-id="c" x="1"/>');
  const next = new Layer([nextA, nextB, nextC]);
  const previousDocument = global.document;
  global.document = { importNode(node) { return new Node(node.id, node.outerHTML); } };
  try {
    renderer.patchKeyedNpcLayer(current, next);
    assert.equal(current.children.length, 3);
    assert.equal(current.children[0], oldA, 'unchanged NPC node is retained');
    assert.notEqual(current.children[1], oldB, 'changed NPC node is replaced');
    assert.equal(current.children[1].outerHTML, nextB.outerHTML);
    assert.equal(current.children[2].id, 'c', 'new NPC is inserted');
    const removeNext = new Layer([new Node('a', nextA.outerHTML)]);
    renderer.patchKeyedNpcLayer(current, removeNext);
    assert.deepEqual(current.children.map(node => node.id), ['a']);
    assert.equal(current.children[0], oldA, 'retained NPC remains the same DOM node');
  } finally {
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});
