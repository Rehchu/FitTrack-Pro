import { create } from 'zustand';

interface BrandingState {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string | null;
  customStyles: Record<string, string>;
  setBranding: (branding: Partial<BrandingState>) => void;
}

export const useBrandingStore = create<BrandingState>((set) => ({
  businessName: '',
  logoUrl: null,
  primaryColor: '#4A90E2',
  secondaryColor: '#F5A623',
  customDomain: null,
  customStyles: {},
  setBranding: (branding) => set((state) => ({ ...state, ...branding })),
}));