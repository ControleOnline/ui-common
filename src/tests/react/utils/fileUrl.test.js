const {describe, expect, it} = global;
const {jest} = require('@jest/globals');

jest.mock('@env', () => ({
  env: {
    API_ENTRYPOINT: 'https://api.controleonline.com',
    DOMAIN: 'manager.controleonline.com',
  },
}));

const {
  resolveDefaultFileSource,
  resolveFileImageUrl,
} = require('../../../react/utils/fileUrl');

describe('fileUrl helpers', () => {
  it('adds app-domain to backend download urls and keeps headers', () => {
    const company = {
      domain: 'maincompany.controleonline.com',
    };

    const source = resolveDefaultFileSource(
      {
        id: 3,
        url: '/files/3/download',
      },
      {
        company,
        headers: {
          Authorization: 'Bearer token',
        },
      },
    );

    expect(source).toEqual({
      uri: 'https://api.controleonline.com/files/3/download?app-domain=maincompany.controleonline.com',
      headers: {
        Authorization: 'Bearer token',
        'app-domain': 'maincompany.controleonline.com',
      },
    });
    expect(resolveFileImageUrl(3, {company})).toBe(
      'https://api.controleonline.com/files/3/download?app-domain=maincompany.controleonline.com',
    );
  });

  it('keeps external image urls untouched', () => {
    const source = resolveDefaultFileSource(
      'https://cdn.controleonline.com/logo.png',
      {
        company: {
          domain: 'maincompany.controleonline.com',
        },
      },
    );

    expect(source).toEqual({
      uri: 'https://cdn.controleonline.com/logo.png',
      headers: {},
    });
  });
});
