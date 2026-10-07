import * as React from 'react';
import { Brand } from './app-shell';
import { LanguageSelect } from './language-select';

export function WordCardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Brand />
        <LanguageSelect id="word-language" />
      </header>
      <main id="main-content" className="mx-auto grid max-w-xl gap-5 px-5 pb-16 sm:px-8">
        {children}
      </main>
    </div>
  );
}
