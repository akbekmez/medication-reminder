import { Pipe, PipeTransform, inject, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  async transform(value: string | null | undefined): Promise<SafeHtml> {
    if (!value) {
      return '';
    }
    const html = await marked.parse(value);
    // Sanitize the HTML to prevent XSS attacks
    const sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, html);
    // Trust the sanitized HTML
    return this.sanitizer.bypassSecurityTrustHtml(sanitizedHtml || '');
  }
}
