import { describe, expect, it } from 'vitest';

import { isKnownHash, parseHash } from './router';

describe('parseHash', () => {
  it('reads screen name, id and query from the hash', () => {
    expect(parseHash('').name).toBe('title');
    expect(parseHash('#/hideout').name).toBe('hideout');
    expect(parseHash('#/palace/abc-1')).toMatchObject({ name: 'palace', id: 'abc-1' });
    const infiltrate = parseHash('#/infiltrate?company=abc-1');
    expect(infiltrate.name).toBe('infiltrate');
    expect(infiltrate.query.get('company')).toBe('abc-1');
  });

  it('falls back to the hideout for unknown paths', () => {
    expect(parseHash('#/nope')).toMatchObject({ name: 'hideout', id: null });
    expect(parseHash('#/palace/')).toMatchObject({ name: 'hideout', id: null });
  });
});

describe('isKnownHash', () => {
  it('accepts every screen address the app links to', () => {
    for (const hash of ['', '#/', '#/hideout', '#/palace', '#/palace/abc-1', '#/card?company=x', '#/infiltrate', '#/result/r1', '#/stats', '#/settings']) {
      expect(isKnownHash(hash), hash).toBe(true);
    }
  });

  it('rejects addresses that would silently show the hideout', () => {
    for (const hash of ['#/nope', '#/palace/', '#/result', '#hideout', '#/Hideout']) {
      expect(isKnownHash(hash), hash).toBe(false);
    }
  });
});
