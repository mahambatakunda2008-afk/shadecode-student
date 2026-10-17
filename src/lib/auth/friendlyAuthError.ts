/**
 * Turns raw Supabase auth error messages into short, actionable text for students.
 * Presentation only: it never changes whether an auth call succeeds or fails.
 */
export function friendlyAuthError(raw: string | null | undefined): string {
  const message = (raw ?? '').trim();
  if (!message) return 'Something went wrong. Please try again.';

  // Supabase lists the exact rule(s) in these messages, so keep that detail.
  if (/password should (be at least|contain)/i.test(message)) {
    return `Your password doesn't meet the requirements. ${message.replace(/^password should/i, 'It should')}`;
  }
  if (/password.*(weak|easy to guess|pwned|compromised)/i.test(message)) {
    return 'That password is too common to be safe. Please choose a different one.';
  }
  // Per-user cooldown ("For security purposes, you can only request this after N seconds").
  if (/security purposes|only request this after/i.test(message)) {
    return 'Please wait a minute before trying again.';
  }
  // Project-wide email cap or per-IP limits: not the student's fault, so say so.
  if (/rate limit|too many requests|over_(email|request)_send_rate_limit/i.test(message)) {
    return 'We\u2019re handling a lot of sign-ins right now. Please try again in a little while. Your details were not saved.';
  }
  if (/already (been )?registered|user already exists/i.test(message)) {
    return 'That email already has an account. Try signing in instead.';
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Email or password is incorrect. Check them and try again, or reset your password.';
  }
  if (/unable to validate email|invalid.*email|email address.*invalid/i.test(message)) {
    return 'That email address doesn\u2019t look right. Please check it and try again.';
  }
  if (/signups? (are )?(not allowed|disabled)|signup.*disabled/i.test(message)) {
    return 'Sign-ups are temporarily unavailable. Please try again soon.';
  }
  if (/database error saving new user/i.test(message)) {
    return 'We couldn\u2019t create your account just now. Please try again in a moment.';
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return 'Can\u2019t reach the server. Check your connection and try again.';
  }
  return message;
}
