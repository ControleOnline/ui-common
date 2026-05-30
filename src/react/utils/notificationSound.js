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
