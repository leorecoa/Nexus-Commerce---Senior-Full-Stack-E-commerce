INSERT INTO public.categories (name, slug, description) VALUES
('Smartphones', 'smartphones', 'Latest smartphones and mobile devices'),
('Laptops', 'laptops', 'High-performance laptops and notebooks'),
('Accessories', 'accessories', 'Tech accessories and peripherals'),
('Audio', 'audio', 'Headphones, speakers, and audio equipment');

INSERT INTO public.products (name, description, price, volume, type, image_url, category_id, stock_quantity, is_active) VALUES
('iPhone 15 Pro', 'Latest Apple flagship with A17 Pro chip', 999.99, '256GB', 'smartphone', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500', (SELECT id FROM public.categories WHERE slug = 'smartphones'), 50, true),
('MacBook Pro M3', 'Powerful laptop for professionals', 1999.99, '16GB RAM', 'laptop', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500', (SELECT id FROM public.categories WHERE slug = 'laptops'), 30, true),
('AirPods Pro', 'Active noise cancellation earbuds', 249.99, NULL, 'audio', 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=500', (SELECT id FROM public.categories WHERE slug = 'audio'), 100, true),
('Magic Mouse', 'Wireless rechargeable mouse', 79.99, NULL, 'accessory', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500', (SELECT id FROM public.categories WHERE slug = 'accessories'), 75, true);
