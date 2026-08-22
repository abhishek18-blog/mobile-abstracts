import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ApiResponse, 
  Paper, 
  ExternalPaper, 
  Project, 
  UserProfile, 
  Community, 
  CommunityPost, 
  AbstractHighlight 
} from '../types';

import Constants from 'expo-constants';

// Automatically resolve host IP during development using Expo Constants, or fallback to Render URL
const getDynamicApiUrl = () => {
  if (!__DEV__) {
    return 'https://abstracts-researchhub.onrender.com/api';
  }

  const debuggerHost = Constants.expoConfig?.hostUri 
    || (Constants as any).manifest?.debuggerHost 
    || (Constants as any).manifest2?.extra?.expoGo?.developer?.extra?.hostUri;

  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    if (ip) {
      return `http://${ip}:3001/api`;
    }
  }

  return 'http://10.212.88.103:3001/api';
};

export const DEFAULT_API_URL = getDynamicApiUrl();

let currentApiUrl = DEFAULT_API_URL;

export const setCustomApiUrl = (url: string) => {
  const clean = url.replace(/\/$/, '');
  currentApiUrl = clean.endsWith('/api') ? clean : `${clean}/api`;
};

// ─── SAMPLE FALLBACK DATA FOR UNAUTHENTICATED/OFFLINE GUEST USERS ─────────────
const MOCK_PAPERS: Paper[] = [
  {
    id: 'mock-1',
    title: 'Attention Is All You Need',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit'],
    year: '2017',
    citations: 124500,
    tags: ['Transformer', 'Deep Learning', 'NLP', 'LLM'],
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, a model architecture relying entirely on an attention mechanism.',
    saved: true,
  },
  {
    id: 'mock-2',
    title: 'Llama 3: Open Foundation and Fine-Tuned Chat Models',
    authors: ['Meta AI Team', 'Hugo Touvron', 'Louis Martin', 'Kevin Stone'],
    year: '2024',
    citations: 4500,
    tags: ['LLM', 'Open Source', 'Foundation Models'],
    abstract: 'We introduce Llama 3, a family of state-of-the-art pretrained and instruction-tuned large language models ranging from 8B to 70B parameters, demonstrating superior performance on reasoning and coding tasks.',
    saved: false,
  },
  {
    id: 'mock-3',
    title: 'GPT-4 Technical Report',
    authors: ['OpenAI', 'Josh Achiam', 'Steven Adler', 'Sandeep Agarwal'],
    year: '2023',
    citations: 18900,
    tags: ['LLM', 'Multimodal', 'GPT-4'],
    abstract: 'We report the development of GPT-4, a large-scale multimodal model capable of accepting image and text inputs and producing text outputs. GPT-4 exhibits human-level performance on various professional benchmarks.',
    saved: true,
  },
  {
    id: 'mock-4',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
    year: '2019',
    citations: 98000,
    tags: ['NLP', 'BERT', 'Transformers', 'LLM'],
    abstract: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers.',
    saved: false,
  },
  {
    id: 'mock-5',
    title: 'Training Language Models to Follow Instructions with Human Feedback',
    authors: ['Long Ouyang', 'Jeff Wu', 'Xu Jiang', 'Diogo Almeida', 'Paul Christiano'],
    year: '2022',
    citations: 14200,
    tags: ['RLHF', 'LLM', 'InstructGPT', 'Alignment'],
    abstract: 'Making language models bigger does not inherently make them better at following a user intent. We show how to align language models using reinforcement learning from human feedback (RLHF).',
    saved: true,
  },
  {
    id: 'mock-6',
    title: 'Mistral 7B: Efficient and High-Performing Open Language Model',
    authors: ['Albert Q. Jiang', 'Alexandre Sablayrolles', 'Arthur Mensch', 'Chris Bamford'],
    year: '2023',
    citations: 3800,
    tags: ['LLM', 'Mistral', 'Sliding Window Attention'],
    abstract: 'We present Mistral 7B, a 7-billion-parameter language model engineered for superior efficiency and performance. It outperforms Llama 2 13B across all benchmarks.',
    saved: false,
  },
  {
    id: 'mock-7',
    title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
    authors: ['Jason Wei', 'Xuezhi Wang', 'Dale Schuurmans', 'Maarten Bosma', 'Ed Chi'],
    year: '2022',
    citations: 9600,
    tags: ['LLM', 'Reasoning', 'Chain-of-Thought'],
    abstract: 'We explore how generating a series of intermediate reasoning steps—a chain of thought—significantly improves the ability of large language models to perform complex reasoning.',
    saved: false,
  },
  {
    id: 'mock-8',
    title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
    authors: ['Rafael Rafailov', 'Archit Sharma', 'Eric Mitchell', 'Stefano Ermon', 'Christopher D. Manning'],
    year: '2023',
    citations: 4100,
    tags: ['DPO', 'LLM', 'Alignment', 'RLHF'],
    abstract: 'We present Direct Preference Optimization (DPO), a simple and stable algorithm for fine-tuning large language models on human preferences without training a explicit reward model.',
    saved: true,
  },
  {
    id: 'mock-9',
    title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    authors: ['Edward J. Hu', 'Yelong Shen', 'Phillip Wallis', 'Zeyuan Allen-Zhu', 'Yuanzhi Li'],
    year: '2021',
    citations: 16500,
    tags: ['LoRA', 'Fine-Tuning', 'LLM', 'Efficiency'],
    abstract: 'We propose Low-Rank Adaptation (LoRA), which freezes pretrained model weights and injects trainable rank decomposition matrices into each layer of the Transformer architecture.',
    saved: false,
  },
  {
    id: 'mock-10',
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
    authors: ['Tri Dao', 'Daniel Y. Fu', 'Stefano Ermon', 'Atri Rudra', 'Christopher Ré'],
    year: '2022',
    citations: 7800,
    tags: ['FlashAttention', 'LLM', 'GPU Optimization', 'Transformers'],
    abstract: 'We introduce FlashAttention, an IO-aware exact attention algorithm that uses tiling to reduce the number of memory reads/writes between GPU high-bandwidth memory (HBM) and GPU on-chip SRAM.',
    saved: true,
  },
  {
    id: 'mock-11',
    title: 'Tree of Thoughts: Deliberate Problem Solving with Large Language Models',
    authors: ['Shunyu Yao', 'Dian Yu', 'Jeffrey Zhao', 'Izhak Shafran', 'Thomas L. Griffiths'],
    year: '2023',
    citations: 3100,
    tags: ['LLM', 'Tree-of-Thought', 'Reasoning', 'Search'],
    abstract: 'We introduce Tree of Thoughts (ToT), a framework for language model reasoning that generalizes over popular chain-of-thought prompting and allows LLMs to explore multiple reasoning paths.',
    saved: false,
  },
  {
    id: 'mock-12',
    title: 'Deep Residual Learning for Image Recognition',
    authors: ['Kaiming He', 'Xiangyu Zhang', 'Shaoqing Ren', 'Jian Sun'],
    year: '2016',
    citations: 185000,
    tags: ['Computer Vision', 'ResNet', 'CNN'],
    abstract: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.',
    saved: false,
  },
  {
    id: 'mock-13',
    title: 'Mastering the Game of Go with Deep Neural Networks',
    authors: ['David Silver', 'Aja Huang', 'Chris J. Maddison', 'Demis Hassabis'],
    year: '2016',
    citations: 45000,
    tags: ['Reinforcement Learning', 'AlphaGo', 'AI'],
    abstract: 'We introduce a new approach to computer Go that uses value networks to evaluate board positions and policy networks to select moves.',
    saved: true,
  },
  {
    id: 'mock-14',
    title: 'DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model',
    authors: ['DeepSeek AI Team', 'Haowei Zhang', 'Chenggang Zhao'],
    year: '2024',
    citations: 2100,
    tags: ['LLM', 'MoE', 'DeepSeek', 'Architecture'],
    abstract: 'We present DeepSeek-V2, an open-source Mixture-of-Experts (MoE) language model achieving competitive performance with GPT-4 at significantly lower training and inference costs.',
    saved: false,
  },
  {
    id: 'mock-15',
    title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
    authors: ['Albert Gu', 'Tri Dao'],
    year: '2023',
    citations: 3900,
    tags: ['Mamba', 'SSM', 'LLM', 'Linear Attention'],
    abstract: 'We propose Mamba, a new architecture based on selective state space models (SSMs) that achieves sub-quadratic linear-time sequence scaling while matching Transformer quality on language modeling.',
    saved: true,
  },
];

let localProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'LLM Reasoning Literature Review',
    description: 'Synthesizing recent chain-of-thought and tree-of-thoughts paper benchmarks.',
    color: '#3b82f6',
    paperCount: 2,
    progress: 65,
    papers: ['mock-1', 'mock-3'],
  },
  {
    id: 'proj-2',
    name: 'Diffusion Models for Medical Imaging',
    description: 'Exploring generative AI applications in high-resolution MRI reconstruction.',
    color: '#10b981',
    paperCount: 0,
    progress: 0,
    papers: [],
  },
];

let localCommunities: Community[] = [
  {
    id: 'comm-1',
    name: 'Machine Learning & AI',
    description: 'Discussions on state-of-the-art ML models, architectures, and ethical AI deployment.',
    subject: 'Computer Science',
    icon: '🤖',
    memberCount: 4200,
    isMember: true,
    posts: [
      {
        id: 'post-1',
        content: 'Has anyone benchmarks on reasoning models vs standard LLM fine-tuning on academic datasets?',
        author: { name: 'Dr. Sarah Chen', role: 'AI Researcher', avatar_initials: 'SC' },
        likes: 24,
        created_at: new Date().toISOString(),
        papers: [],
      },
    ],
  },
  {
    id: 'comm-2',
    name: 'Quantum Computing',
    description: 'Quantum hardware algorithms, error mitigation, and quantum chemistry simulations.',
    subject: 'Physics',
    icon: '⚛️',
    memberCount: 1850,
    isMember: false,
    posts: [
      {
        id: 'post-2',
        content: 'New preprint out analyzing topological qubits error rates under room temperature conditions!',
        author: { name: 'Prof. Marcus Vance', role: 'Physicist', avatar_initials: 'MV' },
        likes: 18,
        created_at: new Date().toISOString(),
        papers: [],
      },
    ],
  },
];

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await AsyncStorage.getItem('token');
  const url = `${currentApiUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.removeItem('token');
      }
      throw new Error(json.error || `Request failed with status ${response.status}`);
    }

    return json;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[Mobile API Notice] ${endpoint}: ${err.message || err}`);
    throw err;
  }
}

// ─── Papers API ─────────────────────────────────────────────────────────────
// ─── IN-MEMORY PAPER CACHE ──────────────────────────────────────────────────
export const paperCache = new Map<string, Paper>();

export const cachePapers = (papers: Paper[]) => {
  if (!Array.isArray(papers)) return;
  papers.forEach((p) => {
    if (p && p.id) {
      paperCache.set(p.id, p);
    }
  });
};

export const papersApi = {
  getAll: async (query: { search?: string; sort?: string; tag?: string; year?: string; saved_by?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.sort) params.append('sort', query.sort);
    if (query.tag) params.append('tag', query.tag);
    if (query.year) params.append('year', query.year);
    if (query.saved_by) params.append('saved_by', query.saved_by);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    try {
      const res = await request<Paper[]>(`/papers${queryString}`);
      if (res.success && res.data) {
        cachePapers(res.data);
      }
      return res;
    } catch {
      // Fallback for guest mode / unauthenticated / offline
      let filtered = [...MOCK_PAPERS];
      if (query.tag === 'saved' || query.saved_by === 'true') {
        filtered = filtered.filter((p) => p.saved);
      }
      if (query.search) {
        const q = query.search.toLowerCase();
        filtered = filtered.filter((p) =>
          p.title.toLowerCase().includes(q) || p.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }
      return { success: true, data: filtered };
    }
  },

  getById: async (id: string): Promise<ApiResponse<Paper>> => {
    // 1. Check in-memory paper cache first
    if (paperCache.has(id)) {
      console.log(`[papersApi.getById] Found paper in cache for id: ${id}`);
      return { success: true, data: paperCache.get(id)! };
    }

    try {
      const res = await request<Paper>(`/papers/${id}`);
      if (res.success && res.data) {
        paperCache.set(res.data.id, res.data);
        console.log(`[papersApi.getById] Loaded paper from API for id: ${id}`);
        return res;
      }
    } catch (err: any) {
      console.warn(`[papersApi.getById] Server fetch failed for id ${id}:`, err?.message || err);
    }

    // 2. Check mock papers
    const found = MOCK_PAPERS.find((p) => p.id === id);
    if (found) {
      console.log(`[papersApi.getById] Found paper in MOCK_PAPERS for id: ${id}`);
      return { success: true, data: found };
    }

    console.error(`[papersApi.getById] Paper not found anywhere for id: ${id}`);
    return { success: false, error: 'Paper not found.' };
  },

  toggleSave: async (id: string) => {
    try {
      return await request<{ saved: boolean }>(`/papers/${id}/save`, { method: 'POST' });
    } catch {
      const p = MOCK_PAPERS.find(x => x.id === id) || paperCache.get(id);
      if (p) p.saved = !p.saved;
      return { success: true, data: { saved: p ? p.saved : true } };
    }
  },

  getHighlights: async (paperId: string) => {
    try {
      return await request<AbstractHighlight[]>(`/papers/${paperId}/highlights`);
    } catch {
      return { success: true, data: [] };
    }
  },

  updateProgress: async (id: string, progress: number) => {
    try {
      return await request<any>(`/papers/${id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ progress })
      });
    } catch {
      const p = MOCK_PAPERS.find(x => x.id === id) || paperCache.get(id);
      if (p) p.readingProgress = progress;
      return { success: true, data: {} };
    }
  }
};

// ─── External Search API ───────────────────────────────────────────────────
export const searchApi = {
  searchPapers: async (
    query: string,
    limit = 10,
    offset = 0,
    options?: { year?: string; sort?: string }
  ): Promise<ApiResponse<ExternalPaper[]>> => {
    // 1. Primary: Try backend server search endpoint
    try {
      let url = `/search/papers?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
      if (options?.year) url += `&year=${encodeURIComponent(options.year)}`;
      if (options?.sort) url += `&sort=${encodeURIComponent(options.sort)}`;
      const res = await request<ExternalPaper[]>(url);
      if (res.success && res.data && res.data.length > 0) {
        return res;
      }
    } catch {
      // Fall through to public APIs
    }

    // 2. Tier 1 Fallback: Direct Semantic Scholar Public API
    try {
      const s2Url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&fields=title,authors,year,citationCount,abstract,url,openAccessPdf`;
      const s2Res = await fetch(s2Url);
      if (s2Res.ok) {
        const s2Data = await s2Res.json();
        if (s2Data.data && Array.isArray(s2Data.data) && s2Data.data.length > 0) {
          const converted: ExternalPaper[] = s2Data.data.map((item: any) => ({
            externalId: item.paperId || Math.random().toString(),
            title: item.title,
            authors: item.authors ? item.authors.map((a: any) => a.name) : ['Unknown Author'],
            year: item.year ? String(item.year) : '2024',
            citations: item.citationCount || 0,
            abstract: item.abstract || `Research abstract investigating ${query} methodology and results.`,
            source: 'Semantic Scholar',
            url: item.url || null,
            pdfUrl: item.openAccessPdf?.url || null,
            doi: null,
          }));
          return { success: true, data: converted, total: s2Data.total || (offset + converted.length + 40) } as any;
        }
      }
    } catch (err) {
      console.warn('[searchApi] Semantic Scholar direct fetch error:', err);
    }

    // 3. Tier 2 Fallback: Direct OpenAlex Public API
    try {
      const pageNum = Math.floor(offset / limit) + 1;
      const alexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&page=${pageNum}`;
      const alexRes = await fetch(alexUrl);
      if (alexRes.ok) {
        const alexData = await alexRes.json();
        if (alexData.results && Array.isArray(alexData.results) && alexData.results.length > 0) {
          const converted: ExternalPaper[] = alexData.results.map((item: any) => ({
            externalId: item.id || Math.random().toString(),
            title: item.display_name || item.title || 'Untitled Research Paper',
            authors: item.authorships ? item.authorships.map((a: any) => a.author?.display_name).filter(Boolean) : ['OpenAlex Researcher'],
            year: item.publication_year ? String(item.publication_year) : '2024',
            citations: item.cited_by_count || 0,
            abstract: `OpenAlex publication exploring key concepts in ${query}.`,
            source: 'OpenAlex',
            url: item.doi || item.primary_location?.landing_page_url || null,
            pdfUrl: item.primary_location?.pdf_url || null,
            doi: item.doi || null,
          }));
          return { success: true, data: converted, total: alexData.meta?.count || (offset + converted.length + 50) } as any;
        }
      }
    } catch (err) {
      console.warn('[searchApi] OpenAlex direct fetch error:', err);
    }

    // Check if user is authenticated
    const token = await AsyncStorage.getItem('token');
    const isAuthenticated = !!token;

    // If user is authenticated, DO NOT fall back to offline mock pool when live APIs fail
    if (isAuthenticated) {
      return {
        success: false,
        error: 'Unable to fetch research papers from live APIs (Backend, Semantic Scholar, OpenAlex). Please check your network connection.',
      };
    }

    // 4. Tier 4 Fallback (Offline Guest Mode Only): Expanded MOCK_PAPERS pool
    const qLower = query.toLowerCase();
    const filtered = MOCK_PAPERS.filter(
      (p) => p.title.toLowerCase().includes(qLower) || 
             p.abstract.toLowerCase().includes(qLower) || 
             p.tags.some(t => t.toLowerCase().includes(qLower)) ||
             query.length > 0
    );
    const paginated = filtered.slice(offset, offset + limit);

    return {
      success: true,
      data: paginated.map((p) => ({
        externalId: p.id,
        title: p.title,
        authors: p.authors,
        year: p.year,
        citations: p.citations,
        abstract: p.abstract,
        source: 'Abstracts Hub (Guest)',
        url: p.source_url || null,
        pdfUrl: p.pdf_url || null,
        doi: null,
      })),
      total: filtered.length,
    } as any;
  },
};

const recCache = new Map<string, Paper[]>();

// ─── Recommendation API ───────────────────────────────────────────────────
export const recommendationApi = {
  /**
   * Fetch recommended papers for a topic using a 3-tier strategy:
   * 1. Primary: Genuine Authorized Semantic Scholar API (via backend server with Bearer auth token / API key)
   * 2. Fallback 1: Unauthorized Semantic Scholar Direct API (public endpoint without API key)
   * 3. Fallback 2: OpenAlex Direct API
   */
  getRecommendations: async (topic: string, limit = 15): Promise<Paper[]> => {
    if (recCache.has(topic) && recCache.get(topic)!.length > 0) {
      return recCache.get(topic)!;
    }

    // Tier 1: Primary - Genuine Authorised Semantic Scholar API via backend endpoint
    try {
      const res = await searchApi.searchPapers(topic, limit, 0);
      if (res.success && res.data && res.data.length > 0) {
        const results = res.data.map((p: ExternalPaper) => ({
          id: p.externalId || Math.random().toString(),
          title: p.title,
          authors: p.authors || [],
          year: p.year || '2024',
          citations: p.citations || 0,
          tags: [p.source || 'Semantic Scholar (Official)'],
          abstract: p.abstract || 'No abstract available.',
          pdf_url: p.pdfUrl,
          source_url: p.url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        cachePapers(results);
        recCache.set(topic, results);
        return results;
      }
    } catch {
      console.warn('[Recommendations] Authorised server search failed, trying unauthorized Semantic Scholar...');
    }

    // Tier 2: Fallback 1 - Direct Semantic Scholar (Unauthorised / Public endpoint, no API key)
    try {
      const s2Url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=${limit}&fields=paperId,title,abstract,year,citationCount,authors,openAccessPdf,url`;
      const s2Res = await fetch(s2Url, {
        headers: { 'Accept': 'application/json' },
      });

      if (s2Res.ok) {
        const s2Data = await s2Res.json();
        if (s2Data.data && s2Data.data.length > 0) {
          const results = s2Data.data.map((paper: any) => ({
            id: paper.paperId || Math.random().toString(),
            title: paper.title || 'Untitled',
            authors: (paper.authors || []).map((a: any) => a.name),
            year: paper.year ? String(paper.year) : 'N/A',
            citations: paper.citationCount || 0,
            tags: ['Semantic Scholar (Public)'],
            abstract: paper.abstract || 'Abstract not available.',
            pdf_url: paper.openAccessPdf?.url || null,
            source_url: paper.url || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          cachePapers(results);
          recCache.set(topic, results);
          return results;
        }
      }
    } catch (err) {
      console.warn('[Recommendations] Unauthorized Semantic Scholar failed:', err);
    }

    // Tier 2: OpenAlex (completely free, no rate limit)
    try {
      const oaUrl = `https://api.openalex.org/works?filter=title_and_abstract.search:${encodeURIComponent(topic)}&per_page=${limit}&sort=cited_by_count:desc&select=id,title,authorships,publication_year,cited_by_count,open_access,doi,primary_location,abstract_inverted_index`;
      const oaRes = await fetch(oaUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Abstracts/1.0 (mailto:abstracts@example.com)',
        },
      });

      if (oaRes.ok) {
        const oaData = await oaRes.json();
        if (oaData.results && oaData.results.length > 0) {
          const results = oaData.results.map((work: any) => {
            let abstract = 'Abstract not available.';
            if (work.abstract_inverted_index) {
              const words: string[] = [];
              for (const [word, positions] of Object.entries(work.abstract_inverted_index)) {
                for (const pos of (positions as number[])) {
                  words[pos] = word;
                }
              }
              abstract = words.join(' ').replace(/\s+/g, ' ').trim();
            }

            return {
              id: work.id?.replace('https://openalex.org/', '') || Math.random().toString(),
              title: work.title || 'Untitled',
              authors: (work.authorships || []).slice(0, 6).map((a: any) => a.author?.display_name || 'Unknown'),
              year: work.publication_year ? String(work.publication_year) : 'N/A',
              citations: work.cited_by_count || 0,
              tags: ['OpenAlex'],
              abstract,
              pdf_url: work.open_access?.oa_url || work.primary_location?.pdf_url || null,
              source_url: work.primary_location?.landing_page_url || work.doi || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          });
          cachePapers(results);
          recCache.set(topic, results);
          return results;
        }
      }
    } catch (err) {
      console.warn('[Recommendations] OpenAlex failed:', err);
    }

    return [];
  },
};

// ─── Projects API ───────────────────────────────────────────────────────────
export const projectsApi = {
  getAll: async (): Promise<ApiResponse<Project[]>> => {
    try {
      return await request<Project[]>('/projects');
    } catch {
      return { success: true, data: localProjects };
    }
  },

  getById: async (id: string): Promise<ApiResponse<Project>> => {
    try {
      return await request<Project>(`/projects/${id}`);
    } catch {
      const found = localProjects.find((p) => p.id === id);
      if (found) {
        const populatedPapers = MOCK_PAPERS.filter(p => found.papers?.includes(p.id));
        return {
          success: true,
          data: {
            ...found,
            papers: populatedPapers
          }
        };
      }
      return { success: false, data: null as any, error: 'Project not found' };
    }
  },

  create: async (data: { name: string; description?: string; color?: string }): Promise<ApiResponse<Project>> => {
    try {
      return await request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        name: data.name,
        description: data.description || '',
        color: data.color || '#3b82f6',
        paperCount: 0,
        progress: 0,
        papers: [],
      };
      localProjects.push(newProj);
      return { success: true, data: newProj };
    }
  },

  addPaper: async (projectId: string, paperId: string): Promise<ApiResponse<any>> => {
    try {
      return await request<any>(`/projects/${projectId}/papers`, {
        method: 'POST',
        body: JSON.stringify({ paperId }),
      });
    } catch {
      const proj = localProjects.find(p => p.id === projectId);
      if (proj) {
        proj.papers = proj.papers || [];
        if (!proj.papers.includes(paperId)) {
          proj.papers.push(paperId);
          proj.paperCount = proj.papers.length;
        }
      }
      return { success: true, data: null, message: 'Paper added' };
    }
  },

  removePaper: async (projectId: string, paperId: string): Promise<ApiResponse<any>> => {
    try {
      return await request<any>(`/projects/${projectId}/papers/${paperId}`, {
        method: 'DELETE',
      });
    } catch {
      const proj = localProjects.find(p => p.id === projectId);
      if (proj) {
        proj.papers = proj.papers || [];
        proj.papers = proj.papers.filter(id => id !== paperId);
        proj.paperCount = proj.papers.length;
      }
      return { success: true, data: null, message: 'Paper removed' };
    }
  },

  /**
   * Import an external paper to local library AND add to project
   */
  importAndAddPaper: async (projectId: string, paper: Paper): Promise<ApiResponse<any>> => {
    try {
      const token = await AsyncStorage.getItem('token');
      const url = `${currentApiUrl}/search/papers/import`;

      const importRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          citations: paper.citations,
          abstract: paper.abstract,
          url: paper.source_url,
          pdfUrl: paper.pdf_url,
          externalId: paper.id,
        }),
      });

      const importJson = await importRes.json();

      let realPaperId: string;
      if (importRes.ok && importJson.success && importJson.data) {
        realPaperId = importJson.data.id || importJson.data._id;
      } else if (importRes.status === 409 && importJson.data) {
        realPaperId = importJson.data.id || importJson.data._id;
      } else {
        throw new Error(importJson.error || 'Failed to import paper');
      }

      // Now add the real paper to the project
      return await request<any>(`/projects/${projectId}/papers`, {
        method: 'POST',
        body: JSON.stringify({ paperId: realPaperId }),
      });
    } catch (err: any) {
      // For guest/offline mode, add locally
      const proj = localProjects.find(p => p.id === projectId);
      if (proj) {
        proj.papers = proj.papers || [];
        if (!proj.papers.includes(paper.id)) {
          proj.papers.push(paper.id);
          proj.paperCount = proj.papers.length;
        }
      }
      return { success: true, data: null, message: 'Paper added (offline)' };
    }
  },
};

// ─── Community API ──────────────────────────────────────────────────────────
export const communityApi = {
  getAll: async (): Promise<ApiResponse<Community[]>> => {
    try {
      return await request<Community[]>('/community');
    } catch {
      return { success: true, data: localCommunities };
    }
  },

  getById: async (id: string): Promise<ApiResponse<Community>> => {
    try {
      return await request<Community>(`/community/${id}`);
    } catch {
      const found = localCommunities.find(c => c.id === id) || localCommunities[0];
      return { success: true, data: found };
    }
  },

  join: async (id: string): Promise<ApiResponse<{ isMember: boolean }>> => {
    try {
      return await request<{ isMember: boolean }>(`/community/${id}/join`, { method: 'POST' });
    } catch {
      const comm = localCommunities.find(c => c.id === id);
      if (comm) {
        comm.isMember = true;
        comm.memberCount++;
      }
      return { success: true, data: { isMember: true } };
    }
  },

  create: async (data: { name: string; description?: string; subject: string; icon?: string }): Promise<ApiResponse<Community>> => {
    try {
      return await request<Community>('/community', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const newComm: Community = {
        id: `comm-${Date.now()}`,
        name: data.name,
        description: data.description || '',
        subject: data.subject,
        icon: data.icon || '🔬',
        memberCount: 1,
        isMember: true,
        posts: [],
      };
      localCommunities.push(newComm);
      return { success: true, data: newComm };
    }
  },

  createPost: async (communityId: string, data: { content: string; paper_ids?: string[] }): Promise<ApiResponse<CommunityPost>> => {
    try {
      return await request<CommunityPost>(`/community/${communityId}/posts`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const comm = localCommunities.find(c => c.id === communityId);
      const papersAttached = MOCK_PAPERS.filter(p => data.paper_ids?.includes(p.id));
      const newPost: CommunityPost = {
        id: `post-${Date.now()}`,
        content: data.content,
        author: { name: 'You (Researcher)', role: 'Contributor', avatar_initials: 'ME' },
        likes: 0,
        created_at: new Date().toISOString(),
        papers: papersAttached,
      };
      if (comm) {
        comm.posts = comm.posts || [];
        comm.posts.unshift(newPost);
      }
      return { success: true, data: newPost };
    }
  },

  deletePost: async (communityId: string, postId: string): Promise<ApiResponse<any>> => {
    try {
      return await request<any>(`/community/${communityId}/posts/${postId}`, {
        method: 'DELETE',
      });
    } catch {
      const comm = localCommunities.find(c => c.id === communityId);
      if (comm && comm.posts) {
        comm.posts = comm.posts.filter(p => p.id !== postId);
      }
      return { success: true, data: null };
    }
  },
};

// ─── User Profile API ───────────────────────────────────────────────────────
export const userApi = {
  getProfile: async () => {
    return request<UserProfile>('/user');
  },

  updateProfile: async (data: Partial<UserProfile>) => {
    return request<UserProfile>('/user', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  uploadAvatar: async (avatarUrlOrBase64: string) => {
    return request<UserProfile>('/user', {
      method: 'PUT',
      body: JSON.stringify({ avatar_url: avatarUrlOrBase64 }),
    });
  },
};
export { MOCK_PAPERS };
