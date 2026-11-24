'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const renderer = require('../public/js/systems/map-renderer');
const root = path.resolve(__dirname, '..');

test('4.61.16 renderer emits a separate keyed dynamic-entity SVG layer', () => {
  const svg = renderer.renderSvg({ dynamicMarkers: '<g data-map-key="mutant:m1"/><g data-map-key="player:p1"/>', markers: '<g id="static-keypoint"/>' });
  assert.match(svg, /data-map-layer="dynamic-markers"><g data-map-key="mutant:m1"\/><g data-map-key="player:p1"\/><\/g>/);
  assert.match(svg, /data-map-layer="markers"><g id="static-keypoint"\/><\/g>/);
});

test('4.61.16 map renderer uses stable-key reconciliation for dynamic entities', () => {
  const source = fs.readFileSync(path.join(root, 'public/js/systems/map-renderer.js'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  assert.match(source, /function patchKeyedLayer\(currentLayer, nextLayer, attribute = 'data-map-key'\)/);
  assert.match(source, /key === 'dynamic-markers'/);
  assert.match(game, /let overlays='',npcOverlays='',dynamicOverlays=''/);
  assert.match(game, /dynamicMarkers:dynamicOverlays\+meDot,markers:overlays/);
  for (const marker of ['battle:', 'convoy:', 'mutant:', 'player:', 'coop-artifact:', 'artifact:', 'stash:']) assert.ok(game.includes(marker), `expected stable key prefix ${marker}`);
  assert.match(game, /data-map-key="player:self"/);
});

test('4.61.16 generic keyed reconciliation retains unchanged nodes and patches changed nodes', () => {
  class Node {
    constructor(id, markup) { this.id = id; this.outerHTML = markup; this.parentNode = null; }
    getAttribute(name) { return name === 'data-map-key' ? this.id : null; }
  }
  class Layer {
    constructor(nodes = []) { this.children = nodes; this.children.forEach(node => { node.parentNode = this; }); }
    insertBefore(node, anchor) {
      if (node.parentNode === this) this.children.splice(this.children.indexOf(node), 1);
      else node.parentNode = this;
      const index = anchor ? this.children.indexOf(anchor) : this.children.length;
      this.children.splice(index < 0 ? this.children.length : index, 0, node);
    }
    replaceChild(next, previous) { const i=this.children.indexOf(previous);this.children[i]=next;next.parentNode=this;previous.parentNode=null; }
    removeChild(node) { this.children.splice(this.children.indexOf(node),1);node.parentNode=null; }
  }
  const oldA = new Node('player:a','<g data-map-key="player:a" x="1"/>');
  const oldB = new Node('mutant:b','<g data-map-key="mutant:b" x="1"/>');
  const current = new Layer([oldA,oldB]);
  const next = new Layer([new Node('player:a',oldA.outerHTML),new Node('mutant:b','<g data-map-key="mutant:b" x="2"/>'),new Node('stash:c','<g data-map-key="stash:c"/>')]);
  const previousDocument=global.document;
  global.document={importNode(node){return new Node(node.id,node.outerHTML);}};
  try {
    renderer.patchKeyedLayer(current,next);
    assert.equal(current.children[0],oldA);
    assert.notEqual(current.children[1],oldB);
    assert.equal(current.children[2].id,'stash:c');
    renderer.patchKeyedLayer(current,new Layer([new Node('player:a',oldA.outerHTML)]));
    assert.deepEqual(current.children.map(node=>node.id),['player:a']);
    assert.equal(current.children[0],oldA);
  } finally { if(previousDocument===undefined)delete global.document;else global.document=previousDocument; }
});

test('4.61.16 browser cache keys and title are updated', () => {
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  assert.match(html,/map-renderer\.js\?v=4\.61\.17/);
  assert.match(html,/ZONE ONLINE 4\.61\.17/);
});
