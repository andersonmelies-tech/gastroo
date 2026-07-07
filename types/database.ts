export type Role = 'owner' | 'manager' | 'cashier' | 'waiter' | 'cook' | 'staff'
export type OrderType = 'mesa' | 'balcao' | 'delivery' | 'takeout'
export type OrderStatus = 'aberto' | 'em_preparo' | 'pronto' | 'fechado' | 'cancelado'
export type TableStatus = 'livre' | 'ocupada' | 'reservada' | 'bloqueada'
export type ItemStatus = 'pendente' | 'em_preparo' | 'pronto' | 'entregue'
export type MovType = 'entrada' | 'saida' | 'ajuste' | 'perda'

export interface Restaurant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  cnpj: string | null
  description: string | null
  city: string | null
  state: string | null
  plan: string
  active: boolean
  opening_hours: string | null
  closing_hours: string | null
  service_fee_pct: number
  accepts_delivery: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface RestaurantMember {
  id: string
  restaurant_id: string
  user_id: string
  role: Role
  name: string | null
  active: boolean
  created_at: string
}

export interface Category {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  active: boolean
  created_at: string
}

export interface Product {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  cost_price: number
  image_url: string | null
  unit: string
  prep_time_min: number
  serves: number
  active: boolean
  featured: boolean
  created_at: string
  updated_at: string
  // joins
  categories?: Category
}

export interface Table {
  id: string
  restaurant_id: string
  number: string
  capacity: number
  status: TableStatus
  location: string | null
  active: boolean
  created_at: string
}

export interface Order {
  id: string
  restaurant_id: string
  table_id: string | null
  order_number: number
  type: OrderType
  status: OrderStatus
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  notes: string | null
  subtotal: number
  discount: number
  service_fee: number
  delivery_fee: number
  total: number
  payment_method: string | null
  paid_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
  // joins
  tables?: Table
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  notes: string | null
  status: ItemStatus
  created_at: string
}

export interface Ingredient {
  id: string
  restaurant_id: string
  name: string
  unit: string
  current_stock: number
  min_stock: number
  cost_per_unit: number
  supplier: string | null
  created_at: string
  updated_at: string
}

export interface IngredientMovement {
  id: string
  ingredient_id: string
  type: MovType
  quantity: number
  notes: string | null
  date: string
  created_at: string
}

export interface CashSession {
  id: string
  restaurant_id: string
  date: string
  opened_by: string | null
  closed_by: string | null
  opening_balance: number
  closing_balance: number | null
  total_income: number | null
  total_expenses: number | null
  status: 'aberto' | 'fechado'
  created_at: string
  closed_at: string | null
}

export interface CashEntry {
  id: string
  restaurant_id: string
  session_id: string | null
  type: 'entrada' | 'saida'
  description: string
  amount: number
  category: string
  payment_method: string
  order_id: string | null
  date: string
  created_by: string | null
  created_at: string
}

export interface Customer {
  id: string
  restaurant_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  birthday: string | null
  notes: string | null
  total_orders: number
  total_spent: number
  created_at: string
}
