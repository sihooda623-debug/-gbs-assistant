export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("비밀번호는 8자 이상이어야 합니다");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("비밀번호는 대문자를 포함해야 합니다");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("비밀번호는 소문자를 포함해야 합니다");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("비밀번호는 숫자를 포함해야 합니다");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
