import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await register(email, password, name);
      // After successful registration, user is automatically logged in
      navigate("/events", { replace: true });
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { status: number } };
        if (axiosError.response?.status === 409) {
          setError("An account with this email already exists");
        } else {
          setError("An error occurred. Please try again.");
        }
      } else {
        setError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-light px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-level-1 p-8">
          <h1 className="text-[28px] font-bold text-neutral-dark mb-2 text-center leading-[34px]">
            Create Account
          </h1>
          <p className="text-neutral-medium mb-8 text-center text-sm leading-[21px]">
            Join Gatherly to manage your events
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-accent-coral/10 border border-accent-coral/50 rounded-md p-3 text-accent-coral text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-[12px] font-medium text-neutral-medium mb-2 uppercase tracking-tight"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 bg-white border border-neutral-border rounded-md text-neutral-dark text-sm placeholder-neutral-medium focus:outline-none focus:ring-2 focus:ring-primary-0/10 focus:border-primary transition-all"
                placeholder="Your full name"
              />
            </div>

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
                className="w-full h-12 px-4 bg-white border border-neutral-border rounded-md text-neutral-dark text-sm placeholder-neutral-medium focus:outline-none focus:ring-2 focus:ring-primary-0/10 focus:border-primary transition-all"
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
                className="w-full h-12 px-4 bg-white border border-neutral-border rounded-md text-neutral-dark text-sm placeholder-neutral-medium focus:outline-none focus:ring-2 focus:ring-primary-0/10 focus:border-primary transition-all"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-[12px] font-medium text-neutral-medium mb-2 uppercase tracking-tight"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-4 bg-white border border-neutral-border rounded-md text-neutral-dark text-sm placeholder-neutral-medium focus:outline-none focus:ring-2 focus:ring-primary-0/10 focus:border-primary transition-all"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-neutral-border disabled:cursor-not-allowed text-white text-base font-semibold rounded-md transition-colors duration-200 shadow-level-1"
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-neutral-medium text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-accent-blue hover:underline font-medium"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
