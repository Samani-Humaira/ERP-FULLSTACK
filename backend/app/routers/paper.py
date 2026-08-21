import logging
from fastapi import APIRouter, HTTPException

from app.schemas import PaperRequest, PaperResponse
from app.services.paper_generator import generate_paper

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/generate",
    response_model=PaperResponse,
    summary="Generate full research paper from gap analysis",
)
async def generate_research_paper(request: PaperRequest) -> PaperResponse:
    """
    Generate a complete research paper based on gap analysis results.

    Takes the output from /search and /analyze endpoints and creates:
      - Full academic paper with abstract, introduction, literature review
      - Methodology, analysis, discussion, conclusion, references

    Usage flow:
      1. POST /api/v1/search → get papers
      2. POST /api/v1/analyze → get gaps/themes/limitations
      3. POST /api/v1/paper/generate → get full research paper
    """
    try:
        logger.info(f"Generating research paper for: '{request.query}'")

        if len(request.papers) < 3:
            raise HTTPException(
                status_code=400,
                detail="Need at least 3 papers for meaningful paper generation."
            )

        if not request.gaps:
            raise HTTPException(
                status_code=400,
                detail="Gap analysis results required. Run /analyze first."
            )

        paper = generate_paper(request)

        logger.info(f"Research paper generated successfully: '{paper.title}'")
        return paper

    except Exception as e:
        logger.error(f"Paper generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Paper generation failed: {str(e)}"
        )



