import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Folder } from "lucide-react";
import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "../components/ui/animations";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Not authenticated. Please login first.");
          setLoading(false);
          return;
        }

        const res = await fetch("http://localhost:8000/api/v1/projects", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to fetch projects.");
        }

        const data = await res.json();
        setProjects(data.projects || data || []);
      } catch (err) {
        setError(err.message || "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading)
    return (
      <PageTransition>
        <LoadingSpinner text="Loading your projects..." />
      </PageTransition>
    );

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Your Projects</h1>
              <p className="text-slate-500 mt-1">
                Browse and manage your saved papers and proposals
              </p>
            </div>
            <div>
              <Button icon={Folder} onClick={() => navigate("/research")}>
                New Research
              </Button>
            </div>
          </div>
        </FadeIn>

        {error && (
          <FadeIn>
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
              {error}
            </div>
          </FadeIn>
        )}

        {projects.length === 0 ? (
          <FadeIn>
            <Card>
              <CardBody>
                <p className="text-sm text-slate-500">No saved projects yet.</p>
              </CardBody>
            </Card>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-4">
            {projects.map((p) => (
              <StaggerItem key={p.id}>
                <Card>
                  <CardBody className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{p.title}</h3>
                      <p className="text-sm text-slate-500">{p.description}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(p.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(`/projects/${p.id}`, {
                            state: { project: p },
                          })
                        }
                      >
                        View
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  );
}
