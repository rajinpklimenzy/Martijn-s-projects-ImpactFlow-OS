
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Send, CheckCircle2, Clock, AlertTriangle, 
  Plus, ChevronRight, Download, X, FileText, Building2, 
  Trash2, Mail, CreditCard, ArrowRight, Loader2, Edit2, Save
} from 'lucide-react';
import { Invoice, Company, InvoiceItem } from '../types.ts';
import { apiGetInvoices, apiGetCompanies, apiUpdateInvoice, apiDeleteInvoice, apiSendInvoiceEmail } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';
import jsPDF from 'jspdf';

interface InvoicingProps {
  onCreateInvoice: () => void;
  currentUser?: any;
}

const Invoicing: React.FC<InvoicingProps> = ({ onCreateInvoice, currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditingBreakdown, setIsEditingBreakdown] = useState(false);
  const [breakdownItems, setBreakdownItems] = useState<InvoiceItem[]>([]);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [newItem, setNewItem] = useState({ description: '', quantity: 1, rate: 0 });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Fetch invoices and companies
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
        
        // Fetch invoices
        const invoicesResponse = await apiGetInvoices(userId);
        const fetchedInvoices = invoicesResponse?.data || invoicesResponse || [];
        setInvoices(Array.isArray(fetchedInvoices) ? fetchedInvoices : []);

        // Fetch companies
        try {
          const companiesResponse = await apiGetCompanies();
          setCompanies(companiesResponse?.data || companiesResponse || []);
        } catch (err) {
          console.error('Failed to fetch companies:', err);
          setCompanies([]);
        }
      } catch (err: any) {
        console.error('[INVOICING] Failed to fetch data:', err);
        showError(err.message || 'Failed to load invoices');
        setInvoices([]);
        setCompanies([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Listen for invoice creation/update events
  useEffect(() => {
    const handleRefresh = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      try {
        const invoicesResponse = await apiGetInvoices(userId);
        const fetchedInvoices = invoicesResponse?.data || invoicesResponse || [];
        setInvoices(Array.isArray(fetchedInvoices) ? fetchedInvoices : []);
      } catch (err) {
        console.error('Failed to refresh invoices:', err);
      }
    };

    window.addEventListener('refresh-invoices', handleRefresh);
    return () => window.removeEventListener('refresh-invoices', handleRefresh);
  }, [currentUser]);

  const getCompany = (id: string) => companies.find(c => c.id === id);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Overdue': return 'bg-red-50 text-red-600 border-red-100';
      case 'Sent': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Draft': return 'bg-slate-50 text-slate-600 border-slate-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const totalOutstanding = invoices
      .filter(inv => inv.status !== 'Paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    // Calculate total amount of unpaid invoices (Draft, Sent, Overdue)
    const awaitingPayment = invoices
      .filter(inv => inv.status !== 'Paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const paidThisMonth = invoices
      .filter(inv => {
        if (inv.status !== 'Paid' || !inv.updatedAt) return false;
        const paidDate = new Date(inv.updatedAt);
        return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);

    return { totalOutstanding, awaitingPayment, paidThisMonth };
  };

  const stats = calculateStats();

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

  // Check for overdue invoices
  const checkOverdueInvoices = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    invoices.forEach(invoice => {
      if (invoice.status === 'Sent' && invoice.dueDate) {
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          // Update to overdue status
          apiUpdateInvoice(invoice.id, { status: 'Overdue' }).catch(err => 
            console.error('Failed to update overdue status:', err)
          );
        }
      }
    });
  };

  useEffect(() => {
    checkOverdueInvoices();
  }, [invoices]);

  // Initialize breakdown items when invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      setBreakdownItems(selectedInvoice.items || []);
      setIsEditingBreakdown(false);
      setEditingItem(null);
      setNewItem({ description: '', quantity: 1, rate: 0 });
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
          updated.amount = (updated.quantity || item.quantity) * (updated.rate || item.rate);
        }
        return updated;
      }
      return item;
    });

    const newTotal = calculateBreakdownTotal(updatedItems);
    if (newTotal > (selectedInvoice?.amount || 0)) {
      showError(`Breakdown total cannot exceed invoice amount of $${(selectedInvoice?.amount || 0).toLocaleString()}`);
      return;
    }

    setBreakdownItems(updatedItems);
    setEditingItem(null);
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
      await apiUpdateInvoice(selectedInvoice.id, { items: breakdownItems });
      setInvoices(prev => prev.map(inv => 
        inv.id === selectedInvoice.id ? { ...inv, items: breakdownItems } : inv
      ));
      setSelectedInvoice({ ...selectedInvoice, items: breakdownItems });
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

  // Generate and download PDF
  const handleDownloadPDF = () => {
    if (!selectedInvoice) return;

    const company = getCompany(selectedInvoice.companyId);
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
    
    // Invoice details
    doc.setTextColor(darkGrayR, darkGrayG, darkGrayB);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Number: ${selectedInvoice.number}`, 20, 50);
    doc.text(`Date: ${new Date(selectedInvoice.createdAt || Date.now()).toLocaleDateString()}`, 20, 56);
    doc.text(`Due Date: ${selectedInvoice.dueDate}`, 20, 62);
    doc.text(`Status: ${selectedInvoice.status}`, 20, 68);
    
    // Company info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Bill To:', 120, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(company?.name || 'Unknown Company', 120, 56);
    if (company?.website) {
      doc.text(company.website, 120, 62);
    }
    
    // Description
    if (selectedInvoice.description) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Description:', 20, 80);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(selectedInvoice.description, 170);
      doc.text(descLines, 20, 86);
    }
    
    let yPos = selectedInvoice.description ? 100 : 90;
    
    // Service Breakdown
    if (breakdownItems && breakdownItems.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Service Breakdown', 20, yPos);
      yPos += 10;
      
      // Table header
      doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
      doc.rect(20, yPos - 5, 170, 8, 'F');
      doc.setTextColor(darkGrayR, darkGrayG, darkGrayB);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', 22, yPos);
      doc.text('Qty', 130, yPos);
      doc.text('Rate', 145, yPos);
      doc.text('Amount', 165, yPos);
      yPos += 8;
      
      // Table rows
      breakdownItems.forEach((item, index) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const descLines = doc.splitTextToSize(item.description, 100);
        doc.text(descLines, 22, yPos);
        doc.text(item.quantity.toString(), 130, yPos);
        doc.text(`$${item.rate.toFixed(2)}`, 145, yPos);
        doc.text(`$${item.amount.toFixed(2)}`, 165, yPos);
        yPos += Math.max(descLines.length * 5, 8);
        
        if (index < breakdownItems.length - 1) {
          doc.setDrawColor(200, 200, 200);
          doc.line(20, yPos - 2, 190, yPos - 2);
        }
      });
      
      yPos += 5;
    }
    
    // Total
    doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total Amount:', 22, yPos + 7);
    doc.setTextColor(primaryColorR, primaryColorG, primaryColorB);
    doc.text(`$${selectedInvoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 165, yPos + 7, { align: 'right' });
    
    // Footer
    yPos = 280;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your business!', 105, yPos, { align: 'center' });
    
    // Save PDF
    doc.save(`Invoice-${selectedInvoice.number}.pdf`);
    showSuccess('Invoice PDF downloaded successfully!');
  };

  // Send invoice via email
  const handleSendInvoiceEmail = async (invoice?: Invoice) => {
    const invoiceToSend = invoice || selectedInvoice;
    if (!invoiceToSend) return;

    const company = getCompany(invoiceToSend.companyId);
    if (!company?.email) {
      showError('Company email is not set. Please add an email address to the company first.');
      return;
    }

    setIsSendingEmail(true);
    try {
      await apiSendInvoiceEmail(invoiceToSend.id);
      
      // Update invoice status to "Sent" if it was "Draft"
      if (invoiceToSend.status === 'Draft') {
        setInvoices(prev => prev.map(inv => 
          inv.id === invoiceToSend.id ? { ...inv, status: 'Sent' as any } : inv
        ));
        if (selectedInvoice?.id === invoiceToSend.id) {
          setSelectedInvoice({ ...selectedInvoice, status: 'Sent' as any });
        }
      }
      
      showSuccess(`Invoice sent successfully to ${company.email}!`);
      window.dispatchEvent(new Event('refresh-invoices'));
    } catch (err: any) {
      console.error('Failed to send invoice email:', err);
      showError(err.message || 'Failed to send invoice email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Download invoice PDF
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
    
    // Invoice details
    doc.setTextColor(darkGrayR, darkGrayG, darkGrayB);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Number: ${invoice.number}`, 20, 50);
    doc.text(`Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}`, 20, 56);
    doc.text(`Due Date: ${invoice.dueDate}`, 20, 62);
    doc.text(`Status: ${invoice.status}`, 20, 68);
    
    // Company info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Bill To:', 120, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(company?.name || 'Unknown Company', 120, 56);
    if (company?.website) {
      doc.text(company.website, 120, 62);
    }
    
    // Description
    if (invoice.description) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Description:', 20, 80);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(invoice.description, 170);
      doc.text(descLines, 20, 86);
    }
    
    let yPos = invoice.description ? 100 : 90;
    
    // Service Breakdown
    const items = invoice.items || [];
    if (items && items.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Service Breakdown', 20, yPos);
      yPos += 10;
      
      // Table header
      doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
      doc.rect(20, yPos - 5, 170, 8, 'F');
      doc.setTextColor(darkGrayR, darkGrayG, darkGrayB);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', 22, yPos);
      doc.text('Qty', 130, yPos);
      doc.text('Rate', 145, yPos);
      doc.text('Amount', 165, yPos);
      yPos += 8;
      
      // Table rows
      items.forEach((item, index) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const descLines = doc.splitTextToSize(item.description, 100);
        doc.text(descLines, 22, yPos);
        doc.text(item.quantity.toString(), 130, yPos);
        doc.text(`$${item.rate.toFixed(2)}`, 145, yPos);
        doc.text(`$${item.amount.toFixed(2)}`, 165, yPos);
        yPos += Math.max(descLines.length * 5, 8);
        
        if (index < items.length - 1) {
          doc.setDrawColor(200, 200, 200);
          doc.line(20, yPos - 2, 190, yPos - 2);
        }
      });
      
      yPos += 5;
    }
    
    // Total
    doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total Amount:', 22, yPos + 7);
    doc.setTextColor(primaryColorR, primaryColorG, primaryColorB);
    doc.text(`$${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 165, yPos + 7, { align: 'right' });
    
    // Footer
    yPos = 280;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your business!', 105, yPos, { align: 'center' });
    
    // Save PDF
    doc.save(`Invoice-${invoice.number}.pdf`);
    showSuccess('Invoice PDF downloaded successfully!');
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
          { label: 'Total Outstanding', value: `$${stats.totalOutstanding.toLocaleString()}`, icon: <DollarSign />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Awaiting Payment', value: `$${stats.awaitingPayment.toLocaleString()}`, icon: <Clock />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Paid This Month', value: `$${stats.paidThisMonth.toLocaleString()}`, icon: <CheckCircle2 />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Invoices Found</h3>
          <p className="text-slate-500 text-sm mb-6">Get started by creating your first invoice.</p>
          <button 
            onClick={onCreateInvoice}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Your First Invoice
          </button>
        </div>
      ) : (
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
                {invoices.map(invoice => (
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
                        <ImageWithFallback
                          src={getCompany(invoice.companyId)?.logo}
                          alt={getCompany(invoice.companyId)?.name || ''}
                          fallbackText={getCompany(invoice.companyId)?.name || 'C'}
                          className="w-6 h-6 border border-slate-200"
                          isAvatar={false}
                        />
                        <span className="text-sm font-semibold text-slate-700">{getCompany(invoice.companyId)?.name || 'Unknown Company'}</span>
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
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleSendInvoiceEmail(invoice);
                          }}
                          disabled={isSendingEmail}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Send Invoice via Email"
                        >
                          {isSendingEmail ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                        <Send className="w-4 h-4" />
                          )}
                      </button>
                      <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDownloadPDFForInvoice(invoice);
                          }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                          title="Download Invoice PDF"
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
      )}

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
                    <ImageWithFallback
                      src={getCompany(selectedInvoice.companyId)?.logo}
                      alt={getCompany(selectedInvoice.companyId)?.name || ''}
                      fallbackText={getCompany(selectedInvoice.companyId)?.name || 'C'}
                      className="w-10 h-10 border border-slate-200"
                      isAvatar={false}
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{getCompany(selectedInvoice.companyId)?.name || 'Unknown Company'}</p>
                      <p className="text-xs text-slate-500">{getCompany(selectedInvoice.companyId)?.website || ''}</p>
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

              {/* Description */}
              {selectedInvoice.description && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</h3>
                  <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">{selectedInvoice.description}</p>
                </div>
              )}

              {/* Service Breakdown */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Service Breakdown</h3>
                  {!isEditingBreakdown ? (
                    <button
                      onClick={() => setIsEditingBreakdown(true)}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveBreakdown}
                      disabled={isUpdating}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      {isUpdating ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {breakdownItems.length === 0 && !isEditingBreakdown ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      No service breakdown items. Click "Edit" to add items.
                    </div>
                  ) : (
                    <>
                      {breakdownItems.map((item) => (
                        <div key={item.id} className="p-4 bg-white flex justify-between items-center group">
                          {isEditingBreakdown && editingItem?.id === item.id ? (
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={editingItem.description}
                                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                className="px-2 py-1 text-sm border border-slate-200 rounded"
                                placeholder="Description"
                              />
                              <input
                                type="number"
                                value={editingItem.quantity}
                                onChange={(e) => {
                                  const qty = parseFloat(e.target.value) || 1;
                                  handleUpdateBreakdownItem(item.id, { quantity: qty });
                                }}
                                className="px-2 py-1 text-sm border border-slate-200 rounded"
                                min="1"
                              />
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  value={editingItem.rate}
                                  onChange={(e) => {
                                    const rate = parseFloat(e.target.value) || 0;
                                    handleUpdateBreakdownItem(item.id, { rate });
                                  }}
                                  className="px-2 py-1 text-sm border border-slate-200 rounded flex-1"
                                  step="0.01"
                                  min="0"
                                />
                                <button
                                  onClick={() => setEditingItem(null)}
                                  className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBreakdownItem(item.id)}
                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800">{item.description}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">
                                  Qty: {item.quantity} @ ${item.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-slate-900">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                {isEditingBreakdown && (
                                  <button
                                    onClick={() => setEditingItem(item)}
                                    className="p-1 text-slate-400 hover:text-indigo-600"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                    </div>
                  ))}

                      {/* Add new item form */}
                      {isEditingBreakdown && (
                        <div className="p-4 bg-slate-50 border-t-2 border-dashed border-slate-200">
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <input
                              type="text"
                              value={newItem.description}
                              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                              placeholder="Description"
                            />
                            <input
                              type="number"
                              value={newItem.quantity}
                              onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
                              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                              placeholder="Qty"
                              min="1"
                            />
                            <input
                              type="number"
                              value={newItem.rate}
                              onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })}
                              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                              placeholder="Rate"
                              step="0.01"
                              min="0"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-slate-500">
                              Amount: ${(newItem.quantity * newItem.rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <button
                              onClick={handleAddBreakdownItem}
                              className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add Item
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Total */}
                  <div className="p-4 flex justify-between items-center bg-slate-50">
                    <p className="text-sm font-black text-slate-900 uppercase">Total</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-black text-indigo-600">
                            ${breakdownItems.length > 0 
                              ? calculateBreakdownTotal(breakdownItems).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : selectedInvoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            }
                          </p>
                          {breakdownItems.length > 0 && calculateBreakdownTotal(breakdownItems) !== selectedInvoice.amount && (
                            <span className="text-xs text-amber-600 font-bold">
                              (Invoice: ${selectedInvoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                          )}
                        </div>
                  </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions & Links */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleSendInvoiceEmail}
                    disabled={isSendingEmail}
                    className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        <span className="text-xs font-bold text-indigo-600">Sending...</span>
                      </>
                    ) : (
                      <>
                    <Mail className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                        <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-700">Email Invoice</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleDownloadPDF}
                    className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
                  >
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
              {selectedInvoice.status !== 'Paid' && (
                <button 
                  onClick={handleMarkAsPaid}
                  disabled={isUpdating}
                  className="flex-1 py-4 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Mark as Paid
                    </>
                  )}
                </button>
              )}
              <button 
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-6 py-4 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-2xl transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[80] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Delete Invoice</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
                <button onClick={() => setIsDeleteConfirmOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete invoice <span className="font-bold text-slate-900">{selectedInvoice.number}</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs text-red-700 font-semibold mb-1">⚠️ Warning:</p>
                  <p className="text-xs text-red-600">
                    This will permanently delete the invoice and all associated data. This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    disabled={isDeleting}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteInvoice}
                    disabled={isDeleting}
                    className="flex-[2] py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Invoice
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoicing;
