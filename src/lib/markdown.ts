function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderSimpleMarkdown(markdown: string): string {
  const escaped = escapeHtml(markdown).replace(/\r\n/g, '\n');
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const withItalic = withBold.replace(/(^|[^*])\*(.+?)\*/g, '$1<em>$2</em>');
  const lines = withItalic.split('\n');
  const blocks: string[] = [];
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length > 0) {
      blocks.push(`<ul>${listBuffer.join('')}</ul>`);
      listBuffer = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuffer.push(`<li>${trimmed.slice(2)}</li>`);
      continue;
    }

    flushList();

    if (trimmed === '---') {
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
