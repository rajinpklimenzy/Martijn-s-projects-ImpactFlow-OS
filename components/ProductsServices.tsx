
import React from 'react';
import { Package, Sparkles } from 'lucide-react';
import EmptyState from './common/EmptyState';

const ProductsServices: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Products & Services</h1>
          <p className="text-slate-500 text-sm font-medium">Manage your products and service catalog.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold border border-amber-100">
          <Sparkles className="w-4 h-4" /> Coming Soon
        </div>
      </div>

      <EmptyState
        icon={<Package className="w-8 h-8" />}
        heading="Products & Services"
        description="Catalog management, pricing, and service offerings will be available here. We're building this section."
      />
    </div>
  );
};

export default ProductsServices;
