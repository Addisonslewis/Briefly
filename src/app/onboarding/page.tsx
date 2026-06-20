"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [ignoredTopics, setIgnoredTopics] = useState<string[]>([]);
  const [signalDescription, setSignalDescription] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [ignoredInput, setIgnoredInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadPreferences() {
      const res = await fetch("/api/preferences");
      if (res.ok) {
        const data = await res.json();
        setEmail(data.email || "");
        setKeywords(data.keywords || []);
        setIgnoredTopics(data.ignoredTopics || []);
        setSignalDescription(data.signalDescription || "");
      }
      setLoaded(true);
    }
    loadPreferences();
  }, []);

  function addKeyword() {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput("");
    }
  }

  function removeKeyword(keyword: string) {
    setKeywords(keywords.filter((k) => k !== keyword));
  }

  function addIgnored() {
    const trimmed = ignoredInput.trim();
    if (trimmed && !ignoredTopics.includes(trimmed)) {
      setIgnoredTopics([...ignoredTopics, trimmed]);
      setIgnoredInput("");
    }
  }

  function removeIgnored(topic: string) {
    setIgnoredTopics(ignoredTopics.filter((t) => t !== topic));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, keywords, ignoredTopics, signalDescription }),
      });

      if (response.ok) {
        router.push("/dashboard");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-100 via-blue-100 to-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main id="main-content" className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-100 to-white px-4 py-12">
      <div className="mx-auto w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome to Briefly
            {session?.user?.name ? `, ${session.user.name}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Tell us what you care about so we can curate your perfect daily
            digest.
          </p>
        </div>

        {/* Delivery Email */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Delivery Email</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Where should we send your daily digest?
            </p>
          </div>
          <input
            type="email"
            placeholder="you@example.com"
            aria-label="Delivery email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Signal Description */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Your Signal</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Describe what kind of content you want to see in your digest.
            </p>
          </div>
          <textarea
            placeholder="e.g., I care about AI infrastructure, Series A funding news, and developer tooling. I want to know about new product launches from major tech companies and emerging startups."
            aria-label="Signal description"
            value={signalDescription}
            onChange={(e) => setSignalDescription(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
          />
        </div>

        {/* Keywords */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Keywords</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Topics and terms you want to track.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Add a keyword..."
              aria-label="Add a keyword"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            <button
              onClick={addKeyword}
              className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-white"
            >
              Add
            </button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove keyword ${keyword}`}
                  onClick={() => removeKeyword(keyword)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); removeKeyword(keyword); } }}
                >
                  {keyword} &times;
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Noise Filter */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Noise Filter</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Topics you want to ignore completely.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              placeholder="e.g., hustle culture, crypto scams..."
              aria-label="Add an ignored topic"
              value={ignoredInput}
              onChange={(e) => setIgnoredInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addIgnored()}
              className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            <button
              onClick={addIgnored}
              className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-destructive hover:text-white"
            >
              Add
            </button>
          </div>
          {ignoredTopics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ignoredTopics.map((topic) => (
                <Badge
                  key={topic}
                  variant="destructive"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ignored topic ${topic}`}
                  onClick={() => removeIgnored(topic)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); removeIgnored(topic); } }}
                >
                  {topic} &times;
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? "Saving..." : "Save & Go to Dashboard"}
        </button>
      </div>
    </main>
  );
}
