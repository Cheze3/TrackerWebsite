'use client';

import { useState } from 'react';
import { ExternalLink, Trash2, TrendingDown, Tag as TagIcon, ChevronDown, ChevronUp, Percent } from 'lucide-react';
import PriceHistoryChart from './PriceHistoryChart';

interface Tag {
  tag: { id: string; name: string };
}

interface TrackedProductItem {
  id: string;
  targetType?: 'FIXED' | 'PERCENTAGE';
  targetValue?: string | number;
  targetPrice: string | number;
  isActive: boolean;
  product: {
    id: string;
    url: string;
    name: string;
    currentPrice: string | number;
    currency: string;
    store: string;
    tags: Tag[];
    priceHistory: { id: string; price: string | number; currency: string; checkedAt: string }[];
  };
}

interface ProductCardProps {
  item: TrackedProductItem;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updated: Partial<TrackedProductItem>) => void;
}

export default function ProductCard({ item, onDelete, onUpdate }: ProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);

  // Target editing state
  const [targetType, setTargetType] = useState<'FIXED' | 'PERCENTAGE'>(item.targetType || 'FIXED');
  const [targetValue, setTargetValue] = useState(
  (item.targetValue ?? item.targetPrice ?? '').toString()
);

  const currentPrice = Number(item.product.currentPrice) || 0;
  const targetPrice = Number(item.targetPrice) || 0;
  const isGoalReached = currentPrice > 0 && currentPrice <= targetPrice;

  const isPercentageMode = item.targetType === 'PERCENTAGE';

  // Parse saved targetValue safely, or fall back to calculating % off from target vs current price
  const parsedValue = Number(item.targetValue);
  const calculatedDiscount = currentPrice > 0
    ? Math.round(((currentPrice - targetPrice) / currentPrice) * 100)
    : 0;

  const percentageDiscount = !isNaN(parsedValue) && parsedValue > 0
    ? parsedValue
    : Math.max(0, calculatedDiscount);

  const toggleActive = async () => {
    try {
      const res = await fetch(`/api/tracked-products/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (res.ok) {
        onUpdate(item.id, { isActive: !item.isActive });
      }
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
  };

  const handleTargetSave = async () => {
    try {
      const res = await fetch(`/api/tracked-products/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetValue: parseFloat(targetValue),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpdate(item.id, {
          targetType,
          targetValue: parseFloat(targetValue),
          targetPrice: data.targetPrice ?? parseFloat(targetValue),
        });
        setIsEditingTarget(false);
      }
    } catch (err) {
      console.error('Failed to update target:', err);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header Info */}
      <div className="flex justify-between items-start gap-3">
        <div>
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-600 rounded mb-1">
            {item.product.store}
          </span>
          <h3 className="font-semibold text-gray-900 text-base line-clamp-1">{item.product.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={item.product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-50"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Price Badges */}
      <div className="mt-4 grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
        <div>
          <span className="text-[11px] text-gray-500 block">Current Price</span>
          <span className="font-bold text-gray-900 text-lg">
            {currentPrice.toLocaleString()} {item.product.currency}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 block">Target Price</span>
            {/* Target Percentage Discount Badge */}
            {isPercentageMode && percentageDiscount > 0 &&(
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-md">
                <Percent className="w-2.5 h-2.5" />
                {percentageDiscount}% OFF
              </span>
            )}
          </div>

          {isEditingTarget ? (
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setTargetType('FIXED')}
                  className={`px-1.5 py-0.5 rounded ${
                    targetType === 'FIXED' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Fixed
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('PERCENTAGE')}
                  className={`px-1.5 py-0.5 rounded ${
                    targetType === 'PERCENTAGE' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  % Off
                </button>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={targetType === 'FIXED' ? 'Target price' : '% off'}
                  className="w-20 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleTargetSave}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded font-medium cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTarget(true)}
              className="cursor-pointer font-bold text-emerald-600 text-lg hover:underline flex items-baseline gap-1"
              title="Click to edit target"
            >
              <span>
                {targetPrice.toLocaleString()} {item.product.currency}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notification status banner */}
      {isGoalReached && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
          <TrendingDown className="w-4 h-4 shrink-0" /> Target price reached!
        </div>
      )}

      {/* Tags & Active Toggle */}
      <div className="mt-4 flex items-center justify-between text-xs border-t pt-3 border-gray-100">
        <div className="flex flex-wrap gap-1 items-center">
          <TagIcon className="w-3.5 h-3.5 text-gray-400 mr-1" />
          {item.product?.tags && item.product.tags.length > 0 ? (
            item.product.tags.map((t) => (
              <span key={t.tag.id} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">
                {t.tag.name}
              </span>
            ))
          ) : (
            <span className="text-gray-400 italic text-[11px]">No tags</span>
          )}
        </div>

        <label className="flex items-center cursor-pointer gap-2">
          <span className="text-gray-500 text-[11px]">{item.isActive ? 'Tracking' : 'Paused'}</span>
          <input
            type="checkbox"
            checked={item.isActive}
            onChange={toggleActive}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all relative"></div>
        </label>
      </div>

      {/* Collapsible Price History Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-800 pt-2 border-t border-gray-100 font-medium cursor-pointer"
      >
        Price History Chart {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Chart */}
      {isExpanded && (
        <PriceHistoryChart
          history={item.product.priceHistory}
          targetPrice={targetPrice}
        />
      )}
    </div>
  );
}