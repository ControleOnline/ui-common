export default class Formatter {

  // Formata CPF ou CNPJ
  static formatDocument(value) {
    if (/^([0-9]{11})$/.test(value))
      return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, '$1.$2.$3-$4');

    if (/^([0-9]{14})$/.test(value))
      return value.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g,
        '$1.$2.$3/$4-$5',
      );

    return value || '';
  }

  // Formata CPF ou CNPJ (reutiliza formatDocument)
  static formatBRDocument(value) {
    return Formatter.formatDocument(value); // Reutiliza formatDocument
  }

  // Formata telefone brasileiro
  static formatBRPhone(value) {
    if (/^([0-9]{10})$/.test(value))
      return value.replace(/(\d{2})(\d{4})(\d{4})/g, '($1) $2-$3');

    if (/^([0-9]{11})$/.test(value))
      return value.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/g, '($1) $2 $3-$4');

    return value || '';
  }

  // Formata telefone brasileiro (reutiliza formatBRPhone)
  static formatPhone(value) {
    return Formatter.formatBRPhone(value); // Reutiliza formatBRPhone
  }

  // ALEMAC // 17/02/2026 // Formata data para o formato brasileiro (DD/MM/YYYY)
  // aceita entradas YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY e remove horário se existir

  // static formatDateToBR(dateISO) {
  //   if (!dateISO) return '';
  //   const [year, month, day] = dateISO.split(/[-/]/); // Suporta YYYY-MM-DD ou DD/MM/YYYY
  //   return `${day}/${month}/${year}`;
  // }

   // ALEMAC // 17/02/2026 // Formata data para o formato brasileiro (DD/MM/YYYY)
  // aceita entradas YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY e remove horário se existir
  static formatDateToBR(dateInput) {
    if (!dateInput) return '';
    
    // Remove horário se existir
    const dateOnly = String(dateInput).split(' ')[0];
    
    // Tenta identificar o formato e converter para DD/MM/YYYY
    const parts = dateOnly.split(/[-/]/);
    
    if (parts.length !== 3) return dateInput;
    
    const [part1, part2, part3] = parts;
    let day, month, year;
    
    // Verifica se é YYYY-MM-DD ou YYYY/MM/DD (parte1 é o ano com 4 dígitos)
    if (part1.length === 4) {
      year = part1;
      month = part2;
      day = part3;
    }
    // Verifica se é DD-MM-YYYY ou DD/MM/YYYY (parte3 é o ano com 4 dígitos)
    else if (part3.length === 4) {
      day = part1;
      month = part2;
      year = part3;
    }
    // Se não se encaixa em nenhum padrão, retorna igual
    else {
      return dateInput;
    }
    
    // Valida se é uma data válida
    if (day > 31 || month > 12 || day < 1 || month < 1) {
      return dateInput;
    }
    
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
    ) {
      return 'Data inválida';
    }

    return true;
  }



  static formatCEP(value) {
    if (!value) return '';
    if (value.length === 7) value = `0${value}`;
    return value.replace(/(\d{5})(\d{3})/g, '$1-$2');
  }

  static formatFloat(value) {
    const formatedValue = String(value || 0)
      .replace(/[^0-9.,]/g, '')
      .replace('.', '')
      .replace(',', '.');
    return parseFloat(formatedValue) || 0;
  }

  static formatMoney(value, currency = 'R$', locale = 'pt-BR') {
    if (!value && value !== 0) return `${currency} 0,00`;

    const numericValue =
      typeof value === 'string'
        ? parseFloat(value.replace('.', '').replace(',', '.')) || 0
        : value;

    const formatter = new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `${currency} ${formatter.format(numericValue)}`;
  }

  static buildAmericanDate(dateString) {
    if (!dateString) return null;

    const normalizedDate = dateString.replaceAll('/', '-');
    const [day, month, year] = normalizedDate.split('-').map(Number);

    // Assume DD-MM-YYYY como entrada e converte para YYYY-MM-DD
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return null;

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
    if (isNaN(date.getTime())) return value; // Retorna o valor original se inválido

    // Ajuste de fuso horário
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
