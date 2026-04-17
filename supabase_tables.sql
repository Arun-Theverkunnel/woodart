-- ═══════════════════════════════════════════════════════════════
--  WOOD ART INTERIO — Supabase Database Setup
--  Paste this entire file into Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- ── 1. PRODUCTS TABLE ────────────────────────────────────────────
-- Stores all showroom products (ready made and custom base products)

create table if not exists products (
  id            serial primary key,
  name          text        not null,
  category      text        not null,          -- Bedroom, Living Room, Dining, etc.
  base_price    numeric     not null default 0,
  description   text,
  emoji         text,                          -- display icon
  stock_count   integer     not null default 0,
  is_custom_base boolean    not null default false, -- can be used as custom order base
  image_url     text,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);

-- ── 2. ORDERS TABLE ──────────────────────────────────────────────
-- One row per order (ready made OR custom)

create table if not exists orders (
  id              serial primary key,
  order_number    text        not null unique,  -- e.g. WA-0042 or WA-RM-0010
  order_type      text        not null check (order_type in ('ready_made','custom')),
  customer_name   text        not null,
  phone           text        not null,
  email           text,
  address         text,
  sales_executive text,
  gst_rate        numeric     not null default 12,
  subtotal        numeric     not null default 0,
  gst_amount      numeric     not null default 0,
  total_price     numeric     not null default 0,
  advance_paid    numeric     not null default 0,
  balance_due     numeric     not null default 0,
  delivery_date   date,
  is_take_away    boolean     not null default false,
  special_notes   text,
  status          text        not null default 'confirmed'
                              check (status in ('confirmed','in_progress','ready','delivered','cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 3. ORDER ITEMS TABLE ─────────────────────────────────────────
-- One row per product line in an order

create table if not exists order_items (
  id            serial primary key,
  order_id      integer     not null references orders(id) on delete cascade,
  product_id    integer     references products(id),  -- null for unlisted custom items
  product_name  text        not null,
  category      text,
  quantity      integer     not null default 1,
  unit_price    numeric     not null default 0,
  line_total    numeric     generated always as (quantity * unit_price) stored,
  created_at    timestamptz not null default now()
);

-- ── 4. CUSTOMISATIONS TABLE ──────────────────────────────────────
-- One row per custom order — stores the chosen fabric, colour, size, hardware

create table if not exists customisations (
  id              serial primary key,
  order_id        integer     not null references orders(id) on delete cascade,
  fabric_type     text,   -- standard | velvet | leather | rexine
  fabric_colour   text,   -- cream | beige | grey | brown | navy | green | maroon | black
  size_option     text,   -- standard | queen | king | custom
  hardware_finish text,   -- chrome | matte | gold | bronze
  price_adjustment numeric not null default 0,
  custom_notes    text,   -- e.g. "custom size 7×4 ft"
  created_at      timestamptz not null default now()
);

-- ── 5. VENDOR REMINDERS TABLE ────────────────────────────────────
-- Tracks vendor call schedule for each custom order

create table if not exists vendor_reminders (
  id            serial primary key,
  order_id      integer     not null references orders(id) on delete cascade,
  vendor_type   text        not null check (vendor_type in ('fabric','glass','hardware','foam')),
  vendor_name   text        not null,
  lead_days     integer     not null,
  call_date     date        not null,
  is_called     boolean     not null default false,
  called_at     timestamptz,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ── 6. STOCK LEDGER TABLE ────────────────────────────────────────
-- Records every stock change (sale, restock, adjustment)

create table if not exists stock_ledger (
  id            serial primary key,
  product_id    integer     not null references products(id),
  order_id      integer     references orders(id),
  change_type   text        not null check (change_type in ('sale','restock','adjustment','return')),
  quantity      integer     not null,   -- negative for sale, positive for restock
  stock_after   integer     not null,   -- snapshot of stock after this change
  reason        text,
  created_at    timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA — Products (matches the app catalogue)
-- ═══════════════════════════════════════════════════════════════

insert into products (name, category, base_price, description, emoji, stock_count, is_custom_base) values
  ('Milano Sofa 3+1+1',           'Living Room', 85000,  'Premium leatherette 5-seater',       '🛋️',  2, true),
  ('Cartier Corner Sofa',          'Living Room', 95000,  'L-shaped premium fabric sofa',        '🛋️',  1, true),
  ('Recliner Chair',               'Living Room', 14350,  'Single recliner with footrest',       '💺',  3, true),
  ('TV Unit WA-0-1',               'Living Room', 18500,  'Wall-mount style walnut finish',      '📺',  2, false),
  ('ALMA Rack Coffee Table',       'Living Room',  8500,  'Open rack design teak wood',          '☕',  4, false),
  ('ARTIC X Coffee Table',         'Living Room',  9200,  'Minimalist glass and wood top',       '☕',  1, false),
  ('Divan Cot WA-DIVAN-1-1',       'Living Room', 22000,  'Upholstered with storage below',      '🛏️', 0, true),
  ('King Bed Hydraulic Storage',   'Bedroom',     42000,  '6x6 ft walnut veneer finish',         '🛏️', 1, true),
  ('Queen Bed',                    'Bedroom',     28000,  '5x6 ft teakwood frame',               '🛏️', 2, true),
  ('Sliding Wardrobe 6-Door',      'Bedroom',     55000,  'Mirror shutters 6 doors 8 ft',        '🚪',  1, false),
  ('Wardrobe 4-Door with Loft',    'Bedroom',     38000,  'Laminate finish full-height',         '🚪',  0, false),
  ('Dressing Unit with Mirror',    'Bedroom',     18000,  'LED mirror and 4 drawers',            '🪞',  2, false),
  ('Full Bedroom Set',             'Bedroom',     95000,  'Bed plus wardrobe plus dresser',      '🛏️', 0, true),
  ('Bedside Table Pair',           'Bedroom',      8500,  'Set of 2 with drawer',                '🪑',  5, false),
  ('Kids Bunk Bed',                'Bedroom',     24000,  'Double-decker with safety rails',     '🛏️', 1, true),
  ('Dining Set 6-Seater',          'Dining',      42000,  'Solid wood table and 6 chairs',       '🍽️', 2, false),
  ('Dining Set 4-Seater',          'Dining',      28000,  'Compact ideal for apartments',        '🍽️', 3, false),
  ('Dining Table 6-Seater',        'Dining',      18000,  'Solid sheesham wood 6 ft',            '🪑',  1, false),
  ('Dining Chair per unit',        'Dining',       3500,  'Cushioned seat solid wood legs',      '🪑',  8, false),
  ('Book Shelf 6-Level',           'Occasional',  12000,  'Open design 6 levels',                '📚',  4, false),
  ('Study Table with Bookshelf',   'Occasional',   9500,  'Student home office combo',           '📖',  2, false),
  ('Bar Stool Set of 2',           'Occasional',   7500,  'Counter height metal legs',           '🪑',  3, false),
  ('Coat Hanger Shoe Rack',        'Occasional',   4500,  'Entryway organiser',                  '🧥',  6, false),
  ('Computer Office Desk',         'Office',      14000,  'Cable management with drawers',       '💻',  4, false),
  ('Executive Office Chair',       'Office',      11000,  'High-back with lumbar support',       '💺',  5, false),
  ('File Rack 4-Tier',             'Office',       4500,  'Office organiser metal frame',        '📁',  3, false),
  ('Storage Ottoman',              'Occasional',   7200,  'Upholstered lid storage inside',      '📦',  2, false);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (basic — enable for production use)
-- ═══════════════════════════════════════════════════════════════
alter table products          enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table customisations    enable row level security;
alter table vendor_reminders  enable row level security;
alter table stock_ledger      enable row level security;

-- Allow all operations for authenticated users (staff login)
create policy "staff_all" on products         for all using (auth.role() = 'authenticated');
create policy "staff_all" on orders           for all using (auth.role() = 'authenticated');
create policy "staff_all" on order_items      for all using (auth.role() = 'authenticated');
create policy "staff_all" on customisations   for all using (auth.role() = 'authenticated');
create policy "staff_all" on vendor_reminders for all using (auth.role() = 'authenticated');
create policy "staff_all" on stock_ledger     for all using (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════
-- USEFUL VIEWS (for reports / owner dashboard later)
-- ═══════════════════════════════════════════════════════════════

-- View: orders with item count
create or replace view orders_summary as
select
  o.id,
  o.order_number,
  o.order_type,
  o.customer_name,
  o.phone,
  o.status,
  o.delivery_date,
  o.total_price,
  o.balance_due,
  count(oi.id) as item_count,
  o.created_at
from orders o
left join order_items oi on oi.order_id = o.id
group by o.id;

-- View: vendor reminders due today or overdue
create or replace view vendor_reminders_due as
select
  vr.*,
  o.order_number,
  o.customer_name,
  o.phone,
  o.delivery_date
from vendor_reminders vr
join orders o on o.id = vr.order_id
where vr.is_called = false
  and vr.call_date <= current_date
order by vr.call_date asc;
