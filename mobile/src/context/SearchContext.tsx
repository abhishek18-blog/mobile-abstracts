import React, { createContext, useContext, useState, useRef, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paper, ExternalPaper } from '../types';
import { searchApi, cachePapers } from '../services/api';

// ─── Offline Cache Keys ──────────────────────────────────────────────────────
const SEARCH_CACHE_PREFIX = '@search_cache:';
const SEARCH_CACHE_META_KEY = '@search_cache_meta';
const MAX_CACHED_QUERIES = 10; // keep last 10 unique searches

async function saveSearchToStorage(query: string, sort: string, papers: Paper[], total: number) {
  try {
    const key = `${SEARCH_CACHE_PREFIX}${query}:${sort}`;
    await AsyncStorage.setItem(key, JSON.stringify({ papers, total, savedAt: Date.now() }));
    // Track query list for cache eviction
    const metaRaw = await AsyncStorage.getItem(SEARCH_CACHE_META_KEY);
    let queries: string[] = metaRaw ? JSON.parse(metaRaw) : [];
    queries = queries.filter((q) => q !== key);
    queries.unshift(key);
    if (queries.length > MAX_CACHED_QUERIES) {
      const removed = queries.splice(MAX_CACHED_QUERIES);
      await Promise.all(removed.map((k) => AsyncStorage.removeItem(k)));
    }
    await AsyncStorage.setItem(SEARCH_CACHE_META_KEY, JSON.stringify(queries));
  } catch {}
}

async function loadSearchFromStorage(query: string, sort: string): Promise<{ papers: Paper[]; total: number } | null> {
  try {
    const key = `${SEARCH_CACHE_PREFIX}${query}:${sort}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { papers, total } = JSON.parse(raw);
    return { papers, total };
  } catch {
    return null;
  }
}

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

  // ── Preload cached papers on mount so Discover is immediately populated offline ──
  useEffect(() => {
    const initDefaultPapers = async () => {
      try {
        const metaRaw = await AsyncStorage.getItem(SEARCH_CACHE_META_KEY);
        if (metaRaw) {
          const queries: string[] = JSON.parse(metaRaw);
          if (queries.length > 0) {
            const raw = await AsyncStorage.getItem(queries[0]);
            if (raw) {
              const { papers: cachedList, total: cachedTotal } = JSON.parse(raw);
              if (Array.isArray(cachedList) && cachedList.length > 0 && !activeQueryRef.current) {
                cachePapers(cachedList);
                setPapers(cachedList);
                setTotal(cachedTotal || cachedList.length);
                setHasMore(false);
                return;
              }
            }
          }
        }
        const { MOCK_PAPERS } = await import('../services/api');
        if (!activeQueryRef.current) {
          cachePapers(MOCK_PAPERS);
          setPapers(MOCK_PAPERS);
          setTotal(MOCK_PAPERS.length);
          setHasMore(false);
        }
      } catch {}
    };
    initDefaultPapers();
  }, []);

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
      setLoading(false);
      setOffset(0);
      setSearchError(null);
      // Reload initial cached papers or default papers so screen is not blank
      try {
        const metaRaw = await AsyncStorage.getItem(SEARCH_CACHE_META_KEY);
        if (metaRaw) {
          const queries: string[] = JSON.parse(metaRaw);
          if (queries.length > 0) {
            const raw = await AsyncStorage.getItem(queries[0]);
            if (raw) {
              const { papers: cachedList, total: cachedTotal } = JSON.parse(raw);
              if (Array.isArray(cachedList) && cachedList.length > 0) {
                setPapers(cachedList);
                setTotal(cachedTotal || cachedList.length);
                setHasMore(false);
                return;
              }
            }
          }
        }
        const { MOCK_PAPERS } = await import('../services/api');
        setPapers(MOCK_PAPERS);
        setTotal(MOCK_PAPERS.length);
        setHasMore(false);
      } catch {
        setPapers([]);
      }
      return;
    }

    activeQueryRef.current = trimmed;
    setLoading(true);
    setSearchError(null);
    setOffset(0);

    // ── Load cached results immediately so UI is not blank offline ──
    const cached = await loadSearchFromStorage(trimmed, sort);
    if (cached && cached.papers.length > 0) {
      if (activeQueryRef.current === trimmed) {
        cachePapers(cached.papers);
        setPapers(cached.papers);
        setTotal(cached.total);
        setHasMore(cached.papers.length < cached.total);
        setSearchError(null);
        setLoading(false); // show cached data instantly
      }
    }

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
            tags: [],
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

          // ── Persist fresh results for offline use ──
          saveSearchToStorage(trimmed, sort, converted, totalRes);
        } else {
          // If live search returned no data, check local offline matches
          const { MOCK_PAPERS, paperCache } = await import('../services/api');
          const allAvailable = Array.from(new Set([...Array.from(paperCache.values()), ...MOCK_PAPERS]));
          const qLower = trimmed.toLowerCase();
          const offlineMatches = allAvailable.filter(
            (p) =>
              p.title?.toLowerCase().includes(qLower) ||
              (p.abstract && p.abstract.toLowerCase().includes(qLower)) ||
              p.tags?.some((t) => t.toLowerCase().includes(qLower)) ||
              p.authors?.some((a) => a.toLowerCase().includes(qLower))
          );
          if (offlineMatches.length > 0) {
            setPapers(offlineMatches);
            setTotal(offlineMatches.length);
            setHasMore(false);
            setSearchError('Offline — showing matching cached & saved papers.');
          } else if (!cached || cached.papers.length === 0) {
            setPapers([]);
            setHasMore(false);
            setSearchError((res as any).error || 'Failed to fetch research papers. Live search endpoints unavailable.');
          }
        }
      }
    } catch (err: any) {
      console.warn('[SearchContext] Background search error:', err);
      // Try searching offline papers (from cachePapers / MOCK_PAPERS / persistent storage)
      const { MOCK_PAPERS, paperCache } = await import('../services/api');
      const allAvailable = Array.from(new Set([...Array.from(paperCache.values()), ...MOCK_PAPERS]));
      const qLower = trimmed.toLowerCase();
      const offlineMatches = allAvailable.filter(
        (p) =>
          p.title?.toLowerCase().includes(qLower) ||
          (p.abstract && p.abstract.toLowerCase().includes(qLower)) ||
          p.tags?.some((t) => t.toLowerCase().includes(qLower)) ||
          p.authors?.some((a) => a.toLowerCase().includes(qLower))
      );
      if (offlineMatches.length > 0) {
        setPapers(offlineMatches);
        setTotal(offlineMatches.length);
        setHasMore(false);
        setSearchError('Offline — showing matching cached & saved papers.');
      } else if (!cached || cached.papers.length === 0) {
        setSearchError('You are offline. Connect to internet to search global research databases.');
        setPapers([]);
        setHasMore(false);
      }
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
          tags: [],
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
