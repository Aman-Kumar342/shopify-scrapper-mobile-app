
#!/usr/bin/env python3
"""
Shopify Product Scraper - Standalone Script
Scrapes all products from a Shopify store via the public /products.json endpoint
"""

import json
import time
import urllib.request
import urllib.error
from urllib.parse import urljoin, urlparse

def scrape_shopify_products(store_url: str, delay: float = 1.0) -> list[dict]:
    """
    Scrape all products from a Shopify store.

    Args:
        store_url: The Shopify store URL (e.g., https://store-name.myshopify.com or custom domain)
        delay: Delay between requests in seconds to avoid rate limiting

    Returns:
        List of all product dictionaries
    """
    # Normalize URL
    if not store_url.startswith(('http://', 'https://')):
        store_url = f'https://{store_url}'
    store_url = store_url.rstrip('/')

    all_products = []
    page = 1
    limit = 250  # Shopify max per page

    print(f"Scraping products from: {store_url}")

    while True:
        url = f"{store_url}/products.json?limit={limit}&page={page}"
        print(f"Fetching page {page}...")

        try:
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/json',
                }
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode('utf-8'))
                products = data.get('products', [])

                if not products:
                    break

                all_products.extend(products)
                print(f"  Found {len(products)} products (Total: {len(all_products)})")

                if len(products) < limit:
                    break

                page += 1
                time.sleep(delay)

        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"Error: Store not found or products.json not accessible")
            elif e.code == 429:
                print(f"Rate limited. Waiting 10 seconds...")
                time.sleep(10)
                continue
            else:
                print(f"HTTP Error {e.code}: {e.reason}")
            break
        except urllib.error.URLError as e:
            print(f"URL Error: {e.reason}")
            break
        except json.JSONDecodeError:
            print("Error: Invalid JSON response")
            break

    return all_products


def extract_product_info(product: dict) -> dict:
    """Extract key information from a product."""
    variants = product.get('variants', [])
    images = product.get('images', [])

    return {
        'id': product.get('id'),
        'title': product.get('title'),
        'handle': product.get('handle'),
        'vendor': product.get('vendor'),
        'product_type': product.get('product_type'),
        'tags': product.get('tags', '').split(', ') if product.get('tags') else [],
        'description': product.get('body_html', ''),
        'created_at': product.get('created_at'),
        'updated_at': product.get('updated_at'),
        'published_at': product.get('published_at'),
        'variants': [
            {
                'id': v.get('id'),
                'title': v.get('title'),
                'price': v.get('price'),
                'compare_at_price': v.get('compare_at_price'),
                'sku': v.get('sku'),
                'available': v.get('available'),
                'inventory_quantity': v.get('inventory_quantity'),
                'weight': v.get('weight'),
                'weight_unit': v.get('weight_unit'),
            }
            for v in variants
        ],
        'images': [img.get('src') for img in images],
        'options': product.get('options', []),
    }


def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python shopify_scraper.py <store_url> [output_file]")
        print("Example: python shopify_scraper.py example.myshopify.com products.json")
        sys.exit(1)

    store_url = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'products.json'

    # Scrape all products
    products = scrape_shopify_products(store_url)

    if not products:
        print("No products found.")
        sys.exit(1)

    # Extract clean product info
    cleaned_products = [extract_product_info(p) for p in products]

    # Save to file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cleaned_products, f, indent=2, ensure_ascii=False)

    print(f"\nScraped {len(cleaned_products)} products")
    print(f"Saved to: {output_file}")

    # Print summary
    vendors = set(p['vendor'] for p in cleaned_products if p['vendor'])
    types = set(p['product_type'] for p in cleaned_products if p['product_type'])

    print(f"\nVendors: {len(vendors)}")
    print(f"Product Types: {len(types)}")

if __name__ == '__main__':
    main()
