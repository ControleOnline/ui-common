const {describe, expect, it} = global;

const {
  formatDisplayUppercase,
  uppercaseText,
} = require('../../../react/utils/entityDisplay');

describe('entityDisplay helpers', () => {
  it('uppercases raw text with accented characters correctly', () => {
    expect(uppercaseText('Cláudia')).toBe('CLÁUDIA');
    expect(uppercaseText('Kibelicia Comida árabe')).toBe('KIBELICIA COMIDA ÁRABE');
  });

  it('uppercases pt-BR strings with cedilla correctly', () => {
    expect(formatDisplayUppercase('Jagunços')).toBe('JAGUNÇOS');
    expect(formatDisplayUppercase('Empório Jagunços Ltda')).toBe('EMPÓRIO JAGUNÇOS LTDA');
  });
});
