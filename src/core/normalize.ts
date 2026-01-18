export function normalizeLF(content: string): string {
  return content.replace(/\r\n/g, '\n');
}
