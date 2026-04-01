import logging
from fastapi import APIRouter, HTTPException

from app.schemas import AutoGenerateRequest, AutoGenerateResponse
from app.services.auto_generate import auto_generate_paper

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/auto-generate",
    response_model=AutoGenerateResponse,
    summary="Automatically generate research paper from topic",
)
async def auto_generate_research_paper(request: AutoGenerateRequest) -> AutoGenerateResponse:
    """
    Complete automated research paper generation workflow.

    This endpoint combines all phases:
      1. Search for relevant papers on the topic
      2. Analyze gaps in the literature
      3. Generate a full research paper addressing unexplored gaps

    Just provide a research topic and get a complete paper!

    Parameters:
      - query: Your research topic
      - top_n: Number of papers to analyze (5-50)
      - year_from: Start year for paper search (default: 2020)
      - year_to: End year for paper search (optional)
    """
    try:
        logger.info(f"Auto-generating research paper for topic: '{request.query}'")

        result = await auto_generate_paper(request)

        logger.info(f"Successfully auto-generated paper: '{result.generated_paper.title}'")
        return result

    except ValueError as e:
        logger.error(f"Validation error in auto-generation: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Auto-generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Auto-generation failed: {str(e)}"
        )