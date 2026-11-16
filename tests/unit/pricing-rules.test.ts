import { describe, expect, it } from 'vitest';
import { optionCharge, regionFor, type RegionInfo } from '@/lib/regions';

const region = (id: string, countries: string[]): RegionInfo => ({
  id, name: id, countries, currency: 'INR', paymentMethods: ['COD'], taxRate: null, shippingOptions: [],
});

describe('shipping charge', () => {
  const standard = { id: 's', name: 'Standard', price: 99, freeAbove: 999, minDays: 3, maxDays: 7 };

  it('charges below the free-delivery threshold and is free at or above it', () => {
    expect(optionCharge(standard, 998)).toBe(99);
    expect(optionCharge(standard, 999)).toBe(0);
  });

  it('always charges when there is no threshold', () => {
    expect(optionCharge({ ...standard, freeAbove: null }, 100_000)).toBe(99);
  });
});

describe('region for a country', () => {
  const regions = [region('in', ['IN']), region('world', ['*'])];

  it('prefers the region that lists the country, then the catch-all', () => {
    expect(regionFor(regions, 'in')?.id).toBe('in');
    expect(regionFor(regions, 'GB')?.id).toBe('world');
  });

  it('returns nothing when no region sells there', () => {
    expect(regionFor([region('in', ['IN'])], 'GB')).toBeNull();
  });
});
