import { describe, expect, it } from 'vitest';
import { friendlyAuthError } from './friendlyAuthError';

describe('friendlyAuthError', () => {
  it('keeps the exact password rule from the server', () => {
    const out = friendlyAuthError('Password should be at least 8 characters.');
    expect(out).toContain('8 characters');
    expect(out).toMatch(/requirements/i);
  });
  it('keeps complexity rules', () => {
    const out = friendlyAuthError('Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789.');
    expect(out).toContain('0123456789');
  });
  it('explains weak or leaked passwords', () => {
    expect(friendlyAuthError('Password is known to be weak and easy to guess, please choose a different one.')).toMatch(/too common/i);
  });
  it('explains rate limits', () => {
    expect(friendlyAuthError('email rate limit exceeded')).toMatch(/wait a few minutes/i);
  });
  it('points existing users to sign in', () => {
    expect(friendlyAuthError('User already registered')).toMatch(/signing in/i);
  });
  it('handles wrong credentials', () => {
    expect(friendlyAuthError('Invalid login credentials')).toMatch(/incorrect/i);
  });
  it('hides the database error wording', () => {
    expect(friendlyAuthError('Database error saving new user')).not.toMatch(/database/i);
  });
  it('passes unknown messages through and handles empty input', () => {
    expect(friendlyAuthError('Something odd happened')).toBe('Something odd happened');
    expect(friendlyAuthError('')).toMatch(/try again/i);
    expect(friendlyAuthError(undefined)).toMatch(/try again/i);
  });
});
