function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Bold "Term: description" patterns in list items — e.g. "Definition of X: Some explanation"
function boldListTerm(text: string): string {
  const colonIdx = text.indexOf(': ');
  if (colonIdx > 0 && colonIdx < 64 && !text.slice(0, colonIdx).includes('<')) {
    return `<strong>${text.slice(0, colonIdx)}</strong>: ${text.slice(colonIdx + 2)}`;
  }
  return text;
}

export function renderSimpleMarkdown(markdown: string): string {
  const escaped = escapeHtml(markdown).replace(/\r\n/g, '\n');
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const withItalic = withBold.replace(/(^|[^*])\*(.+?)\*/g, '$1<em>$2</em>');
  const lines = withItalic.split('\n');
  const blocks: string[] = [];
  let listBuffer: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  function flushList() {
    if (listBuffer.length > 0 && listType) {
      blocks.push(`<${listType}>${listBuffer.join('')}</${listType}>`);
      listBuffer = [];
      listType = null;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (listType === 'ol') flushList();
      listType = 'ul';
      listBuffer.push(`<li>${trimmed.slice(2)}</li>`);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (orderedMatch) {
      if (listType === 'ul') flushList();
      listType = 'ol';
      listBuffer.push(`<li>${boldListTerm(orderedMatch[1])}</li>`);
      continue;
    }

    flushList();

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${headingMatch[2]}</h${level}>`);
    } else if (trimmed === '---') {
      blocks.push('<hr />');
    } else if (trimmed.length === 0) {
      blocks.push('');
    } else {
      blocks.push(`<p>${trimmed}</p>`);
    }
  }

  flushList();

  return blocks.filter((block, index, all) => !(block === '' && all[index - 1] === '')).join('');
}
