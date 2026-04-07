import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useToastHelpers } from '../Toast';
import { Modal } from '../UI';

interface ShopItem {
  id: number;
  name: string;
  description?: string;
  item_type: 'avatar' | 'theme' | 'badge_effect' | 'powerup' | 'emote';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  coin_price: number;
  icon: string;
  color: string;
  is_limited: boolean;
  limited_quantity?: number;
  requires_level: number;
  is_owned: boolean;
}

interface ShopProps {
  userCoins: number;
  userLevel: number;
  onPurchase: (newBalance: number) => void;
}

const rarityColors = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b'
};

const rarityLabels = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};

export const Shop: React.FC<ShopProps> = ({ userCoins, userLevel, onPurchase }) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [inventory, setInventory] = useState<number[]>([]);
  const { success, error } = useToastHelpers();

  const categories = [
    { id: 'all', label: 'All Items', icon: '🛍️' },
    { id: 'avatar', label: 'Avatars', icon: '👤' },
    { id: 'theme', label: 'Themes', icon: '🎨' },
    { id: 'badge_effect', label: 'Effects', icon: '✨' },
    { id: 'powerup', label: 'Power-ups', icon: '⚡' },
    { id: 'emote', label: 'Emotes', icon: '😀' }
  ];

  useEffect(() => {
    loadShopItems();
    loadInventory();
  }, [activeCategory]);

  const loadShopItems = async () => {
    try {
      const response = await apiService.get(`/gamification/shop/items?item_type=${activeCategory === 'all' ? '' : activeCategory}`);
      setItems(response.data);
    } catch (err) {
      console.error('Failed to load shop items:', err);
    }
  };

  const loadInventory = async () => {
    try {
      const response = await apiService.get('/gamification/inventory');
      setInventory(response.data.map((item: any) => item.id));
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  };

  const handlePurchase = async () => {
    if (!selectedItem) return;

    if (userCoins < selectedItem.coin_price) {
      error('Insufficient Coins', `You need ${selectedItem.coin_price - userCoins} more coins`);
      return;
    }

    if (userLevel < selectedItem.requires_level) {
      error('Level Too Low', `Reach level ${selectedItem.requires_level} to unlock`);
      return;
    }

    setIsPurchasing(true);

    try {
      const response = await apiService.post(`/gamification/shop/purchase/${selectedItem.id}`);
      
      if (response.data.success) {
        success('Purchase Successful!', `You bought ${selectedItem.name}`);
        onPurchase(response.data.new_balance);
        loadShopItems();
        loadInventory();
        setSelectedItem(null);
      }
    } catch (err: any) {
      error('Purchase Failed', err.response?.data?.detail || 'Something went wrong');
    } finally {
      setIsPurchasing(false);
    }
  };

  const filteredItems = activeCategory === 'all' 
    ? items 
    : items.filter(item => item.item_type === activeCategory);

  return (
    <div className="shop-container">
      {/* Header */}
      <div className="shop-header">
        <h2>Item Shop</h2>
        <div className="shop-balance">
          <span className="balance-icon">🪙</span>
          <span className="balance-amount">{userCoins.toLocaleString()}</span>
        </div>
      </div>

      {/* Categories */}
      <div className="shop-categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="cat-icon">{cat.icon}</span>
            <span className="cat-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="shop-grid">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className={`shop-item ${item.is_owned ? 'owned' : ''} ${item.rarity}`}
            onClick={() => !item.is_owned && setSelectedItem(item)}
          >
            {item.is_limited && (
              <div className="limited-badge">LIMITED</div>
            )}
            
            <div className="item-icon" style={{ background: item.color + '20' }}>
              {item.icon}
            </div>
            
            <div className="item-info">
              <div className="item-name">{item.name}</div>
              <div 
                className="item-rarity"
                style={{ color: rarityColors[item.rarity] }}
              >
                {rarityLabels[item.rarity]}
              </div>
              
              {item.requires_level > 1 && userLevel < item.requires_level && (
                <div className="level-requirement">
                  🔒 Lvl {item.requires_level}
                </div>
              )}
            </div>
            
            <div className="item-price">
              {item.is_owned ? (
                <span className="owned-badge">OWNED</span>
              ) : (
                <>
                  <span className="price-icon">🪙</span>
                  <span className={`price-amount ${userCoins < item.coin_price ? 'insufficient' : ''}`}>
                    {item.coin_price}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title="Confirm Purchase"
          size="sm"
          footer={
            <>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedItem(null)}
                disabled={isPurchasing}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handlePurchase}
                disabled={isPurchasing || userCoins < selectedItem.coin_price}
              >
                {isPurchasing ? 'Purchasing...' : `Buy for ${selectedItem.coin_price} coins`}
              </button>
            </>
          }
        >
          <div className="purchase-preview">
            <div className="preview-icon" style={{ background: selectedItem.color + '30' }}>
              {selectedItem.icon}
            </div>
            <h3>{selectedItem.name}</h3>
            <p className="preview-description">{selectedItem.description}</p>
            <div 
              className="preview-rarity"
              style={{ color: rarityColors[selectedItem.rarity] }}
            >
              {rarityLabels[selectedItem.rarity]}
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        .shop-container {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .shop-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .shop-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .shop-balance {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #ffd70020, #ff8c0020);
          border: 1px solid #ffd70040;
          border-radius: 12px;
          padding: 12px 20px;
        }

        .balance-icon {
          font-size: 24px;
        }

        .balance-amount {
          font-size: 20px;
          font-weight: 700;
          color: #ffd700;
        }

        .shop-categories {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .category-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .category-btn:hover {
          background: var(--bg-elevated);
          border-color: var(--accent);
        }

        .category-btn.active {
          background: var(--accent-bg);
          border-color: var(--accent);
          color: var(--accent);
        }

        .cat-icon {
          font-size: 18px;
        }

        .shop-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .shop-item {
          background: var(--bg-card);
          border-radius: 16px;
          padding: 20px;
          border: 2px solid var(--border);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .shop-item:hover:not(.owned) {
          transform: translateY(-4px);
          border-color: var(--accent);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .shop-item.common { border-color: #9ca3af40; }
        .shop-item.uncommon { border-color: #22c55e40; }
        .shop-item.rare { border-color: #3b82f640; }
        .shop-item.epic { border-color: #a855f740; }
        .shop-item.legendary { border-color: #f59e0b40; }

        .shop-item.owned {
          opacity: 0.6;
          cursor: default;
        }

        .limited-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .item-icon {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          margin: 0 auto 16px;
        }

        .item-info {
          text-align: center;
        }

        .item-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .item-rarity {
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .level-requirement {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 8px;
          padding: 4px 8px;
          background: var(--bg-elevated);
          border-radius: 6px;
          display: inline-block;
        }

        .item-price {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }

        .price-icon {
          font-size: 16px;
        }

        .price-amount {
          font-size: 16px;
          font-weight: 700;
          color: #ffd700;
        }

        .price-amount.insufficient {
          color: #ef4444;
        }

        .owned-badge {
          font-size: 12px;
          font-weight: 700;
          color: #22c55e;
          background: #22c55e20;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .purchase-preview {
          text-align: center;
          padding: 20px;
        }

        .preview-icon {
          width: 100px;
          height: 100px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 50px;
          margin: 0 auto 20px;
        }

        .purchase-preview h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 8px;
        }

        .preview-description {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0 0 12px;
        }

        .preview-rarity {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
};
