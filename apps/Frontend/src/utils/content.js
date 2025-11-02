export function contentToString(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    if (typeof content.text === 'string' && content.text.trim().length > 0) return content.text;
    if (Array.isArray(content.attachments) && content.attachments.length > 0) {
      const count = content.attachments.length;
      return count === 1 ? '[1 image attachment]' : `[${count} image attachments]`;
    }
    try { return JSON.stringify(content); } catch (e) { return String(content); }
  }
  return String(content);
}

export default contentToString;
