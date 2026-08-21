import re
from typing import Any
from app.schemas import PaperResult


def _normalize_text(text: str) -> str:
    return re.sub(r"[^a-z0-9\s]", " ", text.lower()).strip()


def _tokenize(text: str) -> list[str]:
    tokens = re.findall(r"\w+", text.lower())
    return [token for token in tokens if len(token) > 1]


def _jaccard_similarity(a: list[str], b: list[str]) -> float:
    set_a = set(a)
    set_b = set(b)
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def _shingles(text: str, size: int = 3) -> set[str]:
    tokens = _tokenize(text)
    if len(tokens) < size:
        return set()
    return {" ".join(tokens[i : i + size]) for i in range(len(tokens) - size + 1)}


def _similarity_score(source_text: str, target_text: str) -> float:
    source_tokens = _tokenize(source_text)
    target_tokens = _tokenize(target_text)

    if not source_tokens or not target_tokens:
        return 0.0

    unigram_score = _jaccard_similarity(source_tokens, target_tokens)
    shingle_source = _shingles(source_text)
    shingle_target = _shingles(target_text)
    shingle_score = _jaccard_similarity(list(shingle_source), list(shingle_target))

    return round((unigram_score * 0.7 + shingle_score * 0.3), 4)


def _paper_to_text(paper: Any) -> str:
    title = getattr(paper, "title", None) or paper.get("title", "")
    abstract = getattr(paper, "abstract", None) or paper.get("abstract", "")
    return f"{title}. {abstract}".strip()


def check_plagiarism(source_text: str, papers: list[PaperResult], threshold: float = 0.25) -> dict:
    """Check text against source papers and return similarity matches."""
    normalized_source = _normalize_text(source_text)

    matches = []
    for index, paper in enumerate(papers):
        target_text = _paper_to_text(paper)
        score = _similarity_score(normalized_source, target_text)

        matches.append(
            {
                "paper_index": index,
                "title": getattr(paper, "title", None) or paper.get("title", "Untitled"),
                "source": getattr(paper, "source", None) or paper.get("source", "unknown"),
                "url": getattr(paper, "url", None) or paper.get("url", ""),
                "similarity": score,
                "snippet": target_text[:180].strip() + ("..." if len(target_text) > 180 else ""),
            }
        )

    matches.sort(key=lambda item: item["similarity"], reverse=True)
    top_score = matches[0]["similarity"] if matches else 0.0

    return {
        "flagged": top_score >= threshold,
        "max_similarity": top_score,
        "threshold": threshold,
        "matches": matches[:5],
    }
