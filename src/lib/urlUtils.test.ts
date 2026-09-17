import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { isSafeRedirect } from './urlUtils';

describe('isSafeRedirect', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      origin: 'https://example.com'
    };
  });

  afterAll(() => {
    (window as any).location = originalLocation;
  });

  it('allows exact authorized registered redirect', () => {
    const client = { redirect_uris: ['https://app.external.com/callback'] };
    expect(isSafeRedirect('https://app.external.com/callback', client)).toBe(true);
  });

  it('allows authorized redirect with legitimate OAuth query parameters', () => {
    const client = { redirect_uris: ['https://app.external.com/callback'] };
    expect(isSafeRedirect('https://app.external.com/callback?code=123&state=abc', client)).toBe(true);
  });

  it('allows same-origin relative URL when client is absent', () => {
    expect(isSafeRedirect('/admin?next=/foo', undefined)).toBe(true);
  });

  it('allows same-origin absolute URL when client is absent', () => {
    expect(isSafeRedirect('https://example.com/admin?next=/foo', undefined)).toBe(true);
  });

  it('blocks unregistered external origin', () => {
    const client = { redirect_uris: ['https://app.external.com/callback'] };
    expect(isSafeRedirect('https://attacker.com/callback', client)).toBe(false);
    expect(isSafeRedirect('https://attacker.com/callback', undefined)).toBe(false);
  });

  it('blocks lookalike domain', () => {
    const client = { redirect_uris: ['https://app.external.com/callback'] };
    expect(isSafeRedirect('https://app.external.attacker.com/callback', client)).toBe(false);
  });

  it('blocks subdomain attacker.example when example.com is registered', () => {
    const client = { redirect_uris: ['https://example.com/callback'] };
    expect(isSafeRedirect('https://attacker.example.com/callback', client)).toBe(false);
  });

  it('blocks different port', () => {
    const client = { redirect_uris: ['https://app.external.com:8080/callback'] };
    expect(isSafeRedirect('https://app.external.com:8081/callback', client)).toBe(false);
    expect(isSafeRedirect('https://app.external.com/callback', client)).toBe(false);
  });

  it('blocks different path', () => {
    const client = { redirect_uris: ['https://app.external.com/callback'] };
    expect(isSafeRedirect('https://app.external.com/callback/evil', client)).toBe(false);
    expect(isSafeRedirect('https://app.external.com/other', client)).toBe(false);
  });

  it('blocks protocol change', () => {
    const client = { redirect_uris: ['https://app.external.com/callback'] };
    expect(isSafeRedirect('http://app.external.com/callback', client)).toBe(false);
  });

  it('blocks javascript: scheme', () => {
    const client = { redirect_uris: ['https://app.external.com/callback'] };
    expect(isSafeRedirect('javascript:alert(1)', client)).toBe(false);
    expect(isSafeRedirect('javascript:alert(1)', undefined)).toBe(false);
  });

  it('blocks data: scheme', () => {
    expect(isSafeRedirect('data:text/html,<script>alert(1)</script>', undefined)).toBe(false);
  });

  it('blocks vbscript: scheme', () => {
    expect(isSafeRedirect('vbscript:msgbox(1)', undefined)).toBe(false);
  });

  it('blocks protocol-relative //attacker.example', () => {
    expect(isSafeRedirect('//attacker.example/foo', undefined)).toBe(false);
  });

  it('blocks malformed URL', () => {
    expect(isSafeRedirect('http://%invalid_url%', undefined)).toBe(false);
  });
});
