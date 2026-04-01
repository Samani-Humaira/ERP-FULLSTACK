import logging
from fastapi import APIRouter, HTTPException

from app.schemas import ProposalRequest, ProposalResponse
from app.services.proposal_generator import generate_proposal

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/generate",
    response_model=ProposalResponse,
    summary="Generate research proposal from gap analysis",
)
async def generate_research_proposal(request: ProposalRequest) -> ProposalResponse:
    """
    Generate a complete research proposal based on gap analysis results.

    Takes the output from /search and /analyze endpoints and creates:
      - Structured proposal with title, background, objectives
      - Methodology, expected contributions, timeline, resources

    Usage flow:
      1. POST /api/v1/search → get papers
      2. POST /api/v1/analyze → get gaps/themes/limitations
      3. POST /api/v1/proposal/generate → get full proposal
    """
    try:
        logger.info(f"Generating proposal for: '{request.query}'")

        if len(request.papers) < 3:
            raise HTTPException(
                status_code=400,
                detail="Need at least 3 papers for meaningful proposal generation."
            )

        if not request.gaps:
            raise HTTPException(
                status_code=400,
                detail="Gap analysis results required. Run /analyze first."
            )

        proposal = generate_proposal(request)

        logger.info(f"Proposal generated successfully: '{proposal.title}'")
        return proposal

    except Exception as e:
        logger.error(f"Proposal generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Proposal generation failed: {str(e)}"
        )