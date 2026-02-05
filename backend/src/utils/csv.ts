import { Product } from '../types';

interface FlattenedProduct {
  id: number;
  title: string;
  handle: string;
  description: string;
  vendor: string;
  product_type: string;
  tags: string;
  variant_title: string;
  price: string;
  compare_at_price: string;
  sku: string;
  inventory_quantity: string;
  option1: string;
  option2: string;
  option3: string;
  image_src: string;
  created_at: string;
  updated_at: string;
}

const CSV_HEADERS = [
  'Product ID',
  'Title',
  'Handle',
  'Description',
  'Vendor',
  'Product Type',
  'Tags',
  'Variant Title',
  'Price',
  'Compare At Price',
  'SKU',
  'Inventory Quantity',
  'Option 1',
  'Option 2',
  'Option 3',
  'Image URL',
  'Created At',
  'Updated At',
];

export function generateCSVFromProducts(products: Product[]): string {
  const flattenedProducts = flattenProducts(products);
  
  // Generate CSV rows
  const rows: string[] = [CSV_HEADERS.join(',')];
  
  for (const product of flattenedProducts) {
    const row = [
      product.id,
      escapeCSV(product.title),
      escapeCSV(product.handle),
      escapeCSV(product.description),
      escapeCSV(product.vendor),
      escapeCSV(product.product_type),
      escapeCSV(product.tags),
      escapeCSV(product.variant_title),
      product.price,
      product.compare_at_price,
      escapeCSV(product.sku),
      product.inventory_quantity,
      escapeCSV(product.option1),
      escapeCSV(product.option2),
      escapeCSV(product.option3),
      escapeCSV(product.image_src),
      product.created_at,
      product.updated_at,
    ];
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

function flattenProducts(products: Product[]): FlattenedProduct[] {
  const result: FlattenedProduct[] = [];
  
  for (const product of products) {
    const baseProduct = {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: stripHtml(product.body_html || ''),
      vendor: product.vendor || '',
      product_type: product.product_type || '',
      tags: (product.tags || []).join(', '),
      image_src: product.images?.[0]?.src || '',
      created_at: product.created_at || '',
      updated_at: product.updated_at || '',
    };
    
    if (!product.variants || product.variants.length === 0) {
      // Product with no variants
      result.push({
        ...baseProduct,
        variant_title: '',
        price: '',
        compare_at_price: '',
        sku: '',
        inventory_quantity: '',
        option1: '',
        option2: '',
        option3: '',
      });
    } else {
      // Product with variants - create a row for each variant
      for (const variant of product.variants) {
        result.push({
          ...baseProduct,
          variant_title: variant.title,
          price: variant.price || '',
          compare_at_price: variant.compare_at_price || '',
          sku: variant.sku || '',
          inventory_quantity: variant.inventory_quantity?.toString() || '',
          option1: variant.option1 || '',
          option2: variant.option2 || '',
          option3: variant.option3 || '',
        });
      }
    }
  }
  
  return result;
}

function escapeCSV(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // Escape quotes and wrap in quotes if contains special characters
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
