import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Plus, TrendingUp, TrendingDown, AlertTriangle, ChevronRight,
  Calendar, Building2, Tag, X, Loader2, Save, Trash2, Eye, Edit2,
  PieChart, BarChart3, CheckCircle2, AlertCircle, Settings2, Filter
} from 'lucide-react';
import { Budget as BudgetType } from '../types';
import {
  apiGetBudgets, apiCreateBudget, apiUpdateBudget, apiDeleteBudget,
  apiGetBudgetTracking, apiGetDepartments, apiGetExpenseCategories, apiCreateExpenseCategory
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface BudgetProps {
  currentUser?: any;
}

const Budget: React.FC<BudgetProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [budgetTracking, setBudgetTracking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [viewMode, setViewMode] = useState<'yearly' | 'quarterly' | 'monthly'>('yearly');
  
  // Admin controls
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmBudget, setDeleteConfirmBudget] = useState<BudgetType | null>(null);
  
  // Category management modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    department: '',
    categories: [] as Array<{
      categoryId: string;
      categoryName: string;
      yearlyBudget: number;
      q1Budget: number;
      q2Budget: number;
      q3Budget: number;
      q4Budget: number;
    }>
  });

  const isAdmin = currentUser?.role === 'Admin';
  const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;

  // Available years (current year + 2 past years + 2 future years)
  const availableYears = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await apiGetDepartments();
      const deps = response?.data || [];
      setDepartments(Array.isArray(deps) ? deps : []);
    } catch (err) {
      console.error('[BUDGET] Error fetching departments:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiGetExpenseCategories();
      const cats = response?.data || [];
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      console.error('[BUDGET] Error fetching categories:', err);
    }
  }, []);

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { year: selectedYear };
      if (selectedDepartment) {
        params.department = selectedDepartment;
      }
      
      console.log('[Budget] Fetching budgets with params:', params);
      const response = await apiGetBudgets(params);
      const budgetsData = response?.data || [];
      console.log('[Budget] Received budgets:', budgetsData);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
    } catch (err: any) {
      console.error('[Budget] Error fetching budgets:', err);
      showError(err.message || 'Failed to load budgets');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedDepartment, showError]);

  const fetchBudgetTracking = useCallback(async () => {
    setIsLoadingTracking(true);
    try {
      const params: any = { year: selectedYear };
      if (selectedDepartment) {
        params.department = selectedDepartment;
      }
      
      console.log('[Budget] Fetching tracking with params:', params);
      const response = await apiGetBudgetTracking(params);
      console.log('[Budget] Received tracking:', response?.data);
      setBudgetTracking(response?.data || null);
    } catch (err: any) {
      console.error('[Budget] Error fetching tracking:', err);
      setBudgetTracking(null);
    } finally {
      setIsLoadingTracking(false);
    }
  }, [selectedYear, selectedDepartment]);

  useEffect(() => {
    fetchDepartments();
    fetchCategories();
  }, [fetchDepartments, fetchCategories]);

  useEffect(() => {
    fetchBudgets();
    fetchBudgetTracking();
  }, [fetchBudgets, fetchBudgetTracking]);

  const initializeFormWithCategories = () => {
    setFormData({
      year: selectedYear,
      department: selectedDepartment,
      categories: categories.map(cat => ({
        categoryId: cat.id,
        categoryName: cat.name,
        yearlyBudget: 0,
        q1Budget: 0,
        q2Budget: 0,
        q3Budget: 0,
        q4Budget: 0
      }))
    });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsAddingCategory(true);
    try {
      const response = await apiCreateExpenseCategory({ name: newCategoryName.trim() });
      if (response?.data) {
        const newCategory = response.data;
        setCategories(prev => [...prev, newCategory]);
        setNewCategoryName('');
        showSuccess('Category added successfully');
        // Refresh categories list
        fetchCategories();
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

  const handleCreateBudget = async () => {
    if (!userId) {
      showError('User not found');
      return;
    }

    if (formData.categories.length === 0) {
      showError('Please add at least one category');
      return;
    }

    const totalBudget = formData.categories.reduce((sum, cat) => sum + cat.yearlyBudget, 0);
    if (totalBudget === 0) {
      showError('Total budget cannot be zero');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiCreateBudget({
        year: formData.year,
        department: formData.department || null,
        categories: formData.categories,
        createdBy: userId
      });
      
      showSuccess('Budget created successfully');
      setIsCreateModalOpen(false);
      fetchBudgets();
      fetchBudgetTracking();
    } catch (err: any) {
      showError(err.message || 'Failed to create budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget || !userId) return;

    setIsSubmitting(true);
    try {
      await apiUpdateBudget(editingBudget.id, {
        categories: formData.categories,
        updatedBy: userId
      });
      
      showSuccess('Budget updated successfully');
      setIsEditModalOpen(false);
      setEditingBudget(null);
      fetchBudgets();
      fetchBudgetTracking();
    } catch (err: any) {
      showError(err.message || 'Failed to update budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (budget: BudgetType) => {
    setIsDeleting(true);
    try {
      await apiDeleteBudget(budget.id);
      showSuccess('Budget deleted successfully');
      setDeleteConfirmBudget(null);
      fetchBudgets();
      fetchBudgetTracking();
    } catch (err: any) {
      showError(err.message || 'Failed to delete budget');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getPercentageColor = (percent: number) => {
    if (percent >= 100) return 'text-red-600';
    if (percent >= 80) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getProgressBarColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget Management</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Track spending against allocated budgets</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2 bg-white text-indigo-600 text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-50 border-2 border-indigo-200 transition-all active:scale-95"
            >
              <Tag className="w-4 h-4" /> Manage Categories
            </button>
            <button
              onClick={() => {
                initializeFormWithCategories();
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Create Budget
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              View Mode
            </label>
            <div className="flex gap-2">
              {(['yearly', 'quarterly', 'monthly'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex-1 px-3 py-3 rounded-xl text-xs font-black uppercase transition-all ${
                    viewMode === mode
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Existing Budgets List - Always show if budgets exist */}
      {!isLoading && budgets.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {budgetTracking && budgetTracking.hasBudget !== false ? 'Current Budget' : 'Available Budgets'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {budgets.length} budget{budgets.length !== 1 ? 's' : ''} for selected filters
                </p>
              </div>
              {budgetTracking && budgetTracking.hasBudget !== false && isAdmin && (
                <button
                  onClick={() => {
                    const budget = budgets[0];
                    setEditingBudget(budget);
                    setFormData({
                      year: budget.year,
                      department: budget.department || '',
                      categories: budget.categories.map(cat => ({
                        ...cat,
                        q1Budget: cat.q1Budget || 0,
                        q2Budget: cat.q2Budget || 0,
                        q3Budget: cat.q3Budget || 0,
                        q4Budget: cat.q4Budget || 0
                      }))
                    });
                    setIsEditModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit Budget
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {budgets.map((budget) => (
              <div key={budget.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-sm font-black text-slate-900">
                        {budget.year} {budget.department && `- ${budget.department}`}
                      </h3>
                      {!budget.department && (
                        <span className="px-2 py-1 bg-purple-50 text-purple-600 text-[10px] font-black uppercase rounded-lg border border-purple-200">
                          Global
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Total Budget
                        </p>
                        <p className="text-lg font-black text-indigo-600">
                          {formatCurrency(budget.totalBudget)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Categories
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                          {budget.categories.length} configured
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Created
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {budget.createdAt ? new Date(budget.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Show category details */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <details className="group">
                        <summary className="text-xs font-bold text-indigo-600 cursor-pointer hover:text-indigo-700 list-none flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                          View category breakdown
                        </summary>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {budget.categories.map(cat => (
                            <div key={cat.categoryId} className="p-2 bg-slate-50 rounded-lg">
                              <p className="text-xs font-bold text-slate-900">{cat.categoryName}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                Yearly: <span className="font-black">{formatCurrency(cat.yearlyBudget)}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </div>
                  {isAdmin && !(budgetTracking && budgetTracking.hasBudget !== false) && (
                    <button
                      onClick={() => {
                        setEditingBudget(budget);
                        setFormData({
                          year: budget.year,
                          department: budget.department || '',
                          categories: budget.categories.map(cat => ({
                            ...cat,
                            q1Budget: cat.q1Budget || 0,
                            q2Budget: cat.q2Budget || 0,
                            q3Budget: cat.q3Budget || 0,
                            q4Budget: cat.q4Budget || 0
                          }))
                        });
                        setIsEditModalOpen(true);
                      }}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" /> View/Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Overview Stats */}
      {budgetTracking && budgetTracking.hasBudget !== false && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Budget</p>
            </div>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(budgetTracking.totalBudget)}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spent</p>
            </div>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(budgetTracking.totalSpent)}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${budgetTracking.totalRemaining >= 0 ? 'bg-emerald-50' : 'bg-red-50'} flex items-center justify-center`}>
                {budgetTracking.totalRemaining >= 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remaining</p>
            </div>
            <h3 className={`text-2xl font-black ${budgetTracking.totalRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(budgetTracking.totalRemaining))}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <PieChart className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">% Used</p>
            </div>
            <h3 className={`text-2xl font-black ${getPercentageColor(budgetTracking.totalPercentUsed)}`}>
              {budgetTracking.totalPercentUsed.toFixed(1)}%
            </h3>
          </div>
        </div>
      )}

      {/* Budget Alert */}
      {budgetTracking && budgetTracking.isOverBudget && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-start gap-4 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-black text-red-900 mb-1">Budget Exceeded</h3>
            <p className="text-sm text-red-700">
              You are <span className="font-black">{formatCurrency(budgetTracking.overBudgetAmount)}</span> over budget
              ({budgetTracking.totalPercentUsed.toFixed(1)}% of total budget used).
            </p>
          </div>
        </div>
      )}

      {/* No Budget Message */}
      {!isLoading && (!budgetTracking || budgetTracking.hasBudget === false) && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center">
          <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Budget Set</h3>
          <p className="text-sm text-slate-500 mb-6">
            {isAdmin 
              ? `No budget has been set for ${selectedYear}${selectedDepartment ? ` - ${selectedDepartment}` : ''}. Create one to start tracking.`
              : `No budget available for ${selectedYear}${selectedDepartment ? ` - ${selectedDepartment}` : ''}.`
            }
          </p>
          {isAdmin && (
            <button
              onClick={() => {
                initializeFormWithCategories();
                setIsCreateModalOpen(true);
              }}
              className="px-6 py-3 bg-indigo-600 text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" /> Create Budget
            </button>
          )}
        </div>
      )}

      {/* Category Budget Breakdown */}
      {budgetTracking && budgetTracking.hasBudget !== false && budgetTracking.categories && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-900">Spending vs Budget by Category</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {budgetTracking.categories.map((cat: any) => (
              <div key={cat.categoryId} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-900 mb-1">{cat.categoryName}</h3>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500 font-medium">
                        Budget: <span className="font-black text-slate-900">{formatCurrency(cat.yearlyBudget)}</span>
                      </span>
                      <span className="text-slate-500 font-medium">
                        Spent: <span className="font-black text-slate-900">{formatCurrency(cat.yearlySpent)}</span>
                      </span>
                      <span className={`font-black ${getPercentageColor(cat.yearlyPercentUsed)}`}>
                        {cat.yearlyPercentUsed.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {cat.isOverBudget && (
                    <div className="px-3 py-1 bg-red-50 text-red-600 text-xs font-black uppercase rounded-lg border border-red-200">
                      Over by {formatCurrency(cat.overBudgetAmount)}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all ${getProgressBarColor(cat.yearlyPercentUsed)}`}
                    style={{ width: `${Math.min(cat.yearlyPercentUsed, 100)}%` }}
                  />
                  {cat.yearlyPercentUsed > 100 && (
                    <div
                      className="absolute left-0 top-0 h-full bg-red-500/30 border-r-2 border-red-600"
                      style={{ width: '100%' }}
                    />
                  )}
                </div>

                {/* Quarterly Breakdown */}
                {viewMode === 'quarterly' && (
                  <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                    {['q1', 'q2', 'q3', 'q4'].map((quarter, idx) => {
                      const qData = cat.quarters[quarter];
                      return (
                        <div key={quarter} className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Q{idx + 1}
                          </p>
                          <p className="text-xs text-slate-600 font-medium">
                            <span className="font-black text-slate-900">{formatCurrency(qData.spent)}</span>
                            {' '} / {formatCurrency(qData.budget)}
                          </p>
                          <p className={`text-xs font-black mt-1 ${getPercentageColor(qData.percentUsed)}`}>
                            {qData.percentUsed.toFixed(0)}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Budget Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[120] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-300 flex flex-col">
              {/* Header */}
              <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <DollarSign className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Create Budget</h2>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Set budget allocations for {formData.year}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-6">
                  {/* Year and Department */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Year <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.year}
                        onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                      >
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Department
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                      >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Category Budgets */}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-600" /> Category Budgets
                    </h3>
                    <div className="space-y-4">
                      {formData.categories.map((cat, idx) => (
                        <div key={cat.categoryId} className="p-4 border-2 border-slate-200 rounded-xl">
                          <h4 className="font-black text-slate-900 mb-3">{cat.categoryName}</h4>
                          <div className="grid grid-cols-5 gap-3">
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                Yearly
                              </label>
                              <input
                                type="number"
                                value={cat.yearlyBudget || ''}
                                onChange={(e) => {
                                  const newCategories = [...formData.categories];
                                  newCategories[idx].yearlyBudget = parseFloat(e.target.value) || 0;
                                  setFormData(prev => ({ ...prev, categories: newCategories }));
                                }}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="0"
                              />
                            </div>
                            {['q1Budget', 'q2Budget', 'q3Budget', 'q4Budget'].map((quarter, qIdx) => (
                              <div key={quarter}>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                  Q{qIdx + 1}
                                </label>
                                <input
                                  type="number"
                                  value={cat[quarter as keyof typeof cat] || ''}
                                  onChange={(e) => {
                                    const newCategories = [...formData.categories];
                                    (newCategories[idx] as any)[quarter] = parseFloat(e.target.value) || 0;
                                    setFormData(prev => ({ ...prev, categories: newCategories }));
                                  }}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="mt-6 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-indigo-900 uppercase tracking-widest">
                          Total Budget
                        </span>
                        <span className="text-2xl font-black text-indigo-600">
                          {formatCurrency(formData.categories.reduce((sum, cat) => sum + cat.yearlyBudget, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBudget}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create Budget
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {isEditModalOpen && editingBudget && (
        <div className="fixed inset-0 z-[120] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
            onClick={() => {
              setIsEditModalOpen(false);
              setEditingBudget(null);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-300 flex flex-col">
              {/* Header */}
              <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <Edit2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Edit Budget</h2>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Update budget allocations for {editingBudget.year}
                        {editingBudget.department && ` - ${editingBudget.department}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingBudget(null);
                    }}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-4">
                  {formData.categories.map((cat, idx) => (
                    <div key={cat.categoryId} className="p-4 border-2 border-slate-200 rounded-xl">
                      <h4 className="font-black text-slate-900 mb-3">{cat.categoryName}</h4>
                      <div className="grid grid-cols-5 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                            Yearly
                          </label>
                          <input
                            type="number"
                            value={cat.yearlyBudget || ''}
                            onChange={(e) => {
                              const newCategories = [...formData.categories];
                              newCategories[idx].yearlyBudget = parseFloat(e.target.value) || 0;
                              setFormData(prev => ({ ...prev, categories: newCategories }));
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="0"
                          />
                        </div>
                        {['q1Budget', 'q2Budget', 'q3Budget', 'q4Budget'].map((quarter, qIdx) => (
                          <div key={quarter}>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                              Q{qIdx + 1}
                            </label>
                            <input
                              type="number"
                              value={cat[quarter as keyof typeof cat] || ''}
                              onChange={(e) => {
                                const newCategories = [...formData.categories];
                                (newCategories[idx] as any)[quarter] = parseFloat(e.target.value) || 0;
                                setFormData(prev => ({ ...prev, categories: newCategories }));
                              }}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-indigo-900 uppercase tracking-widest">
                        Total Budget
                      </span>
                      <span className="text-2xl font-black text-indigo-600">
                        {formatCurrency(formData.categories.reduce((sum, cat) => sum + cat.yearlyBudget, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setDeleteConfirmBudget(editingBudget)}
                  disabled={isSubmitting}
                  className="px-6 py-3 border-2 border-red-200 text-red-600 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-50 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingBudget(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBudget}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmBudget && (
        <div className="fixed inset-0 z-[130] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setDeleteConfirmBudget(null)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full pointer-events-auto animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-3">Delete Budget?</h2>
                <p className="text-sm text-slate-600 mb-6">
                  Are you sure you want to delete the budget for {deleteConfirmBudget.year}
                  {deleteConfirmBudget.department && ` - ${deleteConfirmBudget.department}`}?
                  This action cannot be undone.
                </p>
              </div>
              <div className="p-6 flex gap-3 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setDeleteConfirmBudget(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteBudget(deleteConfirmBudget)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Budget
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Manage Categories</h3>
                <p className="text-xs text-slate-400 mt-1">View and add budget/expense categories</p>
              </div>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
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
                ) : (
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
    </div>
  );
};

export default Budget;
