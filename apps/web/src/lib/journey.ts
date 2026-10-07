export const journeySteps = ['feel', 'read', 'reflect', 'together', 'stone'] as const;

// Keep the original draft positions so existing journals and older open tabs remain compatible.
// Both the former Find (1) and Read (2) now reopen at the single Scripture moment.
const draftPositions = [0, 1, 3, 4, 5];

export function restoreJourneyStep(draftStep: number) {
  const step = Math.min(5, Math.max(0, draftStep));
  return step <= 2 ? Math.min(step, 1) : step - 1;
}

export function persistedJourneyStep(moment: number) {
  return draftPositions[moment];
}
