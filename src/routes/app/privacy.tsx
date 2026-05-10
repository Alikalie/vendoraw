import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/app/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  const nav = useNavigate();
  const [content, setContent] = useState<{ title: string; body: string } | null>(null);
  useEffect(() => {
    supabase
      .from("site_content" as never)
      .select("title,body")
      .eq("id", "privacy")
      .maybeSingle()
      .then(({ data }) => setContent(data as { title: string; body: string } | null));
  }, []);
  return (
    <div className="px-5 pt-6 pb-8">
      <button
        onClick={() => nav({ to: "/app/profile" })}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="mt-5 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">{content?.title ?? "Privacy & Terms"}</h1>
      </div>
      <article className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {content?.body ?? "Loading…"}
      </article>
    </div>
  );
}
