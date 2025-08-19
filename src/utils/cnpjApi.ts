/**
 * Utility functions for CNPJ API calls
 * Handles both development (with proxy) and production environments
 */

export interface CNPJData {
  nome: string;
  fantasia?: string;
  cnpj: string;
  abertura?: string;
  situacao?: string;
  tipo?: string;
  porte?: string;
  natureza_juridica?: string;
  atividade_principal?: Array<{code: string, text: string}>;
  atividades_secundarias?: Array<{code: string, text: string}>;
  qsa?: Array<{nome: string, qual: string}>;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  municipio?: string;
  bairro?: string;
  uf?: string;
  cep?: string;
  email?: string;
  telefone?: string;
  data_situacao?: string;
  ultima_atualizacao?: string;
  capital_social?: string;
  efr?: string;
  motivo_situacao?: string;
  situacao_especial?: string;
  data_situacao_especial?: string;
  status?: string;
  message?: string;
}

/**
 * Fetches CNPJ data from ReceitaWS API
 * @param cnpj - CNPJ string (with or without formatting)
 * @returns Promise with CNPJ data
 */
export const fetchCNPJData = async (cnpj: string): Promise<CNPJData> => {
  // Remove formatting from CNPJ
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) {
    throw new Error('CNPJ deve ter 14 dígitos');
  }

  // Always use proxy in development, use CORS proxy in production
  const isDevelopment = import.meta.env.DEV;
  const apiUrl = isDevelopment 
    ? `/api/cnpj/${cleanCNPJ}` // Use Vite proxy in development
    : `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`)}`; // Use CORS proxy in production

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data: CNPJData;
    
    if (isDevelopment) {
      // In development, response is direct from ReceitaWS
      data = await response.json();
    } else {
      // In production, response is wrapped by AllOrigins
      const proxyResponse = await response.json();
      if (proxyResponse.status && proxyResponse.status.http_code !== 200) {
        throw new Error(`API error! status: ${proxyResponse.status.http_code}`);
      }
      data = JSON.parse(proxyResponse.contents);
    }

    if (data.status === 'ERROR') {
      throw new Error(data.message || 'CNPJ não encontrado');
    }

    return data;
  } catch (error) {
    console.error('Error fetching CNPJ data:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro ao consultar CNPJ. Verifique sua conexão e tente novamente.');
  }
};

/**
 * Formats CNPJ string with mask XX.XXX.XXX/XXXX-XX
 * @param value - Raw CNPJ string
 * @returns Formatted CNPJ string
 */
export const formatCNPJ = (value: string): string => {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '');
  
  // Aplica a máscara XX.XXX.XXX/XXXX-XX
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

/**
 * Maps company size from ReceitaWS to our internal values
 * @param porte - Company size from API
 * @returns Mapped company size
 */
export const mapPorte = (porte: string): string => {
  if (porte.includes('MICRO')) return 'Micro (até 9 funcionários)';
  if (porte.includes('PEQUENO')) return 'Pequena (10-49 funcionários)';
  if (porte.includes('MEDIO') || porte.includes('MÉDIO')) return 'Média (50-249 funcionários)';
  if (porte.includes('GRANDE')) return 'Grande (250+ funcionários)';
  return 'Micro (até 9 funcionários)'; // Default
};

/**
 * Maps revenue based on capital social
 * @param capitalSocial - Capital social from API
 * @returns Mapped revenue range
 */
export const mapFaturamento = (capitalSocial: string): string => {
  const capital = parseFloat(capitalSocial.replace(/[^\d,]/g, '').replace(',', '.'));
  if (capital <= 360000) return 'Até R$ 360 mil';
  if (capital <= 4800000) return 'R$ 360 mil - R$ 4,8 milhões';
  if (capital <= 300000000) return 'R$ 4,8 milhões - R$ 300 milhões';
  return 'Acima de R$ 300 milhões';
};

/**
 * Determines business segment based on main activity
 * @param atividadePrincipal - Main activity from API
 * @returns Business segment
 */
export const determineSegmento = (atividadePrincipal: Array<{code: string, text: string}>): string => {
  if (!atividadePrincipal || atividadePrincipal.length === 0) return 'Outros';
  
  const atividade = atividadePrincipal[0].text.toLowerCase();
  
  if (atividade.includes('tecnologia') || atividade.includes('software') || 
      atividade.includes('dados') || atividade.includes('internet') ||
      atividade.includes('hospedagem') || atividade.includes('aplicação')) {
    return 'Tecnologia';
  }
  if (atividade.includes('saúde') || atividade.includes('médic') || atividade.includes('hospital')) {
    return 'Saúde';
  }
  if (atividade.includes('educação') || atividade.includes('ensino') || atividade.includes('escola')) {
    return 'Educação';
  }
  if (atividade.includes('financ') || atividade.includes('banco') || atividade.includes('crédito')) {
    return 'Financeiro';
  }
  if (atividade.includes('varejo') || atividade.includes('comércio') || atividade.includes('venda')) {
    return 'Varejo';
  }
  if (atividade.includes('indústria') || atividade.includes('fabricação') || atividade.includes('manufatura')) {
    return 'Indústria';
  }
  if (atividade.includes('agro') || atividade.includes('rural') || atividade.includes('pecuária')) {
    return 'Agronegócio';
  }
  if (atividade.includes('serviço') || atividade.includes('consultoria') || atividade.includes('assessoria')) {
    return 'Serviços';
  }
  
  return 'Outros';
};

/**
 * Determines region based on state (UF)
 * @param uf - State abbreviation
 * @returns Region name
 */
export const determineRegiao = (uf: string): string => {
  const norte = ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'];
  const nordeste = ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'];
  const centroOeste = ['GO', 'MT', 'MS', 'DF'];
  const sudeste = ['ES', 'MG', 'RJ', 'SP'];
  const sul = ['PR', 'RS', 'SC'];
  
  if (norte.includes(uf)) return 'Norte';
  if (nordeste.includes(uf)) return 'Nordeste';
  if (centroOeste.includes(uf)) return 'Centro-Oeste';
  if (sudeste.includes(uf)) return 'Sudeste';
  if (sul.includes(uf)) return 'Sul';
  
  return 'Sudeste'; // Default
};