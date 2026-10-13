"""Generate publication-style academic PDFs from generated paper content."""

import base64
import html
import re
from io import BytesIO
from typing import Iterable

from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    FrameBreak,
    NextPageTemplate,
    PageTemplate,
    Paragraph,
    Spacer,
)

from app.schemas import PaperResponse


PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = RIGHT_MARGIN = 0.68 * inch
TOP_MARGIN = 0.55 * inch
BOTTOM_MARGIN = 0.62 * inch
COLUMN_GAP = 0.25 * inch
HEADER_HEIGHT = 2.95 * inch


def _styles() -> dict[str, ParagraphStyle]:
    """Create consistent Times-style academic typography."""
    return {
        "title": ParagraphStyle(
            "PaperTitle",
            fontName="Times-Bold",
            fontSize=18,
            leading=21,
            alignment=TA_CENTER,
            spaceAfter=9,
        ),
        "abstract_heading": ParagraphStyle(
            "AbstractHeading",
            fontName="Times-BoldItalic",
            fontSize=9,
            leading=11,
            alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "abstract": ParagraphStyle(
            "Abstract",
            fontName="Times-Roman",
            fontSize=8.5,
            leading=11,
            alignment=TA_JUSTIFY,
            spaceAfter=5,
        ),
        "section": ParagraphStyle(
            "SectionHeading",
            fontName="Times-Bold",
            fontSize=9.5,
            leading=11,
            alignment=TA_CENTER,
            spaceBefore=9,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "BodyTextAcademic",
            fontName="Times-Roman",
            fontSize=9,
            leading=11.5,
            alignment=TA_JUSTIFY,
            firstLineIndent=9,
            spaceAfter=5,
            allowWidows=0,
            allowOrphans=0,
        ),
        "reference": ParagraphStyle(
            "Reference",
            fontName="Times-Roman",
            fontSize=8,
            leading=9.5,
            alignment=TA_LEFT,
            leftIndent=12,
            firstLineIndent=-12,
            spaceAfter=4,
        ),
    }


def _page_number(canvas: Canvas, doc: BaseDocTemplate) -> None:
    """Draw a discreet centered page number in the footer."""
    canvas.saveState()
    canvas.setFont("Times-Roman", 8)
    canvas.setFillColorRGB(0.35, 0.35, 0.35)
    canvas.drawCentredString(PAGE_WIDTH / 2, 0.34 * inch, str(doc.page))
    canvas.restoreState()


def _make_frames() -> tuple[list[Frame], list[Frame]]:
    """Create a full-width title frame and IEEE-like body columns."""
    content_width = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
    column_width = (content_width - COLUMN_GAP) / 2
    header_bottom = PAGE_HEIGHT - TOP_MARGIN - HEADER_HEIGHT
    first_column_height = header_bottom - BOTTOM_MARGIN - 12

    header = Frame(
        LEFT_MARGIN,
        header_bottom,
        content_width,
        HEADER_HEIGHT,
        leftPadding=2,
        rightPadding=2,
        topPadding=2,
        bottomPadding=2,
        id="header",
    )
    first_left = Frame(
        LEFT_MARGIN,
        BOTTOM_MARGIN,
        column_width,
        first_column_height,
        leftPadding=2,
        rightPadding=2,
        topPadding=2,
        bottomPadding=2,
        id="first-left",
    )
    first_right = Frame(
        LEFT_MARGIN + column_width + COLUMN_GAP,
        BOTTOM_MARGIN,
        column_width,
        first_column_height,
        leftPadding=2,
        rightPadding=2,
        topPadding=2,
        bottomPadding=2,
        id="first-right",
    )

    body_height = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN
    body_left = Frame(
        LEFT_MARGIN,
        BOTTOM_MARGIN,
        column_width,
        body_height,
        leftPadding=2,
        rightPadding=2,
        topPadding=2,
        bottomPadding=2,
        id="body-left",
    )
    body_right = Frame(
        LEFT_MARGIN + column_width + COLUMN_GAP,
        BOTTOM_MARGIN,
        column_width,
        body_height,
        leftPadding=2,
        rightPadding=2,
        topPadding=2,
        bottomPadding=2,
        id="body-right",
    )
    return [header, first_left, first_right], [body_left, body_right]


def _paragraphs(text: str, style: ParagraphStyle) -> Iterable[Paragraph]:
    """Split plain text into safely escaped, typeset paragraphs."""
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if lines:
            safe_text = "<br/>".join(html.escape(line) for line in lines)
            yield Paragraph(safe_text, style)


def _reference_paragraphs(text: str, style: ParagraphStyle) -> Iterable[Paragraph]:
    """Render references with IEEE-like numbering and hanging indents."""
    next_number = 1
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.casefold().rstrip(":") in {"key references", "references", "bibliography"}:
            continue
        match = re.match(r"^\[(\d+)\]\s*(.*)$|^(\d+)[.)]\s+(.*)$", line)
        if match:
            number = match.group(1) or match.group(3)
            reference = match.group(2) or match.group(4)
            next_number = int(number) + 1
        else:
            number, reference = str(next_number), line
            next_number += 1
        yield Paragraph(f"[{number}] {html.escape(reference)}", style)


def _section_heading(title: str, index: int, style: ParagraphStyle, references: bool) -> Paragraph:
    """Format section headings with IEEE-style Roman numerals."""
    if references:
        heading = html.escape(title.upper())
    else:
        heading = f"{_to_roman(index)}. {html.escape(title.upper())}"
    return Paragraph(heading, style)


def _to_roman(number: int) -> str:
    """Convert a positive section number to an uppercase Roman numeral."""
    values = (
        (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
        (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
        (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
    )
    result = []
    for value, numeral in values:
        while number >= value:
            result.append(numeral)
            number -= value
    return "".join(result)


def generate_pdf(paper: PaperResponse) -> bytes:
    """Generate an A4 academic PDF with a full-width abstract and justified columns."""
    buffer = BytesIO()
    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title=paper.title,
        author="",
    )
    first_frames, body_frames = _make_frames()
    doc.addPageTemplates(
        [
            PageTemplate(id="first", frames=first_frames, onPage=_page_number),
            PageTemplate(id="body", frames=body_frames, onPage=_page_number),
        ]
    )

    styles = _styles()
    story = [
        Paragraph(html.escape(paper.title), styles["title"]),
        Spacer(1, 8),
        Paragraph("ABSTRACT", styles["abstract_heading"]),
        *_paragraphs(paper.abstract, styles["abstract"]),
        Spacer(1, 4),
        FrameBreak(),
        NextPageTemplate("body"),
    ]

    section_number = 0
    for section in paper.sections:
        is_references = section.title.strip().casefold() in {"references", "bibliography"}
        if not is_references:
            section_number += 1
        story.append(_section_heading(section.title, section_number, styles["section"], is_references))
        if is_references:
            story.extend(_reference_paragraphs(section.content, styles["reference"]))
        else:
            story.extend(_paragraphs(section.content, styles["body"]))

    doc.build(story)
    return buffer.getvalue()


def generate_pdf_base64(paper: PaperResponse) -> str:
    """Generate a PDF and return it as a base64-encoded string."""
    return base64.b64encode(generate_pdf(paper)).decode("utf-8")