import * as React from 'react';
import { Controller, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { ChoiceGroup } from './choice-group';
import { FeelingStones } from './feeling-stones';
import { HeartSpace } from './heart-space';
import { JournalPrompt, type JournalPromptKind } from './journal-prompt';
import { Input, Textarea } from './input';
import { Checkbox } from './checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

type Choice = {
  value: string;
  labelKey: string;
  symbol?: string;
  icon?: LucideIcon;
  supportKey?: string;
};

function PromptDisclosure({
  label,
  initialOpen,
  invalid,
  children,
}: {
  label: string;
  initialOpen: boolean;
  invalid: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(initialOpen);
  React.useEffect(() => {
    if (invalid) setOpen(true);
  }, [invalid]);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="border-b border-border/70 py-4"
    >
      <summary className="cursor-pointer text-sm font-medium text-teal">{label}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export type FormField<T extends FieldValues> = {
  name: Path<T>;
  labelKey: string;
  /** Already-written text, such as an AI question, shown instead of `labelKey`. */
  label?: string;
  placeholderKey?: string;
  descriptionKey?: string;
  disclosureKey?: string;
  promptKind?: JournalPromptKind;
} & (
  | {
      type:
        | 'text'
        | 'email'
        | 'password'
        | 'time'
        | 'textarea'
        | 'checkbox'
        | 'heart-space'
        | 'journal-prompt';
    }
  | { type: 'select' | 'choices' | 'passage-cards' | 'feeling-stones'; choices: readonly Choice[] }
);

function FieldRenderer<T extends FieldValues>({
  definition,
  form,
}: {
  definition: FormField<T>;
  form: UseFormReturn<T>;
}) {
  const { t } = useTranslation(['common', 'journal', 'errors']);
  const id = React.useId();
  return (
    <Controller
      control={form.control}
      name={definition.name}
      render={({ field, fieldState }) => {
        const describedBy =
          [
            definition.descriptionKey ? `${id}-hint` : undefined,
            fieldState.error ? `${id}-error` : undefined,
          ]
            .filter(Boolean)
            .join(' ') || undefined;
        const shared = {
          id,
          'aria-invalid': !!fieldState.error,
          'aria-describedby': describedBy,
        };
        const text = {
          ...shared,
          name: field.name,
          ref: field.ref,
          onBlur: field.onBlur,
          value: String(field.value ?? ''),
          onChange: field.onChange,
          placeholder: definition.placeholderKey ? t(definition.placeholderKey) : undefined,
        };
        const content = (
          <div
            className={definition.type === 'journal-prompt' ? 'grid h-full gap-2' : 'grid gap-2'}
          >
            {!['heart-space', 'journal-prompt'].includes(definition.type) && (
              <label
                id={`${id}-label`}
                htmlFor={
                  ['choices', 'passage-cards', 'feeling-stones'].includes(definition.type)
                    ? undefined
                    : id
                }
                className={
                  definition.type === 'feeling-stones'
                    ? 'sr-only'
                    : 'flex items-center gap-3 text-sm font-semibold'
                }
              >
                {definition.type === 'checkbox' && (
                  <Checkbox
                    {...shared}
                    name={field.name}
                    ref={field.ref}
                    checked={!!field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    onBlur={field.onBlur}
                  />
                )}
                {definition.label ?? t(definition.labelKey)}
              </label>
            )}
            {definition.type === 'heart-space' ? (
              <HeartSpace
                {...text}
                title={definition.label ?? t(definition.labelKey)}
                description={definition.descriptionKey ? t(definition.descriptionKey) : ''}
                descriptionId={`${id}-hint`}
                onWrite={field.onChange}
                starters={['joy', 'heavy', 'unsure'].map((key) => ({
                  label: t(`journal:journey.starters.${key}.label`),
                  text: t(`journal:journey.starters.${key}.text`),
                }))}
              />
            ) : definition.type === 'journal-prompt' ? (
              <JournalPrompt
                {...text}
                prompt={definition.label ?? t(definition.labelKey)}
                kind={definition.promptKind}
              />
            ) : definition.type === 'feeling-stones' ? (
              <FeelingStones
                labelId={`${id}-label`}
                name={field.name}
                value={Array.isArray(field.value) ? field.value : []}
                choices={definition.choices.map((choice) => ({
                  value: choice.value,
                  label: t(choice.labelKey),
                  icon: choice.icon,
                  support: choice.supportKey ? t(choice.supportKey) : undefined,
                }))}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                invalid={!!fieldState.error}
                describedBy={describedBy}
                selectionNote={t('journal:journey.selectionNote')}
                mixedNote={t('journal:journey.mixedNote')}
              />
            ) : definition.type === 'choices' || definition.type === 'passage-cards' ? (
              <ChoiceGroup
                id={id}
                labelId={`${id}-label`}
                name={field.name}
                value={String(field.value ?? '')}
                choices={definition.choices.map((choice) => ({
                  value: choice.value,
                  label: t(choice.labelKey),
                  symbol: choice.symbol,
                }))}
                layout={definition.type === 'passage-cards' ? 'stack' : 'grid'}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                invalid={!!fieldState.error}
                describedBy={describedBy}
              />
            ) : definition.type === 'textarea' ? (
              <Textarea {...text} />
            ) : definition.type === 'select' ? (
              <Select value={String(field.value ?? '')} onValueChange={field.onChange}>
                <SelectTrigger {...shared} ref={field.ref} onBlur={field.onBlur}>
                  <SelectValue placeholder={t('journal:form.choose')} />
                </SelectTrigger>
                <SelectContent>
                  {definition.choices.map((choice) => (
                    <SelectItem key={choice.value} value={choice.value}>
                      {t(choice.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              definition.type !== 'checkbox' && <Input {...text} type={definition.type} />
            )}
            {definition.descriptionKey && definition.type !== 'heart-space' && (
              <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                {t(definition.descriptionKey)}
              </p>
            )}
            {fieldState.error && (
              <p
                id={`${id}-error`}
                role={fieldState.error ? 'alert' : undefined}
                className="text-sm text-destructive"
              >
                {t(fieldState.error.message ?? 'errors:required')}
              </p>
            )}
          </div>
        );
        return definition.disclosureKey ? (
          <PromptDisclosure
            label={t(definition.disclosureKey)}
            initialOpen={!!field.value}
            invalid={!!fieldState.error}
          >
            {content}
          </PromptDisclosure>
        ) : (
          content
        );
      }}
    />
  );
}

export function FormBuilder<T extends FieldValues>({
  form,
  fields,
  onSubmit,
  onContinue,
  before,
  children,
}: {
  form: UseFormReturn<T>;
  fields: readonly FormField<T>[];
  /** Content placed above a named field, e.g. Scripture between two questions. */
  before?: Partial<Record<Path<T>, React.ReactNode>>;
  onSubmit: (values: T) => void | Promise<void>;
  onContinue?: () => void | Promise<void>;
  children?: React.ReactNode;
}) {
  const journalLayout =
    fields.length > 0 && fields.every((field) => field.type === 'journal-prompt');
  return (
    <form
      noValidate
      onSubmit={
        onContinue
          ? (event) => {
              event.preventDefault();
              void onContinue();
            }
          : form.handleSubmit(onSubmit)
      }
      className="grid w-full gap-5"
    >
      <div className={journalLayout ? 'grid gap-4 md:grid-cols-2' : 'grid gap-5'}>
        {fields.map((field) => (
          <React.Fragment key={field.name}>
            {before?.[field.name]}
            <div
              className={
                journalLayout && field.promptKind === 'stood' ? 'min-w-0 md:col-span-2' : 'min-w-0'
              }
            >
              <FieldRenderer definition={field} form={form} />
            </div>
          </React.Fragment>
        ))}
      </div>
      {children}
    </form>
  );
}
