import { CirclePlus, LockOpen } from "lucide-react";
import { useNavigate } from "react-router";

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-12">
      {/* Hero Section */}
      <div className="text-center py-16 md:py-24 mb-12">
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
          Events Made <span className="text-primary">Simple</span>
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Create and manage your gatherly events with ease. Add participants,
          manage couples, and generate secret codes - all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/events")}
            className="bg-primary-0 hover:opacity-90 text-on-primary-0 px-10 py-5 rounded-2xl text-lg font-bold transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate("/decipher")}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-10 py-5 rounded-2xl text-lg font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">
              <LockOpen />
            </span>
            Decipher Code
          </button>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 hover:shadow-xl transition-all group">
          <div className="size-16 rounded-2xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
            🎄
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
            Create Events
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Set up multiple gatherly events for different groups - family,
            friends, coworkers, and more.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 hover:shadow-xl transition-all group">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
            💑
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
            Manage Couples
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Mark couples and choose whether they can buy gifts for each other.
            Perfect for family events!
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 hover:shadow-xl transition-all group">
          <div className="size-16 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
            🔐
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
            Secret Codes
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Generate unique, encrypted codes for each participant. Share them
            easily and keep the surprise alive!
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
