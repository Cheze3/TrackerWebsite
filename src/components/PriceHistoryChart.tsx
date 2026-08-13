'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface PriceHistoryEntry {
  id: string;
  price: string | number;
  currency: string;
  checkedAt: string;
}

interface ChartProps {
  history: PriceHistoryEntry[];
  targetPrice: number;
}

export default function PriceHistoryChart({ history, targetPrice }: ChartProps) {
  if (!history || history.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-6">No history data available yet.</p>;
  }

  // Format data for Recharts
  const formattedData = history.map((entry) => ({
    time: new Date(entry.checkedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    price: Number(entry.price),
    targetPrice: targetPrice,
  }));

  const currency = history[0]?.currency || 'VND';

  return (
    <div className="w-full h-48 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6B7280' }} />
          <YAxis
            tick={{ fontSize: 10, fill: '#6B7280' }}
            tickFormatter={(val) =>
              val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val.toLocaleString()
            }
          />
          <Tooltip
            formatter={(value: any) => [
              `${Number(value).toLocaleString()} ${currency}`,
              'Price',
            ]}
            contentStyle={{ backgroundColor: '#1F2937', borderRadius: '6px', border: 'none' }}
            itemStyle={{ color: '#F3F4F6', fontSize: '12px' }}
            labelStyle={{ color: '#9CA3AF', fontSize: '10px' }}
          />
          {/* Target Price Line */}
          <Line
            type="monotone"
            dataKey="targetPrice"
            stroke="#10B981"
            strokeDasharray="4 4"
            dot={false}
            name="Target Price"
          />
          {/* Price History Line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563EB"
            strokeWidth={2}
            dot={{ r: 3, fill: '#2563EB' }}
            activeDot={{ r: 5 }}
            name="Recorded Price"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}