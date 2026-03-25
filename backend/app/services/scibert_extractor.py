"""
SciBERT Extractor
=================
Extracts structured information from paper abstracts using pattern matching
and keyword-based NLP (no heavy model download required for core extraction).

For each paper abstract we extract:
  - methods    : techniques, algorithms, architectures used
  - datasets   : datasets mentioned
  - limitations: weaknesses/constraints stated by authors
  - findings   : key results and contributions

This structured data feeds directly into gap detection.
"""

import re
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

#  Keyword Banks 

METHOD_KEYWORDS = [
    # Deep Learning
    "deep learning", "neural network", "convolutional neural network", "cnn",
    "recurrent neural network", "rnn", "lstm", "gru", "transformer",
    "bert", "gpt", "attention mechanism", "self-attention", "encoder decoder",
    "autoencoder", "variational autoencoder", "vae", "generative adversarial network",
    "gan", "diffusion model", "graph neural network", "gnn",
    # ML General
    "machine learning", "supervised learning", "unsupervised learning",
    "semi-supervised", "self-supervised", "reinforcement learning",
    "transfer learning", "fine-tuning", "pre-training", "few-shot",
    "zero-shot", "meta-learning", "multi-task learning",
    # Classical ML
    "random forest", "support vector machine", "svm", "decision tree",
    "gradient boosting", "xgboost", "logistic regression", "naive bayes",
    "k-nearest neighbor", "knn", "principal component analysis", "pca",
    "clustering", "k-means", "dbscan",
    # Privacy / Federated
    "federated learning", "differential privacy", "secure aggregation",
    "homomorphic encryption", "privacy preserving",
    # NLP
    "natural language processing", "nlp", "text classification",
    "named entity recognition", "ner", "sentiment analysis",
    "machine translation", "question answering", "summarization",
    "language model", "word embedding", "word2vec", "glove",
    # CV
    "object detection", "image segmentation", "semantic segmentation",
    "image classification", "image recognition", "face recognition",
    "pose estimation", "optical flow",
    # Other
    "optimization", "adam", "sgd", "batch normalization", "dropout",
    "data augmentation", "ensemble", "bayesian", "probabilistic",
]

DATASET_KEYWORDS = [
    # CV Datasets
    "imagenet", "cifar", "cifar-10", "cifar-100", "mnist", "fashion-mnist",
    "coco", "pascal voc", "voc", "cityscapes", "ade20k", "celeba",
    "lfw", "wider face",
    # NLP Datasets
    "glue", "superglue", "squad", "newsqa", "commonsense qa",
    "wikipedia", "bookcorpus", "c4", "pile",
    # Medical
    "mimic", "mimic-iii", "chexpert", "nih chest", "brats", "drive",
    "montgomery", "isic", "kaggle",
    # Other
    "amazon", "yelp", "imdb", "sst", "ag news", "dbpedia",
    "kinetics", "ucf101", "hmdb",
    # Generic dataset patterns
    "benchmark", "dataset", "corpus", "database",
]

LIMITATION_PHRASES = [
    "however", "limitation", "limited", "drawback", "weakness",
    "challenge", "difficult", "lack", "lacks", "lacking",
    "does not", "cannot", "fail", "fails", "unable",
    "only", "restricted", "constrained", "assumption",
    "future work", "future research", "remains", "open problem",
    "not explored", "not investigated", "not considered",
    "small dataset", "limited data", "insufficient",
    "computationally expensive", "high complexity", "scalability",
    "overfitting", "underfitting", "generalization",
]

FINDING_PHRASES = [
    "we propose", "we present", "we introduce", "we develop",
    "we show", "we demonstrate", "we achieve", "we improve",
    "outperforms", "state-of-the-art", "sota", "significant improvement",
    "novel", "new approach", "new method", "new framework",
    "our approach", "our method", "our model", "our framework",
    "results show", "experiments show", "evaluation shows",
    "accuracy of", "improvement of", "reduction of",
]


#  Data Structure 

@dataclass
class ExtractedInfo:
    paper_title: str
    methods: list[str] = field(default_factory=list)
    datasets: list[str] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)
    findings: list[str] = field(default_factory=list)
    raw_abstract: str = ""

    def has_content(self) -> bool:
        return bool(self.methods or self.datasets or self.limitations or self.findings)

    def to_dict(self) -> dict:
        return {
            "paper_title": self.paper_title,
            "methods": self.methods,
            "datasets": self.datasets,
            "limitations": self.limitations,
            "findings": self.findings,
        }


#  Extraction Logic 

def _clean_text(text: str) -> str:
    """Lowercase, remove extra whitespace."""
    return re.sub(r"\s+", " ", text.lower().strip())


def _extract_methods(text: str) -> list[str]:
    found = []
    for keyword in METHOD_KEYWORDS:
        pattern = r"\b" + re.escape(keyword) + r"\b"
        if re.search(pattern, text, re.IGNORECASE):
            found.append(keyword)
    return list(dict.fromkeys(found))  # preserve order, remove duplicates


def _extract_datasets(text: str) -> list[str]:
    found = []
    for keyword in DATASET_KEYWORDS:
        pattern = r"\b" + re.escape(keyword) + r"\b"
        if re.search(pattern, text, re.IGNORECASE):
            found.append(keyword)
    return list(dict.fromkeys(found))


def _extract_limitation_sentences(text: str) -> list[str]:
    """
    Split abstract into sentences and return those containing limitation phrases.
    Returns the actual sentence text (truncated to 200 chars for readability).
    """
    sentences = re.split(r"(?<=[.!?])\s+", text)
    limitation_sentences = []

    for sentence in sentences:
        sentence_lower = sentence.lower()
        for phrase in LIMITATION_PHRASES:
            if phrase in sentence_lower:
                truncated = sentence.strip()[:200]
                if truncated not in limitation_sentences:
                    limitation_sentences.append(truncated)
                break

    return limitation_sentences[:5]  # cap at 5 most relevant


def _extract_finding_sentences(text: str) -> list[str]:
    """Return sentences that describe contributions or results."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    finding_sentences = []

    for sentence in sentences:
        sentence_lower = sentence.lower()
        for phrase in FINDING_PHRASES:
            if phrase in sentence_lower:
                truncated = sentence.strip()[:200]
                if truncated not in finding_sentences:
                    finding_sentences.append(truncated)
                break

    return finding_sentences[:5]


#  Public API 

def extract_info(title: str, abstract: str) -> ExtractedInfo:
    """
    Extract structured information from a single paper's title + abstract.
    Returns an ExtractedInfo object.
    """
    if not abstract:
        return ExtractedInfo(paper_title=title)

    clean = _clean_text(abstract)

    info = ExtractedInfo(
        paper_title=title,
        methods=_extract_methods(clean),
        datasets=_extract_datasets(clean),
        limitations=_extract_limitation_sentences(abstract),
        findings=_extract_finding_sentences(abstract),
        raw_abstract=abstract,
    )

    return info


def extract_all(papers: list[dict]) -> list[ExtractedInfo]:
    """
    Extract info from a list of paper dicts.
    Each dict must have 'title' and 'abstract' keys.
    Papers without abstracts are skipped.
    """
    results = []
    skipped = 0

    for paper in papers:
        title = paper.get("title", "Unknown")
        abstract = paper.get("abstract", "")

        if not abstract or len(abstract.strip()) < 50:
            skipped += 1
            continue

        info = extract_info(title, abstract)
        results.append(info)

    logger.info(f"Extraction complete: {len(results)} processed, {skipped} skipped")
    return results