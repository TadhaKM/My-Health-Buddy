import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Habits } from '@/lib/health-types';
import {
  DEFAULT_DEMO_HEALTH_SNAPSHOT,
  generateDemoGoogleFitSnapshot,
  mapHealthSnapshotToHabits,
  mapSleepHoursToSleepLevel,
  mapStepsToExerciseLevel,
  normalizeDemoHealthSnapshot,
  type DemoHealthSnapshot,
} from '@/lib/health-demo-import';

interface HealthDataConnectorProps {
  habits: Habits;
  onApply: (nextHabits: Habits, snapshot: DemoHealthSnapshot) => void;
}

const SLEEP_LABELS = ['8h', '6h', '5h'] as const;
const EXERCISE_LABELS = ['regular', 'low', 'none'] as const;

export default function HealthDataConnector({ habits, onApply }: HealthDataConnectorProps) {
  const [snapshot, setSnapshot] = useState<DemoHealthSnapshot>(DEFAULT_DEMO_HEALTH_SNAPSHOT);
  const [isConnecting, setIsConnecting] = useState(false);

  const mappedLevels = useMemo(() => {
    const normalized = normalizeDemoHealthSnapshot(snapshot);
    return {
      sleep: mapSleepHoursToSleepLevel(normalized.sleepHours),
      exercise: mapStepsToExerciseLevel(normalized.stepsPerDay, normalized.activityMinutes),
    };
  }, [snapshot]);

  const applySnapshot = (input: DemoHealthSnapshot) => {
    const normalized = normalizeDemoHealthSnapshot(input);
    setSnapshot(normalized);
    onApply(mapHealthSnapshotToHabits(habits, normalized), normalized);
  };

  const connectDemoGoogleFit = async () => {
    setIsConnecting(true);

    await new Promise((resolve) => setTimeout(resolve, 900));

    const imported = generateDemoGoogleFitSnapshot();
    applySnapshot(imported);
    setIsConnecting(false);
    toast.success('Google Fit demo data imported.');
  };

  return (
    <div className="card-elevated rounded-2xl p-5 space-y-4" id="health-data-demo">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Connect Health Data</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Demo mode: import steps, sleep, and activity, then auto-map to your model.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-primary/25 bg-primary/8 text-primary font-semibold">
          Demo
        </span>
      </div>

      <Button
        variant="glow"
        size="sm"
        onClick={connectDemoGoogleFit}
        disabled={isConnecting}
        className="w-full h-9"
      >
        {isConnecting ? 'Connecting Google Fit...' : 'Connect Google Fit (Demo)'}
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Steps/day</span>
          <Input
            type="number"
            value={snapshot.stepsPerDay}
            min={0}
            max={40000}
            onChange={(e) => setSnapshot((prev) => ({ ...prev, stepsPerDay: Number(e.target.value || 0) }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Sleep (hours)</span>
          <Input
            type="number"
            value={snapshot.sleepHours}
            step={0.1}
            min={0}
            max={16}
            onChange={(e) => setSnapshot((prev) => ({ ...prev, sleepHours: Number(e.target.value || 0) }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Activity (min)</span>
          <Input
            type="number"
            value={snapshot.activityMinutes}
            min={0}
            max={300}
            onChange={(e) => setSnapshot((prev) => ({ ...prev, activityMinutes: Number(e.target.value || 0) }))}
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs">
        <span className="text-muted-foreground">Mapped output</span>
        <span className="text-foreground font-medium">
          exercise: {EXERCISE_LABELS[mappedLevels.exercise]} | sleep: {SLEEP_LABELS[mappedLevels.sleep]}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          applySnapshot(snapshot);
          toast.success('Manual health snapshot applied.');
        }}
        className="w-full h-9"
      >
        Apply Manual Snapshot
      </Button>
    </div>
  );
}
