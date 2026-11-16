import test from 'node:test';
import assert from 'node:assert/strict';
import { SKY_SCENARIO_ORDER } from './skyHop';
import { getScenarioMusicSpec, midiToFreq, SCENARIO_MUSIC_SPECS } from './skyHopMusic';

test('midiToFreq converts A4 (MIDI 69) to 440Hz and scales octaves cleanly', () => {
  assert.equal(midiToFreq(69), 440);
  assert.equal(midiToFreq(57), 220);
  assert.equal(midiToFreq(81), 880);
});

test('every SkyHop cosmic scenario has a distinct personalized music spec', () => {
  const seenTitles = new Set<string>();

  for (const scenario of SKY_SCENARIO_ORDER) {
    const spec = getScenarioMusicSpec(scenario.id);
    assert.equal(spec.id, scenario.id);
    assert.ok(spec.tempoBpm >= 70 && spec.tempoBpm <= 160);
    assert.ok(spec.melodySteps.some((n) => n !== null));
    assert.ok(spec.bassSteps.some((n) => n !== null));
    assert.equal(spec.padChord.length, 3);
    assert.ok(!seenTitles.has(spec.themeTitle), `Duplicate theme title: ${spec.themeTitle}`);
    seenTitles.add(spec.themeTitle);
  }

  assert.equal(Object.keys(SCENARIO_MUSIC_SPECS).length, SKY_SCENARIO_ORDER.length);
});
