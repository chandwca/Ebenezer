import * as React from 'react';
import { Button } from './button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
export function WizardActions({
  back,
  next,
  save,
  onBack,
  onNext,
  final,
  disabled,
  nextDisabled = false,
}: {
  back: string;
  next: string;
  save: string;
  onBack: () => void;
  onNext: () => void;
  final: boolean;
  disabled: boolean;
  nextDisabled?: boolean;
}) {
  return (
    <div className="sticky bottom-20 z-10 -mx-2 flex items-center justify-between gap-3 bg-background/95 px-2 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:mt-2 sm:border-t sm:border-border/70 sm:bg-transparent sm:px-0 sm:pt-6 sm:backdrop-blur-none">
      <Button variant="ghost" size="sm" onClick={onBack} disabled={disabled}>
        <ArrowLeft aria-hidden="true" />
        {back}
      </Button>
      {final ? (
        <Button
          variant="gold"
          type="submit"
          disabled={disabled}
          className="shadow-[0_8px_20px_-10px_var(--gold)]"
        >
          {save}
        </Button>
      ) : (
        <Button
          variant="gold"
          onClick={onNext}
          disabled={disabled || nextDisabled}
          className="shadow-[0_8px_20px_-10px_var(--gold)]"
        >
          {next}
          <ArrowRight aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
