
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Receipt, Plus, ChevronRight, X, FileText, Building2, 
  Trash2, Loader2, Upload, Image as ImageIcon, Download, Eye,
  Filter, CheckSquare, DollarSign, Calendar, Tag, Clock, CheckCircle2, Circle
} from 'lucide-react';
import { Expense, Company } from '../types.ts';
import { apiGetExpenses, apiGetCompanies, apiCreateExpense, apiUpdateExpense, apiDeleteExpense, apiGetExpenseCategories, apiCreateExpenseCategory } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';

interface ExpensesProps {
  currentUser?: any;
}

const Expenses: React.FC<ExpensesProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCompanyFilters, setSelectedCompanyFilters] = useState<string[]>([]);
  
  // Category popup state
  const [isCategoryPopupOpen, setIsCategoryPopupOpen] = useState(false);
  const [categoryPopupMode, setCategoryPopupMode] = useState<'select' | 'manage'>('select');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // Company filter popup state
  const [isCompanyFilterPopupOpen, setIsCompanyFilterPopupOpen] = useState(false);
  
  // Multi-select state
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Add expense modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    companyId: '',
    title: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    status: 'Pending' as 'Pending' | 'Approved' | 'Rejected',
    receiptFile: null as File | null
  });

  const fetchCategories = useCallback(async () => {
    try {
      const categoriesResponse = await apiGetExpenseCategories();
      const fetchedCategories = categoriesResponse?.data || categoriesResponse || [];
      setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
    } catch (err) {
      // Fallback to default categories if API fails
      setCategories([
        { id: 'default-1', name: 'Travel', isDefault: true },
        { id: 'default-2', name: 'Meals', isDefault: true },
        { id: 'default-3', name: 'Office Supplies', isDefault: true },
        { id: 'default-4', name: 'Software', isDefault: true },
        { id: 'default-5', name: 'Marketing', isDefault: true },
        { id: 'default-6', name: 'Professional Services', isDefault: true },
        { id: 'default-7', name: 'Utilities', isDefault: true },
        { id: 'default-8', name: 'Equipment', isDefault: true },
        { id: 'default-9', name: 'Other', isDefault: true }
      ]);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch expenses for the whole workspace so every user sees the same data.
      const params: any = {};
      
      // If multiple companies selected, fetch all and filter client-side
      // Otherwise, if single company selected, use server-side filter
      if (selectedCompanyFilters.length === 1) {
        params.companyId = selectedCompanyFilters[0];
      }
      
      const expensesResponse = await apiGetExpenses(params);
      
      let fetchedExpenses = expensesResponse?.data || expensesResponse || [];
      fetchedExpenses = Array.isArray(fetchedExpenses) ? fetchedExpenses : [];
      
      // Filter by multiple companies if any selected
      if (selectedCompanyFilters.length > 1) {
        fetchedExpenses = fetchedExpenses.filter((exp: Expense) => 
          selectedCompanyFilters.includes(exp.companyId)
        );
      }
      
      setExpenses(fetchedExpenses);
      
      try {
        const companiesResponse = await apiGetCompanies();
        setCompanies(companiesResponse?.data || companiesResponse || []);
      } catch (err) {
        console.error('[Expenses] Failed to fetch companies:', err);
        setCompanies([]);
      }
    } catch (err: any) {
      console.error('[Expenses] Error fetching expenses:', err);
      showError(err.message || 'Failed to load expenses');
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, selectedCompanyFilters, showError]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('refresh-expenses', handleRefresh);
    return () => window.removeEventListener('refresh-expenses', handleRefresh);
  }, [fetchData]);

  const getCompany = (id: string) => companies.find(c => c.id === id);

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Rejected': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  const filteredExpenses = expenses; // Already filtered in fetchData

  const stats = {
    totalExpenses: filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
    pendingCount: filteredExpenses.filter(exp => exp.status === 'Pending' || !exp.status).length,
    approvedCount: filteredExpenses.filter(exp => exp.status === 'Approved').length,
    thisMonth: filteredExpenses.filter(exp => {
      const expDate = new Date(exp.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }).reduce((sum, exp) => sum + (exp.amount || 0), 0)
  };

  const selectAll = () => {
    if (selectedExpenseIds.length === filteredExpenses.length && filteredExpenses.length > 0) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(filteredExpenses.map(e => e.id));
    }
  };

  // Compress image for upload
  const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to create canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
      showError('Please select an image or PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('File size must be less than 10MB');
      return;
    }

    setIsProcessingReceipt(true);
    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 1920, 1080, 0.8);
        setReceiptPreview(compressed);
        setFormData(prev => ({ ...prev, receiptFile: file }));
      } else {
        // For PDF, convert to base64
        const reader = new FileReader();
        reader.onload = () => {
          setReceiptPreview(reader.result as string);
          setFormData(prev => ({ ...prev, receiptFile: file }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to process receipt');
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId || !formData.title || !formData.amount || !formData.category || !formData.date) {
      showError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      
      let receiptUrl = '';
      let receiptFilename = '';
      let receiptMimeType = '';
      
      if (formData.receiptFile) {
        if (formData.receiptFile.type.startsWith('image/')) {
          receiptUrl = receiptPreview;
          receiptFilename = formData.receiptFile.name;
          receiptMimeType = formData.receiptFile.type;
        } else {
          receiptUrl = receiptPreview;
          receiptFilename = formData.receiptFile.name;
          receiptMimeType = formData.receiptFile.type;
        }
      }

      await apiCreateExpense({
        companyId: formData.companyId,
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: new Date(formData.date).toISOString(),
        description: formData.description,
        status: formData.status,
        receiptUrl: receiptUrl || undefined,
        receiptFilename: receiptFilename || undefined,
        receiptMimeType: receiptMimeType || undefined,
        userId
      });

      showSuccess('Expense added successfully');
      setIsAddModalOpen(false);
      setFormData({
        companyId: '',
        title: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        status: 'Pending',
        receiptFile: null
      });
      setReceiptPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
      window.dispatchEvent(new Event('refresh-expenses'));
    } catch (err: any) {
      showError(err.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsAddingCategory(true);
    try {
      const response = await apiCreateExpenseCategory({ name: newCategoryName.trim() });
      if (response?.data) {
        const newCategory = response.data;
        setCategories(prev => [...prev, newCategory]);
        setFormData(prev => ({ ...prev, category: newCategory.name }));
        setNewCategoryName('');
        setIsCategoryPopupOpen(false);
        showSuccess('Category added successfully');
      }
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('CATEGORY_EXISTS')) {
        showError('Category with this name already exists');
      } else {
        showError(err.message || 'Failed to add category');
      }
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleUpdateStatus = async (expenseId: string, newStatus: 'Pending' | 'Approved' | 'Rejected') => {
    setIsUpdatingStatus(true);
    try {
      await apiUpdateExpense(expenseId, { status: newStatus });
      
      // Update the expense in the list
      setExpenses(prev => prev.map(exp => 
        exp.id === expenseId ? { ...exp, status: newStatus } : exp
      ));
      
      // Update selected expense if it's the one being updated
      if (selectedExpense && selectedExpense.id === expenseId) {
        setSelectedExpense({ ...selectedExpense, status: newStatus });
      }
      
      showSuccess(`Expense status updated to ${newStatus}`);
      window.dispatchEvent(new Event('refresh-expenses'));
    } catch (err: any) {
      showError(err.message || 'Failed to update expense status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;

    setIsDeleting(true);
    try {
      await apiDeleteExpense(selectedExpense.id);
      setExpenses(prev => prev.filter(exp => exp.id !== selectedExpense.id));
      setSelectedExpense(null);
      setIsDeleteConfirmOpen(false);
      showSuccess('Expense deleted successfully');
      window.dispatchEvent(new Event('refresh-expenses'));
    } catch (err: any) {
      showError(err.message || 'Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    const targetIds = [...selectedExpenseIds];
    if (targetIds.length === 0) return;

    setIsBulkDeleting(true);
    setIsBulkDeleteConfirmOpen(false);
    try {
      await Promise.all(targetIds.map(id => apiDeleteExpense(id)));
      setExpenses(prev => prev.filter(exp => !targetIds.includes(exp.id)));
      setSelectedExpenseIds([]);
      showSuccess(`Successfully deleted ${targetIds.length} expense(s)`);
      window.dispatchEvent(new Event('refresh-expenses'));
    } catch (err: any) {
      showError('Failed to delete some expenses');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="w-full pt-0 pb-20 px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Expenses</h1>
          <p className="text-slate-500 text-sm">Manage company expenses and receipts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCategoryPopupMode('manage');
              setIsCategoryPopupOpen(true);
            }}
            className="px-4 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all flex items-center gap-2 border-2 border-indigo-200"
          >
            <Tag className="w-4 h-4" />
            Manage Categories
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Expenses', value: formatCurrency(stats.totalExpenses), icon: <DollarSign className="w-5 h-5" />, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Pending', value: stats.pendingCount.toString(), icon: <Clock className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50' },
          { label: 'Approved', value: stats.approvedCount.toString(), icon: <CheckSquare className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'This Month', value: formatCurrency(stats.thisMonth), icon: <Calendar className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-600">Filter by Company:</span>
        </div>
        <button
          onClick={() => setIsCompanyFilterPopupOpen(true)}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors flex items-center gap-2"
        >
          <span>
            {selectedCompanyFilters.length === 0 
              ? 'All Companies' 
              : selectedCompanyFilters.length === 1
              ? companies.find(c => c.id === selectedCompanyFilters[0])?.name || '1 Selected'
              : `${selectedCompanyFilters.length} Companies Selected`
            }
          </span>
          {selectedCompanyFilters.length > 0 && (
            <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">
              {selectedCompanyFilters.length}
            </span>
          )}
        </button>
        <div className="text-xs text-slate-400 font-bold ml-auto">
          Showing {filteredExpenses.length} expense(s)
        </div>
      </div>

      {/* Multi-select Controls - Floating Action Bar */}
      {selectedExpenseIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 rounded-full px-6 py-4 shadow-2xl flex items-center gap-4 min-w-[320px]">
            {/* Selection Count Badge */}
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-black">{selectedExpenseIds.length}</span>
            </div>
            
            {/* Selected Label */}
            <span className="text-white text-sm font-bold">Selected</span>
            
            {/* Vertical Separator */}
            <div className="w-px h-6 bg-white/20"></div>
            
            {/* Delete Button */}
            <button
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              disabled={isBulkDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  DELETE
                </>
              )}
            </button>
            
            {/* Dismiss Button */}
            <button
              onClick={() => setSelectedExpenseIds([])}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex-shrink-0 ml-auto"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses Grid */}
        <div className={`lg:col-span-2 space-y-4 ${selectedExpense ? 'lg:pr-6' : ''}`}>
          {/* Select All */}
          {filteredExpenses.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedExpenseIds.length === filteredExpenses.length && filteredExpenses.length > 0}
                  onChange={selectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-sm font-bold text-slate-600">Select All</span>
              </label>
            </div>
          )}

          {filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-900 mb-2">No Expenses Found</h3>
              <p className="text-slate-500 text-sm mb-6">Get started by adding your first expense</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Add Expense
              </button>
            </div>
          ) : (
            filteredExpenses.map(expense => {
              const company = getCompany(expense.companyId);
              const isSelected = selectedExpenseIds.includes(expense.id);
              
              return (
                <div
                  key={expense.id}
                  onClick={() => setSelectedExpense(expense)}
                  className={`bg-white rounded-2xl border ${isSelected ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200'} shadow-sm hover:shadow-xl transition-all cursor-pointer p-6 ${
                    selectedExpense?.id === expense.id ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedExpenseIds(prev => 
                            isSelected ? prev.filter(id => id !== expense.id) : [...prev, expense.id]
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0"
                      />
                      <ImageWithFallback
                        src={company?.logo}
                        fallbackText={company?.name}
                        className="w-10 h-10 rounded-xl shrink-0"
                        isAvatar={false}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-slate-900 text-lg mb-1 truncate">{expense.title}</h3>
                        <p className="text-sm text-slate-500 truncate">{company?.name || 'Unknown Company'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-2xl font-black text-slate-900 mb-1">{formatCurrency(expense.amount)}</p>
                      <select
                        value={expense.status || 'Pending'}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(expense.id, e.target.value as 'Pending' | 'Approved' | 'Rejected');
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isUpdatingStatus}
                        className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border outline-none cursor-pointer transition-all ${
                          getStatusStyle(expense.status || 'Pending')
                        } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span className="font-bold">{expense.category}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span className="font-bold">{formatDate(expense.date)}</span>
                    </div>
                    {expense.receiptUrl && (
                      <div className="flex items-center gap-1 text-indigo-600">
                        <FileText className="w-3 h-3" />
                        <span className="font-bold">Receipt</span>
                      </div>
                    )}
                  </div>

                  {expense.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{expense.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExpense(expense);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      View Details
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExpense(expense);
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Expense Detail Sidebar */}
        {selectedExpense && (
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900">Expense Details</h2>
              <button
                onClick={() => setSelectedExpense(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Title</label>
                <p className="text-lg font-black text-slate-900">{selectedExpense.title}</p>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Company</label>
                <div className="flex items-center gap-2">
                  <ImageWithFallback
                    src={getCompany(selectedExpense.companyId)?.logo}
                    fallbackText={getCompany(selectedExpense.companyId)?.name}
                    className="w-6 h-6 rounded-lg"
                    isAvatar={false}
                  />
                  <p className="text-sm font-bold text-slate-900">{getCompany(selectedExpense.companyId)?.name || 'Unknown'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Amount</label>
                <p className="text-2xl font-black text-indigo-600">{formatCurrency(selectedExpense.amount)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                  <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold">
                    {selectedExpense.category}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Status</label>
                  <select
                    value={selectedExpense.status || 'Pending'}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'Pending' | 'Approved' | 'Rejected';
                      handleUpdateStatus(selectedExpense.id, newStatus);
                    }}
                    disabled={isUpdatingStatus}
                    className={`w-full px-3 py-1.5 rounded-lg text-sm font-bold border outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                      getStatusStyle(selectedExpense.status || 'Pending')
                    } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  {isUpdatingStatus && (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                      <span className="text-xs text-slate-500">Updating...</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Date</label>
                <p className="text-sm font-bold text-slate-900">{formatDate(selectedExpense.date)}</p>
              </div>

              {selectedExpense.description && (
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Description</label>
                  <p className="text-sm text-slate-600">{selectedExpense.description}</p>
                </div>
              )}

              {selectedExpense.receiptUrl && (
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Receipt</label>
                  <div className="space-y-2">
                    {selectedExpense.receiptMimeType?.startsWith('image/') ? (
                      <div className="relative group">
                        <img
                          src={selectedExpense.receiptUrl}
                          alt={selectedExpense.receiptFilename || 'Receipt'}
                          className="w-full rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(`<img src="${selectedExpense.receiptUrl}" style="max-width:100%;height:auto;" />`);
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye className="w-6 h-6 text-white drop-shadow-lg" />
                        </div>
                      </div>
                    ) : (
                      <a
                        href={selectedExpense.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <span className="text-sm font-bold text-slate-900 flex-1 truncate">
                          {selectedExpense.receiptFilename || 'Receipt'}
                        </span>
                        <Download className="w-4 h-4 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setSelectedExpense(selectedExpense);
                    setIsDeleteConfirmOpen(true);
                  }}
                  disabled={isDeleting}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Expense
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                  <Receipt className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Add Expense</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mt-2">Company Expense Management</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setFormData({
                    companyId: '',
                    title: '',
                    amount: '',
                    category: '',
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    status: 'Pending' as 'Pending' | 'Approved' | 'Rejected',
                    receiptFile: null
                  });
                  setReceiptPreview('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Company *</label>
                  <select
                    required
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                  >
                    <option value="">Select Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Title *</label>
                  <input
                    required
                    type="text"
                    placeholder="Expense title..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Amount *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Category *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryPopupMode('select');
                      setIsCategoryPopupOpen(true);
                    }}
                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 text-left flex items-center justify-between ${
                      formData.category ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    <span>{formData.category || 'Select Category'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Date *</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Pending' | 'Approved' | 'Rejected' })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Additional details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Receipt (Image/PDF)</label>
                  <label className="flex items-center gap-3 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      {isProcessingReceipt ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : receiptPreview ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900">
                        {receiptPreview ? (formData.receiptFile?.name || 'Receipt uploaded') : 'Upload Receipt'}
                      </p>
                      <p className="text-[10px] text-slate-400">PNG, JPG, PDF (Max 10MB)</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleReceiptChange}
                      disabled={isProcessingReceipt}
                      className="hidden"
                    />
                  </label>
                  {receiptPreview && formData.receiptFile?.type.startsWith('image/') && (
                    <div className="mt-3">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-full max-h-48 object-contain rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                  {receiptPreview && formData.receiptFile?.type.includes('pdf') && (
                    <div className="mt-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
                      <FileText className="w-8 h-8 text-red-600 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-900">{formData.receiptFile.name}</p>
                        <p className="text-xs text-red-700 mt-0.5">PDF document ready to upload</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptPreview('');
                          setFormData(prev => ({ ...prev, receiptFile: null }));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setFormData({
                      companyId: '',
                      title: '',
                      amount: '',
                      category: '',
                      date: new Date().toISOString().split('T')[0],
                      description: '',
                      status: 'Pending' as 'Pending' | 'Approved' | 'Rejected',
                      receiptFile: null
                    });
                    setReceiptPreview('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="flex-1 py-4 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-[24px] hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isProcessingReceipt}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-[24px] hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Expense
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedExpense && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Delete Expense?</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">This action cannot be undone</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-900 mb-1">{selectedExpense.title}</p>
                <p className="text-xs text-slate-500">{formatCurrency(selectedExpense.amount)} • {getCompany(selectedExpense.companyId)?.name || 'Unknown'}</p>
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setSelectedExpense(null);
                }}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteExpense}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Selection Popup */}
      {isCategoryPopupOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {categoryPopupMode === 'manage' ? 'Manage Categories' : 'Select Category'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {categoryPopupMode === 'manage' ? 'View and add expense categories' : 'Choose an expense category'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCategoryPopupOpen(false);
                  setNewCategoryName('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <div className="text-center py-8">
                    <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No categories yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add your first category below</p>
                  </div>
                ) : categoryPopupMode === 'manage' ? (
                  categories.map(category => (
                    <div
                      key={category.id}
                      className="px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Tag className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">{category.name}</span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  ))
                ) : (
                  categories.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, category: category.name });
                        setIsCategoryPopupOpen(false);
                      }}
                      className={`w-full px-4 py-3 rounded-xl text-left transition-all flex items-center justify-between ${
                        formData.category === category.name
                          ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-200'
                          : 'bg-slate-50 text-slate-900 border-2 border-transparent hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-bold text-sm">{category.name}</span>
                      {formData.category === category.name ? (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategoryName.trim() && !isAddingCategory) {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim() || isAddingCategory}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAddingCategory ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Categories are shared across budgets and expenses
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Company Filter Popup */}
      {isCompanyFilterPopupOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Filter by Company</h3>
                <p className="text-xs text-slate-400 mt-1">Select one or more companies</p>
              </div>
              <button
                onClick={() => setIsCompanyFilterPopupOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedCompanyFilters.length === 0}
                    onChange={() => {
                      setSelectedCompanyFilters([]);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="font-bold text-sm text-slate-900">All Companies</span>
                </label>
                {companies.map(company => (
                  <label
                    key={company.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanyFilters.includes(company.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCompanyFilters(prev => [...prev, company.id]);
                        } else {
                          setSelectedCompanyFilters(prev => prev.filter(id => id !== company.id));
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <ImageWithFallback
                      src={company.logo}
                      fallbackText={company.name}
                      className="w-6 h-6 rounded-lg"
                      isAvatar={false}
                    />
                    <span className="font-bold text-sm text-slate-900 flex-1">{company.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedCompanyFilters([]);
                }}
                disabled={selectedCompanyFilters.length === 0}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
              <button
                onClick={() => {
                  setIsCompanyFilterPopupOpen(false);
                  fetchData();
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
              >
                Apply Filters ({selectedCompanyFilters.length === 0 ? 'All' : selectedCompanyFilters.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Delete {selectedExpenseIds.length} Expense(s)?</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">This action cannot be undone</p>
                </div>
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setIsBulkDeleteConfirmOpen(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
