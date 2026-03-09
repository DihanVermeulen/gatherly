import type { Metadata } from "next";
import { Check, Gift, UtensilsCrossed, Camera } from "lucide-react";
import { ImageCarouselHero } from "@/components/ui/ai-image-generator-hero";

export const metadata: Metadata = {
  title: "Gatherly — Events Made Effortless",
  description:
    "Plan, manage, and enjoy your gatherings without the stress. From intimate dinners to large celebrations.",
};

const features = [
  {
    icon: Gift,
    title: "Gift Exchange",
    description:
      "Organise Secret Santa with automated drawing and built-in wishlists. Set budgets and delivery dates effortlessly.",
    bullets: ["Anonymous matching", "Gifting tracking"],
  },
  {
    icon: UtensilsCrossed,
    title: "Potluck Planner",
    description:
      "Coordinate who brings what so you never have two potato salads again. Real-time lists for appetisers, mains, and drinks.",
    bullets: ["Dietary labels/API", "RSVP food commitments"],
  },
  {
    icon: Camera,
    title: "Photo Gallery",
    description:
      "Collect and share every memory in a private, high-resolution collaborative album. No more texting photos individually.",
    bullets: ["Bulk download/print", "Shared commenting"],
  },
];

const heroImages = [
  {
    id: "1",
    src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=500&fit=crop",
    alt: "Birthday party celebration",
    rotation: -15,
  },
  {
    id: "2",
    src: "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=400&h=500&fit=crop",
    alt: "Rooftop BBQ gathering",
    rotation: -8,
  },
  {
    id: "3",
    src: "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&h=500&fit=crop",
    alt: "Holiday dinner party",
    rotation: 5,
  },
  {
    id: "4",
    src: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&h=500&fit=crop",
    alt: "Friends gathering at a party",
    rotation: 12,
  },
  {
    id: "5",
    src: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=400&h=500&fit=crop",
    alt: "Celebration toast",
    rotation: -12,
  },
  {
    id: "6",
    src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=500&fit=crop",
    alt: "Team dinner event",
    rotation: 8,
  },
  {
    id: "7",
    src: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=500&fit=crop",
    alt: "Wedding reception gathering",
    rotation: -5,
  },
  {
    id: "8",
    src: "https://images.unsplash.com/photo-1470753937643-efeb931202a9?w=400&h=500&fit=crop",
    alt: "Outdoor picnic event",
    rotation: 10,
  },
];

const heroFeatures = [
  {
    title: "Gift Exchange",
    description:
      "Automated Secret Santa matching with built-in wishlists and budget tracking.",
  },
  {
    title: "Potluck Planner",
    description:
      "Coordinate who brings what — no more duplicate potato salads.",
  },
  {
    title: "Photo Gallery",
    description:
      "Collect and share every memory in a private collaborative album.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <ImageCarouselHero
        title="Stop herding cats. Start hosting."
        subtitle="Gatherly replaces the group chat chaos"
        description="Gatherly replaces the group chat chaos, the shared spreadsheet, and the &ldquo;wait, who&rsquo;s bringing dessert?&rdquo; texts — with one simple app your whole group will actually use."
        ctaText="Download Free — iOS & Android"
        images={heroImages}
        features={heroFeatures}
      />

      {/* Feature grid */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for the perfect host
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Our specialised modules make organising specific event types a
              breeze. No more messy spreadsheets or lost group chats.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
                >
                  <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon size={20} className="text-brand-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    {f.description}
                  </p>
                  <ul className="space-y-1.5">
                    {f.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <Check size={14} className="text-brand-500 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mobile CTA section */}
      <section className="bg-brand-800 py-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
          {/* Left — text + store buttons */}
          <div className="flex-1 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              Experience Gatherly on the go
            </h2>
            <p className="text-brand-400 mb-8 leading-relaxed">
              The details are handled. Real-time notifications, quick RSVPs,
              and mobile photo uploads — so you can focus on the people, not
              the logistics. Available now for iOS and Android.
            </p>
            <div className="flex flex-wrap gap-4">
              {/* App Store button */}
              <a
                href="#"
                className="flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-xl transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div>
                  <p className="text-xs opacity-70">Download on the</p>
                  <p className="text-sm font-semibold">App Store</p>
                </div>
              </a>
              {/* Google Play button */}
              <a
                href="#"
                className="flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-xl transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <path d="M3.18 23.76c.37.2.8.22 1.2.06l12.16-7.03-2.66-2.67-10.7 9.64zm-1.14-1.02A1.99 1.99 0 012 21.22V2.78c0-.66.36-1.23.87-1.55L14.12 12 2.04 22.74zM20.98 10.5l-2.63-1.52-2.98 2.97 2.98 2.98 2.65-1.53c.76-.44.76-1.47-.02-1.9zM4.38.18L16.54 7.2 13.88 9.87 3.18.24c.37-.17.82-.17 1.2-.06z" />
                </svg>
                <div>
                  <p className="text-xs opacity-70">Get it on</p>
                  <p className="text-sm font-semibold">Google Play</p>
                </div>
              </a>
            </div>
          </div>

          {/* Right — phone mockup */}
          <div className="flex-1 flex justify-center">
            <div className="w-56 h-96 bg-gray-900 rounded-[2.5rem] border-4 border-gray-700 shadow-2xl overflow-hidden p-3 flex flex-col">
              <div className="text-white text-xs font-semibold mb-3 px-1">
                My Events
              </div>
              {[
                {
                  name: "Anna's Birthday",
                  date: "Tomorrow • 12 guests",
                  color: "bg-brand-500",
                },
                {
                  name: "Team Offsite Dinner",
                  date: "Friday • 8 guests",
                  color: "bg-purple-500",
                },
                {
                  name: "Annual Holiday Bash",
                  date: "Dec 20 • 24 guests",
                  color: "bg-orange-400",
                },
              ].map((ev) => (
                <div
                  key={ev.name}
                  className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 mb-2"
                >
                  <div className={`w-8 h-8 ${ev.color} rounded-lg shrink-0`} />
                  <div>
                    <p className="text-white text-xs font-medium">{ev.name}</p>
                    <p className="text-gray-400 text-xs">{ev.date}</p>
                  </div>
                </div>
              ))}
              <div className="mt-auto flex justify-end">
                <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  +
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
