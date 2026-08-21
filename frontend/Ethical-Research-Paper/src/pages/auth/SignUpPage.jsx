import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Building, GraduationCap } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import PasswordStrengthIndicator from "../../components/ui/PasswordStrengthIndicator";

export default function SignUpPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/dashboard";
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "researcher",
    institution: "",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.institution.trim()) errs.institution = "Institution is required";
    if (form.password.length < 6) errs.password = "Minimum 6 characters";
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setApiError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          institution: form.institution,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApiError(data.detail || "Signup failed.");
        return;
      }
      navigate(`/login?next=${encodeURIComponent(next)}`);
    } catch {
      setApiError(
        "Cannot connect to server. Make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardBody className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">
              Create an account
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Start your research journey today
            </p>
          </div>

          {apiError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Full Name"
              placeholder="Jane Doe"
              icon={User}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@university.edu"
              icon={Mail}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
              required
            />

            <Input
              label="Institution"
              placeholder="e.g. MIT, Stanford, IIT"
              icon={Building}
              value={form.institution}
              onChange={(e) =>
                setForm({ ...form, institution: e.target.value })
              }
              error={errors.institution}
              required
            />

            {/* Role selector */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                I am a
              </label>
              <div className="flex gap-3">
                {["researcher", "student"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                      form.role === r
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="Create a password"
                icon={Lock}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
                required
              />
              <PasswordStrengthIndicator password={form.password} />
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              icon={Lock}
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              error={errors.confirmPassword}
              required
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Login
            </Link>
          </p>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
