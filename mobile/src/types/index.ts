// Shared Data Models for Abstracts Mobile App

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: string;
  citations: number;
  tags: string[];
  abstract: string;
  pdf_url?: string | null;
  source_url?: string | null;
  saved?: boolean;
  readingProgress?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalPaper {
  externalId: string;
  title: string;
  authors: string[];
  year: string;
  citations: number;
  abstract: string;
  url: string | null;
  pdfUrl: string | null;
  doi: string | null;
  source: string;
}

export interface AbstractHighlight {
  id: string;
  user_id: string;
  paper_id: string;
  text: string;
  color: string;
}

export interface Project {
  id: string;
  user_id?: string;
  name: string;
  description: string;
  color: string;
  paperCount: number;
  progress: number;
  papers?: (Paper | string)[];
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_initials: string;
  avatar_url?: string;
  interests?: string[];
  hasSelectedInterests?: boolean;
  stats?: {
    savedPapers: number;
    projects: number;
    papersInProgress: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  subject: string;
  icon: string;
  memberCount: number;
  postCount?: number;
  isMember: boolean;
  posts?: CommunityPost[];
}

export interface CommunityPost {
  id: string;
  community_id?: string;
  user_id?: string;
  content: string;
  papers?: Paper[];
  likes: number;
  author?: { name: string; avatar_initials: string; avatar_url?: string; role: string };
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
  message?: string;
}
