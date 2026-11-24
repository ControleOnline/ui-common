// File.content comes base64 encoded from the API (File::getContent()). Contract
// and proposal documents are HTML generated from Twig models, while signed
// documents may be PDFs. Decode before deciding how to render.

const BASE64_PATTERN = /^[A-Za-z0-9+/=\r\n]+$/;

const decodeBase64Utf8 = value => {
  const binary =
    typeof globalThis.atob === 'function'
      ? globalThis.atob(value)
      : typeof Buffer !== 'undefined'
        ? Buffer.from(value, 'base64').toString('binary')
        : null;
  if (binary === null) {
    return null;
  }

  const percentEncoded = Array.from(binary)
    .map(char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
    .join('');
  return decodeURIComponent(percentEncoded);
};

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
    try {
      const decoded = decodeBase64Utf8(compact.replace(/[\r\n]/g, ''));
      if (decoded !== null && looksLikeHtml(decoded)) {
        return { kind: 'html', content: decoded };
      }
    } catch {
      // Not UTF-8 text: binary payload such as a PDF.
    }

    return { kind: 'pdf', content: compact };
  }

  return { kind: 'text', content: raw };
};

module.exports = {
  resolveDocumentFileContent,
};
