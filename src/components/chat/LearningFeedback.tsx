import { Badge } from "@/components/ui";

export type LearningFeedbackData = {
  corrections: string[];
  newWords: string[];
};

type LearningFeedbackProps = {
  feedback: LearningFeedbackData;
};

export function LearningFeedback({ feedback }: LearningFeedbackProps) {
  if (feedback.corrections.length === 0 && feedback.newWords.length === 0) {
    return null;
  }

  return (
    <aside className="ml-[3.75rem] mt-3 max-w-[min(42rem,82vw)] rounded-lg border border-brand-accent/20 bg-brand-accent/[0.07] px-4 py-3">
      <h3 className="text-sm font-semibold text-white">Learning notes</h3>
      {feedback.corrections.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
            Corrections
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-200">
            {feedback.corrections.map((correction) => (
              <li key={correction}>{correction}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {feedback.newWords.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
            New words
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {feedback.newWords.map((word) => (
              <Badge key={word} tone="cyan">
                {word}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
