import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { PersonSearchResult } from '@ebenezer/contracts';
import { Input } from '@/components/ui/input';
import { PersonList, PersonRow } from '@/components/ui/person-row';
import { SectionCard } from '@/components/ui/section-card';
import type { CommunityApi } from './community-api';

/** Find people on Ebenezer by handle; the caller decides the action for each result. */
export function PeopleSearch({
  api,
  label,
  action,
  refreshKey,
}: {
  api: CommunityApi;
  label: string;
  action: (person: PersonSearchResult) => React.ReactNode;
  /** Change to re-run the current search after an action. */
  refreshKey?: unknown;
}) {
  const { t } = useTranslation('community');
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<PersonSearchResult[]>();
  React.useEffect(() => {
    const term = query.trim().replace(/^@/, '');
    if (term.length < 2) return setResults(undefined);
    const controller = new AbortController();
    // Wait for a pause in typing before asking the server.
    const timer = setTimeout(() => {
      api
        .search(term, controller.signal)
        .then((people) => !controller.signal.aborted && setResults(people))
        .catch(() => !controller.signal.aborted && setResults([]));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, query, refreshKey]);
  return (
    <SectionCard title={label} description={t('search.hint')}>
      <Input
        aria-label={label}
        type="search"
        value={query}
        maxLength={31}
        placeholder={t('search.placeholder')}
        onChange={(event) => setQuery(event.target.value)}
      />
      {results && (
        <PersonList empty={t('search.none')}>
          {results.map((person) => (
            <PersonRow key={person.id} name={person.displayName} detail={`@${person.handle}`}>
              {action(person)}
            </PersonRow>
          ))}
        </PersonList>
      )}
    </SectionCard>
  );
}
