
import React, { useState } from 'react';
import { MOCK_INVOICES, MOCK_COMPANIES } from '../constants.tsx';
import { 
  DollarSign, Send, CheckCircle2, Clock, AlertTriangle, 
  Plus, ChevronRight, Download, X, FileText, Building2, 
  Trash2, Mail, CreditCard, ArrowRight
} from 'lucide-react';
import { Invoice } from '../types.ts';

interface InvoicingProps {
  onCreateInvoice: () => void;
}

const Invoicing: React.FC<InvoicingProps> = ({ onCreateInvoice }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const getCompany = (id: string) => MOCK_COMPANIES.find(c => c.id === id);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Overdue': return 'bg-red-50 text-red-600 border-red-100';
      case 'Sent': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Billing & Invoicing</h1>
          <p className="text-slate-500 text-sm font-medium">Oversee payments and logistics milestone billing</p>
        </div>
        <button 
          onClick={onCreateInvoice}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Outstanding', value: '$42,300', icon: <DollarSign />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Awaiting Payment', value: '14', icon: <Clock />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Paid This Month', value: '$12,850', icon: <CheckCircle2 />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
              {React.cloneElement(stat.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-xl font-black text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MOCK_INVOICES.map(invoice => (
                <tr 
                  key={invoice.id} 
                  onClick={() => setSelectedInvoice(invoice)}
                  className="group hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{invoice.number}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">REF: {invoice.id.substring(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img src={getCompany(invoice.companyId)?.logo} className="w-6 h-6 rounded border border-slate-200" alt="" />
                      <span className="text-sm font-semibold text-slate-700">{getCompany(invoice.companyId)?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">${invoice.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-500">{invoice.dueDate}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${getStatusStyle(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); /* logic to send */ }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); /* logic to download */ }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-all translate-x-0 group-hover:translate-x-1" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Drawer */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" 
            onClick={() => setSelectedInvoice(null)} 
          />
          <div className="absolute right-0 inset-y-0 w-full max-w-xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedInvoice.number}</h2>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Billing Statement</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)} 
                className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm border border-transparent hover:border-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* Header Info */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</p>
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <img src={getCompany(selectedInvoice.companyId)?.logo} className="w-10 h-10 rounded border border-slate-200" alt="" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{getCompany(selectedInvoice.companyId)?.name}</p>
                      <p className="text-xs text-slate-500">{getCompany(selectedInvoice.companyId)?.website}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                  <span className={`inline-block mt-1 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(selectedInvoice.status)}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount Due</p>
                  <h3 className="text-2xl font-black text-slate-900">${selectedInvoice.amount.toLocaleString()}</h3>
                </div>
                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                  <h3 className="text-2xl font-black text-slate-900">{selectedInvoice.dueDate}</h3>
                </div>
              </div>

              {/* Items List (Mock) */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Service Breakdown</h3>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {[
                    { desc: 'Digital Transformation Consulting (Ph 1)', qty: 1, rate: 3500 },
                    { desc: 'TMS API Implementation', qty: 1, rate: 1500 }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 flex justify-between items-center bg-white">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.desc}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Qty: {item.qty} @ ${item.rate.toLocaleString()}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">${(item.qty * item.rate).toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="p-4 flex justify-between items-center bg-slate-50">
                    <p className="text-sm font-black text-slate-900 uppercase">Total</p>
                    <p className="text-lg font-black text-indigo-600">${selectedInvoice.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Actions & Links */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group">
                    <Mail className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-700">Email Link</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group">
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-700">Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Automation Note */}
              <div className="bg-indigo-900 rounded-[28px] p-8 text-white relative overflow-hidden group shadow-xl">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
                      <CreditCard className="w-4 h-4 text-indigo-300" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Smart Billing</span>
                  </div>
                  <h4 className="text-xl font-bold mb-2">Automated Reminders</h4>
                  <p className="text-indigo-200 text-xs leading-relaxed opacity-80 mb-6">
                    This client is enrolled in our AI-driven follow-up sequence. Next reminder scheduled for {selectedInvoice.status !== 'Paid' ? 'Tomorrow morning' : 'N/A'}.
                  </p>
                  <button className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest hover:underline transition-all">
                    View Sequence <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <DollarSign className="absolute -right-6 -bottom-6 w-40 h-40 text-indigo-800 opacity-20 pointer-events-none" />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button 
                className="flex-1 py-4 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as Paid
              </button>
              <button className="px-6 py-4 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoicing;
