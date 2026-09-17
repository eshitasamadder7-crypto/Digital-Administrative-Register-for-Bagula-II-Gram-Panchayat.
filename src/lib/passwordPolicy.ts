/**
 * Authoritative Password Policy for Bagula II Gram Panchayat
 * Enforces:
 *  - Minimum length: 8 characters
 *  - At least 1 uppercase letter (A-Z)
 *  - At least 1 lowercase letter (a-z)
 *  - At least 1 number (0-9)
 *  - At least 1 special character (non-alphanumeric, e.g. !@#$%^&*()-_+=)
 */

export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  requirements: PasswordRequirements;
  errorMessage: string | null;
}

export function validatePassword(password: string): PasswordValidationResult {
  const pw = password ?? "";
  const requirements: PasswordRequirements = {
    minLength: pw.length >= 8,
    hasUppercase: /[A-Z]/.test(pw),
    hasLowercase: /[a-z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  };

  const isValid =
    requirements.minLength &&
    requirements.hasUppercase &&
    requirements.hasLowercase &&
    requirements.hasNumber &&
    requirements.hasSpecial;

  let errorMessage: string | null = null;
  if (!requirements.minLength) {
    errorMessage = "Password must be at least 8 characters.";
  } else if (!requirements.hasUppercase) {
    errorMessage = "Password must contain at least 1 uppercase letter (A-Z).";
  } else if (!requirements.hasLowercase) {
    errorMessage = "Password must contain at least 1 lowercase letter (a-z).";
  } else if (!requirements.hasNumber) {
    errorMessage = "Password must contain at least 1 number (0-9).";
  } else if (!requirements.hasSpecial) {
    errorMessage = "Password must contain at least 1 special character (!@#$%^&* etc.).";
  }

  return { isValid, requirements, errorMessage };
}

export function checkPasswordMatch(
  password: string,
  confirm: string
): { matches: boolean; message: string } {
  if (!confirm) {
    return { matches: false, message: "Confirm password is required." };
  }
  if (password === confirm) {
    return { matches: true, message: "Passwords match" };
  }
  return { matches: false, message: "Passwords do not match" };
}
