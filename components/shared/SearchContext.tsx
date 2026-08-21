'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Shared search state so the Header search input (rendered at the top of the
 * shell) can filter a client ledger rendered deeper in the tree (e.g. the
 * dashboard subscription ledger) without turning the whole Server Component
 * page into a client component.
 *
 * A client shell mounts the provider high in the tree (around the Header and
 * the ledger); the Header input and the ledger both consume it. When no
 * provider is present the Header input is a no-op.
 */
interface SearchContextValue {
  readonly term: string;
  readonly setTerm: (value: string) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [term, setTerm] = useState('');
  return (
    <SearchContext.Provider value={{ term, setTerm }}>
      {children}
    </SearchContext.Provider>
  );
}

/** Returns live search state, or null when no provider is mounted. */
export function useSearch(): SearchContextValue | null {
  return useContext(SearchContext);
}
