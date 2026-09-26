"""
Full Research Paper Generator Service
=====================================
Generates complete research papers from gap analysis results.
Creates structured academic papers with all standard sections.
"""

import logging
import re
from typing import List, Dict, Any
from app.schemas import PaperRequest, PaperResponse, PaperSection

logger = logging.getLogger(__name__)


def generate_paper(request: PaperRequest) -> PaperResponse:
    """
    Generate a complete research paper from gap analysis data.
    """
    query = _clean_research_topic(request.query)
    themes = request.themes
    limitations = request.limitations
    gaps = request.gaps
    papers = request.papers

    # Generate title
    title = _generate_paper_title(query, gaps)

    # Generate abstract
    abstract = _generate_abstract(query, themes, gaps)

    # Generate sections
    sections = []

    # Introduction
    sections.append(PaperSection(
        title="I. INTRODUCTION",
        content=_generate_introduction(query, themes, gaps)
    ))

    # Literature Review
    sections.append(PaperSection(
        title="II. LITERATURE REVIEW",
        content=_generate_literature_review(themes, limitations, papers)
    ))

    # Methodology
    sections.append(PaperSection(
        title="III. METHODOLOGY",
        content=_generate_methodology_section(themes, gaps)
    ))

    # Analysis and Findings
    sections.append(PaperSection(
        title="IV. ANALYSIS AND FINDINGS",
        content=_generate_analysis_section(gaps, limitations)
    ))

    # Discussion
    sections.append(PaperSection(
        title="V. DISCUSSION",
        content=_generate_discussion_section(gaps, themes)
    ))

    # Conclusion
    sections.append(PaperSection(
        title="VI. CONCLUSION",
        content=_generate_conclusion(query, gaps)
    ))

    # References
    sections.append(PaperSection(
        title="References",
        content=_generate_references(papers)
    ))

    return PaperResponse(
        title=title,
        abstract=abstract,
        sections=sections
    )


def _generate_paper_title(query: str, gaps: List[Dict[str, Any]]) -> str:
    """Create a concise title from the topic, not from a search instruction or gap label."""
    topic = _clean_research_topic(query)
    return f"{topic}: Current Research and Open Challenges"


def _clean_research_topic(query: str) -> str:
    """Remove common prompt wording accidentally included in a user's search query."""
    topic = re.sub(r"\s+", " ", (query or "")).strip().strip('"“”\'` ')
    instruction_prefix = re.compile(
        r"^(?:(?:please\s+)?(?:search|find|review|analyze)\s+for\s+)?"
        r"(?:(?:recent|current)\s+)?(?:academic\s+)?(?:research|literature)\s+"
        r"(?:papers?\s+)?(?:on|about|into)\s+",
        re.IGNORECASE,
    )
    for _ in range(3):
        cleaned = instruction_prefix.sub("", topic).strip()
        if cleaned == topic:
            break
        topic = cleaned

    # Search prompts often append instructions after the actual subject.
    topic = re.split(
        r"(?:[.!?]\s+|\s+)(?:focus on|with a focus on|include|cover|examine|analyze)\b",
        topic,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]
    topic = topic.strip().strip('"“”\'` .,:;')

    # If a prompt nests the topic in quotation marks, prefer the innermost quoted subject.
    quoted_topics = re.findall(r'["“\']([^"”\']{2,100})["”\']', topic)
    if quoted_topics:
        topic = quoted_topics[-1].strip()

    topic = re.sub(r"\s+", " ", topic).strip().strip('"“”\'` .,:;')
    if not topic:
        topic = "Research and Emerging Applications"

    topic = topic[:100].strip()
    titled = topic.title()
    for acronym in ("AI", "NLP", "IoT", "ICT", "COVID-19", "3D"):
        titled = re.sub(rf"\b{re.escape(acronym.title())}\b", acronym, titled)
    return titled


def _generate_abstract(query: str, themes: List[str], gaps: List[Dict[str, Any]]) -> str:
    """Generate paper abstract."""
    theme_text = ", ".join(themes[:2]) if themes else "emerging research areas"

    abstract = f"This paper presents a comprehensive analysis of {query.lower()} within the context of {theme_text}.\n\n"

    if gaps:
        top_gap = gaps[0]
        gap_desc = top_gap.get('description', '')[:100]
        abstract += f"The study addresses the critical gap: {gap_desc}.\n\n"

    abstract += f"Through systematic literature review and analysis of recent publications,\n"
    abstract += f"this research identifies key challenges, proposes novel approaches, and provides\n"
    abstract += f"insights for future research directions.\n\n"
    abstract += f"The findings contribute to the advancement of knowledge in {theme_text}\n"
    abstract += f"and offer practical implications for researchers and practitioners."

    return abstract


def _generate_introduction(query: str, themes: List[str], gaps: List[Dict[str, Any]]) -> str:
    """Generate introduction section."""
    intro = f"The field of {query.lower()} has witnessed significant developments in recent years, " \
            f"particularly within {', '.join(themes[:3]) if themes else 'emerging research domains'}. "

    if gaps:
        intro += f"However, despite these advancements, several critical gaps remain unaddressed. "

        for gap in gaps[:2]:
            gap_title = gap.get('title', '').replace('Underexplored area:', '').strip()
            intro += f"This study focuses on {gap_title.lower()}, "

    intro += f"\n\nThe importance of addressing these challenges cannot be overstated, " \
             f"as they represent fundamental barriers to progress in {query.lower()}. " \
             f"This paper aims to provide a comprehensive analysis of these issues, " \
             f"offering insights and recommendations for future research and practice."

    return intro


def _generate_literature_review(themes: List[str], limitations: List[str], papers: List[Any]) -> str:
    """Generate literature review section."""
    review = f"The literature on {', '.join(themes[:3]) if themes else 'this topic'} reveals " \
             f"a rich landscape of research contributions and ongoing challenges.\n\n"

    if themes:
        for theme in themes[:3]:
            review += f"Research in {theme.lower()} has shown promising results, " \
                     f"with numerous studies demonstrating the potential of various approaches. "

    review += f"\n\nHowever, several limitations persist in the current body of work. "

    if limitations:
        for i, limitation in enumerate(limitations[:3], 1):
            review += f"Firstly, {limitation.lower()}. "
    else:
        review += f"Key challenges include methodological constraints, " \
                 f"limited generalizability, and insufficient validation across diverse contexts."

    review += f"\n\nAnalysis of {len(papers)} recent publications indicates that while " \
             f"significant progress has been made, substantial opportunities remain for " \
             f"further investigation and methodological innovation."

    return review


def _generate_methodology_section(themes: List[str], gaps: List[Dict[str, Any]]) -> str:
    """Generate methodology section."""
    methodology = f"This study employs a comprehensive research methodology designed to address " \
                 f"the identified gaps in {', '.join(themes[:2]) if themes else 'the field'}.\n\n"

    methodology += f"The research design incorporates multiple analytical approaches:\n\n" \
                  f"1. Systematic Literature Review: Comprehensive analysis of peer-reviewed publications\n" \
                  f"2. Thematic Analysis: Identification of recurring patterns and themes\n" \
                  f"3. Gap Analysis: Systematic identification of research opportunities\n" \
                  f"4. Synthesis and Integration: Development of coherent frameworks and recommendations\n\n"

    if gaps:
        methodology += f"The methodology specifically targets the following research gaps:\n"
        for gap in gaps[:3]:
            gap_title = gap.get('title', '').replace('Underexplored area:', '').strip()
            methodology += f"• {gap_title}\n"

    methodology += f"\nData sources include academic databases, conference proceedings, " \
                  f"and peer-reviewed journals, ensuring comprehensive coverage of the field."

    return methodology


def _generate_analysis_section(gaps: List[Dict[str, Any]], limitations: List[str]) -> str:
    """Generate analysis/findings section."""
    analysis = f"The analysis reveals several key findings regarding the current state of research " \
              f"and future directions.\n\n"

    if gaps:
        analysis += f"Gap Analysis Results:\n"
        for i, gap in enumerate(gaps[:3], 1):
            gap_title = gap.get('title', '').replace('Underexplored area:', '').strip()
            priority = gap.get('priority', 'Medium')
            analysis += f"{i}. {gap_title} (Priority: {priority})\n"

    analysis += f"\n\nKey Limitations Identified:\n"
    if limitations:
        for i, limitation in enumerate(limitations[:3], 1):
            analysis += f"{i}. {limitation}\n"
    else:
        analysis += f"1. Methodological constraints in existing studies\n" \
                   f"2. Limited generalizability across different contexts\n" \
                   f"3. Insufficient longitudinal data and validation\n"

    analysis += f"\n\nThese findings highlight the need for innovative approaches and " \
               f"methodological advancements to address the identified challenges."

    return analysis


def _generate_discussion_section(gaps: List[Dict[str, Any]], themes: List[str]) -> str:
    """Generate discussion section."""
    discussion = f"The findings of this study have significant implications for research and practice " \
                f"in {', '.join(themes[:2]) if themes else 'the field'}.\n\n"

    if gaps:
        discussion += f"The identified research gaps represent critical opportunities for advancement. "
        top_gap = gaps[0]
        gap_title = top_gap.get('title', '').replace('Underexplored area:', '').strip()
        discussion += f"Particularly, {gap_title.lower()} emerges as a priority area " \
                     f"requiring immediate attention from the research community.\n\n"

    discussion += f"The implications extend beyond academic research to practical applications. " \
                 f"Addressing these gaps could lead to improved methodologies, " \
                 f"enhanced understanding, and more effective solutions to real-world challenges.\n\n"

    discussion += f"Future research directions should prioritize interdisciplinary approaches, " \
                 f"longitudinal studies, and validation across diverse contexts to ensure " \
                 f"robust and generalizable findings."

    return discussion


def _generate_conclusion(query: str, gaps: List[Dict[str, Any]]) -> str:
    """Generate conclusion section."""
    conclusion = f"In conclusion, this comprehensive analysis of {query.lower()} reveals " \
                f"a field rich with opportunities and challenges.\n\n"

    if gaps:
        conclusion += f"The identified research gaps, particularly in {gaps[0].get('title', '').replace('Underexplored area:', '').strip().lower()}, " \
                     f"represent critical areas requiring further investigation.\n\n"

    conclusion += f"This study contributes to the advancement of knowledge by providing " \
                 f"a systematic analysis of current research, identifying key limitations, " \
                 f"and proposing directions for future work. The findings underscore " \
                 f"the importance of continued research efforts to address the complex " \
                 f"challenges in {query.lower()}.\n\n"

    conclusion += f"By addressing these research gaps, the field can move toward more " \
                 f"comprehensive understanding and more effective practical applications."

    return conclusion


def _generate_references(papers: List[Any]) -> str:
    """Generate references section."""
    if not papers:
        return "References to be added based on specific sources used in the research."

    references = "Key References:\n\n"
    for i, paper in enumerate(papers[:10], 1):
        title = paper.title if hasattr(paper, 'title') else paper.get('title', 'Untitled')
        authors = paper.authors if hasattr(paper, 'authors') else paper.get('authors', ['Unknown'])
        year = paper.year if hasattr(paper, 'year') else paper.get('year', 'N/A')

        author_str = ", ".join(authors[:2]) if isinstance(authors, list) else str(authors)
        if len(authors) > 2:
            author_str += " et al."

        references += f"{i}. {author_str} ({year}). {title}.\n"

    if len(papers) > 10:
        references += f"\n... and {len(papers) - 10} additional sources."

    return references
