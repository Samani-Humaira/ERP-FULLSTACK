import { FileCode, Download, Save } from 'lucide-react';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '../components/ui/animations';

const proposal = {
  title:
    'A Unified Framework for Cross-Domain Fairness Evaluation in Healthcare AI Systems',
  problemStatement:
    'Current fairness evaluation methods for AI in healthcare are fragmented across individual studies, each using different metrics, datasets, and definitions of fairness. This inconsistency makes it impossible to compare results across domains or establish reliable benchmarks. There is an urgent need for a standardized, cross-domain framework that enables systematic evaluation of fairness in AI-assisted clinical decision-making, addressing the gap between theoretical fairness definitions and practical clinical requirements.',
  methodology: [
    'Conduct a systematic literature review to catalog existing fairness metrics, evaluation criteria, and benchmark datasets used in healthcare AI research.',
    'Develop a taxonomy of fairness definitions applicable to different clinical domains (diagnostics, treatment recommendation, resource allocation).',
    'Design a modular evaluation framework that supports pluggable fairness metrics and domain-specific evaluation protocols.',
    'Implement the framework as an open-source toolkit with standardized APIs for integration with existing ML pipelines.',
    'Validate the framework through case studies across three clinical domains: radiology diagnosis, patient triage, and drug interaction prediction.',
    'Conduct expert evaluation with clinicians and AI ethicists to assess the practical utility and coverage of the framework.',
  ],
  expectedContribution: [
    'A comprehensive taxonomy mapping fairness definitions to clinical application domains.',
    'An open-source, modular fairness evaluation framework for healthcare AI systems.',
    'Standardized benchmark datasets and evaluation protocols for cross-domain fairness comparison.',
    'Empirical evidence demonstrating the framework\'s effectiveness across multiple clinical use cases.',
    'Guidelines for practitioners on selecting appropriate fairness metrics for specific healthcare applications.',
  ],
};

export default function ProposalPage() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Research Proposal
              </h1>
              <p className="text-slate-500 mt-1">
                AI-generated proposal based on identified research gaps
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={FileCode} size="sm">
                Export as LaTeX
              </Button>
              <Button variant="secondary" icon={Download} size="sm">
                Download PDF
              </Button>
              <Button icon={Save} size="sm">
                Save Project
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Proposed Title */}
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Proposed Title
              </h2>
            </CardHeader>
            <CardBody>
              <h3 className="text-xl font-bold text-slate-800 leading-relaxed">
                {proposal.title}
              </h3>
            </CardBody>
          </Card>
        </FadeIn>

        {/* Problem Statement */}
        <FadeIn delay={0.15}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Problem Statement
              </h2>
            </CardHeader>
            <CardBody>
              <p className="text-slate-700 leading-relaxed">
                {proposal.problemStatement}
              </p>
            </CardBody>
          </Card>
        </FadeIn>

        {/* Proposed Methodology */}
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Proposed Methodology
              </h2>
            </CardHeader>
            <CardBody>
              <StaggerContainer className="space-y-3">
                {proposal.methodology.map((step, i) => (
                  <StaggerItem key={i}>
                    <li className="flex items-start gap-3 list-none">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-700 leading-relaxed">{step}</p>
                    </li>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </CardBody>
          </Card>
        </FadeIn>

        {/* Expected Contribution */}
        <FadeIn delay={0.25}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Expected Contribution
              </h2>
            </CardHeader>
            <CardBody>
              <StaggerContainer className="space-y-3">
                {proposal.expectedContribution.map((item, i) => (
                  <StaggerItem key={i}>
                    <li className="flex items-start gap-3 list-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
                      <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
                    </li>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </CardBody>
          </Card>
        </FadeIn>

        {/* Bottom Actions */}
        <FadeIn delay={0.3}>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="secondary" icon={FileCode}>
              Export as LaTeX
            </Button>
            <Button variant="secondary" icon={Download}>
              Download PDF
            </Button>
            <Button icon={Save}>Save Project</Button>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
