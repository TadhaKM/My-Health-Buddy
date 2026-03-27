import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import BodyVisualization3D from '@/components/BodyVisualization3D';
import KPIStrip from '@/components/KPIStrip';
import BodyContextPanel from '@/components/BodyContextPanel';
import HealthProgressBar from '@/components/HealthProgressBar';
import HealthReportPDF from '@/components/HealthReportPDF';
import AppHeader from '@/components/AppHeader';
import HealthDataConnector from '@/components/HealthDataConnector';
import OrganInsightCard from '@/components/OrganInsightCard';
import AISummaryCard from '@/components/AISummaryCard';
import { useHealthState } from '@/hooks/use-health-state';
import { PRESETS, type OrganRisk, type HabitLevel, type Habits } from '@/lib/health-types';
import type { DemoHealthSnapshot } from '@/lib/health-demo-import';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tglfrgxkinkoxbocadum.supabase.co';
const ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbGZyZ3hraW5rb3hib2NhZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MDg4MjEsImV4cCI6MjA5MDE4NDgyMX0.l6qzeNnFKwKt6D1pj6qQvQ4jmPg6f2lZ9WFFGX6ZJck';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

const ICONS: Record<string, string> = {
  brain: '🧠',
  heart: '❤️',
  lungs: '🫁',
  liver: '🫀',
  kidneys: '🫘',
  'body-fat': '🏋️',
};

const PRESET_ACCENTS: Record<string, string> = {
  healthy: 'from-emerald-500/20 to-teal-400/10',
  smoker: 'from-rose-500/20 to-orange-400/10',
  poorSleep: 'from-amber-400/20 to-sky-400/10',
  stressCombo: 'from-fuchsia-500/20 to-yellow-400/10',
};

function DashboardPage() {
  const { habits, setHabits, demographics, years, risks, resetAll } = useHealthState();
  const [selectedOrgan, setSelectedOrgan] = useState<OrganRisk | null>(null);
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleOrganClick = useCallback((organ: OrganRisk) => {
    setSelectedOrgan(organ);
  }, []);

  const handleReset = useCallback(() => {
    resetAll();
    setSelectedOrgan(null);
    setHoveredOrgan(null);
    setChatMessages([]);
    toast.success('All settings reset.');
  }, [resetAll]);

  const applyImportedHealthData = useCallback(
    (nextHabits: Habits, _snapshot: DemoHealthSnapshot) => {
      setHabits(nextHabits);
      toast.success('Health data mapped to lifestyle habits.');
    },
    [setHabits],
  );

  const handleChat = useCallback(
    async (message: string) => {
      setChatMessages((prev) => [...prev, { role: 'user', text: message }]);
      setChatLoading(true);

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-habits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ANON_KEY}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({ message, demographics }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          toast.error(errData.error || 'Something went wrong.');
          setChatLoading(false);
          return;
        }

        const data = await res.json();

        if (data.habits) {
          setHabits({
            smoking: data.habits.smoking as HabitLevel,
            alcohol: data.habits.alcohol as HabitLevel,
            sleep: data.habits.sleep as HabitLevel,
            exercise: data.habits.exercise as HabitLevel,
            diet: data.habits.diet as HabitLevel,
            stress: (data.habits.stress ?? 0) as HabitLevel,
            hydration: (data.habits.hydration ?? 0) as HabitLevel,
          });
        }

        let aiText = data.summary || 'Habits analyzed.';
        if (data.sources?.length > 0) aiText += `\nSources: ${data.sources.join(' · ')}`;
        if (data.bmi_note) aiText += `\n${data.bmi_note}`;
        setChatMessages((prev) => [...prev, { role: 'ai', text: aiText }]);
      } catch (error) {
        console.error('Chat error:', error);
        toast.error('Failed to parse habits. Try again.');
      } finally {
        setChatLoading(false);
      }
    },
    [demographics, setHabits],
  );

  const sendMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    handleChat(chatInput.trim());
    setChatInput('');
  }, [chatInput, handleChat]);

  const topRisks = useMemo(() => [...risks].sort((a, b) => b.score - a.score).slice(0, 3), [risks]);
  const overallScore = useMemo(() => Math.round(100 - risks.reduce((sum, risk) => sum + risk.score, 0) / risks.length), [risks]);
  const headlineRisk = topRisks[0];

  return (
    <div className="dashboard-shell min-h-screen bg-mesh pb-20">
      <AppHeader
        onReset={handleReset}
        extraActions={<HealthReportPDF risks={risks} habits={habits} demographics={demographics} years={years} chatMessages={chatMessages} />}
      />

      <main className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px] space-y-5">
          <section className="panel-tint soft-ring overflow-hidden rounded-[28px] border border-white/50 px-5 py-6 sm:px-7">
            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
              <div className="space-y-4">
                <p className="section-kicker">Preventive Health Twin</p>
                <div className="max-w-3xl space-y-3">
                  <h1 className="font-display text-4xl font-bold leading-none tracking-tight text-foreground sm:text-5xl">
                    <span className="text-gradient">Future You</span> turns habits into a living body forecast.
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                    Explore how daily behavior, blood work, and time pressure different organs. The body model, risk cards, and AI guidance update together so the story stays coherent.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="min-w-[160px] rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
                    <p className="section-kicker">Health Score</p>
                    <div className="mt-1 flex items-end gap-2">
                      <span className="font-mono text-3xl font-bold text-foreground">{overallScore}</span>
                      <span className="pb-1 text-xs text-muted-foreground">live composite</span>
                    </div>
                  </div>
                  <div className="min-w-[220px] rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
                    <p className="section-kicker">Most Pressured Organ</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{headlineRisk?.label ?? 'Stable'}</p>
                        <p className="text-xs text-muted-foreground">Current leading driver in your projection</p>
                      </div>
                      <span className="rounded-full bg-foreground px-3 py-1 font-mono text-xs text-background">{headlineRisk?.score.toFixed(2) ?? '0.00'}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[24px] border border-white/60 bg-white/72 p-4 shadow-sm">
                  <p className="section-kicker">Current Horizon</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-foreground">{years === 0 ? 'Present day' : `+${years} years`}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Shift the timeline to see how your internal systems age under the same behavior pattern.</p>
                </div>
                <div className="rounded-[24px] border border-white/60 bg-white/72 p-4 shadow-sm">
                  <p className="section-kicker">Suggested Use</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Start with a preset, then hover the body.</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">The right column explains what changed, while the AI chat can translate plain-language health descriptions into habit shifts.</p>
                </div>
              </div>
            </div>
          </section>

          <HealthProgressBar risks={risks} demographics={demographics} habits={habits} years={years} />
          <KPIStrip risks={risks} onOrganHover={setHoveredOrgan} hoveredOrgan={hoveredOrgan} />

          <div className="flex flex-wrap items-center gap-2">
            <span className="section-kicker">Quick presets</span>
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => setHabits(preset.habits)}
                className={`rounded-full border border-white/70 bg-gradient-to-br ${PRESET_ACCENTS[key] ?? 'from-white to-white'} px-4 py-2 text-xs font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <section className="lg:col-span-7">
              <div className="panel-tint soft-ring overflow-hidden rounded-[30px] border border-white/60">
                <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
                  <div>
                    <p className="section-kicker mb-1">Interactive Anatomy</p>
                    <h2 className="text-base font-semibold text-foreground">Your Body</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Hover organs for detail, click to lock insights, drag to inspect the anatomy stack.</p>
                  </div>
                  <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-mono text-muted-foreground shadow-sm">
                    {years === 0 ? 'Now' : `+${years}y projection`}
                  </span>
                </div>
                <div className="relative min-h-[540px] lg:min-h-[640px]">
                  <BodyVisualization3D risks={risks} onOrganClick={handleOrganClick} highlightedOrgan={hoveredOrgan} />
                  <BodyContextPanel risks={risks} hoveredOrgan={hoveredOrgan} selectedOrgan={selectedOrgan} />
                </div>
              </div>
            </section>

            <section className="space-y-4 lg:col-span-5">
              <HealthDataConnector habits={habits} onApply={applyImportedHealthData} />

              <div className="panel-tint soft-ring overflow-hidden rounded-[28px] border border-white/60">
                <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
                  <div>
                    <p className="section-kicker mb-1">Live Breakdown</p>
                    <h2 className="text-sm font-semibold text-foreground">Organ Health Breakdown</h2>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{years === 0 ? 'current' : `${years}y projection`}</span>
                </div>
                <div className="divide-y divide-border">
                  {risks.map((risk) => {
                    const healthVal = 100 - risk.score;
                    const isHovered = hoveredOrgan === risk.organ;
                    const barColor = healthVal >= 70 ? 'bg-severity-good' : healthVal >= 40 ? 'bg-severity-warn' : 'bg-severity-bad';
                    const textColor = healthVal >= 70 ? 'text-severity-good' : healthVal >= 40 ? 'text-severity-warn' : 'text-severity-bad';

                    return (
                      <div
                        key={risk.organ}
                        onMouseEnter={() => setHoveredOrgan(risk.organ)}
                        onMouseLeave={() => setHoveredOrgan(null)}
                        onClick={() => handleOrganClick(risk)}
                        className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors ${isHovered ? 'bg-primary/[0.05]' : 'hover:bg-white/45'}`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 text-base shadow-sm">{ICONS[risk.organ]}</span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">{risk.label}</span>
                            <span className={`font-mono text-xs font-bold ${textColor}`}>{healthVal.toFixed(2)}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
                            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${healthVal}%` }} />
                          </div>
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            risk.risk === 'low'
                              ? 'bg-severity-good/10 text-severity-good'
                              : risk.risk === 'moderate'
                                ? 'bg-severity-warn/10 text-severity-warn'
                                : 'bg-severity-bad/10 text-severity-bad'
                          }`}
                        >
                          {risk.risk}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <OrganInsightCard organ={selectedOrgan} />

              <div className="panel-tint soft-ring rounded-[28px] border border-white/60 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Top Risks</h3>
                  <span className="section-kicker">Live</span>
                </div>
                <div className="space-y-2">
                  {topRisks.map((risk) => (
                    <div key={risk.organ} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/65 px-3 py-2.5 text-xs shadow-sm">
                      <span className="flex items-center gap-2 text-foreground">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-muted/55">{ICONS[risk.organ]}</span>
                        {risk.label}
                      </span>
                      <span className="font-mono text-muted-foreground">{risk.score.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-tint soft-ring rounded-[28px] border border-white/60 p-5">
                <div className="mb-3">
                  <p className="section-kicker mb-1">Recommendations</p>
                  <h3 className="text-sm font-semibold text-foreground">Lifestyle Drivers</h3>
                </div>
                <AISummaryCard risks={risks} years={years} />
              </div>
            </section>
          </div>

          {chatMessages.length > 0 && (
            <section className="panel-tint soft-ring overflow-hidden rounded-[28px] border border-white/60">
              <div className="border-b border-border/70 px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">AI Analysis Log</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Chat history and health insights from the AI</p>
              </div>
              <div className="max-h-[400px] space-y-3 overflow-y-auto p-5">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      }`}
                    >
                      {msg.text.split('\n').map((line, j, arr) => (
                        <span key={j}>
                          {line}
                          {j < arr.length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-xl bg-muted px-4 py-2.5 text-sm text-foreground animate-pulse">Analyzing...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </section>
          )}

          <p className="px-2 text-center text-[10px] text-muted-foreground/50">
            Educational tool only. References public-health guidance and is not medical advice.
          </p>
        </div>
      </main>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30">
        <div className="mx-auto max-w-[700px] px-4 pb-5 pointer-events-auto">
          <AnimatePresence mode="wait">
            {chatOpen ? (
              <motion.div
                key="open"
                initial={{ y: 20, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="rainbow-aura rounded-2xl"
              >
                <div className="overflow-hidden rounded-2xl panel-tint">
                  <div className="flex items-center justify-between border-b border-border/50 bg-white/35 px-4 py-2.5">
                    <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                      AI Health Chat
                    </span>
                    <button onClick={() => setChatOpen(false)} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 p-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder='Try: "I smoke daily and sleep 5 hours"'
                      disabled={chatLoading}
                      className="flex-1 bg-transparent px-2 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                      autoFocus
                    />
                    <button
                      onClick={sendMessage}
                      disabled={chatLoading || !chatInput.trim()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all active:scale-95 hover:bg-primary/90 disabled:opacity-30"
                    >
                      {chatLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="closed"
                initial={{ y: 20, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={() => setChatOpen(true)}
                className="w-full rounded-2xl rainbow-aura"
              >
                <div className="flex cursor-pointer items-center gap-3 rounded-2xl panel-tint px-5 py-3.5 transition-colors hover:bg-white/80">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-violet to-brand-pink text-primary-foreground">
                    <MessageSquare className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-sm text-muted-foreground">Describe your habits to the AI...</span>
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
