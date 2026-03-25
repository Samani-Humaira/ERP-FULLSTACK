import logging
import re
from collections import Counter
from fastapi import APIRouter, HTTPException

from app.gap_schemas import (
    GapAnalysisRequest, GapAnalysisResponse,
    ResearchTheme, ExtractedLimitation, IdentifiedGap,
    PaperExtraction, GapAnalysisSummary,
    GapType, GapPriority,
)
from app.services.scibert_extractor import extract_all
from app.services.embedder import embed_papers
from app.services.gap_detector import detect_gaps

logger = logging.getLogger(__name__)


#  Helper functions 

def _confidence_to_priority(confidence: float) -> GapPriority:
    """Convert numeric confidence score to High / Medium / Low badge."""
    if confidence >= 0.75:
        return GapPriority.HIGH
    elif confidence >= 0.5:
        return GapPriority.MEDIUM
    return GapPriority.LOW


def _build_source_label(paper: dict) -> str:
    """Build 'Author et al., YEAR' label from paper dict."""
    authors = paper.get("authors") or []
    year = paper.get("year", "")

    if authors:
        first_author = authors[0]
        parts = first_author.strip().split()
        last_name = parts[-1] if parts else first_author
        if len(authors) > 1:
            return f"{last_name} et al., {year}"
        return f"{last_name}, {year}"

    return f"Unknown, {year}"


def _extract_themes(extracted_infos: list) -> list[ResearchTheme]:
    """Build theme pills from the most common methods across all papers."""
    theme_map = {
        "federated learning": "Federated Learning",
        "differential privacy": "Privacy-Preserving Machine Learning",
        "deep learning": "Deep Learning Applications",
        "machine learning": "Machine Learning in Healthcare",
        "transformer": "Transformer-Based Models",
        "bert": "BERT & Language Models",
        "convolutional neural network": "Convolutional Neural Networks",
        "cnn": "Convolutional Neural Networks",
        "natural language processing": "Natural Language Processing",
        "nlp": "Natural Language Processing",
        "generative adversarial network": "Generative Models",
        "gan": "Generative Models",
        "reinforcement learning": "Reinforcement Learning",
        "transfer learning": "Transfer Learning",
        "explainability": "Explainability in Clinical Decision Support",
        "interpretability": "Explainability in Clinical Decision Support",
        "bias": "Bias & Fairness in AI Systems",
        "fairness": "Bias & Fairness in AI Systems",
        "privacy": "Privacy-Preserving Machine Learning",
        "graph neural network": "Graph Neural Networks",
        "object detection": "Computer Vision",
        "image segmentation": "Medical Image Analysis",
        "clustering": "Unsupervised Learning Methods",
        "random forest": "Ensemble Methods",
        "support vector machine": "Classical ML Methods",
    }

    method_counter: Counter = Counter()
    for info in extracted_infos:
        for method in info.methods:
            method_counter[method] += 1

    seen_labels: set[str] = set()
    themes: list[ResearchTheme] = []

    for method, _ in method_counter.most_common(20):
        label = theme_map.get(method.lower())
        if label and label not in seen_labels:
            seen_labels.add(label)
            themes.append(ResearchTheme(label=label))

    # Fallback — use raw method names if not enough themes found
    if len(themes) < 3:
        for method, _ in method_counter.most_common(5):
            label = method.title()
            if label not in seen_labels:
                seen_labels.add(label)
                themes.append(ResearchTheme(label=label))

    return themes[:6]


def _extract_frontend_limitations(
    extracted_infos: list,
    paper_dicts: list[dict],
) -> list[ExtractedLimitation]:
    """Pick the most meaningful limitation from each paper with its source label."""
    limitations: list[ExtractedLimitation] = []

    for info, paper in zip(extracted_infos, paper_dicts):
        if not info.limitations:
            continue

        best = info.limitations[0].strip()

        # Clean leading "however,"
        best = re.sub(r"^however[,\s]+", "", best, flags=re.IGNORECASE)
        best = best[0].upper() + best[1:] if best else best

        source = _build_source_label(paper)

        limitations.append(ExtractedLimitation(text=best, source=source))

    return limitations[:6]


def _build_gap_title(raw_title: str) -> str:
    """Convert internal gap title to clean human-readable UI title."""
    cleaned = re.sub(
        r"^(Underexplored area|Recurring unsolved limitation|Untested combination|Outdated research):\s*",
        "",
        raw_title,
        flags=re.IGNORECASE,
    )
    return cleaned.strip().title()


#  Router 

router = APIRouter()


@router.post(
    "/analyze",
    response_model=GapAnalysisResponse,
    summary="Detect research gaps from retrieved papers",
)
async def analyze_gaps(request: GapAnalysisRequest) -> GapAnalysisResponse:
    """
    Phase 2 — Gap Analysis.

    Takes papers from POST /search and returns:
      - themes       → common research theme pills
      - limitations  → extracted limitation sentences with sources
      - gaps         → identified research gaps with High/Medium/Low priority
      - papers_used  → full paper list for future use

    Correct flow:
      Step 1 → POST /api/v1/search   { "query": "...", "top_n": 20 }
      Step 2 → POST /api/v1/analyze  { "query": "...", "papers": [...] }
    """
    query = request.query.strip()
    papers = request.papers

    if len(papers) < 3:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 3 papers. Got {len(papers)}. Run /search first.",
        )

    logger.info(f"[Phase2] Analyzing {len(papers)} papers for: '{query}'")

    # Convert PaperResult → dicts for internal services
    paper_dicts: list[dict] = [
        {
            "title": p.title,
            "abstract": p.abstract,
            "year": p.year,
            "authors": p.authors,
            "citation_count": p.citation_count,
            "source": p.source,
        }
        for p in papers
    ]

    #  Step 1: Extract structured info 
    logger.info("[Phase2] Extracting methods, datasets, limitations...")
    extracted_infos = extract_all(paper_dicts)

    if not extracted_infos:
        raise HTTPException(
            status_code=400,
            detail="No usable abstracts found in provided papers.",
        )

    #  Step 2: Embed abstracts with Sentence-BERT 
    logger.info("[Phase2] Embedding with Sentence-BERT...")
    try:
        embedded_papers = embed_papers(paper_dicts)
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Run: pip install sentence-transformers",
        )

    if not embedded_papers:
        raise HTTPException(
            status_code=500,
            detail="Embedding failed. Ensure all papers have valid abstracts.",
        )

    #  Steps 3–4: Detect gaps 
    logger.info("[Phase2] Detecting gaps...")
    try:
        raw_gaps = detect_gaps(embedded_papers, extracted_infos, paper_dicts)
    except Exception as e:
        logger.error(f"Gap detection error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Gap detection failed: {str(e)}",
        )

    #  Build frontend-ready response 

    themes = _extract_themes(extracted_infos)

    frontend_limitations = _extract_frontend_limitations(extracted_infos, paper_dicts)

    gap_cards: list[IdentifiedGap] = [
        IdentifiedGap(
            title=_build_gap_title(gap.title),
            description=gap.description,
            priority=_confidence_to_priority(gap.confidence),
            gap_type=GapType(gap.gap_type),
            confidence=gap.confidence,
            evidence=gap.evidence,
        )
        for gap in raw_gaps
    ]

    paper_extractions: list[PaperExtraction] = [
        PaperExtraction(
            title=info.paper_title,
            methods=info.methods,
            datasets=info.datasets,
            limitations=info.limitations,
            findings=info.findings,
        )
        for info in extracted_infos
    ]

    gap_type_counts = Counter(g.gap_type for g in raw_gaps)
    gap_summary = GapAnalysisSummary(
        total_papers_analysed=len(papers),
        total_gaps_found=len(raw_gaps),
        unexplored_area_gaps=gap_type_counts.get("unexplored_area", 0),
        limitation_gaps=gap_type_counts.get("limitation", 0),
        dataset_gaps=gap_type_counts.get("dataset", 0),
        recency_gaps=gap_type_counts.get("recency", 0),
    )

    logger.info(
        f"[Phase2] Done. {len(gap_cards)} gaps, "
        f"{len(themes)} themes, {len(frontend_limitations)} limitations."
    )

    return GapAnalysisResponse(
        query=query,
        themes=themes,
        limitations=frontend_limitations,
        gaps=gap_cards,
        paper_extractions=paper_extractions,
        gap_summary=gap_summary,
        papers_used=papers,
    )