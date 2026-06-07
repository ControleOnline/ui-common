/*
 * Regra do fallback de audio operacional
 * - O som padrao dos alertas e `caixa.m4a`.
 * - Quando nao houver URL customizada, este helper precisa resolver o asset
 *   empacotado para manter o aviso sonoro dos novos pedidos.
 */

const DEFAULT_NOTIFICATION_SOUND_FILE = 'caixa.m4a';

let defaultNotificationSoundSource = null;

try {
  // O asset fica empacotado no app e serve como fallback quando nao ha URL customizada.
  defaultNotificationSoundSource = require('@controleonline/../../src/assets/sound/caixa.m4a');
} catch {
  defaultNotificationSoundSource = null;
}

const normalizeText = value => String(value || '').trim();

const resolveNotificationSoundSource = (
  soundUrl,
  fallbackSource = defaultNotificationSoundSource,
) => {
  if (typeof soundUrl === 'number') {
    return soundUrl;
  }

  if (soundUrl && typeof soundUrl === 'object') {
    return soundUrl;
  }

  const normalizedSoundUrl = normalizeText(soundUrl);

  return normalizedSoundUrl || fallbackSource;
};

export {
  DEFAULT_NOTIFICATION_SOUND_FILE,
  defaultNotificationSoundSource as DEFAULT_NOTIFICATION_SOUND_SOURCE,
  resolveNotificationSoundSource,
};
