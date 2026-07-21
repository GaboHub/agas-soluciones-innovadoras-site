import raw from '../data/faqs.json';

export interface FaqItem {
  pregunta: string;
  respuesta: string;
}

export interface FaqsData {
  global: FaqItem[];
}

export const faqs: FaqsData = raw as FaqsData;

export const faqsGlobales: FaqItem[] = faqs.global;
