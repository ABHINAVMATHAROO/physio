import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

type AppointmentStatus = "booked" | "completed" | "cancelled" | "no_show";

type Appointment = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  patientName: string;
  phone: string;
  reason: string;
};

type ClinicConfig = {
  slotMinutes: number;
  timezone: string;
  workHours: { start: string; end: string };
  breaks?: { start: string; end: string }[];
  maxDaysAhead: number;
};

const getAvailableMinutes = (config: ClinicConfig | null) => {
  if (!config) {
    return 0;
  }
  const workMinutes =
    parseTimeToMinutes(config.workHours.end) - parseTimeToMinutes(config.workHours.start);
  const breakMinutes = (config.breaks ?? []).reduce((total, item) => {
    return total + (parseTimeToMinutes(item.end) - parseTimeToMinutes(item.start));
  }, 0);
  return Math.max(workMinutes - breakMinutes, 0);
};

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
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(today));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [trend, setTrend] = useState<{ date: string; utilizationPercent: number }[]>([]);

  const availableMinutes = useMemo(() => getAvailableMinutes(config), [config]);

  const displayName = useMemo(() => user.email ?? "Doctor", [user.email]);

  const statusCounts = useMemo(() => {
    return appointments.reduce(
      (acc, appointment) => {
        acc.total += 1;
        acc[appointment.status] += 1;
        return acc;
      },
      {
        total: 0,
        booked: 0,
        cancelled: 0,
        no_show: 0,
        completed: 0,
      }
    );
  }, [appointments]);

  const bookedMinutes = useMemo(() => {
    return appointments
      .filter((appointment) =>
        appointment.status === "booked" || appointment.status === "completed"
      )
      .reduce((total, appointment) => {
        const duration =
          parseTimeToMinutes(appointment.endTime) -
          parseTimeToMinutes(appointment.startTime);
        return total + Math.max(duration, 0);
      }, 0);
  }, [appointments]);

  const utilizationPercent = useMemo(() => {
    if (!availableMinutes) {
      return 0;
    }
    return Math.round((bookedMinutes / availableMinutes) * 100);
  }, [availableMinutes, bookedMinutes]);

  const loadConfig = async () => {
    const snapshot = await getDoc(doc(db, "config", "clinic"));
    if (!snapshot.exists()) {
      throw new Error("Clinic configuration not found.");
    }
    setConfig(snapshot.data() as ClinicConfig);
  };

  const loadAppointments = async (dateISO: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const appointmentQuery = query(
        collection(db, "appointments"),
        where("date", "==", dateISO),
        orderBy("startTime")
      );
      const snapshot = await getDocs(appointmentQuery);
      const results = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as Omit<Appointment, "id">;
        return { ...data, id: docSnapshot.id };
      });
      setAppointments(results);
    } catch (err) {
      setError("Unable to load appointments.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrend = async (baseDate: Date, configData: ClinicConfig) => {
    const available = getAvailableMinutes(configData);
    const results: { date: string; utilizationPercent: number }[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const dateISO = formatDate(addDays(baseDate, -offset));
      const appointmentQuery = query(
        collection(db, "appointments"),
        where("date", "==", dateISO)
      );
      const snapshot = await getDocs(appointmentQuery);
      const totalBookedMinutes = snapshot.docs.reduce((total, docSnapshot) => {
        const data = docSnapshot.data() as Appointment;
        if (data.status !== "booked" && data.status !== "completed") {
          return total;
        }
        const duration =
          parseTimeToMinutes(data.endTime) - parseTimeToMinutes(data.startTime);
        return total + Math.max(duration, 0);
      }, 0);

      const utilization = available ? Math.round((totalBookedMinutes / available) * 100) : 0;
      results.push({ date: dateISO, utilizationPercent: utilization });
    }

    setTrend(results);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadConfig();
      } catch (err) {
        setError("Unable to load clinic configuration.");
      }
    };

    void load();
  }, []);

  useEffect(() => {
    void loadAppointments(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!config) {
      return;
    }
    void loadTrend(today, config);
  }, [config, today]);

  const handleStatusUpdate = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      await updateDoc(doc(db, "appointments", appointmentId), {
        status,
        lastUpdatedAt: serverTimestamp(),
      });
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === appointmentId ? { ...appointment, status } : appointment
        )
      );
    } catch (err) {
      setError("Unable to update appointment.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="dash-date">
              Schedule date
            </label>
            <input
              id="dash-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Availability: {availableMinutes} minutes
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Total</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{statusCounts.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Booked</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{statusCounts.booked}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{statusCounts.completed}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Cancelled</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{statusCounts.cancelled}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Utilization</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{utilizationPercent}%</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Appointments</h2>
          {isLoading ? <p className="text-xs text-slate-500">Loading...</p> : null}
        </div>
        <div className="mt-4 space-y-3">
          {appointments.length === 0 && !isLoading ? (
            <p className="text-sm text-slate-500">No appointments scheduled.</p>
          ) : null}
          <div className="hidden grid-cols-12 gap-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase text-slate-500 md:grid">
            <span className="col-span-2">Time</span>
            <span className="col-span-3">Patient</span>
            <span className="col-span-2">Phone</span>
            <span className="col-span-3">Reason</span>
            <span className="col-span-1">Status</span>
            <span className="col-span-1">Actions</span>
          </div>
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700 md:grid-cols-12 md:items-center"
            >
              <div className="md:col-span-2">
                {appointment.startTime} - {appointment.endTime}
              </div>
              <div className="md:col-span-3">
                <p className="font-semibold text-slate-900">{appointment.patientName}</p>
              </div>
              <div className="md:col-span-2">{appointment.phone}</div>
              <div className="md:col-span-3">{appointment.reason || "—"}</div>
              <div className="md:col-span-1">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {appointment.status}
                </span>
              </div>
              <div className="md:col-span-1">
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(appointment.id, "completed")}
                    className="rounded-md border border-emerald-200 px-2 py-1 text-emerald-700 hover:border-emerald-300"
                  >
                    Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(appointment.id, "no_show")}
                    className="rounded-md border border-amber-200 px-2 py-1 text-amber-700 hover:border-amber-300"
                  >
                    No show
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(appointment.id, "cancelled")}
                    className="rounded-md border border-rose-200 px-2 py-1 text-rose-700 hover:border-rose-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">7-day utilization trend</h2>
        <div className="mt-4 space-y-2">
          {trend.length === 0 ? (
            <p className="text-sm text-slate-500">No trend data yet.</p>
          ) : (
            trend.map((item) => (
              <div key={item.date} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{item.date}</span>
                <span className="font-semibold text-slate-900">{item.utilizationPercent}%</span>
              </div>
            ))
          )}
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
