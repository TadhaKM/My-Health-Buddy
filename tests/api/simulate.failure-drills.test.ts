import { describe, expect, it } from 'vitest';
import {
  generateMockSimulation,
  normalizeSimulationResponseWithMeta,
  ORGANS,
  YEARS,
} from '../../lib/simulation';
import { PRESET_TO_PAYLOAD } from '../../src/lib/preset-contract';

describe('simulate normalizer failure drills', () => {
  const fallback = generateMockSimulation(PRESET_TO_PAYLOAD.stressCombo.payload);

  it('repairs missing organs/years using fallback', () => {
    const raw = {
      organs: { lungs: { '0': 12 } },
      summary: 'partial',
    };

    const normalized = normalizeSimulationResponseWithMeta(raw, fallback);

    for (const organ of ORGANS) {
      for (const year of YEARS) {
        expect(Number.isInteger(normalized.response.organs[organ][year])).toBe(true);
      }
    }

    expect(normalized.meta.repairedValueCount).toBeGreaterThan(0);
  });

  it('coerces string values and clamps out-of-range values', () => {
    const raw = {
      organs: {
        lungs: { '0': '-20', '5': '40', '10': '200', '20': '10' },
        heart: { '0': '1', '5': '2', '10': '3', '20': '4' },
        liver: { '0': '5', '5': '6', '10': '7', '20': '8' },
        brain: { '0': '9', '5': '10', '10': '11', '20': '12' },
        body_fat: { '0': '13', '5': '14', '10': '15', '20': '16' },
      },
      summary: 'ok',
    };

    const normalized = normalizeSimulationResponseWithMeta(raw, fallback);
    expect(normalized.response.organs.lungs['0']).toBe(0);
    expect(normalized.response.organs.lungs['10']).toBe(100);
    expect(normalized.response.organs.lungs['20']).toBeGreaterThanOrEqual(
      normalized.response.organs.lungs['10']
    );
  });

  it('extracts JSON from markdown-wrapped output', () => {
    const raw = '```json\n{"organs":{"lungs":{"0":10,"5":20,"10":30,"20":40},"heart":{"0":10,"5":20,"10":30,"20":40},"liver":{"0":10,"5":20,"10":30,"20":40},"brain":{"0":10,"5":20,"10":30,"20":40},"body_fat":{"0":10,"5":20,"10":30,"20":40}},"summary":"wrapped"}\n```';
    const normalized = normalizeSimulationResponseWithMeta(raw, fallback);

    expect(normalized.meta.usedJsonExtraction).toBe(true);
    expect(normalized.response.summary).toBe('wrapped');
  });

  it('falls back on invalid JSON text', () => {
    const raw = 'this is not json';
    const normalized = normalizeSimulationResponseWithMeta(raw, fallback);

    expect(normalized.meta.parseError).toBeTruthy();
    expect(normalized.response.organs.heart['20']).toBe(fallback.organs.heart['20']);
  });

  it('trims summary to max two sentences', () => {
    const raw = {
      organs: fallback.organs,
      summary: 'Sentence one. Sentence two. Sentence three.',
    };

    const normalized = normalizeSimulationResponseWithMeta(raw, fallback);
    expect(normalized.response.summary).toBe('Sentence one. Sentence two.');
  });

  it('repairs body-fat alias key', () => {
    const raw = {
      organs: {
        lungs: { '0': 1, '5': 2, '10': 3, '20': 4 },
        heart: { '0': 1, '5': 2, '10': 3, '20': 4 },
        liver: { '0': 1, '5': 2, '10': 3, '20': 4 },
        brain: { '0': 1, '5': 2, '10': 3, '20': 4 },
        'body-fat': { '0': 11, '5': 12, '10': 13, '20': 14 },
      },
      summary: 'alias key',
    };

    const normalized = normalizeSimulationResponseWithMeta(raw, fallback);
    expect(normalized.response.organs.body_fat['0']).toBe(11);
    expect(normalized.response.organs.body_fat['20']).toBe(14);
  });
});
