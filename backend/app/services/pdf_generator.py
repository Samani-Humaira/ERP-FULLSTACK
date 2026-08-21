"""
PDF Generator Service
====================
Uses WeasyPrint to generate professional PDFs from paper content with proper margins, wrapping, page breaks.
"""

from typing import Dict
from weasyprint import HTML
import io
from app.schemas import PaperResponse
import base64


def generate_pdf(paper: PaperResponse) -> bytes:
    """
    Generate PDF bytes from PaperResponse using WeasyPrint.
    Returns PDF bytes for API response.
    """
    # Build HTML with CSS for academic layout
    html_content = _build_html(paper)
    
    # Generate PDF with proper A4 margins/page settings
    html = HTML(string=html_content)
    pdf_bytes = html.write_pdf(
        stylesheets=None,  # Inline CSS handles everything
        margin_top="1in",
        margin_right="1in",
        margin_bottom="1in",
        margin_left="1in"
    )
    
    return pdf_bytes


def generate_pdf_base64(paper: PaperResponse) -> str:
    """Generate PDF and return base64 for frontend download."""
    pdf_bytes = generate_pdf(paper)
    return base64.b64encode(pdf_bytes).decode('utf-8')


def _build_html(paper: PaperResponse) -> str:
    """Build full HTML document with embedded CSS."""
    css = """
    @page {
        size: A4;
        margin: 1in;
        @bottom-center {
            content: counter(page) ' of ' counter(pages);
            font-size: 10pt;
            color: #666;
        }
    }
    body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 10pt;
        line-height: 1.35;
        color: #000;
        hyphens: auto;
        -webkit-hyphens: auto;
        column-width: 3.25in;
        column-gap: 0.25in;
        column-rule: 0.5pt solid #000;
        orphans: 4;
        widows: 4;
        hanging-punctuation: first;
    }
    h1.title {
        font-size: 18pt;
        font-weight: bold;
        text-align: center;
        margin: 20pt 0 10pt 0;
        text-transform: uppercase;
    }
    .authors {
        text-align: center;
        font-size: 11pt;
        margin-bottom: 20pt;
        font-style: italic;
    }
    .abstract {
        background: #f9f9f9;
        padding: 15pt;
        border-left: 4pt solid #007acc;
        margin: 20pt 0;
    }
    .abstract h2 {
        font-size: 14pt;
        margin-top: 0;
        color: #007acc;
    }
    h2.section, h3 {
        column-span: all;
        break-before: avoid;
        break-after: avoid;
        margin-top: 18pt;
        margin-bottom: 6pt;
        font-weight: bold;
    }
    h2.section {
        font-size: 11pt;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
    }
    h3 {
        font-size: 10pt;
    }
    h3 {
        font-size: 12pt;
        margin-top: 20pt;
        margin-bottom: 8pt;
    }
    p {
        margin-bottom: 12pt;
        text-align: justify;
        hyphens: auto;
    }
    ul {
        margin-bottom: 12pt;
    }
    li {
        margin-bottom: 6pt;
    }
    .references {
        font-size: 10pt;
    }
    .references ol {
        padding-left: 20pt;
    }
    """

    # Escape content for HTML
    def escape_html(text: str) -> str:
        return (text.replace('&', '&amp;')
                     .replace('<', '<')
                     .replace('>', '>')

    sections_html = ""
    for section in paper.sections:
        sections_html += f'<h2 class="section">{escape_html(section.title)}</h2>'
        sections_html += f'<p>{escape_html(section.content).replace("\\n", "<br>")}</p>'

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{escape_html(paper.title)}</title>
    <style>{css}</style>
</head>
<body>
    <h1 class="title">{escape_html(paper.title)}</h1>
    <div class="authors">
        AI Research Assistant<sup>*</sup><br>
        Department of Computer Science, University of Technology<br>
        *Corresponding author: ai-research@example.com
    </div>
    
    <div class="abstract">
        <h2>Abstract</h2>
        <p>{escape_html(paper.abstract).replace("\\n", "<br>")}</p>
    </div>
    
    {sections_html}
    
    <div class="references">
        <h2>References</h2>
        <p>References formatted according to IEEE style based on analyzed literature.</p>
    </div>
</body>
</html>"""
    
    return html
