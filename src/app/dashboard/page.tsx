'use client';

import { useState, useEffect } from 'react';
import NotificationBell from '@/components/NotificationBell';
import ProductCard from '@/components/ProductCard';
import { Plus, Search, RefreshCw, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter input states
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // Debounced states for triggering API calls
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [debouncedTagFilter, setDebouncedTagFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [url, setUrl] = useState('');
  const [targetType, setTargetType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [targetValue, setTargetValue] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Debounce Search Query (1000ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Debounce Tag Filter (1000ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTagFilter(tagFilter);
    }, 1000);

    return () => clearTimeout(timer);
  }, [tagFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append('q', debouncedSearchQuery);
      if (debouncedTagFilter) params.append('tag', debouncedTagFilter);

      const res = await fetch(`/api/tracked-products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch products only when debounced values change
  useEffect(() => {
    fetchProducts();
  }, [debouncedSearchQuery, debouncedTagFilter]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const parsedTags = tagsInput
        ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const res = await fetch('/api/tracked-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          targetType,
          targetValue,
          tags: parsedTags,
        }),
      });

      if (res.ok) {
        setUrl('');
        setTargetValue('');
        setTagsInput('');
        setIsModalOpen(false);
        fetchProducts();
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || 'Failed to add product');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to stop tracking this item?')) return;
    try {
      const res = await fetch(`/api/tracked-products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleUpdate = (id: string, updatedFields: Partial<any>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedFields } : p))
    );
  };

  // Helper boolean flags to show spinners while typing before debounce fires
  const isSearchDebouncing = searchQuery !== debouncedSearchQuery;
  const isTagDebouncing = tagFilter !== debouncedTagFilter;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            PriceTracker
          </h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button
              onClick={() => {
                setErrorMsg('');
                setIsModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 justify-between items-center">
          {/* Search Input with Debounce Spinner */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search product title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isSearchDebouncing && (
              <Loader2 className="w-4 h-4 absolute right-3 top-3 text-blue-500 animate-spin" />
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Tag Filter Input with Debounce Spinner */}
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="Filter by tag (e.g. shoes)"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isTagDebouncing && (
                <Loader2 className="w-4 h-4 absolute right-3 top-3 text-blue-500 animate-spin" />
              )}
            </div>

            <button
              onClick={fetchProducts}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading your tracked items...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-xl">
            <p className="text-gray-500 text-sm">No tracked products found.</p>
            <button
              onClick={() => {
                setErrorMsg('');
                setIsModalOpen(true);
              }}
              className="mt-3 text-sm text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              Add your first product URL
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Track New Product</h2>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-md mb-4 border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Target Type Selector Tabs */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Mode</label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTargetType('FIXED')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                      targetType === 'FIXED'
                        ? 'bg-white shadow text-black'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Fixed Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('PERCENTAGE')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                      targetType === 'PERCENTAGE'
                        ? 'bg-white shadow text-black'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Percentage Off (%)
                  </button>
                </div>
              </div>

              {/* Dynamic Target Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {targetType === 'FIXED' ? 'Target Price' : 'Target Discount Percentage'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={targetType === 'PERCENTAGE' ? 99 : undefined}
                  step="any"
                  placeholder={targetType === 'FIXED' ? 'e.g. 2000000' : 'e.g. 20'}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {targetType === 'PERCENTAGE' && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Triggers an alert when the item price drops by {targetValue || 'X'}% from its current price.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="shoes, nike, sale"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Scraping & Saving...' : 'Start Tracking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}