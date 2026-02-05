import axios, { AxiosError } from 'axios';
import { Product, ProductVariant, ProductImage } from '../types';

// Constants from Python implementation
const MAX_PAGE_LIMIT = 250; // Shopify max per page
const DEFAULT_DELAY = 1000; // 1 second between requests
const MAX_PAGES = 50; // Safety limit (12500 products max)
const REQUEST_TIMEOUT = 30000;

interface ScrapeOptions {
  delay?: number;
  maxPages?: number;
  onProgress?: (page: number, totalProducts: number) => void;
}

interface ScrapeResult {
  success: boolean;
  products: Product[];
  totalCount: number;
  pagesFetched: number;
  error?: string;
}

/**
 * Normalize store URL to ensure consistent format
 */
export function normalizeStoreUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  
  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  return normalized;
}

/**
 * Extract store name from URL
 */
export function extractStoreName(url: string): string {
  const normalized = normalizeStoreUrl(url);
  const hostname = normalized.replace(/^https?:\/\//, '').split('/')[0];
  return hostname.replace('.myshopify.com', '').replace('.com', '');
}

/**
 * Validate if a URL is a valid Shopify store
 * Mirrors the Python implementation's validation logic
 */
export async function validateShopifyStore(url: string): Promise<{
  isValid: boolean;
  url: string;
  storeName: string;
  productCount?: number;
  message?: string;
}> {
  const normalizedUrl = normalizeStoreUrl(url);
  const storeName = extractStoreName(normalizedUrl);
  
  try {
    // Try to fetch just 1 product to validate
    const response = await axios.get(
      `${normalizedUrl}/products.json?limit=1`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (response.data && Array.isArray(response.data.products)) {
      const firstProduct = response.data.products[0];
      
      return {
        isValid: true,
        url: normalizedUrl,
        storeName: firstProduct?.vendor || storeName,
        productCount: undefined, // Will be determined during full scrape
      };
    }

    return {
      isValid: false,
      url: normalizedUrl,
      storeName,
      message: 'Not a valid Shopify store',
    };
  } catch (error: any) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response?.status === 404) {
      return {
        isValid: false,
        url: normalizedUrl,
        storeName,
        message: 'Store not found or products.json not accessible',
      };
    }
    
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return {
        isValid: false,
        url: normalizedUrl,
        storeName,
        message: 'Connection timeout',
      };
    }
    
    if (axiosError.response?.status === 429) {
      return {
        isValid: false,
        url: normalizedUrl,
        storeName,
        message: 'Rate limited. Please try again later.',
      };
    }
    
    return {
      isValid: false,
      url: normalizedUrl,
      storeName,
      message: 'Unable to reach store',
    };
  }
}

/**
 * Scrape all products from a Shopify store
 * Direct TypeScript port of the Python shopify_scraper.py logic
 */
export async function scrapeShopifyProducts(
  storeUrl: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const normalizedUrl = normalizeStoreUrl(storeUrl);
  const delay = options.delay || DEFAULT_DELAY;
  const maxPages = options.maxPages || MAX_PAGES;
  
  const allProducts: any[] = [];
  let page = 1;
  let hasMore = true;
  let rateLimitRetries = 0;
  const maxRateLimitRetries = 3;

  console.log(`[Scraper] Starting scrape for: ${normalizedUrl}`);

  while (hasMore && page <= maxPages) {
    const url = `${normalizedUrl}/products.json?limit=${MAX_PAGE_LIMIT}&page=${page}`;
    console.log(`[Scraper] Fetching page ${page}...`);

    try {
      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });

      const data = response.data;
      const products = data.products || [];

      if (products.length === 0) {
        console.log(`[Scraper] No more products found on page ${page}`);
        hasMore = false;
        break;
      }

      allProducts.push(...products);
      console.log(`[Scraper] Found ${products.length} products (Total: ${allProducts.length})`);

      // Report progress
      if (options.onProgress) {
        options.onProgress(page, allProducts.length);
      }

      // Check if we've reached the end
      if (products.length < MAX_PAGE_LIMIT) {
        hasMore = false;
      } else {
        page++;
        // Rate limiting delay (mirrors Python's time.sleep)
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Reset rate limit retries on success
      rateLimitRetries = 0;

    } catch (error: any) {
      const axiosError = error as AxiosError;

      // Handle rate limiting (429) - mirrors Python's retry logic
      if (axiosError.response?.status === 429) {
        rateLimitRetries++;
        if (rateLimitRetries <= maxRateLimitRetries) {
          const waitTime = 10000 * rateLimitRetries; // 10s, 20s, 30s
          console.log(`[Scraper] Rate limited. Waiting ${waitTime / 1000}s before retry ${rateLimitRetries}/${maxRateLimitRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry the same page
        } else {
          console.error('[Scraper] Max rate limit retries exceeded');
          return {
            success: false,
            products: allProducts.map(extractProductInfo),
            totalCount: allProducts.length,
            pagesFetched: page - 1,
            error: 'Rate limited by Shopify. Please try again later.',
          };
        }
      }

      // Handle 404
      if (axiosError.response?.status === 404) {
        console.error('[Scraper] Store not found or products.json not accessible');
        return {
          success: false,
          products: allProducts.map(extractProductInfo),
          totalCount: allProducts.length,
          pagesFetched: page - 1,
          error: 'Store not found or products.json not accessible',
        };
      }

      // Handle network errors
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        console.error('[Scraper] Request timeout');
        return {
          success: false,
          products: allProducts.map(extractProductInfo),
          totalCount: allProducts.length,
          pagesFetched: page - 1,
          error: 'Request timeout. The store may be too large or unresponsive.',
        };
      }

      // Handle other errors
      console.error(`[Scraper] Error fetching page ${page}:`, axiosError.message);
      
      // If we have some products, return partial success
      if (allProducts.length > 0) {
        return {
          success: true,
          products: allProducts.map(extractProductInfo),
          totalCount: allProducts.length,
          pagesFetched: page - 1,
          error: `Partial scrape completed. Error on page ${page}: ${axiosError.message}`,
        };
      }

      return {
        success: false,
        products: [],
        totalCount: 0,
        pagesFetched: 0,
        error: `Failed to fetch products: ${axiosError.message}`,
      };
    }
  }

  console.log(`[Scraper] Completed. Total products: ${allProducts.length}, Pages: ${page}`);

  // Transform raw products to cleaned Product type
  const cleanedProducts = allProducts.map(extractProductInfo);

  return {
    success: true,
    products: cleanedProducts,
    totalCount: cleanedProducts.length,
    pagesFetched: page,
  };
}

/**
 * Extract key information from a product
 * Direct TypeScript port of Python's extract_product_info function
 */
export function extractProductInfo(product: any): Product {
  const variants: ProductVariant[] = (product.variants || []).map((v: any) => ({
    id: v.id,
    title: v.title,
    price: v.price,
    sku: v.sku,
    inventory_quantity: v.inventory_quantity,
    grams: v.grams,
    compare_at_price: v.compare_at_price,
    option1: v.option1,
    option2: v.option2,
    option3: v.option3,
  }));

  const images: ProductImage[] = (product.images || []).map((img: any) => ({
    id: img.id,
    src: img.src,
  }));

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    body_html: product.body_html,
    vendor: product.vendor,
    product_type: product.product_type,
    tags: product.tags ? 
      (typeof product.tags === 'string' ? product.tags.split(', ') : product.tags) 
      : [],
    variants,
    images,
    created_at: product.created_at,
    updated_at: product.updated_at,
    published_at: product.published_at,
  };
}

/**
 * Generate summary statistics from scraped products
 */
export function generateScrapeSummary(products: Product[]) {
  const vendors = new Set(products.map(p => p.vendor).filter(Boolean));
  const productTypes = new Set(products.map(p => p.product_type).filter(Boolean));
  const totalVariants = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
  const totalImages = products.reduce((sum, p) => sum + (p.images?.length || 0), 0);

  return {
    totalProducts: products.length,
    totalVariants,
    totalImages,
    uniqueVendors: vendors.size,
    uniqueProductTypes: productTypes.size,
    vendors: Array.from(vendors).slice(0, 10), // First 10 vendors
    productTypes: Array.from(productTypes).slice(0, 10), // First 10 types
  };
}
