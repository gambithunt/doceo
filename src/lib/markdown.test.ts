import { describe, it, expect } from 'vitest';
import { renderSimpleMarkdown } from './markdown';

describe('renderSimpleMarkdown', () => {
  describe('headings', () => {
    it('renders h1', () => {
      expect(renderSimpleMarkdown('# Title')).toBe('<h1>Title</h1>');
    });

    it('renders h2', () => {
      expect(renderSimpleMarkdown('## Section')).toBe('<h2>Section</h2>');
    });

    it('renders h3', () => {
      expect(renderSimpleMarkdown('### Subsection')).toBe('<h3>Subsection</h3>');
    });

    it('renders h4', () => {
      expect(renderSimpleMarkdown('#### Deep heading')).toBe('<h4>Deep heading</h4>');
    });

    it('renders heading with bold text', () => {
      expect(renderSimpleMarkdown('### **Bold** heading')).toBe('<h3><strong>Bold</strong> heading</h3>');
    });

    it('does not treat # in the middle of a line as a heading', () => {
      expect(renderSimpleMarkdown('This has a # in it')).toBe('<p>This has a # in it</p>');
    });

    it('renders heading between paragraphs', () => {
      const input = 'Some text\n\n### Practice with Scenarios\n\nMore text';
      const result = renderSimpleMarkdown(input);
      expect(result).toContain('<h3>Practice with Scenarios</h3>');
      expect(result).toContain('<p>Some text</p>');
      expect(result).toContain('<p>More text</p>');
    });
  });
});
