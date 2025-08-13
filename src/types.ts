import { CropIcon as IconProps } from 'lucide-react';

export interface MessageType {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  segmentId?: string;
  hidden?: boolean;
  messageId?: string;
}

export interface SegmentType {
  id: string;
  userId: string;
  userEmail: string;
  company: string;
  title: string;
  description: string;
  sessionId: string;
  createdAt: string;
}

export interface UserType {
  uid: string;
  name: string;
  email: string;
  cpf: string;
  company: string;
  phone: string;
  createdAt: string;
}


export interface StartupListType {
  id: string;
  userId: string;
  userEmail: string;
  segmentTitle: string;
  ratingExplanation: string;
  startups: StartupType[]; // Keep for backward compatibility
  empresas?: StartupType[]; // New field for companies
  projectPlanning: ProjectPhaseType[];
  expectedResults: string[];
  competitiveAdvantages: string[];
  createdAt: string;
}

export interface ManualCompanyType {
  id?: string;
  nome: string;
  empresa: string;
  cnpj: string;
  email: string;
  whatsapp: string;
  linkedin: string;
  segmento: string;
  regiao: string;
  tamanho: string;
  faturamento: string;
  cargoAlvo: string;
  dores: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLink {
  type: 'website' | 'email' | 'linkedin' | 'facebook' | 'twitter' | 'instagram';
  url: string;
  icon: (props: IconProps) => JSX.Element;
  label: string;
}

export interface StartupType {
  name: string;
  description: string;
  rating: number;
  website: string;
  category: string;
  vertical: string;
  foundedYear: string;
  teamSize: string;
  businessModel: string;
  email: string;
  ipoStatus: string;
  city: string;
  reasonForChoice: string;
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
}

export interface ProjectPhaseType {
  phase: string;
  duration: string;
  description: string;
}