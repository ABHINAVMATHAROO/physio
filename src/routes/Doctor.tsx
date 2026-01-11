import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";

const DoctorLogin = ({
  onSubmit,
  error,
  isLoading,
}: {
  onSubmit: (email: string, password: string) => void;
  error: string | null;
  isLoading: boolean;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSubmit(email, password);
  };

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Doctor login</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sign in to access the doctor dashboard.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="doctor-email">
            Email
          </label>
          <input
            id="doctor-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="doctor@clinic.com"
          />
          {fieldErrors.email ? <p className="text-xs text-rose-600">{fieldErrors.email}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="doctor-password">
            Password
          </label>
          <input
            id="doctor-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="••••••••"
          />
          {fieldErrors.password ? (
            <p className="text-xs text-rose-600">{fieldErrors.password}</p>
          ) : null}
        </div>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
};

const DoctorDashboard = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const displayName = useMemo(() => user.email ?? "Doctor", [user.email]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Doctor dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Welcome back, {displayName}. Manage your schedule and patients here.
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
        >
          Logout
        </button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Next appointment</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">No upcoming bookings</p>
          <p className="mt-1 text-xs text-slate-500">Patient bookings will appear here.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Availability</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">Synced with clinic config</p>
          <p className="mt-1 text-xs text-slate-500">Update hours in Firestore config.</p>
        </div>
      </div>
    </section>
  );
};

const Doctor = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error instanceof Error) {
        setLoginError(error.message);
      } else {
        setLoginError("Unable to sign in. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (isAuthLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Checking authentication...
      </section>
    );
  }

  if (!user) {
    return <DoctorLogin onSubmit={handleLogin} error={loginError} isLoading={isLoggingIn} />;
  }

  return <DoctorDashboard user={user} onLogout={handleLogout} />;
};

export default Doctor;
