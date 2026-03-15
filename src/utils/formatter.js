export default class Formatter {

  /* ================= UTIL ================= */

  static onlyNumbers(value) {
    return String(value || '').replace(/\D/g, '');
  }

  /* ================= DOCUMENTOS ================= */

  static formatDocument(value) {

    const numbers = Formatter.onlyNumbers(value);

    if (numbers.length === 11)
      return Formatter.maskCPF(numbers);

    if (numbers.length === 14)
      return Formatter.maskCNPJ(numbers);

    return value || '';
  }

  static formatBRDocument(value) {
    return Formatter.maskBRDocument(value);
  }

  /* ================= MÁSCARAS DIGITAÇÃO ================= */

  static maskCPF(value) {

    value = Formatter.onlyNumbers(value).slice(0, 11);

    return value
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }

  static maskCNPJ(value) {

    value = Formatter.onlyNumbers(value).slice(0, 14);

    return value
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  static maskBRDocument(value) {

    const numbers = Formatter.onlyNumbers(value);

    if (numbers.length <= 11)
      return Formatter.maskCPF(numbers);

    return Formatter.maskCNPJ(numbers);
  }

  /* ================= TELEFONE ================= */

  static maskPhoneBR(value) {

    value = Formatter.onlyNumbers(value).slice(0, 11);

    if (value.length <= 2)
      return `(${value}`;

    if (value.length <= 6)
      return value.replace(/(\d{2})(\d+)/, '($1) $2');

    if (value.length <= 10)
      return value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');

    return value.replace(/(\d{2})(\d{1})(\d{4})(\d+)/, '($1) $2 $3-$4');
  }

  static formatBRPhone(value) {

    const numbers = Formatter.onlyNumbers(value);

    if (numbers.length === 10)
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');

    if (numbers.length === 11)
      return numbers.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');

    return value || '';
  }

  static formatPhone(value) {
    return Formatter.maskPhoneBR(value);
  }

  /* ================= VALIDAÇÕES ================= */

  static validateEmail(email) {
    if (!email) return false;
    return /\S+@\S+\.\S+/.test(email);
  }

  static validateCPF(cpf) {

    cpf = Formatter.onlyNumbers(cpf);

    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;

    for (let i = 0; i < 9; i++)
      sum += cpf[i] * (10 - i);

    let rev = 11 - (sum % 11);
    if (rev >= 10) rev = 0;

    if (rev != cpf[9]) return false;

    sum = 0;

    for (let i = 0; i < 10; i++)
      sum += cpf[i] * (11 - i);

    rev = 11 - (sum % 11);
    if (rev >= 10) rev = 0;

    return rev == cpf[10];
  }

  static validateCNPJ(cnpj) {

    cnpj = Formatter.onlyNumbers(cnpj);

    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;

    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);

    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {

      sum += numbers[length - i] * pos--;

      if (pos < 2)
        pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;

    if (result != digits[0])
      return false;

    length = length + 1;
    numbers = cnpj.substring(0, length);

    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {

      sum += numbers[length - i] * pos--;

      if (pos < 2)
        pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - sum % 11;

    return result == digits[1];
  }

  /* ================= DATAS ================= */

  static formatDateToBR(dateInput) {

    if (!dateInput) return '';

    const dateOnly = String(dateInput).split(' ')[0];
    const parts = dateOnly.split(/[-/]/);

    if (parts.length !== 3)
      return dateInput;

    const [part1, part2, part3] = parts;

    let day, month, year;

    if (part1.length === 4) {

      year = part1;
      month = part2;
      day = part3;

    } else if (part3.length === 4) {

      day = part1;
      month = part2;
      year = part3;

    } else {
      return dateInput;
    }

    if (day > 31 || month > 12 || day < 1 || month < 1)
      return dateInput;

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  static validateBRDate(value) {

    if (!value) return true;

    const normalizedValue = value.replace(/[-/]/g, '/');

    const regex = /^\d{2}\/\d{2}\/\d{4}$/;

    if (!regex.test(normalizedValue))
      return 'Data inválida. Formato esperado: DD/MM/YYYY';

    const [day, month, year] = normalizedValue.split('/').map(Number);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() + 1 !== month ||
      date.getDate() !== day
    )
      return 'Data inválida';

    return true;
  }

  /* ================= CEP ================= */

  static formatCEP(value) {

    if (!value) return '';

    value = Formatter.onlyNumbers(value);

    if (value.length === 7)
      value = `0${value}`;

    return value.replace(/(\d{5})(\d{3})/, '$1-$2');
  }

  /* ================= NUMÉRICOS ================= */

  static formatFloat(value) {

    const formatedValue = String(value || 0)
      .replace(/[^0-9.,]/g, '')
      .replace('.', '')
      .replace(',', '.');

    return parseFloat(formatedValue) || 0;
  }

  static formatMoney(value, currency = 'R$', locale = 'pt-BR') {

    if (!value && value !== 0)
      return `${currency} 0,00`;

    const numericValue =
      typeof value === 'string'
        ? parseFloat(value.replace('.', '').replace(',', '.')) || 0
        : value;

    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `${currency} ${formatter.format(numericValue)}`;
  }

  /* ================= DATAS AUX ================= */

  static buildAmericanDate(dateString) {

    if (!dateString) return null;

    const normalizedDate = dateString.replaceAll('/', '-');

    const [day, month, year] = normalizedDate.split('-').map(Number);

    const date = new Date(year, month - 1, day);

    if (isNaN(date.getTime()))
      return null;

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  static getCurrentDate() {

    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  static formatDateYmdTodmY(value, withTime = false) {

    if (!value) return '';

    const date = new Date(value);

    if (isNaN(date.getTime()))
      return value;

    const clientTimeZoneOffset = new Date().getTimezoneOffset();

    const timeZoneDiffMinutes = clientTimeZoneOffset - date.getTimezoneOffset();

    date.setMinutes(date.getMinutes() + timeZoneDiffMinutes);

    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
    };

    if (withTime) {

      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
    }

    return date.toLocaleString('pt-BR', options);
  }

}