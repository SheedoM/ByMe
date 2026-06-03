const RTL_RE = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
const LTR_RE = /[A-Za-z]/

export function getTextDirection(text = '') {
  for (const char of text) {
    if (RTL_RE.test(char)) return 'rtl'
    if (LTR_RE.test(char)) return 'ltr'
  }
  return 'auto'
}
