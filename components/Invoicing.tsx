
import React, { useState } from 'react';
import { MOCK_INVOICES, MOCK_COMPANIES } from '../constants';
import { DollarSign, Send, CheckCircle2, Clock, AlertTriangle, Search, Filter, Plus, CreditCard, ChevronRight, X, Download, FileText, Trash2, Printer } from 'lucide-react';
import { Invoice } from '../types';

interface InvoicingProps {
  onCreateInvoice: () => void;
}

const Invoicing: React.FC<InvoicingProps> = ({ onCreateInvoice }) => {
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Paid': return 'bg-emerald-100 text-emerald-700';
      case 'Overdue': return 'bg-red-100 text-red-700';
      case 'Sent': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-in slide-in-from-right-2 duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Billing</h1>
          <p className="text-slate-500 text-xs lg:text-sm">Manage payments and collections</p>
        </div>
        <button 
          onClick={onCreateInvoice}
          className="px-3 lg:px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Invoice</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-6">
        {[
          { label: 'Outstanding', value: '$24,000', color: 'text-indigo-600' },
          { label: 'Paid', value: '$12,500', color: 'text-emerald-600' },
          { label: 'Overdue', value: '$8,200', color: 'text-red-600' },
        ].map((m, i) => (
          <div key={i} className="bg-white p-4 lg:p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
            <h2 className={`text-xl lg:text-2xl font-bold ${m.color}`}>{m.value}</h2>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 lg:p-4 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50">
          <div className="flex gap-1 lg:gap-2">
            <button className="text-[10px] lg:text-xs font-bold text-slate-600 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">All</button>
            <button className="text-[10px] lg:text-xs font-bold text-slate-400 px-3 py-1.5 hover:text-slate-600 transition-colors">Pending</button>
            <button className="text-[10px] lg:text-xs font-bold text-slate-400 px-3 py-1.5 hover:text-slate-600 transition-colors">Paid</button>
          </div>
          <div className="flex items-center gap-2 lg:gap-3 flex-1 lg:flex-none justify-end">
             <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm shrink-0" onClick={() => setShowStripeModal(true)}>
              <CreditCard className="w-3.5 h-3.5" />
              Stripe Connect
             </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_INVOICES.map(invoice => {
                const company = MOCK_COMPANIES.find(c => c.id === invoice.companyId);
                return (
                  <tr 
                    key={invoice.id} 
                    onClick={() => setSelectedInvoice(invoice)}
                    className={`transition-colors group cursor-pointer active:bg-indigo-50/30 ${selectedInvoice?.id === invoice.id ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600 group-hover:underline">{invoice.number}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={company?.logo} alt="" className="w-6 h-6 rounded border border-slate-100 shadow-sm" />
                        <span className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{company?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">${invoice.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${getStatusStyle(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{invoice.dueDate}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => {e.stopPropagation();}} className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded text-slate-400 transition-colors shadow-sm">
                          <Send className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 self-center ml-2" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="lg:hidden divide-y divide-slate-100">
          {MOCK_INVOICES.map(invoice => {
            const company = MOCK_COMPANIES.find(c => c.id === invoice.companyId);
            return (
              <div 
                key={invoice.id} 
                onClick={() => setSelectedInvoice(invoice)}
                className={`p-4 flex items-center justify-between active:bg-indigo-50 cursor-pointer group ${selectedInvoice?.id === invoice.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                    <img src={company?.logo} alt="" className="w-6 h-6 rounded" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">{company?.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-indigo-600">{invoice.number}</span>
                      <span className="text-[10px] text-slate-400">• Due {invoice.dueDate}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">${invoice.amount.toLocaleString()}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getStatusStyle(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice Detail Drawer */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setSelectedInvoice(null)} />
          <div className="absolute right-0 inset-y-0 w-full max-w-2xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedInvoice.number}</h2>
                  <p className="text-xs text-slate-500">Billed to {MOCK_COMPANIES.find(c => c.id === selectedInvoice.companyId)?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white rounded-lg text-slate-400 border border-transparent hover:border-slate-200 shadow-sm transition-all"><Printer className="w-5 h-5" /></button>
                <button className="p-2 hover:bg-white rounded-lg text-slate-400 border border-transparent hover:border-slate-200 shadow-sm transition-all"><Download className="w-5 h-5" /></button>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-white rounded-full text-slate-400 border border-transparent hover:border-slate-200 shadow-sm transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30">
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-8 max-w-lg mx-auto">
                <div className="flex justify-between items-start pb-8 border-b border-slate-100">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">INVOICE</h1>
                    <p className="text-sm font-bold text-indigo-600 mt-1">{selectedInvoice.number}</p>
                  </div>
                  <div className="text-right">
                    <img src={MOCK_COMPANIES.find(c => c.id === selectedInvoice.companyId)?.logo} className="w-12 h-12 ml-auto mb-2 rounded border border-slate-100" />
                    <p className="text-xs font-bold text-slate-900">{MOCK_COMPANIES.find(c => c.id === selectedInvoice.companyId)?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Issue Date</p>
                    <p className="font-semibold">May 10, 2024</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                    <p className="font-semibold text-red-500">{selectedInvoice.dueDate}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Description</th>
                        <th className="text-right py-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      <tr>
                        <td className="py-4">
                          <p className="font-bold">Software Implementation</p>
                          <p className="text-xs text-slate-500">Phase 1: Discovery & Architecture</p>
                        </td>
                        <td className="text-right font-bold">${selectedInvoice.amount.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-8 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-semibold">${selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span>Total Amount</span>
                    <span className="text-indigo-600">${selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="max-w-lg mx-auto space-y-4">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Billing Actions</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <button className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-center group">
                      <Send className="w-5 h-5 mx-auto mb-2 text-slate-400 group-hover:text-indigo-600" />
                      <p className="text-xs font-bold text-slate-900">Resend Link</p>
                    </button>
                    <button className="p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-center group">
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-slate-400 group-hover:text-emerald-600" />
                      <p className="text-xs font-bold text-slate-900">Mark as Paid</p>
                    </button>
                 </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
              <button className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Send Invoice</button>
              <button className="px-5 py-3 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showStripeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="bg-white p-6 lg:p-8 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl relative animate-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => setShowStripeModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-100">
              <CreditCard className="w-6 h-6 lg:w-8 lg:h-8" />
            </div>
            <h3 className="text-lg lg:text-xl font-bold mb-2">Connect Stripe</h3>
            <p className="text-slate-500 text-xs lg:text-sm mb-6 leading-relaxed">Automate your billing cycles for digital transformation projects. Connect your Stripe account to sync invoices and track payments in real-time.</p>
            <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98]">
              Start Stripe Onboarding
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoicing;
