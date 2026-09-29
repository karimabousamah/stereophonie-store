-- ============================================================
-- STEREOPHONIE ADMIN
-- Historical reusable product configuration backfill
-- GENERATED FROM EXISTING PRODUCT CONFIGURATION HIERARCHIES
-- ============================================================

-- Existing product and variant rows are not modified.
-- Generic values are scoped by configuration option key.
-- Colorways are deduplicated by exact normalized name + hex pair.

INSERT INTO public.admin_product_option_values (
  option_key,
  value
)
VALUES
  ('calculator_features', 'lcd-display'),
  ('capacity', '900VA / 480W'),
  ('capacity', '1500VA / 600 W'),
  ('capacity', '2000VA / 900W'),
  ('capacity', '5000mAh'),
  ('capacity', '7500mAh'),
  ('capacity', '8800mAh'),
  ('capacity', '10000mAh'),
  ('case_type', 'back-cover'),
  ('colors', 'BLUE'),
  ('colors', 'PURPLE'),
  ('connectivity', 'Mesh Wifi'),
  ('connectivity', 'USB 3.0'),
  ('connectivity', 'Wi-Fi'),
  ('connectivity', 'Wi-Fi 5'),
  ('connectivity', 'Wi-Fi 6'),
  ('iphone_model', 'iPhone 12 / 12 Pro'),
  ('iphone_model', 'iPhone 13'),
  ('iphone_model', 'iPhone 13 Pro'),
  ('iphone_model', 'iPhone 13 Pro Max'),
  ('iphone_model', 'iPhone 14'),
  ('iphone_model', 'iPhone 14 Pro'),
  ('iphone_model', 'iPhone 14 Pro Max'),
  ('iphone_model', 'iPhone 15'),
  ('iphone_model', 'iPhone 15 Pro'),
  ('iphone_model', 'iPhone 15 Pro Max'),
  ('iphone_model', 'iPhone 16'),
  ('iphone_model', 'iPhone 16 Pro'),
  ('iphone_model', 'iPhone 16 Pro Max'),
  ('iphone_model', 'iPhone 17'),
  ('iphone_model', 'iPhone 17 Pro'),
  ('iphone_model', 'iPhone 17 Pro max'),
  ('material', 'Anodized Aluminum'),
  ('material', 'Stainless Steel'),
  ('model', 'AirPods 4'),
  ('model', 'AirPods 4 with Active Noise Cancellation'),
  ('model', 'AirPods 5'),
  ('model', 'AirPods 5 With Wireless Charging Case'),
  ('model', 'DS26 (3-in-1 / 4-in-1 Folding Wireless Charging Dock)'),
  ('model', 'Green Lion 4-in-1 Wireless Charging Hub'),
  ('model', 'iPad'),
  ('model', 'iPad 10.9" (10th Gen) / iPad 11" (A16)'),
  ('model', 'iPad Air 10.9" and iPad Pro 11"'),
  ('model', 'iPad Air 13" and iPad Pro 12.9"'),
  ('model', 'iPad Pro 13" (M4/M5)'),
  ('model', 'iPhone 16 Pro'),
  ('model', 'iPhone 16 Pro Max'),
  ('model', 'iPhone 17'),
  ('model', 'iPhone 17 Air'),
  ('model', 'iPhone 17 Pro'),
  ('model', 'iPhone 17 Pro Max'),
  ('model', 'iPhone 18 Pro'),
  ('model', 'iPhone 18 Pro Max'),
  ('model', 'OV81'),
  ('model', 'Stephen Curry'),
  ('size', '1.8M'),
  ('size', 'S-M'),
  ('storage', '1TB'),
  ('storage', '2TB'),
  ('storage', '64GB'),
  ('storage', '128GB'),
  ('storage', '256GB'),
  ('storage', '512GB')
ON CONFLICT DO NOTHING;

-- Colorway identity must permit:
-- same name + different hex
-- different name + same hex
-- while rejecting the same exact normalized name + hex pair.

DROP INDEX IF EXISTS public.admin_custom_colors_name_lower_idx;
DROP INDEX IF EXISTS public.admin_custom_colors_hex_lower_idx;

CREATE UNIQUE INDEX IF NOT EXISTS admin_custom_colors_name_hex_lower_idx
ON public.admin_custom_colors (
  lower(btrim(name)),
  lower(btrim(hex_value))
);

INSERT INTO public.admin_custom_colors (
  name,
  hex_value
)
VALUES
  ('Berry', '#9B3158'),
  ('Black', '#111111'),
  ('Blue', '#2F6BFF'),
  ('Burgundy', '#6B1D2A'),
  ('Denim Blue', '#597B98'),
  ('Forest Green', '#405C4B'),
  ('Gold', '#D4AF37'),
  ('Gray', '#808083'),
  ('Green', '#4E8B57'),
  ('Midnight', '#1D2530'),
  ('Midnight Black', '#202123'),
  ('Obsidian', '#26272A'),
  ('Pink', '#E8A5B5'),
  ('Pink', '#E98AAE'),
  ('Purple', '#7651C9'),
  ('Red', '#D92D20'),
  ('Silver', '#C9C9C9'),
  ('Space Gray', '#6B6B6D'),
  ('Sunrise Gold', '#D2AE82'),
  ('White', '#F5F5F7'),
  ('White', '#F7F7F5'),
  ('Yellow', '#F4C430')
ON CONFLICT DO NOTHING;
