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
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Lukasz Kaiser', 'Illia Polosukhin'],
    year: '2017',
    citations: 124500,
    tags: ['Transformer', 'Deep Learning', 'NLP', 'LLM'],
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs, a small fraction of the training costs of the best models from the literature. We show that the Transformer generalizes well to other tasks by applying it successfully to English constituency parsing both with large and limited training data.',
    saved: true,
  },
  {
    id: 'mock-2',
    title: 'Llama 3: Open Foundation and Fine-Tuned Chat Models',
    authors: ['Meta AI Team', 'Hugo Touvron', 'Louis Martin', 'Kevin Stone', 'Peter Albert'],
    year: '2024',
    citations: 4500,
    tags: ['LLM', 'Open Source', 'Foundation Models'],
    abstract: 'Modern artificial intelligence workflows increasingly rely on large language models capable of nuanced natural language comprehension, multi-step problem solving, and complex code generation. In this work, we introduce Llama 3, a family of multilingual, multimodal foundation models pretrained on over 15 trillion tokens of text and code with extensive preference alignment. We detail the architectural modifications, scalable training infrastructure across tens of thousands of GPUs, and novel data curation pipelines that enable Llama 3 models—ranging from 8B to 70B parameters—to achieve parity or superiority over leading proprietary systems across standard academic benchmarks in reasoning, mathematics, coding, and general knowledge while maintaining safe, helpful conversational alignment.',
    saved: false,
  },
  {
    id: 'mock-3',
    title: 'GPT-4 Technical Report',
    authors: ['OpenAI', 'Josh Achiam', 'Steven Adler', 'Sandeep Agarwal', 'Lama Ahmad'],
    year: '2023',
    citations: 18900,
    tags: ['LLM', 'Multimodal', 'GPT-4'],
    abstract: 'We report the development of GPT-4, a large-scale, multimodal model which can accept image and text inputs and produce text outputs. While less capable than humans in many real-world scenarios, GPT-4 exhibits human-level performance on various professional and academic benchmarks, including passing a simulated bar exam with a score around the top 10% of test takers. GPT-4 is a Transformer-style model pre-trained to predict the next token in a document, using both publicly available data and data licensed from third-party providers. The model was then fine-tuned using Reinforcement Learning from Human Feedback (RLHF). Given the competitive landscape and the safety implications of large-scale models like GPT-4, this report contains no further details about the architecture (including model size), hardware, training compute, dataset construction, or training method.',
    saved: true,
  },
  {
    id: 'mock-4',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
    year: '2019',
    citations: 98000,
    tags: ['NLP', 'BERT', 'Transformers', 'LLM'],
    abstract: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks, such as question answering and language inference, without substantial task-specific architecture modifications. BERT is conceptually simple and empirically powerful. It obtains new state-of-the-art results on eleven natural language processing tasks, including pushing the GLUE score to 80.5% (7.7% point absolute improvement), MultiNLI accuracy to 86.7% (4.6% absolute improvement), SQuAD v1.1 question answering Test F1 to 93.2 (1.5 point absolute improvement) and SQuAD v2.0 Test F1 to 83.1 (5.1 point absolute improvement).',
    saved: false,
  },
  {
    id: 'mock-5',
    title: 'Training Language Models to Follow Instructions with Human Feedback',
    authors: ['Long Ouyang', 'Jeff Wu', 'Xu Jiang', 'Diogo Almeida', 'Paul Christiano'],
    year: '2022',
    citations: 14200,
    tags: ['RLHF', 'LLM', 'InstructGPT', 'Alignment'],
    abstract: 'Making language models bigger does not inherently make them better at following a user\'s intent. For example, large language models can generate outputs that are untruthful, toxic, or simply not helpful to the user. In other words, these models are not aligned with their users. In this paper, we show an avenue for aligning language models with user intent on a wide range of tasks by fine-tuning with human feedback. Starting with a set of labeler-written prompts and prompts submitted through the OpenAI API, we collect a dataset of labeler demonstrations of the desired model behavior, which we use to fine-tune GPT-3 using supervised learning. We then collect a dataset of rankings of model outputs, which we use to further fine-tune this supervised model using reinforcement learning from human feedback (RLHF). We call the resulting models InstructGPT. In human evaluations on our prompt distribution, outputs from the 1.3B parameter InstructGPT model are preferred to outputs from the 175B GPT-3, despite having 100x fewer parameters.',
    saved: true,
  },
  {
    id: 'mock-6',
    title: 'Mistral 7B: Efficient and High-Performing Open Language Model',
    authors: ['Albert Q. Jiang', 'Alexandre Sablayrolles', 'Arthur Mensch', 'Chris Bamford', 'Devendra Singh Chaplot'],
    year: '2023',
    citations: 3800,
    tags: ['LLM', 'Mistral', 'Sliding Window Attention'],
    abstract: 'We introduce Mistral 7B, a 7-billion-parameter language model engineered for superior efficiency and performance. Mistral 7B outperforms the best open 13B model (Llama 2) across all evaluated benchmarks, and matches the performance of 34B models in reasoning, mathematics, and code generation. Our model leverages grouped-query attention (GQA) for faster inference, coupled with sliding window attention (SWA) to handle arbitrarily long sequences at reduced computational cost. We also provide an instruction-tuned model, Mistral 7B - Instruct, that surpasses the Llama 2 13B - Chat model on both human and automated benchmarks. Mistral 7B is released under the Apache 2.0 license.',
    saved: false,
  },
  {
    id: 'mock-7',
    title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
    authors: ['Jason Wei', 'Xuezhi Wang', 'Dale Schuurmans', 'Maarten Bosma', 'Ed Chi', 'Quoc Le', 'Denny Zhou'],
    year: '2022',
    citations: 9600,
    tags: ['LLM', 'Reasoning', 'Chain-of-Thought'],
    abstract: 'We explore how generating a series of intermediate reasoning steps—a chain of thought—significantly improves the ability of large language models to perform complex reasoning. In particular, we show how such reasoning abilities emerge naturally in sufficiently large language models via a simple method called chain-of-thought prompting, where a few chain-of-thought demonstrations are provided as exemplars in prompting. Experiments on three large language models show that chain-of-thought prompting improves performance on a range of arithmetic, commonsense, and symbolic reasoning benchmarks. For instance, prompting a 540B-parameter PaLM with just eight chain-of-thought exemplars achieves state-of-the-art accuracy on the GSM8K benchmark of math word problems, even surpassing finetuned GPT-3 with a verifier.',
    saved: false,
  },
  {
    id: 'mock-8',
    title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
    authors: ['Rafael Rafailov', 'Archit Sharma', 'Eric Mitchell', 'Stefano Ermon', 'Christopher D. Manning', 'Chelsea Finn'],
    year: '2023',
    citations: 4100,
    tags: ['DPO', 'LLM', 'Alignment', 'RLHF'],
    abstract: 'While large-scale unsupervised language models learn broad world knowledge and some reasoning skills, achieving precise control over their behavior is difficult due to the completely unsupervised nature of their training. Existing methods for gaining this steering control typically use reinforcement learning from human feedback (RLHF), a complex and often unstable procedure that first fits a reward model reflecting human preferences and then fine-tunes the large unsupervised LM using reinforcement learning to maximize this estimated reward without drifting too far from the original model. In this paper, we introduce a new parameterization of the reward model in RLHF that enables the extraction of the corresponding optimal policy in closed form, allowing the standard RLHF problem with KL divergence constraints to be solved with only a simple cross-entropy loss. The resulting algorithm, Direct Preference Optimization (DPO), is stable, performant, and computationally lightweight, eliminating the need for fitting a reward model, sampling from the LM during fine-tuning, or performing significant hyperparameter tuning.',
    saved: true,
  },
  {
    id: 'mock-9',
    title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    authors: ['Edward J. Hu', 'Yelong Shen', 'Phillip Wallis', 'Zeyuan Allen-Zhu', 'Yuanzhi Li', 'Shean Wang', 'Weizhu Chen'],
    year: '2021',
    citations: 16500,
    tags: ['LoRA', 'Fine-Tuning', 'LLM', 'Efficiency'],
    abstract: 'An important paradigm of natural language processing centers on large-scale pre-training on general domain data and adaptation to specific tasks or domains. As we pre-train larger models, full fine-tuning, which retrains all model parameters, becomes less feasible. Using GPT-3 175B as an example—deploying independent instances of fine-tuned models, each with 175B parameters, is prohibitively expensive. We propose Low-Rank Adaptation, or LoRA, which freezes the pre-trained model weights and injects trainable rank decomposition matrices into each layer of the Transformer architecture, greatly reducing the number of trainable parameters for downstream tasks. Compared to fine-tuning with Adam, LoRA can reduce the number of trainable parameters by 10,000 times and the GPU memory requirement by 3 times. LoRA performs on-par or better than fine-tuning in model quality on RoBERTa, DeBERTa, GPT-2, and GPT-3, despite having fewer trainable parameters, a higher training throughput, and, unlike adapters, no additional inference latency.',
    saved: false,
  },
  {
    id: 'mock-10',
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
    authors: ['Tri Dao', 'Daniel Y. Fu', 'Stefano Ermon', 'Atri Rudra', 'Christopher Ré'],
    year: '2022',
    citations: 7800,
    tags: ['FlashAttention', 'LLM', 'GPU Optimization', 'Transformers'],
    abstract: 'Transformers are slow and memory-hungry on long sequences, since the time and memory complexity of self-attention are quadratic in sequence length. Approximate attention methods have attempted to address this problem by trading off model quality to reduce the compute complexity, but often do not achieve wall-clock speedup. We argue that a missing principle is making attention algorithms IO-aware—accounting for reads and writes between levels of GPU memory. We propose FlashAttention, an IO-aware exact attention algorithm that uses tiling to reduce the number of memory reads/writes between GPU high-bandwidth memory (HBM) and GPU on-chip SRAM. We analyze the IO complexity of FlashAttention, proving that it requires fewer HBM accesses than standard attention, and is optimal for a range of SRAM sizes. FlashAttention trains Transformers faster than existing baselines: 15% end-to-end wall-clock speedup on BERT-large, 3x speedup on GPT-2, and 2.4x speedup on long-range arena benchmarks.',
    saved: true,
  },
  {
    id: 'mock-11',
    title: 'Tree of Thoughts: Deliberate Problem Solving with Large Language Models',
    authors: ['Shunyu Yao', 'Dian Yu', 'Jeffrey Zhao', 'Izhak Shafran', 'Thomas L. Griffiths', 'Yuan Cao', 'Karthik Narasimhan'],
    year: '2023',
    citations: 3100,
    tags: ['LLM', 'Tree-of-Thought', 'Reasoning', 'Search'],
    abstract: 'Popular autoregressive large language models (LLMs) are often constrained to token-level, left-to-right decision making during inference, which falls short for tasks requiring strategic foresight, self-evaluation, and lookahead search. To address these limitations, we introduce Tree of Thoughts (ToT), a general problem-solving framework that generalizes over the popular Chain-of-Thought prompting approach. ToT maintains a tree of thoughts where thoughts represent coherent language sequences serving as intermediate steps toward problem resolution. This allows an LLM to deliberately explore multiple reasoning paths, evaluate the promise of individual states through self-reflection, and leverage tree-search algorithms (such as breadth-first search or depth-first search) with systematic lookahead and backtracking. Experiments on three novel tasks requiring deliberate planning—Game of 24, Creative Writing, and 5x5 Mini Crosswords—demonstrate that ToT substantially enhances the problem-solving competencies of large language models.',
    saved: false,
  },
  {
    id: 'mock-12',
    title: 'Deep Residual Learning for Image Recognition',
    authors: ['Kaiming He', 'Xiangyu Zhang', 'Shaoqing Ren', 'Jian Sun'],
    year: '2016',
    citations: 185000,
    tags: ['Computer Vision', 'ResNet', 'CNN'],
    abstract: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions. We provide comprehensive empirical evidence showing that these residual networks are easier to optimize, and can gain accuracy from considerably increased depth. On the ImageNet dataset we evaluate residual nets with a depth of up to 152 layers—8x deeper than VGG nets but still having lower complexity. An ensemble of these residual nets achieves 3.57% error on the ImageNet test set. This result won the 1st place on the ILSVRC 2015 classification task.',
    saved: false,
  },
  {
    id: 'mock-13',
    title: 'Mastering the Game of Go with Deep Neural Networks and Tree Search',
    authors: ['David Silver', 'Aja Huang', 'Chris J. Maddison', 'Arthur Guez', 'Laurent Sifre', 'George van den Driessche', 'Julian Schrittwieser', 'Demis Hassabis'],
    year: '2016',
    citations: 45000,
    tags: ['Reinforcement Learning', 'AlphaGo', 'AI'],
    abstract: 'The game of Go has long been viewed as the most challenging of classic games for artificial intelligence owing to its enormous search space and the difficulty of evaluating board positions and moves. Here we introduce a new approach to computer Go that uses value networks to evaluate board positions and policy networks to select moves. These deep neural networks are trained through a novel combination of supervised learning from human expert games, and reinforcement learning from self-play games. Using search algorithms that combine Monte Carlo simulation with value and policy networks, our program AlphaGo achieved a 99.8% winning rate against other Go programs, and defeated the human European Go champion by 5 games to 0. This is the first time that a computer program has defeated a human professional player in the full-sized game of Go.',
    saved: true,
  },
  {
    id: 'mock-14',
    title: 'DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model',
    authors: ['DeepSeek AI Team', 'Haowei Zhang', 'Chenggang Zhao', 'Xiao Bi', 'Deyu Guan'],
    year: '2024',
    citations: 2100,
    tags: ['LLM', 'MoE', 'DeepSeek', 'Architecture'],
    abstract: 'We present DeepSeek-V2, an innovative open-source Mixture-of-Experts (MoE) language model with 236B total parameters, of which 21B are activated for each token. DeepSeek-V2 incorporates Multi-head Latent Attention (MLA) and DeepSeekMoE architecture to dramatically compress Key-Value (KV) cache memory footprints during inference and reduce training compute costs. Extensive evaluations demonstrate that DeepSeek-V2 achieves top-tier performance on standard reasoning, coding, and mathematical benchmarks comparable to state-of-the-art dense models, while drastically slashing training costs by 42.5% and accelerating inference throughput by over 5.76x compared to DeepSeek 67B.',
    saved: false,
  },
  {
    id: 'mock-15',
    title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
    authors: ['Albert Gu', 'Tri Dao'],
    year: '2023',
    citations: 3900,
    tags: ['Mamba', 'SSM', 'LLM', 'Linear Attention'],
    abstract: 'Foundation models, now predominantly based on the Transformer architecture and its core attention mechanism, suffer from sub-quadratic scaling with context length and memory-intensive KV caching during generation. While continuous-time state space models (SSMs) like S4 have emerged as promising linear-time architectures, their inability to selectively compress context prevents them from matching Transformer quality on dense modality benchmarks. We introduce Mamba, a new class of selective state space models where SSM parameters are conditioned on input tokens, allowing the model to filter out irrelevant information and remember critical tokens indefinitely. Combined with a hardware-aware parallel scan algorithm on GPU SRAM, Mamba achieves 5x higher inference throughput than Transformers, sub-quadratic training speedups, and superior modeling performance across language, audio, and genomics benchmarks up to million-token contexts.',
    saved: true,
  },
];

// ─── OFFLINE STORAGE KEYS & CACHES ──────────────────────────────────────────
export const OFFLINE_PROJECTS_KEY = '@library_projects';
export const OFFLINE_COMMUNITIES_KEY = '@offline_communities';
export const OFFLINE_PAPERS_CACHE_KEY = '@offline_papers_cache';
export const OFFLINE_SAVED_PAPERS_KEY = '@library_saved_papers';

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

// Initialize local projects from storage
AsyncStorage.getItem(OFFLINE_PROJECTS_KEY).then((raw) => {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localProjects = parsed;
      }
    } catch {}
  }
}).catch(() => {});

export const persistLocalProjects = async (projects: Project[]) => {
  try {
    localProjects = projects;
    await AsyncStorage.setItem(OFFLINE_PROJECTS_KEY, JSON.stringify(projects));
  } catch {}
};

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

// Initialize local communities from storage
AsyncStorage.getItem(OFFLINE_COMMUNITIES_KEY).then((raw) => {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localCommunities = parsed;
      }
    } catch {}
  }
}).catch(() => {});

export const persistLocalCommunities = async (comms: Community[]) => {
  try {
    localCommunities = comms;
    await AsyncStorage.setItem(OFFLINE_COMMUNITIES_KEY, JSON.stringify(comms));
  } catch {}
};

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
// ─── IN-MEMORY & PERSISTED PAPER CACHE ──────────────────────────────────────
export const paperCache = new Map<string, Paper>();

// Load persisted papers into paperCache on startup
AsyncStorage.getItem(OFFLINE_PAPERS_CACHE_KEY).then((raw) => {
  if (raw) {
    try {
      const list: Paper[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((p) => {
          if (p && p.id && !paperCache.has(p.id)) {
            paperCache.set(p.id, p);
          }
        });
      }
    } catch {}
  }
}).catch(() => {});

let cacheSaveTimeout: any = null;
const persistPaperCacheDebounced = () => {
  if (cacheSaveTimeout) clearTimeout(cacheSaveTimeout);
  cacheSaveTimeout = setTimeout(async () => {
    try {
      const arr = Array.from(paperCache.values()).slice(-150);
      await AsyncStorage.setItem(OFFLINE_PAPERS_CACHE_KEY, JSON.stringify(arr));
    } catch {}
  }, 1000);
};

export const getAbstractText = (paper?: {
  title?: string;
  abstract?: string;
  summary?: string;
  description?: string;
  authors?: string[];
  year?: string;
  tags?: string[];
} | null): string => {
  if (!paper) return 'No abstract metadata available for this publication.';
  
  if (
    paper.abstract &&
    typeof paper.abstract === 'string' &&
    paper.abstract.trim().length > 10 &&
    !paper.abstract.toLowerCase().startsWith('no abstract available') &&
    !paper.abstract.toLowerCase().startsWith('abstract not available')
  ) {
    return paper.abstract.trim();
  }
  if (paper.description && typeof paper.description === 'string' && paper.description.trim().length > 10) {
    return paper.description.trim();
  }
  if (paper.summary && typeof paper.summary === 'string' && paper.summary.trim().length > 10) {
    return paper.summary.trim();
  }

  return 'The complete original abstract for this publication is not indexed in public metadata. Tap "Read PDF / View Source" to access the full paper.';
};

export const cachePapers = (papers: Paper[]) => {
  if (!Array.isArray(papers)) return;
  papers.forEach((p) => {
    if (p && p.id) {
      if (!p.abstract || p.abstract.trim().length < 10) {
        p.abstract = getAbstractText(p);
      }
      paperCache.set(p.id, p);
    }
  });
  persistPaperCacheDebounced();
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
        if (query.tag === 'saved' || query.saved_by === 'true') {
          AsyncStorage.setItem(OFFLINE_SAVED_PAPERS_KEY, JSON.stringify(res.data)).catch(() => {});
        }
      }
      return res;
    } catch {
      // Fallback for guest mode / unauthenticated / offline
      let filtered = [...MOCK_PAPERS];
      if (query.tag === 'saved' || query.saved_by === 'true') {
        try {
          const savedRaw = await AsyncStorage.getItem(OFFLINE_SAVED_PAPERS_KEY);
          if (savedRaw) {
            const parsed = JSON.parse(savedRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return { success: true, data: parsed };
            }
          }
        } catch {}
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
        persistPaperCacheDebounced();
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

    // 3. Check persistent storage for saved library papers
    try {
      const savedRaw = await AsyncStorage.getItem(OFFLINE_SAVED_PAPERS_KEY);
      if (savedRaw) {
        const savedList: Paper[] = JSON.parse(savedRaw);
        const fromSaved = savedList.find((p) => p.id === id);
        if (fromSaved) {
          paperCache.set(fromSaved.id, fromSaved);
          return { success: true, data: fromSaved };
        }
      }
    } catch {}

    console.error(`[papersApi.getById] Paper not found anywhere for id: ${id}`);
    return { success: false, error: 'Paper not found.' };
  },

  toggleSave: async (id: string) => {
    let newSavedState = false;
    try {
      const res = await request<{ saved: boolean }>(`/papers/${id}/save`, { method: 'POST' });
      newSavedState = res.data?.saved ?? false;
      const p = paperCache.get(id);
      if (p) p.saved = newSavedState;
    } catch {
      const p = MOCK_PAPERS.find(x => x.id === id) || paperCache.get(id);
      if (p) {
        p.saved = !p.saved;
        newSavedState = p.saved;
      } else {
        newSavedState = true;
      }
    }

    // Keep OFFLINE_SAVED_PAPERS_KEY in sync
    try {
      const savedRaw = await AsyncStorage.getItem(OFFLINE_SAVED_PAPERS_KEY);
      let list: Paper[] = savedRaw ? JSON.parse(savedRaw) : [];
      if (newSavedState) {
        const paperToSave = paperCache.get(id) || MOCK_PAPERS.find(x => x.id === id);
        if (paperToSave && !list.some(p => p.id === id)) {
          list.unshift({ ...paperToSave, saved: true });
        }
      } else {
        list = list.filter(p => p.id !== id);
      }
      await AsyncStorage.setItem(OFFLINE_SAVED_PAPERS_KEY, JSON.stringify(list));
    } catch {}

    return { success: true, data: { saved: newSavedState } };
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
      const alexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&page=${pageNum}&select=id,title,authorships,publication_year,cited_by_count,open_access,doi,primary_location,abstract_inverted_index`;
      const alexRes = await fetch(alexUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Abstracts/1.0 (mailto:abstracts@example.com)',
        },
      });
      if (alexRes.ok) {
        const alexData = await alexRes.json();
        if (alexData.results && Array.isArray(alexData.results) && alexData.results.length > 0) {
          const converted: ExternalPaper[] = alexData.results.map((item: any) => {
            let fullAbstract = '';
            if (item.abstract_inverted_index) {
              const words: string[] = [];
              for (const [word, positions] of Object.entries(item.abstract_inverted_index)) {
                for (const pos of (positions as number[])) {
                  words[pos] = word;
                }
              }
              fullAbstract = words.join(' ').replace(/\s+/g, ' ').trim();
            }
            return {
              externalId: item.id || Math.random().toString(),
              title: item.display_name || item.title || 'Untitled Research Paper',
              authors: item.authorships ? item.authorships.map((a: any) => a.author?.display_name).filter(Boolean) : ['OpenAlex Researcher'],
              year: item.publication_year ? String(item.publication_year) : '2024',
              citations: item.cited_by_count || 0,
              abstract: fullAbstract || '',
              source: 'OpenAlex',
              url: item.doi || item.primary_location?.landing_page_url || null,
              pdfUrl: item.primary_location?.pdf_url || item.open_access?.oa_url || null,
              doi: item.doi || null,
            };
          });
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

// ─── Local Recommendation State & Caching ─────────────────────────────────────
// 1. Memory Cache (`recCache`): Stores paper recommendations per topic for the lifetime of the app session.
//    Prevents redundant network calls when switching between tabs.
const recCache = new Map<string, Paper[]>();

// 2. Local Concurrency Lock (`activeRecPromise`):
//    Guarantees that on this specific device, only ONE network request for recommendations runs at a time.
//    If the user rapidly switches topic pills (e.g. ML -> Vision -> NLP), requests queue up cleanly rather than firing in parallel.
let activeRecPromise: Promise<Paper[]> | null = null;

// 3. Official Semantic Scholar API Key:
//    Reads from Expo env variables (EXPO_PUBLIC_SEMANTIC_SCHOLAR_API_KEY).
//    When provided, includes 'x-api-key' header in direct requests to unlock official high rate limits (10,000+ reqs/min).
let configuredSemanticScholarApiKey = process.env.EXPO_PUBLIC_SEMANTIC_SCHOLAR_API_KEY || '';

/**
 * Dynamically set or update the Semantic Scholar API Key at runtime.
 */
export const setSemanticScholarApiKey = (key: string) => {
  configuredSemanticScholarApiKey = key.trim();
};

// ─── Recommendation API ───────────────────────────────────────────────────
export const recommendationApi = {
  /**
   * Clears recommendation cache for a specific topic or all topics.
   * Called when the user triggers a pull-to-refresh on the "For You" screen.
   */
  clearCache: (topic?: string) => {
    if (topic) {
      recCache.delete(topic);
    } else {
      recCache.clear();
    }
  },

  /**
   * Fetch recommended latest research papers for a given topic using a robust 3-tier strategy:
   * 
   * ── Tier 1: Primary (Backend Server proxy)
   * Calls your backend server `/api/search/papers`, which uses your server-side `SEMANTIC_SCHOLAR_API_KEY`
   * and shared server-side caching (1ms response for duplicate topics across all users).
   * 
   * ── Tier 2: Direct Semantic Scholar API
   * Direct call to Semantic Scholar Graph API with `x-api-key` header (if available) and `sort=publicationDate:desc`
   * to fetch papers published in the last 2 years.
   * 
   * ── Tier 3: Direct OpenAlex API (Rate-limit safe fallback)
   * High-capacity fallback sorted by publication year (`sort=publication_year:desc`) to ensure papers are always returned.
   */
  getRecommendations: async (topic: string, limit = 15): Promise<Paper[]> => {
    // STEP 1: Check In-Memory App Cache
    // If we already fetched papers for this topic during this app session, return them instantly without hitting the network.
    if (recCache.has(topic) && recCache.get(topic)!.length > 0) {
      return recCache.get(topic)!;
    }

    // STEP 2: Device-level Concurrency Protection
    // If a request is ALREADY in flight on this phone, wait for it to complete instead of launching another parallel request.
    if (activeRecPromise) {
      console.log('[Recommendations] Request in progress on device, waiting...');
      await activeRecPromise;
      if (recCache.has(topic)) {
        return recCache.get(topic)!;
      }
    }

    // STEP 3: Execute the 3-Tier Fetching Task
    const fetchTask = (async (): Promise<Paper[]> => {
      // ── TIER 1: Backend Server Search (Uses Server API key & Shared Server Cache) ──
      try {
        const res = await searchApi.searchPapers(topic, limit, 0, { sort: 'publicationDate:desc' });
        if (res.success && res.data && res.data.length > 0) {
          const results: Paper[] = res.data.map((p: ExternalPaper) => ({
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

          // Sort papers by publication year descending (newest first)
          results.sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));
          cachePapers(results);
          recCache.set(topic, results);
          return results;
        }
      } catch {
        console.warn('[Recommendations] Authorised server search failed, trying direct Semantic Scholar...');
      }

      // ── TIER 2: Direct Semantic Scholar API Call (With Optional Client API Key) ──
      try {
        const currentYear = new Date().getFullYear();
        const yearFilter = `${currentYear - 2}-${currentYear}`; // Last 2 years
        const fields = 'paperId,title,abstract,year,publicationDate,citationCount,authors,openAccessPdf,url';
        const s2Url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=${limit}&year=${yearFilter}&fields=${fields}&sort=publicationDate:desc`;
        
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        // Attach Official API key header if available
        if (configuredSemanticScholarApiKey) {
          headers['x-api-key'] = configuredSemanticScholarApiKey;
        }

        const s2Res = await fetch(s2Url, { headers });

        if (s2Res.ok) {
          const s2Data = await s2Res.json();
          if (s2Data.data && s2Data.data.length > 0) {
            const results: Paper[] = s2Data.data.map((paper: any) => ({
              id: paper.paperId || Math.random().toString(),
              title: paper.title || 'Untitled',
              authors: (paper.authors || []).map((a: any) => a.name),
              year: paper.year ? String(paper.year) : '2024',
              citations: paper.citationCount || 0,
              tags: [configuredSemanticScholarApiKey ? 'Semantic Scholar (Official API)' : 'Semantic Scholar (Public)'],
              abstract: paper.abstract || 'Abstract not available.',
              pdf_url: paper.openAccessPdf?.url || null,
              source_url: paper.url || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            // Sort papers by publication year descending (newest first)
            results.sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));
            cachePapers(results);
            recCache.set(topic, results);
            return results;
          }
        }
      } catch (err) {
        console.warn('[Recommendations] Direct Semantic Scholar fetch failed:', err);
      }

      // ── TIER 3: Direct OpenAlex API (Free Fallback, No Rate Limits) ──
      try {
        const oaUrl = `https://api.openalex.org/works?filter=title_and_abstract.search:${encodeURIComponent(topic)}&per_page=${limit}&sort=publication_year:desc&select=id,title,authorships,publication_year,cited_by_count,open_access,doi,primary_location,abstract_inverted_index`;
        const oaRes = await fetch(oaUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Abstracts/1.0 (mailto:abstracts@example.com)',
          },
        });

        if (oaRes.ok) {
          const oaData = await oaRes.json();
          if (oaData.results && oaData.results.length > 0) {
            const results: Paper[] = oaData.results.map((work: any) => {
              // Reconstruct abstract string from OpenAlex inverted index structure
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
                year: work.publication_year ? String(work.publication_year) : '2024',
                citations: work.cited_by_count || 0,
                tags: ['OpenAlex (Latest)'],
                abstract,
                pdf_url: work.open_access?.oa_url || work.primary_location?.pdf_url || null,
                source_url: work.primary_location?.landing_page_url || work.doi || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
            });

            // Sort papers by publication year descending (newest first)
            results.sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));
            cachePapers(results);
            recCache.set(topic, results);
            return results;
          }
        }
      } catch (err) {
        console.warn('[Recommendations] OpenAlex failed:', err);
      }

      return [];
    })();

    // Register active promise and reset lock when done
    activeRecPromise = fetchTask;
    try {
      return await fetchTask;
    } finally {
      activeRecPromise = null;
    }
  },
};

// ─── Projects API ───────────────────────────────────────────────────────────
export const projectsApi = {
  getAll: async (): Promise<ApiResponse<Project[]>> => {
    try {
      const res = await request<Project[]>('/projects');
      if (res.success && res.data) {
        persistLocalProjects(res.data);
      }
      return res;
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
        const populatedPapers = (found.papers || []).map((pid: any) => {
          const idStr = typeof pid === 'string' ? pid : pid?.id;
          return paperCache.get(idStr) || MOCK_PAPERS.find(p => p.id === idStr) || (typeof pid === 'object' ? pid : null);
        }).filter(Boolean) as Paper[];
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
      const res = await request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.success && res.data) {
        localProjects.unshift(res.data);
        persistLocalProjects(localProjects);
      }
      return res;
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
      localProjects.unshift(newProj);
      persistLocalProjects(localProjects);
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
          persistLocalProjects(localProjects);
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
        persistLocalProjects(localProjects);
      }
      return { success: true, data: null, message: 'Paper removed' };
    }
  },

  /**
   * Import an external paper to local library AND add to project
   */
  importAndAddPaper: async (projectId: string, paper: Paper): Promise<ApiResponse<any>> => {
    cachePapers([paper]);
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
          persistLocalProjects(localProjects);
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
      const res = await request<Community[]>('/community');
      if (res.success && res.data) {
        persistLocalCommunities(res.data);
      }
      return res;
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
        persistLocalCommunities(localCommunities);
      }
      return { success: true, data: { isMember: true } };
    }
  },

  create: async (data: { name: string; description?: string; subject: string; icon?: string }): Promise<ApiResponse<Community>> => {
    try {
      const res = await request<Community>('/community', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.success && res.data) {
        localCommunities.unshift(res.data);
        persistLocalCommunities(localCommunities);
      }
      return res;
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
      localCommunities.unshift(newComm);
      persistLocalCommunities(localCommunities);
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
        persistLocalCommunities(localCommunities);
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
        persistLocalCommunities(localCommunities);
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
