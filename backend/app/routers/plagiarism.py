import logging
from fastapi import APIRouter, HTTPException
from app.schemas import PlagiarismRequest, PlagiarismResponse
from app.services.plagiarism_checker import check_plagiarism

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/check",
    response_model=PlagiarismResponse,
    summary="Check generated text for similarity against source papers",
)
async def check_plagiarism_endpoint(request: PlagiarismRequest) -> PlagiarismResponse:
    try:
        logger.info("Running plagiarism similarity check")
        report = check_plagiarism(request.source_text, request.papers, threshold=request.threshold)
        return PlagiarismResponse(**report)
    except Exception as e:
        logger.error(f"Plagiarism check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Plagiarism check failed: {str(e)}")
