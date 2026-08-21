import React, { createContext, useContext, useState, useRef } from 'react';
import { Paper, ExternalPaper } from '../types';
import { searchApi, cachePapers } from '../services/api';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  papers: Paper[];
  setPapers: React.Dispatch<React.SetStateAction<Paper[]>>;
  selectedSort: 'most_cited' | 'most_recent';
  setSelectedSort: (sort: 'most_cited' | 'most_recent') => void;
  viewMode: 'list' | 'swipe';
  setViewMode: (mode: 'list' | 'swipe') => void;
  loading: boolean;
  searchInBg: (query: string, sort?: 'most_cited' | 'most_recent') => Promise<void>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedSort, setSelectedSort] = useState<'most_cited' | 'most_recent'>('most_cited');
  const [viewMode, setViewMode] = useState<'list' | 'swipe'>('list');
  const [loading, setLoading] = useState<boolean>(false);
  const activeQueryRef = useRef<string>('');

  const searchInBg = async (query: string, sort: 'most_cited' | 'most_recent' = selectedSort) => {
    const trimmed = query.trim();
    if (!trimmed) {
      activeQueryRef.current = '';
      setPapers([]);
      setLoading(false);
      return;
    }

    activeQueryRef.current = trimmed;
    setLoading(true);

    try {
      const res = await searchApi.searchPapers(trimmed);
      // Ensure we only set state if this search is still the active search query
      if (activeQueryRef.current === trimmed && res.success && res.data) {
        let converted: Paper[] = res.data.map((p: ExternalPaper) => ({
          id: p.externalId || Math.random().toString(),
          title: p.title,
          authors: p.authors || [],
          year: p.year || '2024',
          citations: p.citations || 0,
          tags: [p.source || 'OpenAlex'],
          abstract: p.abstract || 'No abstract available.',
          pdf_url: p.pdfUrl,
          source_url: p.url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        if (sort === 'most_cited') {
          converted.sort((a, b) => (b.citations || 0) - (a.citations || 0));
        } else if (sort === 'most_recent') {
          converted.sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));
        }

        cachePapers(converted);
        setPapers(converted);
      }
    } catch (err) {
      console.warn('[SearchContext] Background search error:', err);
    } finally {
      if (activeQueryRef.current === trimmed) {
        setLoading(false);
      }
    }
  };

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        papers,
        setPapers,
        selectedSort,
        setSelectedSort,
        viewMode,
        setViewMode,
        loading,
        searchInBg,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
