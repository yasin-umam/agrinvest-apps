import { MapPin, Building2 } from 'lucide-react';

interface RegionCardProps {
  code: string;
  name: string;
  description: string;
  corporationCount: number;
  onClick: () => void;
}

export function RegionCard({ code, name, description, corporationCount, onClick }: RegionCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-green-500 hover:shadow-lg transition-all duration-200 text-left w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-lg">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{code}</h3>
            <p className="text-sm text-gray-600">{name}</p>
          </div>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>

      <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 w-fit">
        <Building2 className="w-4 h-4" />
        <span className="text-sm font-medium">
          {corporationCount} Korporasi
        </span>
      </div>
    </button>
  );
}
