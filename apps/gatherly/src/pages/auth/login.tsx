import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Navigate to the page they were trying to access, or /events by default
      const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname ||
        "/events";
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { status: number } };
        if (axiosError.response?.status === 401) {
          setError("Invalid email or password");
        } else {
          setError("An error occurred. Please try again.");
        }
      } else {
        setError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-light px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-level-1 p-8">
          <h1 className="text-[28px] font-bold text-neutral-dark mb-2 text-center leading-[34px]">
            Welcome Back
          </h1>
          <p className="text-neutral-medium mb-8 text-center text-sm leading-[21px]">
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-accent-coral/10 border border-accent-coral/50 rounded-md p-3 text-accent-coral text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-[12px] font-medium text-neutral-medium mb-2 uppercase tracking-tight"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 bg-white border border-neutral-border rounded-md text-neutral-dark text-sm placeholder-neutral-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[12px] font-medium text-neutral-medium mb-2 uppercase tracking-tight"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 bg-white border border-neutral-border rounded-md text-neutral-dark text-sm placeholder-neutral-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-neutral-border disabled:cursor-not-allowed text-white text-base font-semibold rounded-md transition-colors duration-200 shadow-level-1"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-neutral-medium text-sm">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-accent-blue hover:underline font-medium"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
