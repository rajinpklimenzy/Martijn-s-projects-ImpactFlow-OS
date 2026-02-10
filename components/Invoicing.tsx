
import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, Send, CheckCircle2, Clock, AlertTriangle, 
  Plus, ChevronRight, Download, X, FileText, Building2, 
  Trash2, Mail, Loader2, Edit2, Save, CheckSquare
} from 'lucide-react';
import { Invoice, Company, InvoiceItem } from '../types.ts';
import { apiGetInvoices, apiGetCompanies, apiUpdateInvoice, apiDeleteInvoice, apiSendInvoiceEmail } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';
import { formatCurrency, getCurrencySymbol, CURRENCIES, DEFAULT_CURRENCY } from '../utils/currency';
import jsPDF from 'jspdf';

interface InvoicingProps {
  onCreateInvoice: () => void;
  currentUser?: any;
}

const Invoicing: React.FC<InvoicingProps> = ({ onCreateInvoice, currentUser }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Selection State
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isEditingBreakdown, setIsEditingBreakdown] = useState(false);
  const [breakdownItems, setBreakdownItems] = useState<InvoiceItem[]>([]);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [newItem, setNewItem] = useState({ description: '', quantity: 1, rate: 0 });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEditingCurrency, setIsEditingCurrency] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<string>(DEFAULT_CURRENCY);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all invoices for the workspace so every user can see the full billing view.
      const invoicesResponse = await apiGetInvoices();
      const fetchedInvoices = invoicesResponse?.data || invoicesResponse || [];
      setInvoices(Array.isArray(fetchedInvoices) ? fetchedInvoices : []);
      try {
        const companiesResponse = await apiGetCompanies();
        setCompanies(companiesResponse?.data || companiesResponse || []);
      } catch (err) {
        setCompanies([]);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('refresh-invoices', handleRefresh);
    return () => window.removeEventListener('refresh-invoices', handleRefresh);
  }, [fetchData]);

  const getCompany = (id: string) => companies.find(c => c.id === id);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Overdue': return 'bg-red-50 text-red-600 border-red-100';
      case 'Sent': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const stats = {
    totalOutstanding: invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + (inv.amount || 0), 0),
    awaitingPayment: invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + (inv.amount || 0), 0),
    paidThisMonth: invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + (inv.amount || 0), 0)
  };

  const selectAll = () => {
    if (selectedInvoiceIds.length === invoices.length) setSelectedInvoiceIds([]);
    else setSelectedInvoiceIds(invoices.map(i => i.id));
  };

  const handleBulkMarkPaid = async () => {
    // Capture current selection into a fixed immutable array to avoid closure race conditions
    const targetIds = [...selectedInvoiceIds];
    if (targetIds.length === 0) return;
    
    setIsBulkProcessing(true);
    showInfo(`Processing payment status for ${targetIds.length} items...`);
    
    try {
      // Execute batch updates using the captured local copy
      await Promise.all(targetIds.map(id => apiUpdateInvoice(id, { status: 'Paid' })));
      
      // Update state functionally for better reliability
      setInvoices(prev => prev.map(inv => targetIds.includes(inv.id) ? { ...inv, status: 'Paid' as any } : inv));
      
      showSuccess(`Successfully marked ${targetIds.length} invoices as paid`);
      setSelectedInvoiceIds([]);
      fetchData(); // Trigger fresh fetch to ensure data integrity
    } catch (err) {
      showError('Bulk update failed. Some items may not have been updated.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    // Capture current selection into a fixed immutable array to avoid closure race conditions
    const targetIds = [...selectedInvoiceIds];
    if (targetIds.length === 0) return;
    
    setIsBulkDeleteConfirmOpen(true);
  };

  const executeBulkDelete = async () => {
    const targetIds = [...selectedInvoiceIds];
    if (targetIds.length === 0) return;
    
    setIsBulkProcessing(true);
    setIsBulkDeleteConfirmOpen(false);
    showInfo(`Executing batch deletion for ${targetIds.length} registry entries...`);
    
    try {
      // Execute batch deletions using the captured local copy
      await Promise.all(targetIds.map(id => apiDeleteInvoice(id)));
      
      // Update state functionally
      setInvoices(prev => prev.filter(inv => !targetIds.includes(inv.id)));
      
      showSuccess(`Successfully removed ${targetIds.length} invoices from registry`);
      setSelectedInvoiceIds([]);
      fetchData(); // Sync with server state
    } catch (err) {
      showError('Bulk deletion encountered an error. Refresh registry to verify state.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Initialize breakdown items and currency when invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      // Check for both 'items' and 'lineItems' (lineItems takes precedence)
      const items = selectedInvoice.lineItems || selectedInvoice.items || [];
      setBreakdownItems(items);
      setIsEditingBreakdown(false);
      setEditingItem(null);
      setNewItem({ description: '', quantity: 1, rate: 0 });
      setEditingCurrency(selectedInvoice.currency || DEFAULT_CURRENCY);
      setIsEditingCurrency(false);
    }
  }, [selectedInvoice]);

  // Calculate breakdown total
  const calculateBreakdownTotal = (items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + (item.amount || item.quantity * item.rate), 0);
  };

  // Add new breakdown item
  const handleAddBreakdownItem = () => {
    if (!newItem.description || !newItem.rate) {
      showError('Please fill in description and rate');
      return;
    }

    const amount = newItem.quantity * newItem.rate;
    const currentTotal = calculateBreakdownTotal(breakdownItems);
    
    if (currentTotal + amount > (selectedInvoice?.amount || 0)) {
      showError(`Breakdown total cannot exceed invoice amount of $${(selectedInvoice?.amount || 0).toLocaleString()}`);
      return;
    }

    const item: InvoiceItem = {
      id: Date.now().toString(),
      description: newItem.description,
      quantity: newItem.quantity,
      rate: newItem.rate,
      amount: amount
    };

    setBreakdownItems([...breakdownItems, item]);
    setNewItem({ description: '', quantity: 1, rate: 0 });
  };

  // Update breakdown item
  const handleUpdateBreakdownItem = (itemId: string, updates: Partial<InvoiceItem>) => {
    const updatedItems = breakdownItems.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates };
        if (updates.quantity !== undefined || updates.rate !== undefined) {
          updated.amount = (updates.quantity || item.quantity) * (updates.rate || item.rate);
        }
        return updated;
      }
      return item;
    });

    const newTotal = calculateBreakdownTotal(updatedItems);
    if (newTotal > (selectedInvoice?.amount || 0)) {
      showError(`Breakdown total cannot exceed invoice amount of ${formatCurrency(selectedInvoice?.amount || 0, selectedInvoice?.currency)}`);
      return;
    }

    setBreakdownItems(updatedItems);
    if (editingItem?.id === itemId) {
      setEditingItem({ ...editingItem, ...updates });
    }
  };

  // Delete breakdown item
  const handleDeleteBreakdownItem = (itemId: string) => {
    setBreakdownItems(breakdownItems.filter(item => item.id !== itemId));
  };

  // Save breakdown to database
  const handleSaveBreakdown = async () => {
    if (!selectedInvoice) return;

    setIsUpdating(true);
    try {
      await apiUpdateInvoice(selectedInvoice.id, { 
        items: breakdownItems,
        lineItems: breakdownItems // Also update lineItems for consistency
      });
      setInvoices(prev => prev.map(inv => 
        inv.id === selectedInvoice.id ? { 
          ...inv, 
          items: breakdownItems,
          lineItems: breakdownItems 
        } : inv
      ));
      setSelectedInvoice({ 
        ...selectedInvoice, 
        items: breakdownItems,
        lineItems: breakdownItems 
      });
      setIsEditingBreakdown(false);
      showSuccess('Service breakdown saved successfully!');
      window.dispatchEvent(new Event('refresh-invoices'));
    } catch (err: any) {
      console.error('Failed to save breakdown:', err);
      showError(err.message || 'Failed to save breakdown');
    } finally {
      setIsUpdating(false);
    }
  };

  // Mark invoice as paid (single)
  const handleMarkAsPaid = async () => {
    if (!selectedInvoice) return;

    setIsUpdating(true);
    try {
      await apiUpdateInvoice(selectedInvoice.id, { status: 'Paid' });
      setInvoices(prev => prev.map(inv => 
        inv.id === selectedInvoice.id ? { ...inv, status: 'Paid' as any } : inv
      ));
      setSelectedInvoice({ ...selectedInvoice, status: 'Paid' as any });
      showSuccess('Invoice marked as paid!');
      window.dispatchEvent(new Event('refresh-invoices'));
    } catch (err: any) {
      console.error('Failed to update invoice:', err);
      showError(err.message || 'Failed to update invoice');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete invoice (single)
  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;

    setIsDeleting(true);
    try {
      await apiDeleteInvoice(selectedInvoice.id);
      setInvoices(prev => prev.filter(inv => inv.id !== selectedInvoice.id));
      setSelectedInvoice(null);
      setIsDeleteConfirmOpen(false);
      showSuccess('Invoice deleted successfully!');
      window.dispatchEvent(new Event('refresh-invoices'));
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      showError(err.message || 'Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  // PDF Generation logic
  const handleDownloadPDFForInvoice = (invoice: Invoice) => {
    const company = getCompany(invoice.companyId);
    const doc = new jsPDF();
    
    // Colors
    const primaryColorR = 99;
    const primaryColorG = 102;
    const primaryColorB = 241;
    const lightGrayR = 241;
    const lightGrayG = 245;
    const lightGrayB = 249;
    const darkGrayR = 51;
    const darkGrayG = 65;
    const darkGrayB = 85;
    
    // Header
    doc.setFillColor(primaryColorR, primaryColorG, primaryColorB);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 20, 25);
    
    // Details
    doc.setTextColor(darkGrayR, darkGrayG, darkGrayB);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Number: ${invoice.number}`, 20, 50);
    doc.text(`Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}`, 20, 56);
    doc.text(`Due Date: ${invoice.dueDate}`, 20, 62);
    doc.text(`Status: ${invoice.status}`, 20, 68);
    
    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Bill To:', 120, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(company?.name || 'Unknown Company', 120, 56);
    if (company?.website) doc.text(company.website, 120, 62);
    
    // Save
    doc.save(`Invoice-${invoice.number}.pdf`);
    showSuccess('Invoice PDF downloaded successfully!');
  };

  const handleSendInvoiceEmail = async (invoice?: Invoice) => {
    const invoiceToSend = invoice || selectedInvoice;
    if (!invoiceToSend) return;
    const company = getCompany(invoiceToSend.companyId);
    if (!company?.email) {
      showError('Company email is missing.');
      return;
    }
    setIsSendingEmail(true);
    try {
      await apiSendInvoiceEmail(invoiceToSend.id);
      if (invoiceToSend.status === 'Draft') {
        setInvoices(prev => prev.map(inv => inv.id === invoiceToSend.id ? { ...inv, status: 'Sent' as any } : inv));
      }
      showSuccess(`Invoice sent to ${company.email}!`);
      fetchData();
    } catch (err: any) {
      showError('Failed to send invoice email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 relative h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Invoicing</h1>
          <p className="text-slate-500 text-sm font-medium">Oversee payments and logistics milestone billing</p>
        </div>
        <button onClick={onCreateInvoice} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Outstanding', value: `$${stats.totalOutstanding.toLocaleString()}`, icon: <DollarSign />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Awaiting Payment', value: `$${stats.awaitingPayment.toLocaleString()}`, icon: <Clock />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Paid This Month', value: `$${stats.paidThisMonth.toLocaleString()}`, icon: <CheckCircle2 />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
              {React.cloneElement(stat.icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
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
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    checked={invoices.length > 0 && selectedInvoiceIds.length === invoices.length}
                    onChange={selectAll}
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400 text-sm font-medium">No records found in digital registry.</td></tr>
              ) : invoices.map(invoice => {
                const isItemSelected = selectedInvoiceIds.includes(invoice.id);
                return (
                  <tr 
                    key={invoice.id} 
                    onClick={() => setSelectedInvoice(invoice)}
                    className={`group transition-colors cursor-pointer ${isItemSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        checked={isItemSelected}
                        onChange={() => setSelectedInvoiceIds(prev => isItemSelected ? prev.filter(id => id !== invoice.id) : [...prev, invoice.id])}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{invoice.number}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">REF: {invoice.id.substring(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ImageWithFallback src={getCompany(invoice.companyId)?.logo} fallbackText={getCompany(invoice.companyId)?.name} className="w-6 h-6" isAvatar={false} />
                        <span className="text-sm font-semibold text-slate-700">{getCompany(invoice.companyId)?.name || 'Unknown Partner'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-900">{formatCurrency(invoice.amount, invoice.currency)}</span></td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">{invoice.dueDate}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusStyle(invoice.status)}`}>{invoice.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Robust Bulk Action Bar */}
      {selectedInvoiceIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl px-8 py-4 flex items-center gap-8 border border-white/10 ring-4 ring-indigo-500/10">
            <span className="text-sm font-black flex items-center gap-3">
              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px]">{selectedInvoiceIds.length}</div>
              Selected
            </span>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); handleBulkMarkPaid(); }}
                disabled={isBulkProcessing}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isBulkProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Mark Paid
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleBulkDelete(); }}
                disabled={isBulkProcessing}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isBulkProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
              <button onClick={() => setSelectedInvoiceIds([])} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setSelectedInvoice(null)} />
          <div className="absolute right-0 inset-y-0 w-full max-w-xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600"><FileText className="w-6 h-6" /></div>
                <div><h2 className="text-lg font-bold text-slate-900">{selectedInvoice.number}</h2><p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Billing Statement</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                  <span className={`inline-block mt-1 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(selectedInvoice.status)}`}>{selectedInvoice.status}</span>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm border border-transparent hover:border-slate-200 transition-all"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</p>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <ImageWithFallback src={getCompany(selectedInvoice.companyId)?.logo} fallbackText={getCompany(selectedInvoice.companyId)?.name || 'C'} className="w-10 h-10 border border-slate-200" isAvatar={false} />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{getCompany(selectedInvoice.companyId)?.name || 'Unknown Company'}</p>
                    <p className="text-xs text-slate-500">{getCompany(selectedInvoice.companyId)?.website || ''}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Due</p>
                    {!isEditingCurrency ? (
                      <button onClick={() => setIsEditingCurrency(true)} className="px-2 py-1 text-[9px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 className="w-3 h-3" /></button>
                    ) : (
                      <button onClick={async () => {
                        setIsUpdating(true);
                        try {
                          await apiUpdateInvoice(selectedInvoice.id, { currency: editingCurrency });
                          setInvoices(prev => prev.map(inv => 
                            inv.id === selectedInvoice.id ? { ...inv, currency: editingCurrency } : inv
                          ));
                          setSelectedInvoice({ ...selectedInvoice, currency: editingCurrency });
                          setIsEditingCurrency(false);
                          showSuccess('Currency updated successfully!');
                        } catch (err: any) {
                          showError(err.message || 'Failed to update currency');
                        } finally {
                          setIsUpdating(false);
                        }
                      }} disabled={isUpdating} className="px-2 py-1 text-[9px] font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"><Save className="w-3 h-3" /></button>
                    )}
                  </div>
                  {isEditingCurrency ? (
                    <select
                      value={editingCurrency}
                      onChange={(e) => setEditingCurrency(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl text-sm outline-none font-bold appearance-none bg-white border-2 border-indigo-200 focus:ring-4 focus:ring-indigo-100 text-indigo-600"
                      style={{
                        backgroundImage: `url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"%3E%3Cpath stroke="%234f46e5" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m6 8 4 4 4-4"/%3E%3C/svg%3E')`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '16px'
                      }}
                    >
                      {CURRENCIES.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} ({currency.symbol})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <h3 className="text-2xl font-black text-slate-900">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</h3>
                  )}
                </div>
                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                  <h3 className="text-2xl font-black text-slate-900">{selectedInvoice.dueDate}</h3>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Registry Narrative</h3>
                <p className="text-sm text-slate-700 bg-slate-50 p-6 rounded-3xl border border-slate-100 leading-relaxed italic">{selectedInvoice.description || 'No additional strategic description provided for this statement.'}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Service Breakdown</h3>
                  {!isEditingBreakdown ? (
                    <button onClick={() => setIsEditingBreakdown(true)} className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                  ) : (
                    <button onClick={handleSaveBreakdown} disabled={isUpdating} className="px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"><Save className="w-3 h-3" /> {isUpdating ? 'Saving...' : 'Save'}</button>
                  )}
                </div>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                  {breakdownItems.map((item) => (
                    <div key={item.id} className="p-5 flex justify-between items-center group">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{item.description}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Qty: {item.quantity} @ {getCurrencySymbol(selectedInvoice.currency)}{item.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">{formatCurrency(item.amount, selectedInvoice.currency)}</p>
                    </div>
                  ))}
                  {breakdownItems.length === 0 && (
                    <div className="p-8 text-center text-slate-400 italic text-xs">No granular items archived.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              {selectedInvoice.status !== 'Paid' && (
                <button onClick={handleMarkAsPaid} disabled={isUpdating} className="flex-1 py-4 bg-indigo-600 text-white text-sm font-black uppercase tracking-[0.1em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-2">
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm Receipt
                </button>
              )}
              <button onClick={() => setIsDeleteConfirmOpen(true)} className="px-6 py-4 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-2xl transition-all shadow-sm active:scale-95"><Trash2 className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[80] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[36px] w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200 p-10">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Archive Invoice?</h3>
              <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">This will permanently remove the billing statement from the digital registry. This action is terminal.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)} 
                  disabled={isDeleting}
                  className="flex-1 py-4 text-sm font-black text-slate-500 bg-slate-50 rounded-2xl uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Abort
                </button>
                <button 
                  onClick={handleDeleteInvoice} 
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-red-600 text-white text-sm font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Terminal Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteConfirmOpen && selectedInvoiceIds.length > 0 && (
        <div className="fixed inset-0 z-[80] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setIsBulkDeleteConfirmOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[36px] w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200 p-10">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Delete {selectedInvoiceIds.length} Invoice{selectedInvoiceIds.length > 1 ? 's' : ''}?</h3>
              <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">This will permanently remove {selectedInvoiceIds.length} invoice{selectedInvoiceIds.length > 1 ? 's' : ''} from the digital registry. This action is terminal and cannot be undone.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsBulkDeleteConfirmOpen(false)} 
                  disabled={isBulkProcessing}
                  className="flex-1 py-4 text-sm font-black text-slate-500 bg-slate-50 rounded-2xl uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Abort
                </button>
                <button 
                  onClick={executeBulkDelete} 
                  disabled={isBulkProcessing}
                  className="flex-1 py-4 bg-red-600 text-white text-sm font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isBulkProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    `Delete ${selectedInvoiceIds.length} Invoice${selectedInvoiceIds.length > 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoicing;
