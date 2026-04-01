"""
Proposal Generator Service
==========================
Generates structured research proposals from gap analysis results.
"""

import logging
from typing import List, Dict, Any
from app.schemas import ProposalRequest, ProposalResponse

logger = logging.getLogger(__name__)


def generate_proposal(request: ProposalRequest) -> ProposalResponse:
    """
    Generate a complete research proposal from gap analysis data.
    """
    query = request.query
    themes = request.themes
    limitations = request.limitations
    gaps = request.gaps

    # Generate title from top gap or query
    title = _generate_title(query, gaps)

    # Background section
    background = _generate_background(query, themes)

    # Problem statement from top gap
    problem_statement = _generate_problem_statement(gaps)

    # Objectives from gaps
    objectives = _generate_objectives(gaps)

    # Methodology based on themes and papers
    methodology = _generate_methodology(themes, request.papers)

    # Expected contributions
    expected_contributions = _generate_contributions(gaps, themes)

    # Timeline and resources
    timeline = _generate_timeline()
    resources = _generate_resources()

    return ProposalResponse(
        title=title,
        background=background,
        problem_statement=problem_statement,
        objectives=objectives,
        methodology=methodology,
        expected_contributions=expected_contributions,
        timeline=timeline,
        resources=resources
    )


def _generate_title(query: str, gaps: List[Dict[str, Any]]) -> str:
    """Generate proposal title from query and top gap."""
    if gaps:
        top_gap = gaps[0]
        gap_title = top_gap.get('title', '').replace('Underexplored area:', '').strip()
        return f"Addressing {gap_title} in {query.title()}"
    return f"Research Proposal: {query.title()}"


def _generate_background(query: str, themes: List[str]) -> str:
    """Generate background section."""
    theme_text = ", ".join(themes[:3]) if themes else "emerging research areas"
    return f"This research proposal focuses on {query.lower()} within {theme_text}. " \
           f"Recent advancements in these areas have shown significant potential, " \
           f"but several critical gaps remain unaddressed in the current literature."


def _generate_problem_statement(gaps: List[Dict[str, Any]]) -> str:
    """Generate problem statement from top gap."""
    if gaps:
        top_gap = gaps[0]
        description = top_gap.get('description', '')
        return f"The primary research problem addressed in this proposal is: {description}"
    return "The current research landscape lacks comprehensive understanding of key challenges in this domain."


def _generate_objectives(gaps: List[Dict[str, Any]]) -> List[str]:
    """Generate research objectives from gaps."""
    objectives = []
    for i, gap in enumerate(gaps[:3], 1):
        title = gap.get('title', '').replace('Underexplored area:', '').strip()
        objectives.append(f"Objective {i}: Investigate and address {title.lower()}")

    if not objectives:
        objectives = [
            "Objective 1: Conduct comprehensive literature review",
            "Objective 2: Identify key research gaps",
            "Objective 3: Develop novel methodological approaches"
        ]

    return objectives


def _generate_methodology(themes: List[str], papers: List[Any]) -> List[str]:
    """Generate methodology section."""
    steps = [
        "Conduct systematic literature review to synthesize current findings.",
        "Perform qualitative and quantitative analysis of the selected papers.",
        "Validate results with domain expert feedback and peer review.",
    ]

    if themes:
        for theme in themes[:2]:
            steps.append(f"Perform specialized analysis in {theme.lower()}.")

    steps.append(
        f"Leverage data from {len(papers)} publications to ensure broad empirical support."
    )

    return steps


def _generate_contributions(gaps: List[Dict[str, Any]], themes: List[str]) -> List[str]:
    """Generate expected contributions."""
    contributions = [
        "Advance theoretical understanding of key challenges in the field",
        "Provide practical insights for researchers and practitioners",
        "Establish foundation for future research directions"
    ]

    if gaps:
        contributions.append(f"Address critical gap: {gaps[0].get('title', '').lower()}")

    if themes:
        contributions.append(f"Contribute to {themes[0].lower()} research domain")

    return contributions[:4]


def _generate_timeline() -> str:
    """Generate timeline section."""
    return "Month 1-2: Literature review and gap analysis\n" \
           "Month 3-4: Methodology development and data collection\n" \
           "Month 5-6: Analysis and results interpretation\n" \
           "Month 7-8: Writing and peer review\n" \
           "Month 9-10: Final revisions and submission"


def _generate_resources() -> List[str]:
    """Generate resources section."""
    return [
        "Access to academic databases and research libraries",
        "Computing resources for data analysis",
        "Research software tools and statistical packages",
        "Expert consultation and peer review network"
    ]