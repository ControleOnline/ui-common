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
  it('uses path app-domain for backend download urls and keeps headers', () => {
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
      uri: 'https://api.controleonline.com/maincompany.controleonline.com/files/3/download',
      headers: {
        Authorization: 'Bearer token',
        'app-domain': 'maincompany.controleonline.com',
      },
    });
    expect(resolveFileImageUrl(3, {company})).toBe(
      'https://api.controleonline.com/maincompany.controleonline.com/files/3/download',
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

  it('keeps the explicit environment domain on the registered download route', () => {
    const source = resolveDefaultFileSource(
      {
        id: 8444,
        url: '/files/8444/download',
      },
      {
        company: {
          domain: 'staging.controleonline.com',
        },
        headers: {
          Authorization: 'Bearer token',
        },
      },
    );

    expect(source).toEqual({
      uri: 'https://api.controleonline.com/staging.controleonline.com/files/8444/download',
      headers: {
        Authorization: 'Bearer token',
        'app-domain': 'staging.controleonline.com',
      },
    });
    expect(source.uri).toContain('staging.controleonline.com/files');
  });

  it('uses the configured platform domain on the registered download route', () => {
    // DOMAIN mock is manager.controleonline.com; no company → environment-like
    const source = resolveDefaultFileSource(
      {id: 9, url: '/files/9/download'},
      {headers: {Authorization: 'Bearer t'}},
    );

    expect(source.uri).toBe('https://api.controleonline.com/manager.controleonline.com/files/9/download');
    expect(source.headers['app-domain']).toBe('manager.controleonline.com');
    expect(source.uri).toMatch(/manager\.controleonline\.com\/files/);
  });
});


describe('file authentication origin boundary', () => {
  it('removes ERP credentials from external images and download-shaped URLs', () => {
    for (const uri of ['https://images.example.test/image.png', 'https://images.example.test/files/1/download', '//images.example.test/image.png']) {
      const source = resolveDefaultFileSource(uri, {headers: {'API-TOKEN': 'session-secret', Authorization: 'Bearer session-secret', 'App-Domain': 'tenant.test', Accept: 'image/*'}});
      expect(source.headers).not.toHaveProperty('API-TOKEN');
      expect(source.headers).not.toHaveProperty('Authorization');
      expect(source.headers).not.toHaveProperty('App-Domain');
      expect(source.headers.Accept).toBe('image/*');
    }
  });
  it('preserves authentication on the configured API download', () => {
    const source = resolveDefaultFileSource(1, {headers: {'API-TOKEN': 'session-secret'}});
    expect(source.headers['API-TOKEN']).toBe('session-secret');
  });

  it('ignores file.domain when it is the API host and uses tenant app-domain (app-community#1160)', () => {
    const company = {domain: 'loja.jaguncos.com.br'};

    const source = resolveDefaultFileSource(
      {
        id: 8408,
        domain: 'api.controleonline.com',
        url: '/api.controleonline.com/files/8408/download',
      },
      {
        company,
        headers: {Authorization: 'Bearer token'},
      },
    );

    expect(source.uri).toBe(
      'https://api.controleonline.com/loja.jaguncos.com.br/files/8408/download',
    );
    expect(source.uri).not.toMatch(/api\.controleonline\.com\/files/);
    expect(source.headers['app-domain']).toBe('loja.jaguncos.com.br');
  });

  it('ignores API host as company domain and falls back to explicit appDomain', () => {
    const source = resolveDefaultFileSource(
      {
        id: 8408,
        domain: 'api.controleonline.com',
      },
      {
        company: {domain: 'api.controleonline.com'},
        appDomain: 'erp.jaguncos.com.br',
        headers: {},
      },
    );

    expect(source.uri).toBe(
      'https://api.controleonline.com/erp.jaguncos.com.br/files/8408/download',
    );
    expect(source.headers['app-domain']).toBe('erp.jaguncos.com.br');
  });

  it('still prefers a real tenant file.domain over company when not API host', () => {
    const source = resolveDefaultFileSource(
      {
        id: 12,
        domain: 'cardapio.jaguncos.com.br',
        url: '/files/12/download',
      },
      {
        company: {domain: 'erp.jaguncos.com.br'},
      },
    );

    expect(source.uri).toBe(
      'https://api.controleonline.com/cardapio.jaguncos.com.br/files/12/download',
    );
    expect(source.headers['app-domain']).toBe('cardapio.jaguncos.com.br');
  });
});
