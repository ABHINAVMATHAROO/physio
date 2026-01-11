import { NavLink, Outlet } from "react-router-dom";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-md px-4 py-2 text-sm font-medium transition",
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-200 hover:text-slate-900",
  ].join(" ");

const RootLayout = () => {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">Physio</p>
            <p className="text-xs text-slate-500">Book appointments and find doctors</p>
          </div>
          <nav className="flex gap-2">
            <NavLink to="/book" className={navLinkClass}>
              Book
            </NavLink>
            <NavLink to="/doctor" className={navLinkClass}>
              Doctor
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
};

export default RootLayout;
