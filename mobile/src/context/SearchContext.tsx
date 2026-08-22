import React, { createContext, useContext, useState, useRef, useMemo, useEffect } from 'react';
import { Paper, ExternalPaper } from '../types';
import { searchApi, cachePapers } from '../services/api';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchError: string | null;
  papers: Paper[];
  filteredPapers: Paper[];
  setPapers: React.Dispatch<React.SetStateAction<Paper[]>>;
  selectedSort: 'most_cited' | 'most_recent';
  setSelectedSort: (sort: 'most_cited' | 'most_recent') => void;
  viewMode: 'list' | 'swipe';
  setViewMode: (mode: 'list' | 'swipe') => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  offset: number;
  total: number;
  selectedAuthors: string[];
  setSelectedAuthors: React.Dispatch<React.SetStateAction<string[]>>;
  selectedYears: string[];
  setSelectedYears: React.Dispatch<React.SetStateAction<string[]>>;
  availableAuthors: string[];
  availableYears: string[];
  searchInBg: (query: string, sort?: 'most_cited' | 'most_recent') => Promise<void>;
  loadMore: () => Promise<void>;
  clearFilters: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedSort, setSelectedSort] = useState<'most_cited' | 'most_recent'>('most_cited');
  const [viewMode, setViewMode] = useState<'list' | 'swipe'>('list');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  const activeQueryRef = useRef<string>('');
  const loadingMoreRef = useRef<boolean>(false);

  const extractAuthorsAndYears = (paperList: Paper[]) => {
    const authorsSet = new Set<string>();
    const yearsSet = new Set<string>();

    paperList.forEach((p) => {
      if (p.authors && Array.isArray(p.authors)) {
        p.authors.forEach((a) => {
          if (a && a.trim() && a !== 'Unknown') {
            authorsSet.add(a.trim());
          }
        });
      }
      if (p.year && p.year !== 'N/A') {
        yearsSet.add(p.year.trim());
      }
    });

    return {
      authors: Array.from(authorsSet).sort(),
      years: Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a)),
    };
  };

  const availableMetadata = useMemo(() => {
    return extractAuthorsAndYears(papers);
  }, [papers]);

  const searchInBg = async (query: string, sort: 'most_cited' | 'most_recent' = selectedSort) => {
    const trimmed = query.trim();
    if (!trimmed) {
      activeQueryRef.current = '';
      setPapers([]);
      setLoading(false);
      setOffset(0);
      setTotal(0);
      setHasMore(false);
      setSearchError(null);
      return;
    }

    activeQueryRef.current = trimmed;
    setLoading(true);
    setSearchError(null);
    setOffset(0);

    try {
      const res = await searchApi.searchPapers(trimmed, 10, 0, { sort });
      if (activeQueryRef.current === trimmed) {
        if (res.success && res.data) {
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

          const totalRes = (res as any).total || (converted.length >= 10 ? converted.length + 50 : converted.length);

          cachePapers(converted);
          setPapers(converted);
          setTotal(totalRes);
          setHasMore(converted.length > 0 && converted.length < totalRes);
          setSearchError(null);
        } else {
          setPapers([]);
          setHasMore(false);
          setSearchError((res as any).error || 'Failed to fetch research papers. Live search endpoints unavailable.');
        }
      }
    } catch (err: any) {
      console.warn('[SearchContext] Background search error:', err);
      setSearchError(err?.message || 'Error fetching papers. Please check network connection.');
      setPapers([]);
      setHasMore(false);
    } finally {
      if (activeQueryRef.current === trimmed) {
        setLoading(false);
      }
    }
  };

  const loadMore = async () => {
    const query = activeQueryRef.current;
    if (!query || loading || loadingMore || !hasMore || loadingMoreRef.current) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const nextOffset = offset + 10;

    try {
      const res = await searchApi.searchPapers(query, 10, nextOffset, { sort: selectedSort });
      if (activeQueryRef.current === query && res.success && res.data) {
        const fresh: Paper[] = res.data.map((p: ExternalPaper) => ({
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

        if (fresh.length === 0) {
          setHasMore(false);
        } else {
          setPapers((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newUnique = fresh.filter((p) => !existingIds.has(p.id));
            const combined = [...prev, ...newUnique];

            if (selectedSort === 'most_cited') {
              combined.sort((a, b) => (b.citations || 0) - (a.citations || 0));
            } else if (selectedSort === 'most_recent') {
              combined.sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));
            }

            cachePapers(combined);
            const totalRes = (res as any).total || (combined.length >= 10 ? combined.length + 50 : combined.length);
            setHasMore(combined.length < totalRes && newUnique.length > 0);
            return combined;
          });
          setOffset(nextOffset);
        }
      }
    } catch (err) {
      console.warn('[SearchContext] Load more error:', err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const clearFilters = () => {
    setSelectedAuthors([]);
    setSelectedYears([]);
  };

  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      if (selectedAuthors.length > 0) {
        const matchAuthor = paper.authors?.some((a) => selectedAuthors.includes(a));
        if (!matchAuthor) return false;
      }
      if (selectedYears.length > 0) {
        if (!paper.year || !selectedYears.includes(paper.year)) return false;
      }
      return true;
    });
  }, [papers, selectedAuthors, selectedYears]);

  // Deep fetch if active filters result in low matching papers count
  useEffect(() => {
    const hasActiveFilters = selectedAuthors.length > 0 || selectedYears.length > 0;
    if (
      hasActiveFilters &&
      activeQueryRef.current &&
      hasMore &&
      !loading &&
      !loadingMore &&
      filteredPapers.length < 5
    ) {
      loadMore();
    }
  }, [selectedAuthors, selectedYears, filteredPapers.length, hasMore, loading, loadingMore]);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchError,
        papers,
        filteredPapers,
        setPapers,
        selectedSort,
        setSelectedSort,
        viewMode,
        setViewMode,
        loading,
        loadingMore,
        hasMore,
        offset,
        total,
        selectedAuthors,
        setSelectedAuthors,
        selectedYears,
        setSelectedYears,
        availableAuthors: availableMetadata.authors,
        availableYears: availableMetadata.years,
        searchInBg,
        loadMore,
        clearFilters,
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
