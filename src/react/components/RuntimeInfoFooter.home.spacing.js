// Keep the native safe area outside the centered content row.
export default (appearance, platform, bottomInset) => appearance === 'soft' ? {
  contentPadding: 4,
  safeAreaBottom: platform === 'web' ? 0 : Math.max(Number(bottomInset) || 0, 0),
} : null;
