import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { PageTransition, FadeIn } from '../components/ui/animations';

export default function ResearchInputPage() {
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();

    if (!topic.trim()) return;

    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      //  pass query to next page
      navigate(`/papers?query=${encodeURIComponent(topic)}`);

    }, 1000);
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-3xl mx-auto mt-24">
          <Card>
            <CardBody className="py-16">
              <LoadingSpinner text="Searching for relevant papers..." />
            </CardBody>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">

        <FadeIn>
          <h1 className="text-2xl font-bold text-slate-800">
            Start Research
          </h1>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <CardBody className="p-6">

              <form onSubmit={handleSearch} className="space-y-5">

                <div>
                  <label className="text-sm font-medium">
                    Research Topic
                  </label>

                  <div className="relative">

                    <textarea
                      rows={4}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. AI in healthcare"
                      className="w-full border rounded-lg p-3"
                      required
                    />

                    <Sparkles className="absolute top-3 right-3 w-4 h-4" />

                  </div>
                </div>

                <Button
                  type="submit"
                  icon={Search}
                  size="lg"
                  className="w-full"
                >
                  Search Papers
                </Button>

              </form>

            </CardBody>
          </Card>
        </FadeIn>

        

      </div>
    </PageTransition>
  );
}