const {describe, expect, it} = global;

const {
  DEFAULT_NOTIFICATION_SOUND_FILE,
  resolveNotificationSoundSource,
} = require('../../../react/utils/notificationSound');

describe('notificationSound helpers', () => {
  it('keeps the custom sound url when it is provided', () => {
    expect(
      resolveNotificationSoundSource(
        'https://cdn.example.com/alerta.mp3',
        'fallback-source',
      ),
    ).toBe('https://cdn.example.com/alerta.mp3');
  });

  it('falls back to the bundled source when the url is blank', () => {
    expect(resolveNotificationSoundSource('   ', 'fallback-source')).toBe(
      'fallback-source',
    );
  });

  it('exposes the bundled sound file name', () => {
    expect(DEFAULT_NOTIFICATION_SOUND_FILE).toBe('caixa.m4a');
  });
});
