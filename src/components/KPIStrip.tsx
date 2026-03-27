import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { OrganRisk } from '@/lib/health-types';

interface KPIStripProps {
  risks: OrganRisk[];
  onOrganHover?: (organId: string | null) => void;
  hoveredOrgan?: string | null;
}

const ORGAN_ICONS: Record<string, string> = {
  brain: '🧠', heart: '❤️', lungs: '🫁', liver: '🫀', kidneys: '🫘', 'body-fat': '🏋️',
};

function MiniSparkline({ value }: { value: number }) {
  const healthVal = 100 - value;
  const color = healthVal >= 70 ? 'var(--severity-good)' : healthVal >= 40 ? 'var(--severity-warn)' : 'var(--severity-bad)';
  const width = Math.max(8, healthVal);

  return (
    <div className="w-full h-1.5 rounded-full bg-muted/40 overflow-hidden mt-1">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function KPIStrip({ risks, onOrganHover, hoveredOrgan }: KPIStripProps) {
  const avgScore = useMemo(() => {
    const avg = risks.reduce((s, r) => s + r.score, 0) / risks.length;
    return Math.round(100 - avg);
  }, [risks]);

  const overallColor = avgScore >= 70 ? 'text-severity-good' : avgScore >= 40 ? 'text-severity-warn' : 'text-severity-bad';

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <div className="panel-tint min-w-[110px] shrink-0 rounded-[22px] border border-white/60 px-4 py-3 shadow-sm">
        <p className="section-kicker">Overall</p>
        <p className={`font-mono text-2xl font-bold ${overallColor}`}>{avgScore}</p>
        <MiniSparkline value={100 - avgScore} />
      </div>

      {risks.map((risk) => {
        const healthVal = 100 - risk.score;
        const color = healthVal >= 70 ? 'text-severity-good' : healthVal >= 40 ? 'text-severity-warn' : 'text-severity-bad';
        const isHovered = hoveredOrgan === risk.organ;

        return (
          <motion.div
            key={risk.organ}
            onMouseEnter={() => onOrganHover?.(risk.organ)}
            onMouseLeave={() => onOrganHover?.(null)}
            className={`min-w-[110px] shrink-0 cursor-pointer rounded-[22px] border px-4 py-3 transition-all ${
              isHovered
                ? 'border-primary/40 bg-white/80 shadow-lg shadow-primary/10'
                : 'panel-tint border-white/60 hover:border-primary/30'
            }`}
            whileHover={{ y: -2 }}
          >
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-white/75 text-xs shadow-sm">{ORGAN_ICONS[risk.organ]}</span>
              {risk.label}
            </p>
            <p className={`font-mono text-xl font-bold ${color}`}>{healthVal.toFixed(0)}</p>
            <MiniSparkline value={risk.score} />
          </motion.div>
        );
      })}
    </div>
  );
}
