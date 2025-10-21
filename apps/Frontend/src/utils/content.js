export function contentToString(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text;
    try { return JSON.stringify(content); } catch (e) { return String(content); }
  }
  return String(content);
}

export default contentToString;
