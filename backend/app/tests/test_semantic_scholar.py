import pytest

from app.clients import fetch_semantic_scholar


@pytest.mark.asyncio
async def test_semantic_scholar():

    results = await fetch_semantic_scholar(
        "generative artificial intelligence education",
        limit=10,
        year_from=2024,
        year_to=2026,
    )

    assert isinstance(results, list)

    print(f"\nSemantic Scholar returned: {len(results)} papers")

    for paper in results[:3]:
        print(paper.title)