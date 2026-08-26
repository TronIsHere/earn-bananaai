import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpLeft,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Info,
  Lightbulb,
} from "lucide-react";
import {
  HELP_CATEGORIES,
  type HelpBlock,
  type HelpCalloutTone,
  type HelpGuide,
} from "@/lib/help-guides";
import {
  brandCta,
  brandGlassCard,
  brandGlassCardHover,
  brandIconBg,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

const calloutStyle: Record<
  HelpCalloutTone,
  { wrap: string; icon: typeof Info }
> = {
  tip: {
    wrap: "border-brand/25 bg-brand/8 text-white/80",
    icon: Lightbulb,
  },
  info: {
    wrap: "border-sky-500/25 bg-sky-500/10 text-sky-50/90",
    icon: Info,
  },
  warn: {
    wrap: "border-amber-500/30 bg-amber-500/10 text-amber-50/90",
    icon: AlertTriangle,
  },
};

function Block({ block }: { block: HelpBlock }) {
  if (block.type === "p") {
    return <p className="text-sm leading-relaxed text-white/65">{block.text}</p>;
  }

  if (block.type === "ul") {
    return (
      <ul className="space-y-2 pr-1">
        {block.items.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 text-sm leading-relaxed text-white/65"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "ol") {
    return (
      <ol className="space-y-2.5">
        {block.items.map((item, index) => (
          <li
            key={item}
            className="flex gap-3 text-sm leading-relaxed text-white/65"
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
              {(index + 1).toLocaleString("fa-IR")}
            </span>
            <span className="pt-0.5">{item}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "steps") {
    return (
      <ol className="space-y-3">
        {block.items.map((item, index) => (
          <li
            key={item.title}
            className="rounded-2xl border border-white/8 bg-black/20 p-4"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-ink">
                {(index + 1).toLocaleString("fa-IR")}
              </span>
              <h3 className="font-semibold text-white">{item.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-white/60">{item.text}</p>
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "callout") {
    const meta = calloutStyle[block.tone];
    const Icon = meta.icon;
    return (
      <div className={cn("rounded-2xl border px-4 py-3", meta.wrap)}>
        <div className="flex items-start gap-2.5">
          <Icon className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 space-y-1">
            {block.title && (
              <div className="text-sm font-semibold text-white">{block.title}</div>
            )}
            <p className="text-sm leading-relaxed">{block.text}</p>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "cta") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href={block.href} className={cn(brandCta, "px-4 py-2.5 text-sm")}>
          {block.label}
          <ArrowUpLeft className="size-3.5" />
        </Link>
        {block.hint && (
          <span className="text-xs text-white/40">{block.hint}</span>
        )}
      </div>
    );
  }

  if (block.type === "table") {
    return (
      <div className="overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-md text-right text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/4">
              {block.headers.map((header) => (
                <th
                  key={header}
                  className="px-4 py-2.5 text-xs font-semibold text-white/50"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr
                key={row.join("-")}
                className="border-b border-white/6 last:border-0"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${row[0]}-${cellIndex}`}
                    className={cn(
                      "px-4 py-3 leading-relaxed text-white/65",
                      cellIndex === 0 && "font-medium text-white"
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <HelpFaq items={block.items} />;
}

function HelpFaq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <details
          key={item.q}
          className="group rounded-2xl border border-white/8 bg-black/20 open:border-brand/25"
        >
          <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-white marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="flex items-start justify-between gap-3">
              {item.q}
              <span className="mt-0.5 shrink-0 text-brand transition-transform group-open:rotate-45">
                +
              </span>
            </span>
          </summary>
          <p className="border-t border-white/8 px-4 py-3 text-sm leading-relaxed text-white/60">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}

export function HelpArticle({
  guide,
  related,
}: {
  guide: HelpGuide;
  related: HelpGuide[];
}) {
  const category = HELP_CATEGORIES.find((item) => item.id === guide.category);

  return (
    <article className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-white/40">
        <Link href="/help" className="hover:text-brand">
          راهنما
        </Link>
        <span>/</span>
        <span>{category?.title}</span>
        <span>/</span>
        <span className="text-white/70">{guide.title}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">
            <BookOpen className="size-3.5" />
            {category?.title}
          </span>
          <span className="text-[11px] text-white/40">
            حدود {guide.minutes.toLocaleString("fa-IR")} دقیقه مطالعه
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          {guide.title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-white/55">
          {guide.description}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-8">
          {guide.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 space-y-4"
            >
              <h2 className="text-lg font-bold text-white">{section.title}</h2>
              {section.blocks.map((block, index) => (
                <Block key={`${section.id}-${index}`} block={block} />
              ))}
            </section>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className={cn(brandGlassCard, "p-4")}>
            <div className="mb-3 text-xs font-semibold text-white/45">
              در این راهنما
            </div>
            <nav className="space-y-1.5">
              {guide.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-lg px-2 py-1.5 text-sm text-white/55 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/70">راهنماهای مرتبط</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/help/${item.slug}`}
                className={cn(brandGlassCard, brandGlassCardHover, "p-4")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl",
                      brandIconBg
                    )}
                  >
                    <CircleHelp className="size-4 text-brand" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{item.title}</div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
