import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:8000/api/v1/auth/password/forgot",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Could not request a password reset. Please try again.",
        );
      }
      setSent(true);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not connect to the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardBody className="p-8">
          {sent ? (
            <div className="py-4 text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-800">
                Check your email
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                If an account exists for{" "}
                <span className="font-medium text-slate-700">{email}</span>,
                we&apos;ll send a password reset link. The link expires after 30
                minutes.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-slate-800">
                  Forgot password?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your account email and we&apos;ll send a secure reset
                  link.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@university.edu"
                  icon={Mail}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full"
                  size="lg"
                >
                  Send Reset Link
                </Button>
              </form>

              <p className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </p>
            </>
          )}
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
