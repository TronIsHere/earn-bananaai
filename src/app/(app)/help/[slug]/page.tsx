import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpArticle } from "@/components/help-article";
import {
  getHelpGuide,
  helpGuides,
  relatedHelpGuides,
} from "@/lib/help-guides";

export function generateStaticParams() {
  return helpGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getHelpGuide(slug);
  if (!guide) {
    return { title: "راهنما" };
  }
  return {
    title: guide.title,
    description: guide.description,
  };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getHelpGuide(slug);
  if (!guide) notFound();

  return <HelpArticle guide={guide} related={relatedHelpGuides(guide)} />;
}
