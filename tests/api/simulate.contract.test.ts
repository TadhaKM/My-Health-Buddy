import { describe, expect, it } from 'vitest';
import { POST } from '../../app/api/simulate/route';
import { generateMockSimulation, ORGANS, YEARS } from '../../lib/simulation';
import { PRESET_TO_PAYLOAD } from '../../src/lib/preset-contract';
import type { SimulationResponse } from '../../lib/types';

function assertContractShape(response: SimulationResponse) {
  for (const organ of ORGANS) {
    expect(response.organs[organ]).toBeDefined();
    for (const year of YEARS) {
      const value = response.organs[organ][year];
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }

    expect(response.organs[organ]['0']).toBeLessThanOrEqual(response.organs[organ]['5']);
    expect(response.organs[organ]['5']).toBeLessThanOrEqual(response.organs[organ]['10']);
    expect(response.organs[organ]['10']).toBeLessThanOrEqual(response.organs[organ]['20']);
  }

  expect(typeof response.summary).toBe('string');
  expect(response.summary.length).toBeGreaterThan(0);
}

describe('/api/simulate contract', () => {
  it('returns deterministic valid structure for healthy preset', () => {
    const result = generateMockSimulation(PRESET_TO_PAYLOAD.healthy.payload);
    assertContractShape(result);
  });

  it('returns deterministic valid structure for smoker preset', () => {
    const result = generateMockSimulation(PRESET_TO_PAYLOAD.smoker.payload);
    assertContractShape(result);
  });

  it('returns deterministic valid structure for poor sleep preset', () => {
    const result = generateMockSimulation(PRESET_TO_PAYLOAD.poorSleep.payload);
    assertContractShape(result);
  });

  it('returns deterministic valid structure for stress combo preset', () => {
    const result = generateMockSimulation(PRESET_TO_PAYLOAD.stressCombo.payload);
    assertContractShape(result);
  });

  it('preset realism: smoker has stronger lungs/heart strain than healthy by year 20', () => {
    const healthy = generateMockSimulation(PRESET_TO_PAYLOAD.healthy.payload);
    const smoker = generateMockSimulation(PRESET_TO_PAYLOAD.smoker.payload);

    expect(smoker.organs.lungs['20']).toBeGreaterThan(healthy.organs.lungs['20']);
    expect(smoker.organs.heart['20']).toBeGreaterThan(healthy.organs.heart['20']);
  });

  it('preset realism: stress combo has stronger liver/brain strain than healthy by year 20', () => {
    const healthy = generateMockSimulation(PRESET_TO_PAYLOAD.healthy.payload);
    const stress = generateMockSimulation(PRESET_TO_PAYLOAD.stressCombo.payload);

    expect(stress.organs.liver['20']).toBeGreaterThan(healthy.organs.liver['20']);
    expect(stress.organs.brain['20']).toBeGreaterThan(healthy.organs.brain['20']);
  });

  it('route returns 400 for invalid body', async () => {
    const req = new Request('http://localhost:3001/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smoking: 'invalid' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('route returns fallback contract when api key is missing', async () => {
    process.env.ANTHROPIC_API_KEY = '';

    const req = new Request('http://localhost:3001/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PRESET_TO_PAYLOAD.smoker.payload),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const data = (await response.json()) as SimulationResponse;
    assertContractShape(data);
  });
});
