import { apiClient, type ApiResponse } from './apiClient';

export interface CmsPolicy {
  id: string;
  title: string;
  policyType: 'PRIVACY' | 'TERMS' | string;
  version?: string;
  content: string;
  effectiveDate?: string;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
}

export interface CmsFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CmsBanner {
  id: string;
  title: string;
  imageUrl: string;
  mobileImageUrl?: string;
  redirectUrl?: string;
  displayOrder?: number;
  startDate?: string;
  endDate?: string;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
}

export const cmsService = {
  // Policies (Privacy Policy & Terms)
  getPolicies: async (policyType?: string): Promise<ApiResponse<CmsPolicy[]>> => {
    const query = policyType ? `?policyType=${encodeURIComponent(policyType)}` : '';
    return apiClient.get<CmsPolicy[]>(`/api/v1/cms/policies${query}`);
  },

  createPolicy: async (dto: Partial<CmsPolicy>): Promise<ApiResponse<CmsPolicy>> => {
    return apiClient.post<CmsPolicy>('/api/v1/cms/policies', dto);
  },

  updatePolicy: async (id: string, dto: Partial<CmsPolicy>): Promise<ApiResponse<CmsPolicy>> => {
    return apiClient.put<CmsPolicy>(`/api/v1/cms/policies/${id}`, dto);
  },

  deletePolicy: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.delete(`/api/v1/cms/policies/${id}`);
  },

  // Pages
  getPages: async (status?: string): Promise<ApiResponse<CmsPage[]>> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient.get<CmsPage[]>(`/api/v1/cms/pages${query}`);
  },

  createPage: async (dto: Partial<CmsPage>): Promise<ApiResponse<CmsPage>> => {
    return apiClient.post<CmsPage>('/api/v1/cms/pages', dto);
  },

  updatePage: async (id: string, dto: Partial<CmsPage>): Promise<ApiResponse<CmsPage>> => {
    return apiClient.put<CmsPage>(`/api/v1/cms/pages/${id}`, dto);
  },

  deletePage: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.delete(`/api/v1/cms/pages/${id}`);
  },

  // FAQs
  getFaqs: async (category?: string): Promise<ApiResponse<CmsFaq[]>> => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiClient.get<CmsFaq[]>(`/api/v1/cms/faqs${query}`);
  },

  createFaq: async (dto: Partial<CmsFaq>): Promise<ApiResponse<CmsFaq>> => {
    return apiClient.post<CmsFaq>('/api/v1/cms/faqs', dto);
  },

  updateFaq: async (id: string, dto: Partial<CmsFaq>): Promise<ApiResponse<CmsFaq>> => {
    return apiClient.put<CmsFaq>(`/api/v1/cms/faqs/${id}`, dto);
  },

  deleteFaq: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.delete(`/api/v1/cms/faqs/${id}`);
  },

  // Banners
  getBanners: async (): Promise<ApiResponse<CmsBanner[]>> => {
    return apiClient.get<CmsBanner[]>('/api/v1/cms/banners');
  },

  createBanner: async (dto: Partial<CmsBanner>): Promise<ApiResponse<CmsBanner>> => {
    return apiClient.post<CmsBanner>('/api/v1/cms/banners', dto);
  },

  updateBanner: async (id: string, dto: Partial<CmsBanner>): Promise<ApiResponse<CmsBanner>> => {
    return apiClient.put<CmsBanner>(`/api/v1/cms/banners/${id}`, dto);
  },

  deleteBanner: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.delete(`/api/v1/cms/banners/${id}`);
  },
};

export default cmsService;
