const testimonials = [
  {
    id: 1,
    video: "/videos/testimonials/testimonee%201.mp4",
    name: "Sophia Martinez",
    title: "Real Estate Developer",
    location: "Miami, USA",
    amount: "$175,000",
    quote: "The VIP plan daily yield outperforms traditional REITs by 10x while maintaining top-grade cold storage safety.",
  },
  {
    id: 2,
    video: "/videos/testimonials/testimonee%202.mp4",
    name: "Sophia Lee",
    title: "Hedge Fund Analyst",
    location: "London, UK",
    amount: "$120,000",
    quote: "The multi-asset arbitrage engine delivers consistent returns even during market volatility. Truly institutional grade.",
  },
  {
    id: 3,
    video: "/videos/testimonials/testimonee%203.mp4",
    name: "Elena Rostova",
    title: "Senior Tech Strategist",
    location: "Dubai, UAE",
    amount: "$50,000",
    quote: "Explore a unified investment dashboard for digital assets and other markets.",
  },
  {
    id: 4,
    video: "/videos/testimonials/testimonee%204.mp4",
    name: "ava chen",
    title: "Commodities Trader",
    location: "Singapore",
    amount: "$45,000",
    quote: "Combining Oil, Forex, and crypto trading under one unified dashboard is a game-changer for my portfolio.",
  },
  {
    id: 5,
    video: "/videos/testimonials/testimonee%205.mp4",
    name: "ibrahim al-hassan",
    title: "Investor",
    location: "Dubai, UAE",
    amount: "$50,000",
    quote: "Watch this investor video to hear their experience.",
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="relative overflow-hidden border-y border-white/10 bg-[#050914] px-4 py-20 sm:px-6 lg:px-12 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute left-[12%] top-[15%] h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_18px_5px_rgba(56,189,248,0.35)]" />
        <div className="absolute right-[14%] top-[42%] h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_18px_5px_rgba(167,139,250,0.35)]" />
        <div className="absolute bottom-[12%] left-[35%] h-1 w-1 rounded-full bg-sky-400 shadow-[0_0_16px_4px_rgba(56,189,248,0.35)]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <span className="inline-flex rounded-full border border-sky-400/25 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-400">
            Investor Stories
          </span>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Real Stories.{" "}
            <span className="text-sky-400">Personal Experiences.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
            Watch our investor video features and learn about individual experiences.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-[24px] border border-slate-700/70 bg-[#0e172b] shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition duration-300 hover:-translate-y-1 hover:border-sky-400/40"
            >
              <div className="relative aspect-video overflow-hidden bg-black">
                <video
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={`Investor video ${item.id}`}
                >
                  <source src={item.video} type="video/mp4" />
                  Your browser does not support HTML video.
                </video>

                {item.amount && (
                  <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-emerald-400/20 bg-[#07101f]/95 px-3 py-1.5 text-xs font-bold text-emerald-400 shadow-lg sm:text-sm">
                    {item.amount} Invested
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <div
                  className="mb-3 flex gap-1 text-xl leading-none text-amber-400"
                  aria-label="Five stars"
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index} aria-hidden="true">★</span>
                  ))}
                </div>

                <blockquote className="text-sm italic leading-6 text-slate-300 sm:text-base sm:leading-7">
                  “{item.quote}”
                </blockquote>

                <div className="my-4 border-t border-white/10" />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-bold text-white sm:text-lg">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      {item.title}
                    </p>
                  </div>

                  {item.location && (
                    <p className="shrink-0 pt-1 text-right text-xs leading-5 text-sky-400 sm:text-sm">
                      {item.location}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-9 max-w-3xl text-center text-xs leading-6 text-slate-500">
          Investment involves risk, including possible loss of capital. Past
          performance and individual experiences do not guarantee future results.
          Verify testimonials and investment details before publication.
        </p>
      </div>
    </section>
  );
}
