import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reflectionSchema, type ReflectionValues } from '@ebenezer/contracts';

/** Older journals have one feeling; keep that selection when opening them. */
export function useReflectionForm(values: ReflectionValues) {
  const form = useForm<ReflectionValues>({
    resolver: zodResolver(reflectionSchema),
    defaultValues: {
      ...values,
      feelings: values.feelings ?? (values.feel ? [values.feel] : []),
      checkIn: values.checkIn ?? '',
    },
  });
  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (name === 'feelings') form.setValue('feel', values.feelings?.[0] ?? '');
      if (name === 'ref' && values.scripture && values.ref !== values.scripture.reference)
        form.setValue('scripture', undefined);
    });
    return () => subscription.unsubscribe();
  }, [form]);
  return form;
}
