from typing import List
from app.schemas import PaperResponse, PaperSection
from jinja2 import Template

IEEE_TEMPLATE = r"""
\documentclass[conference]{IEEEtran}
\IEEEoverridecommandlockouts
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}
\usepackage{hyperref}

\title{\vspace{-1cm}\Huge\bfseries
{{ title }}
\vspace{0.5cm}}

\author{\IEEEauthorblockN{AI Research Assistant\textsuperscript{*} }
\IEEEauthorblockA{\textit{Department of Computer Science} \\
\textit{University of Technology}\\
ai-research@example.com}}

\begin{document}

\maketitle

\begin{abstract}
{{ abstract }}
\end{abstract}

\begin{IEEEkeywords}
artificial intelligence, research paper generation, academic publishing
\end{IEEEkeywords}

{{ sections }}

\bibliographystyle{IEEEtran}
\bibliography{references}

\end{document}
"""

def paper_to_ieee_latex(paper: PaperResponse) -> str:
    """
    Convert generated paper to IEEE LaTeX format.
    """
    sections_latex = ""
    for section in paper.sections:
        sections_latex += f"\\section{{{section.title}}}\\n\\n{section.content}\\n\\n"
    
    template = Template(IEEE_TEMPLATE)
    latex_content = template.render(
        title=paper.title,
        abstract=paper.abstract,
        sections=sections_latex
    )
    return latex_content
