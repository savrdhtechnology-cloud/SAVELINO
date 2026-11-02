-- Reconstructed from SAVLINO live Supabase data (2026-10-10).
-- Remote migration history: 20261010074209 / 0003_seed_catalogue.
-- Upserts the seven published collection labels without changing existing records.
insert into public.collections (slug,name,description,sort_order,is_published) values
('designer-blouses','Designer Blouses','Sculpted silhouettes, hand-finished embroidery and backs designed to be remembered.',1,true),
('ready-made-blouses','Ready-Made Blouses','Designer detailing in carefully graded standard sizes.',2,true),
('salwar-suits','Salwar Suits','Flowing anarkalis and tailored suits in rich jewel tones.',3,true),
('sarees','Sarees','Woven golds, soft silks and timeless drapes.',4,true),
('shapewear','Shapewear','Smoothing, breathable foundations for sarees and suits.',5,true),
('lingerie','Lingerie','Fine lace and soft support in noir, ivory and burgundy.',6,true),
('loungewear','Loungewear','Satin-soft sets and robes for slow mornings.',7,true)
on conflict (slug) do nothing;
insert into public.content_blocks (key,title,body) values
('hero','A Legacy of Elegance','{}'::jsonb),
('designer-blouses','The blouse, elevated to an heirloom','{}'::jsonb),
('lookbook','For every shade of a woman','{}'::jsonb),
('partners','Grow with the house of SAVLINO','{}'::jsonb)
on conflict (key) do nothing;
