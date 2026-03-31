const signupAttempts = new Map<string, { count: number; resetTime: number }>();
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW = 60 * 60 * 1000; // 1 hour

export function checkSignupRateLimit(email: string): boolean {
  const now = Date.now();
  const attempt = signupAttempts.get(email);

  if (!attempt || now > attempt.resetTime) {
    signupAttempts.set(email, {
      count: 1,
      resetTime: now + SIGNUP_WINDOW,
    });
    return true;
  }

  if (attempt.count >= SIGNUP_LIMIT) {
    return false;
  }

  attempt.count++;
  return true;
}
