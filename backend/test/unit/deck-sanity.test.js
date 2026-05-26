const test = require('node:test');
const assert = require('node:assert/strict');
const { HackerDeck, SecEngDeck, TaskDeck } = require('../../models/decks');
const actions = require('../../models/cards/action');

test('every card built by the live decks has a name, type, effect text, and unique id within its deck', () => {
  const decks = [new HackerDeck(), new SecEngDeck(), new TaskDeck()];

  for (const deck of decks) {
    const seen = new Set();
    const cards = [...deck.playPile, ...deck.discardPile];
    assert.ok(cards.length > 0, `${deck.sourceDeck} deck should not be empty`);

    for (const card of cards) {
      assert.equal(typeof card.id, 'string');
      assert.equal(seen.has(card.id), false, `duplicate id ${card.id}`);
      seen.add(card.id);
      assert.ok(card.name, `${deck.sourceDeck} card missing name`);
      assert.ok(card.type, `${card.name} missing type`);
      assert.ok(card.effectDescription, `${card.name} missing effectDescription`);
      assert.equal(typeof card.toJSON, 'function', `${card.name} should be serialisable`);
    }
  }
});

test('Reconnaissance card definition matches its private/non-hostile rules text', () => {
  const recon = new actions.Reconnaissance();

  assert.equal(recon.hackerOnly, true);
  assert.equal(recon.isHostile, false);
  assert.match(recon.effectDescription, /privately view/i);
  assert.match(recon.effectDescription, /not hostile/i);
});

test('Task deck contains exactly 2 copies of each live task card', () => {
  const deck = new TaskDeck();
  const counts = new Map();
  for (const card of deck.playPile) counts.set(card.name, (counts.get(card.name) || 0) + 1);

  assert.deepEqual([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])), [
    ['Access Review', 2],
    ['Company Meeting', 2],
    ['Company Mixer Event', 2],
    ['Corporate Announcement', 2],
    ['Hazard Report', 2],
    ['Model Training', 2],
    ['Office Lockup Audit', 2],
    ['Responsible Engineer', 2],
    ['Secure Build Review', 2],
    ['Server Maintenance', 2],
  ]);
});
