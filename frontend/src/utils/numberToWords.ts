/**
 * Converts a numeric amount into Indian Currency Words
 * Handles Lakhs, Crores, Thousands, Hundreds, and Paise.
 */
export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Rupees Zero Only';
  }

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertTwoDigits(num: number): string {
    if (num < 20) return ones[num];
    const t = Math.floor(num / 10);
    const o = num % 10;
    return tens[t] + (o > 0 ? ' ' + ones[o] : '');
  }

  function convertThreeDigits(num: number): string {
    const h = Math.floor(num / 100);
    const r = num % 100;
    let str = '';
    if (h > 0) {
      str += ones[h] + ' Hundred';
      if (r > 0) str += ' and ';
    }
    if (r > 0) {
      str += convertTwoDigits(r);
    }
    return str;
  }

  const wholeNumber = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - wholeNumber) * 100);

  let num = wholeNumber;
  const parts: string[] = [];

  // Crores
  const crores = Math.floor(num / 10000000);
  if (crores > 0) {
    parts.push(convertThreeDigits(crores) + ' Crore');
    num %= 10000000;
  }

  // Lakhs
  const lakhs = Math.floor(num / 100000);
  if (lakhs > 0) {
    parts.push(convertTwoDigits(lakhs) + ' Lakh');
    num %= 100000;
  }

  // Thousands
  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    parts.push(convertTwoDigits(thousands) + ' Thousand');
    num %= 1000;
  }

  // Hundreds & Units
  if (num > 0) {
    parts.push(convertThreeDigits(num));
  }

  let words = parts.length > 0 ? 'Rupees ' + parts.join(' ') : 'Rupees Zero';

  if (paise > 0) {
    words += ' and ' + convertTwoDigits(paise) + ' Paise';
  }

  return words + ' Only';
}

export function formatINR(val: number): string {
  if (isNaN(val)) return '₹0.00';
  return (
    '₹' +
    val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
