import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  FolderOpen,
  BarChart3,
  GitCompareArrows,
  ClipboardPen,
  ArrowRight,
} from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
  AnimatedCounter,
} from '../components/ui/animations';
import { getDashboard } from '../api/activity';

// Map activity type from API to icon + label
const ACTIVITY_META = {
  search:       { icon: Search,      label: 'Research Search' },
  gap_analysis: { icon: BarChart3,   label: 'Gap Analysis'    },
  proposal:     { icon: ClipboardPen, label: 'Proposal'       },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function DashboardPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName = user?.full_name?.split(' ')[0] || 'Researcher';

  const [stats, setStats] = useState({
    total_searches: 0,
    gaps_identified: 0,
    proposals_generated: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getDashboard();
        setStats(data.stats);
        setRecentActivity(data.recent_activity);
      } catch (err) {
        console.error('Dashboard fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const statCards = [
    {
      label: 'Total Searches',
      value: stats.total_searches,
      icon: Search,
      color: 'bg-primary-100 text-primary-600',
    },
    {
      label: 'Gaps Identified',
      value: stats.gaps_identified,
      icon: GitCompareArrows,
      color: 'bg-amber-100 text-amber-600',
    },
    {
      label: 'Proposals Generated',
      value: stats.proposals_generated,
      icon: ClipboardPen,
      color: 'bg-emerald-100 text-emerald-600',
    },
  ];

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Welcome */}
        <FadeIn>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Continue your research or start something new.
          </p>
        </FadeIn>

        {/* Quick Actions */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StaggerItem>
            <Link to="/research">
              <Card hover className="h-full">
                <CardBody className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200/50 rounded-xl">
                    <Search className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">Start New Research</h3>
                    <p className="text-sm text-slate-500">Search papers and explore topics</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </CardBody>
              </Card>
            </Link>
          </StaggerItem>

          <StaggerItem>
            <Link to="/papers">
              <Card hover className="h-full">
                <CardBody className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-violet-100 to-violet-200/50 rounded-xl">
                    <FolderOpen className="h-6 w-6 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">View Previous Projects</h3>
                    <p className="text-sm text-slate-500">Browse your saved papers and results</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </CardBody>
              </Card>
            </Link>
          </StaggerItem>
        </StaggerContainer>

        {/* Stats */}
        <FadeIn delay={0.2}>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Your Activity</h2>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4" staggerDelay={0.1}>
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <StaggerItem key={label}>
                <Card>
                  <CardBody className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">
                        {loading ? '—' : <AnimatedCounter target={value} />}
                      </p>
                      <p className="text-sm text-slate-500">{label}</p>
                    </div>
                  </CardBody>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </FadeIn>

        {/* Recent Activity */}
        <FadeIn delay={0.35}>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
                {/* <Button variant="ghost" size="sm">View All</Button> */}
              </div>

              {loading ? (
                <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  No activity yet. Start by searching a research topic!
                </p>
              ) : (
                <StaggerContainer className="space-y-3" staggerDelay={0.06}>
                  {recentActivity.map((item) => {
                    const meta = ACTIVITY_META[item.type] || {
                      icon: Search,
                      label: item.type,
                    };
                    const Icon = meta.icon;
                    return (
                      <StaggerItem key={item.id}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <Icon className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-400">{meta.label}</p>
                          </div>
                          <span className="text-xs text-slate-400 shrink-0">
                            {timeAgo(item.created_at)}
                          </span>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              )}
            </CardBody>
          </Card>
        </FadeIn>

      </div>
    </PageTransition>
  );
}