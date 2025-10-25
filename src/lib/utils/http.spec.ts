import { describe, it, expect } from 'vitest';
import { buildUrl } from './http';

describe('buildUrl', () => {
  const baseUrl = 'https://api.example.com/data';

  it('should return the base URL when params object is empty', () => {
    const url = buildUrl(baseUrl, {});
    expect(url).toBe(baseUrl);
  });

  it('should build a URL with multiple parameters of different types', () => {
    const params = {
      name: 'test-user',
      age: 30,
      isActive: true,
    };
    const url = buildUrl(baseUrl, params);
    // URLSearchParams preserves insertion order in this environment.
    expect(url).toBe(`${baseUrl}?name=test-user&age=30&isActive=true`);
  });

  it('should ignore any parameters with undefined values', () => {
    const params = {
      name: 'test-user',
      age: undefined,
      isActive: true,
    };
    const url = buildUrl(baseUrl, params);
    expect(url).toBe(`${baseUrl}?name=test-user&isActive=true`);
  });

  it('should return just the base URL if all parameters are undefined', () => {
    const params = {
      name: undefined,
      age: undefined,
    };
    const url = buildUrl(baseUrl, params);
    expect(url).toBe(baseUrl);
  });

  it('should correctly URL-encode special characters in parameter values', () => {
    const params = {
      q: 'ski touring & freeride!',
    };
    const url = buildUrl(baseUrl, params);
    const expected = `${baseUrl}?q=ski+touring+%26+freeride%21`;
    expect(url).toBe(expected);
  });

  it('should correctly URL-encode special characters in parameter keys', () => {
    const params = {
      'user-id/1': '123',
    };
    const url = buildUrl(baseUrl, params);
    const expected = `${baseUrl}?user-id%2F1=123`;
    expect(url).toBe(expected);
  });

  it('should handle boolean false correctly', () => {
    const params = {
      isActive: false,
    };
    const url = buildUrl(baseUrl, params);
    expect(url).toBe(`${baseUrl}?isActive=false`);
  });

  it('should handle number 0 correctly', () => {
    const params = {
      count: 0,
    };
    const url = buildUrl(baseUrl, params);
    expect(url).toBe(`${baseUrl}?count=0`);
  });

  it('should append a new query string to a base URL that already contains one', () => {
    const baseUrlWithQuery = `${baseUrl}?existing=true`;
    const params = {
      newUser: 'test',
    };
    const url = buildUrl(baseUrlWithQuery, params);
    // This documents the current behavior, which results in a technically malformed URL.
    expect(url).toBe(`${baseUrlWithQuery}?newUser=test`);
  });
});
