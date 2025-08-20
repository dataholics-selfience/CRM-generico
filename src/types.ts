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
  role: 'admin' | 'vendedor';
  createdAt: string;
  emailVerified?: boolean;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  plans: ServicePlan[];
  createdAt: string;
  createdBy: string;
  active: boolean;
}

export interface ServicePlan {
  id: string;
  name: string;
  price: number;
  duration: string; // "mensal", "anual", "único"
  features: string[];
  active: boolean;
}

export interface ClientType {
  id: string;
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
  stage: 'mapeada' | 'selecionada' | 'contatada' | 'entrevistada' | 'poc' | 'proposta' | 'negociacao' | 'fechada' | 'perdida';
  serviceId: string;
  planId: string;
  assignedTo: string; // userId do vendedor responsável
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BusinessType {
  id: string;
  nome: string; // Nome do negócio
  valor: number; // Valor do negócio
  companyId: string; // ID da empresa
  contactIds: string[]; // IDs dos contatos
  serviceId: string;
  planId: string;
  stage: string; // ID do estágio
  assignedTo: string; // userId do vendedor responsável
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  description?: string; // Descrição do negócio
}

export interface ContactType {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  linkedin: string;
  cargoAlvo: string;
  companyId: string; // ID da empresa
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CompanyType {
  id: string;
  nome: string;
  cnpj: string;
  segmento: string;
  regiao: string;
  tamanho: string;
  faturamento: string;
  dores: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface InteractionType {
  id: string;
  clientId: string;
  userId: string;
  userName: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | 'service_change';
  title: string;
  description: string;
  date: string;
  createdAt: string;
  metadata?: {
    previousStage?: string;
    newStage?: string;
    previousService?: string;
    newService?: string;
  };
}

export interface SaleType {
  id: string;
  clientId: string;
  serviceId: string;
  planId: string;
  value: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdBy: string;
  createdAt: string;
  closedAt?: string;
  notes?: string;
}

export interface StartupListType {
  id: string;
  userId: string;
  userEmail: string;
  segmentTitle: string;
  ratingExplanation: string;
  startups: StartupType[];
  empresas?: StartupType[];
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

export interface DashboardMetrics {
  totalClients: number; // Total de negócios
  newClientsThisMonth: number;
  totalSales: number;
  salesThisMonth: number;
  conversionRate: number;
  averageTicket: number;
  pipelineValue: number;
  mrr: number; // Monthly Recurring Revenue
  monthlyRevenue: number; // Receita total mensal
  annualRevenue: number; // Receita total anual
  arr: number; // Annual Recurring Revenue
  clientsByStage: Record<string, number>;
  salesStatus: {
    won: number;
    lost: number;
    inProgress: number;
  };
  salesByService: Record<string, number>;
  topPerformers: Array<{
    userId: string;
    userName: string;
    sales: number;
    clients: number;
  }>;
}

export interface PipelineStageType {
  id: string;
  name: string;
  color: string;
  position: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyType {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}