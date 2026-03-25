import { useState, useEffect } from 'react';
import { Mail, User, Building, BookOpen, Save } from 'lucide-react';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { PageTransition, FadeIn } from '../components/ui/animations';

export default function ProfilePage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    institution: '',
    department: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState('');

  // Load user from localStorage on mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setForm({
      name: user.full_name || '',
      email: user.email || '',
      institution: user.institution || '',
      department: '',   // not in backend yet, local only for now
    });
  }, []);

  // Initials for avatar
  const initials = form.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setApiError('');

    try {
      const token = localStorage.getItem('token');

      // Call update profile endpoint
      const res = await fetch('http://localhost:8000/api/v1/auth/me/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: form.name,
          institution: form.institution,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.detail || 'Failed to save changes.');
        return;
      }

      // Update localStorage with new info
      localStorage.setItem('user', JSON.stringify(data));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

    } catch {
      setApiError('Cannot connect to server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        <FadeIn>
          <h1 className="text-2xl font-bold text-slate-800">Profile</h1>
          <p className="text-slate-500 mt-1">Manage your account information</p>
        </FadeIn>

        {/* Avatar Card */}
        <FadeIn delay={0.1}>
          <Card>
            <CardBody className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <span className="text-2xl font-bold text-white">{initials}</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{form.name}</h2>
                <p className="text-sm text-slate-500">{form.email}</p>
                <p className="text-sm text-slate-400">{form.institution}</p>
              </div>
            </CardBody>
          </Card>
        </FadeIn>

        {/* Form */}
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-800">Personal Information</h2>
            </CardHeader>
            <CardBody>

              {apiError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-5">
                <Input
                  label="Full Name"
                  icon={User}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />

                {/* Email is read-only — changing email needs verification flow */}
                <Input
                  label="Email"
                  type="email"
                  icon={Mail}
                  value={form.email}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 -mt-3">
                  Email cannot be changed here.
                </p>

                <Input
                  label="Institution"
                  icon={Building}
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                />

                {/* <Input
                  label="Department"
                  icon={BookOpen}
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                /> */}

                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" icon={Save} loading={saving}>
                    Save Changes
                  </Button>
                  {saved && (
                    <span className="text-sm text-emerald-600 font-medium animate-pulse">
                      Changes saved!
                    </span>
                  )}
                </div>
              </form>
            </CardBody>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}