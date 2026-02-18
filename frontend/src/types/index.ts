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

// Multi-card search
export interface MultiSearchCardRequest {
  name: string;
  quantity: number;
}

export interface SellerProductDetail extends Product {
  variant_pack_name: string;
  variant_rare: string;
}

export interface SellerCardDetail {
  total_stock: number;
  lowest_price: number;
  estimated_cost: number;
  products: SellerProductDetail[];
}

export interface SellerMatch {
  seller_nickname: string;
  seller_area: string;
  credit: number;
  order_complete: number;
  total_cost: number;
  cards: Record<string, SellerCardDetail>;
}

export interface MultiSearchResult {
  sellers: SellerMatch[];
  card_details: Record<
    string,
    { variants_count: number; error: string | null }
  >;
  stats: {
    total_sellers_scanned: number;
    matching_sellers: number;
    cards_requested: number;
  };
}
