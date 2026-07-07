-- ═══════════════════════════════════════════════════════════════
--  GASTROO — Schema Multi-Tenant Supabase
--  Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ── Extensões ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tabela de Restaurantes (tenants) ────────────────────────────
CREATE TABLE IF NOT EXISTS restaurants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  cnpj          TEXT,
  city          TEXT,
  state         TEXT,
  description   TEXT,
  opening_hours TEXT,
  closing_hours TEXT,
  service_fee_pct DECIMAL(5,2) DEFAULT 10,
  accepts_delivery BOOLEAN DEFAULT TRUE,
  plan          TEXT DEFAULT 'free',
  active        BOOLEAN DEFAULT TRUE,
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Membros do restaurante (staff) ──────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'staff',
  -- roles: owner, manager, cashier, kitchen, staff
  name            TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, user_id)
);

-- ── Categorias do cardápio ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  sort_order      INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Produtos (itens do cardápio) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_price      DECIMAL(10,2) DEFAULT 0,
  image_url       TEXT,
  unit            TEXT DEFAULT 'un',
  prep_time_min   INTEGER DEFAULT 0,
  serves          INTEGER DEFAULT 1,
  active          BOOLEAN DEFAULT TRUE,
  featured        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Mesas ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  number          TEXT NOT NULL,
  capacity        INTEGER DEFAULT 4,
  status          TEXT DEFAULT 'livre',
  -- status: livre, ocupada, reservada, bloqueada
  location        TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Pedidos ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id        UUID REFERENCES tables(id) ON DELETE SET NULL,
  order_number    INTEGER NOT NULL,
  type            TEXT DEFAULT 'mesa',
  -- type: mesa, balcao, delivery, takeout
  status          TEXT DEFAULT 'aberto',
  -- status: aberto, em_preparo, pronto, fechado, cancelado
  customer_name   TEXT,
  customer_phone  TEXT,
  customer_address TEXT,
  notes           TEXT,
  subtotal        DECIMAL(10,2) DEFAULT 0,
  discount        DECIMAL(10,2) DEFAULT 0,
  service_fee     DECIMAL(10,2) DEFAULT 0,
  delivery_fee    DECIMAL(10,2) DEFAULT 0,
  total           DECIMAL(10,2) DEFAULT 0,
  payment_method  TEXT,
  paid_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ
);

-- Sequência de número de pedido por restaurante
CREATE TABLE IF NOT EXISTS order_sequences (
  restaurant_id   UUID PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  last_number     INTEGER DEFAULT 0
);

-- ── Itens do pedido ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL,
  total_price     DECIMAL(10,2) NOT NULL,
  notes           TEXT,
  status          TEXT DEFAULT 'pendente',
  -- status: pendente, em_preparo, pronto, entregue
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Insumos (estoque) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  unit            TEXT DEFAULT 'kg',
  current_stock   DECIMAL(10,3) DEFAULT 0,
  min_stock       DECIMAL(10,3) DEFAULT 0,
  cost_per_unit   DECIMAL(10,4) DEFAULT 0,
  supplier        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ficha técnica (receita dos pratos) ──────────────────────────
CREATE TABLE IF NOT EXISTS product_ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity        DECIMAL(10,4) NOT NULL DEFAULT 0,
  UNIQUE(product_id, ingredient_id)
);

-- ── Movimentações de estoque ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingredient_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  -- type: entrada, saida, ajuste, perda
  quantity        DECIMAL(10,3) NOT NULL,
  notes           TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Caixa ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  opened_by       UUID REFERENCES auth.users(id),
  closed_by       UUID REFERENCES auth.users(id),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_balance DECIMAL(10,2) DEFAULT 0,
  closing_balance DECIMAL(10,2),
  total_income    DECIMAL(10,2),
  total_expenses  DECIMAL(10,2),
  status          TEXT DEFAULT 'aberto',
  -- status: aberto, fechado
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cash_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES cash_sessions(id) ON DELETE SET NULL,
  type            TEXT NOT NULL,
  -- type: entrada, saida
  description     TEXT,
  amount          DECIMAL(10,2) NOT NULL,
  category        TEXT DEFAULT 'venda',
  payment_method  TEXT DEFAULT 'dinheiro',
  order_id        UUID REFERENCES orders(id),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Clientes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  birthday        DATE,
  notes           TEXT,
  total_orders    INTEGER DEFAULT 0,
  total_spent     DECIMAL(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
--  FUNÇÕES AUXILIARES
-- ════════════════════════════════════════════════════════════════

-- Retorna o restaurant_id do usuário logado
CREATE OR REPLACE FUNCTION get_my_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id FROM restaurant_members
  WHERE user_id = auth.uid() AND active = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Gera próximo número de pedido
CREATE OR REPLACE FUNCTION next_order_number(p_restaurant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_number INTEGER;
BEGIN
  INSERT INTO order_sequences(restaurant_id, last_number) VALUES (p_restaurant_id, 1)
  ON CONFLICT(restaurant_id) DO UPDATE SET last_number = order_sequences.last_number + 1
  RETURNING last_number INTO v_number;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE restaurants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables               ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_sequences      ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuário só vê dados do seu restaurante
CREATE POLICY "members_own" ON restaurant_members FOR ALL
  USING (user_id = auth.uid() OR restaurant_id = get_my_restaurant_id());

CREATE POLICY "restaurants_own" ON restaurants FOR ALL
  USING (id = get_my_restaurant_id());

CREATE POLICY "categories_own" ON categories FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "products_own" ON products FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "tables_own" ON tables FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "orders_own" ON orders FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "order_items_own" ON order_items FOR ALL
  USING (order_id IN (SELECT id FROM orders WHERE restaurant_id = get_my_restaurant_id()));

CREATE POLICY "ingredients_own" ON ingredients FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "product_ingredients_own" ON product_ingredients FOR ALL
  USING (product_id IN (SELECT id FROM products WHERE restaurant_id = get_my_restaurant_id()));

CREATE POLICY "ingredient_movements_own" ON ingredient_movements FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "cash_sessions_own" ON cash_sessions FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "cash_entries_own" ON cash_entries FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "customers_own" ON customers FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "order_sequences_own" ON order_sequences FOR ALL
  USING (restaurant_id = get_my_restaurant_id());
