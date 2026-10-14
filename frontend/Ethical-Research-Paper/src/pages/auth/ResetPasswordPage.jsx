import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";

export default function ResetPasswordPage() {
  const [token] = useState(
    () => new URLSearchParams(window.location.search).get("token") || "",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.toString());
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) {
      setError(
        "This reset link is missing its token. Please request a new link.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must be no more than 72 UTF-8 bytes.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/v1/auth/password/reset",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, new_password: password }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Could not reset your password. Please request a new link.",
        );
      }
      setComplete(true);
    } catch (resetError) {
      setError(
        resetError.message ||
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
          {complete ? (
            <div className="py-4 text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-800">
                Password updated
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                Your password has been reset successfully.
              </p>
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Continue to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-slate-800">
                  Set a new password
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a new password with at least 8 characters.
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

              {!token ? (
                <div className="space-y-5 text-center">
                  <p className="text-sm text-slate-600">
                    This reset link is missing or has expired.
                  </p>
                  <Link
                    to="/forgot-password"
                    className="font-medium text-primary-600 hover:text-primary-700"
                  >
                    Request a new reset link
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    label="New password"
                    type="password"
                    placeholder="At least 8 characters"
                    icon={Lock}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    required
                  />
                  <Input
                    label="Confirm new password"
                    type="password"
                    placeholder="Enter the password again"
                    icon={Lock}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Passwords are limited to 72 UTF-8 bytes for secure bcrypt
                    hashing.
                  </p>
                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full"
                    size="lg"
                  >
                    Reset Password
                  </Button>
                </form>
              )}

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
