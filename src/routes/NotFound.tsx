import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page you are looking for does not exist. Head back to booking.
      </p>
      <Link
        to="/book"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Go to Book
      </Link>
    </section>
  );
};

export default NotFound;
