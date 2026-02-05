export interface User {
  id: string;
  email: string;
  credits: number;
  created_at: string;
}

export interface ScrapeJob {
  id: string;
  user_id: string;
  store_url: string;
  store_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  csv_path?: string;
  products_count?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface StoreValidation {
  url: string;
  isValid: boolean;
  storeName: string;
  productCount?: number;
  message?: string;
}

export interface Product {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  variants: ProductVariant[];
  images?: ProductImage[];
  created_at?: string;
  updated_at?: string;
  published_at?: string;
}

export interface ProductVariant {
  id: number;
  title: string;
  price: string;
  sku?: string;
  inventory_quantity?: number;
  grams?: number;
  compare_at_price?: string;
  option1?: string;
  option2?: string;
  option3?: string;
}

export interface ProductImage {
  id: number;
  src: string;
}
