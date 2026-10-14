import { Reveal } from "@/components/animations/reveal";
import { cn } from "@/lib/utils/cn";

export function SectionHeading({ title, body, className, align = "start", id }) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <h2 id={id} className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
        {title}
      </h2>
      {body && <p className="mt-4 text-lg text-ink-muted">{body}</p>}
    </Reveal>
  );
}
