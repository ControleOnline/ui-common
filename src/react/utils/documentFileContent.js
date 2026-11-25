// File.content comes base64 encoded from the API (File::getContent()). Contract
// and proposal documents are generated from Twig models (HTML or plain text;
// plain text must be rendered as native text, not through RenderHTML),
// while signed documents may be PDFs. Decode before deciding how to render.

const BASE64_PATTERN = /^[A-Za-z0-9+/=\r\n]+$/;

const decodeBase64Binary = value => {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(value);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('binary');
  }
  return null;
};

const binaryToUtf8 = binary =>
  decodeURIComponent(
    Array.from(binary)
      .map(char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );

const looksLikeHtml = value => String(value || '').trim().startsWith('<');

const resolveDocumentFileContent = content => {
  const raw = String(content || '');
  if (!raw.trim()) {
    return { kind: 'empty', content: '' };
  }

  if (looksLikeHtml(raw)) {
    return { kind: 'html', content: raw };
  }

  const compact = raw.trim();
  if (BASE64_PATTERN.test(compact)) {
    const binary = decodeBase64Binary(compact.replace(/[\r\n]/g, ''));
    if (binary !== null) {
      if (binary.startsWith('%PDF')) {
        return { kind: 'pdf', content: compact };
      }
      try {
        const decoded = binaryToUtf8(binary);
        return looksLikeHtml(decoded)
          ? { kind: 'html', content: decoded }
          : { kind: 'text', content: decoded };
      } catch {
        // Not UTF-8 text: keep the binary payload for a viewer.
      }
    }
    return { kind: 'pdf', content: compact };
  }

  return { kind: 'text', content: raw };
};

module.exports = {
  resolveDocumentFileContent,
};
