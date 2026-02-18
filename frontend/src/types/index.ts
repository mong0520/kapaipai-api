export interface CardVariant {
  card_key: string;
  card_name: string;
  pack_id: string;
  pack_name: string;
  pack_card_id: string;
  rare: string;
  lowest_price: number | null;
  avg_price: number | null;
}

export interface Product {
  price: number;
  stock: number;
  condition: string;
  condition_label: string;
  seller_nickname: string;
  seller_area: string;
  credit: number;
  order_complete: number;
  pack_name: string;
}

export interface PriceSnapshot {
  id: number;
  watchlist_item_id: number;
  lowest_price: number | null;
  avg_price: number | null;
  buyable_count: number;
  total_count: number;
  checked_at: string;
}

export interface WatchlistItem {
  id: number;
  user_id: number;
  card_key: string;
  card_name: string;
  pack_id: string | null;
  pack_name: string | null;
  pack_card_id: string | null;
  rare: string;
  target_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latest_snapshot: PriceSnapshot | null;
}

export interface NotificationRecord {
  id: number;
  watchlist_item_id: number;
  triggered_price: number;
  target_price: number;
  message: string;
  status: "sent" | "failed";
  sent_at: string;
  card_name: string | null;
  rare: string | null;
}
