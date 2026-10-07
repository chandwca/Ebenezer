import type { ReflectionValues } from '@ebenezer/contracts';
import {
  CloudRain,
  Compass,
  Heart,
  Leaf,
  Luggage,
  Moon,
  ShieldAlert,
  Sun,
  Tornado,
  Sprout,
  Waves,
} from 'lucide-react';
import type { FormField } from '@/components/ui/form-builder';

import { passages } from '@/lib/scripture';
export { passages };
export { journeySteps as steps } from '@/lib/journey';
const feelings = [
  ['overwhelmed', Waves],
  ['anxious', Tornado],
  ['lonely', Heart],
  ['sad', CloudRain],
  ['afraid', ShieldAlert],
  ['tired', Moon],
  ['ashamed', Leaf],
  ['homesick', Luggage],
  ['uncertain', Compass],
  ['grateful', Sun],
  ['hopeful', Sprout],
] as const;
export const fields: readonly (readonly FormField<ReflectionValues>[])[] = [
  [
    {
      name: 'feelings',
      type: 'feeling-stones',
      labelKey: 'journal:form.feel',
      choices: feelings.map(([value, icon]) => ({
        value,
        icon,
        labelKey: `journal:feelings.${value}`,
        supportKey: `journal:journey.support.${value}`,
      })),
    },
    {
      name: 'checkIn',
      type: 'heart-space',
      labelKey: 'journal:journey.heartTitle',
      descriptionKey: 'journal:journey.heartDescription',
      placeholderKey: 'journal:journey.wordsPlaceholder',
    },
  ],
  [{ name: 'ref', type: 'text', labelKey: 'journal:form.passage' }],
  (['stood', 'learned', 'questions', 'thoughts', 'prayer'] as const).map((name) => ({
    name,
    type: 'journal-prompt' as const,
    promptKind: name,
    labelKey: `journal:journey.prompts.${name}`,
    placeholderKey: `journal:journey.writing.${name}`,
  })),
  [
    {
      name: 'partner',
      type: 'text',
      labelKey: 'journal:form.partner',
      descriptionKey: 'journal:form.partnerNote',
      disclosureKey: 'journal:journey.invite',
    },
  ],
  [
    {
      name: 'memory',
      type: 'textarea',
      labelKey: 'journal:form.memoryLabel',
      placeholderKey: 'journal:form.memoryPlaceholder',
    },
    {
      name: 'tone',
      type: 'choices',
      labelKey: 'journal:form.tone',
      choices: ['bright', 'mixed', 'hard'].map((value) => ({
        value,
        labelKey: `journal:tones.${value}`,
      })),
    },
  ],
];
