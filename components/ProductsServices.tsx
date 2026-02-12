
import React from 'react';
import { Package, Sparkles } from 'lucide-react';

const ProductsServices: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Products & Services</h1>
          <p className="text-slate-500 text-sm font-medium">Manage your products and service catalog.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-100">
          <Sparkles className="w-4 h-4" /> Coming Soon
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 p-12 shadow-sm flex flex-col items-center justify-center min-h-[320px] text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-[24px] flex items-center justify-center mb-6">
          <Package className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Products & Services</h2>
        <p className="text-slate-500 max-w-md">
          Catalog management, pricing, and service offerings will be available here. This section is in development.
        </p>
      </div>
    </div>
  );
};

export default ProductsServices;
