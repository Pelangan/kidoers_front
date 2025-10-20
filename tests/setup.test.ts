/**
 * Simple Jest test to verify the setup is working
 */

describe('Jest Setup Test', () => {
  it('should run Jest tests successfully', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to Jest globals', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });
});
