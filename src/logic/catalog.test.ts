import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_UNLOCKED_ITEMS, FOOD_ITEMS, VIP_CATALOG, applyFoodToCat } from './minigames';
import { createDefaultSharedState } from './defaultState';

test('metadinhas category was removed and replaced by anime cosmetics', () => {
  assert.equal('metadinhas' in VIP_CATALOG, false);
  assert.ok(Array.isArray(VIP_CATALOG.anime));
  assert.ok(VIP_CATALOG.anime.length >= 18);
});

test('all anime cosmetics use couple currency (Medalhas) and cover all requested franchises', () => {
  for (const item of VIP_CATALOG.anime) {
    assert.equal(item.currency, 'couple', `${item.id} should use couple currency`);
    assert.ok(item.price >= 1, `${item.id} should cost at least 1 Medalha`);
  }

  const names = VIP_CATALOG.anime.map((i) => i.name).join(' | ');
  const requiredKeywords = [
    'JoJo',
    'FMA',
    'Baki',
    'Franxx',
    'Apotecária',
    'Ghibli',
    'Dandadan',
    'Tokyo Ghoul',
    'AoT',
    'SAO',
  ];
  for (const kw of requiredKeywords) {
    assert.ok(names.includes(kw), `Missing anime franchise keyword: ${kw}`);
  }
});

test('caminhas category provides customizable cat beds with classic unlocked by default', () => {
  assert.ok(Array.isArray(VIP_CATALOG.caminhas));
  assert.ok(VIP_CATALOG.caminhas.length >= 5);
  assert.ok(DEFAULT_UNLOCKED_ITEMS.includes('bed_classic'));
  const classic = VIP_CATALOG.caminhas.find((i) => i.id === 'bed_classic');
  assert.ok(classic);
  assert.equal(classic.price, 0);
  for (const item of VIP_CATALOG.caminhas) {
    assert.equal(item.type, 'bed');
  }
});

test('food items have doubled prices, normal names, and significant stat variations', () => {
  const prices = FOOD_ITEMS.map((f) => f.price);
  assert.deepEqual(prices, [24, 36, 60, 50, 100, 160]);

  const forbiddenTerms = ['Povo', 'Coletivizado', 'Báltico', 'Estrela Vermelha', 'Politburo', 'Bolchevique'];
  for (const food of FOOD_ITEMS) {
    for (const term of forbiddenTerms) {
      assert.equal(
        food.name.includes(term),
        false,
        `Food "${food.name}" should have a normal name without "${term}"`
      );
    }
  }

  const hungers = FOOD_ITEMS.map((f) => f.hunger);
  const energies = FOOD_ITEMS.map((f) => f.energy);
  const joys = FOOD_ITEMS.map((f) => f.joy);

  assert.ok(Math.max(...hungers) - Math.min(...hungers) >= 40, 'Hunger spread should vary significantly');
  assert.ok(Math.max(...energies) - Math.min(...energies) >= 40, 'Energy spread should vary significantly');
  assert.ok(Math.max(...joys) - Math.min(...joys) >= 40, 'Joy spread should vary significantly');
  assert.ok(new Set(energies).size >= 5, 'Foods should give distinct energy gains');
});

test('applyFoodToCat wakes sleeping cat, applies varied stats, and clamps at 100', () => {
  const baseCat = {
    ...createDefaultSharedState().cat1,
    isSleeping: true,
    hunger: 50,
    energy: 30,
    happiness: 60,
  };
  const elixir = FOOD_ITEMS.find((f) => f.id === 'food_potion')!;
  const fed = applyFoodToCat(baseCat, elixir);

  assert.equal(fed.isSleeping, false);
  assert.equal(fed.hunger, 90);
  assert.equal(fed.energy, 95);
  assert.equal(fed.happiness, 100);
});

