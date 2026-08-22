/**
 * Canonical password policy shared by create / change / reset flows.
 * Must stay aligned with api-platform-users PasswordPolicyService.
 */
export const PASSWORD_MIN_LENGTH = 6;

export const PASSWORD_MSG_REQUIRED = 'A senha é obrigatória.';
export const PASSWORD_MSG_MIN_LENGTH = `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
export const PASSWORD_MSG_COMPROMISED =
  'Esta senha não pode ser usada porque consta em lista de senhas comprometidas (vazamento de dados). Escolha outra senha.';
export const PASSWORD_MSG_CONFIRM_MISMATCH =
  'A senha e a confirmação devem ser iguais.';

export const PASSWORD_HELP_LINES = [
  `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`,
  'Não use senhas que já tenham vazado em vazamentos públicos de dados.',
];

/**
 * Client-side validation for length/required/confirm.
 * Does not call breach API — that remains server-side.
 * @returns {string|null} error message or null when valid
 */
export function validatePasswordClient(password, confirm) {
  const normalized = String(password ?? '').trim();
  if (!normalized) {
    return PASSWORD_MSG_REQUIRED;
  }
  if (normalized.length < PASSWORD_MIN_LENGTH) {
    return PASSWORD_MSG_MIN_LENGTH;
  }
  if (confirm !== undefined && confirm !== null) {
    const confirmNormalized = String(confirm ?? '').trim();
    if (normalized !== confirmNormalized) {
      return PASSWORD_MSG_CONFIRM_MISMATCH;
    }
  }
  return null;
}

/**
 * Map API / raw error text to product Portuguese copy for known policy violations.
 */
export function mapPasswordErrorMessage(raw) {
  const text = String(raw ?? '').trim();
  if (!text) {
    return text;
  }
  if (/leaked|data breach|compromised password|have i been pwned|comprometid/i.test(text)) {
    return PASSWORD_MSG_COMPROMISED;
  }
  const minMatch =
    text.match(/at least\s+(\d+)\s+characters/i) ||
    text.match(/pelo menos\s+(\d+)\s+caracteres/i);
  if (minMatch) {
    return `A senha precisa ter pelo menos ${minMatch[1]} caracteres.`;
  }
  if (/must be identical|não coincidem|must match/i.test(text)) {
    return PASSWORD_MSG_CONFIRM_MISMATCH;
  }
  return text;
}

export default {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MSG_REQUIRED,
  PASSWORD_MSG_MIN_LENGTH,
  PASSWORD_MSG_COMPROMISED,
  PASSWORD_MSG_CONFIRM_MISMATCH,
  PASSWORD_HELP_LINES,
  validatePasswordClient,
  mapPasswordErrorMessage,
};
