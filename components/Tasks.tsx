
import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, Circle, Clock, MoreVertical, Plus, Filter, Search, 
  Calendar, ChevronRight, X, User, Layout, Trash2, Tag, Loader2, 
  CheckSquare, FileUp, List, Grid, Download, AlertCircle, Save,
  Archive, RotateCcw, Box, FileSpreadsheet, Info, ArrowRight, Table,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Task, Project, User as UserType } from '../types';
import { apiGetTasks, apiUpdateTask, apiDeleteTask, apiGetProjects, apiGetUsers, apiCreateTask, apiBulkImportTasks } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';

interface TasksProps {
  onCreateTask: () => void;
  currentUser?: any;
}

const Tasks: React.FC<TasksProps> = ({ onCreateTask, currentUser }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [displayMode, setDisplayMode] = useState<'list' | 'card'>('list');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'mapping'>('upload');
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({
    title: '',
    dueDate: '',
    description: '',
    priority: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [archivingTaskId, setArchivingTaskId] = useState<string | null>(null);
  const [archiveConfirmTask, setArchiveConfirmTask] = useState<Task | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  
  // Multi-select state
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeletingTasks, setIsBulkDeletingTasks] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const [taskRes, projRes, userRes] = await Promise.all([
        apiGetTasks(userId),
        apiGetProjects(),
        apiGetUsers()
      ]);
      setTasks(taskRes.data || []);
      setProjects(projRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) { showError('Failed to load tasks'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [currentUser]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('refresh-tasks', handleRefresh);
    return () => window.removeEventListener('refresh-tasks', handleRefresh);
  }, []);

  const handleArchiveTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setArchivingTaskId(id);
    try {
      await apiUpdateTask(id, { archived: viewMode === 'active' });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, archived: viewMode === 'active' } : t));
      setArchiveConfirmTask(null);
      showSuccess(viewMode === 'active' ? 'Task archived' : 'Task restored');
    } catch (err) { 
      showError('Update failed'); 
    } finally {
      setArchivingTaskId(null);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setDeletingTaskId(id);
    try {
      await apiDeleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      setDeleteConfirmTask(null);
      showSuccess('Task deleted successfully');
      fetchData();
    } catch (err) {
      showError('Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  // Multi-select handlers
  const selectAllTasks = () => {
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map(t => t.id));
    }
  };

  const handleBulkDeleteTasks = async () => {
    setIsBulkDeletingTasks(true);
    try {
      const targetIds = [...selectedTaskIds];
      await Promise.all(targetIds.map(id => apiDeleteTask(id)));
      setTasks(prev => prev.filter(t => !targetIds.includes(t.id)));
      setSelectedTaskIds([]);
      setBulkDeleteConfirmOpen(false);
      showSuccess(`Successfully deleted ${targetIds.length} task${targetIds.length > 1 ? 's' : ''}`);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete tasks');
    } finally {
      setIsBulkDeletingTasks(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create Excel template using xlsx
    const ws = XLSX.utils.aoa_to_sheet([
      ['Title', 'Due Date (YYYY-MM-DD)', 'Priority (Low/Medium/High)', 'Description'],
      ['Update Logistics Map', '2024-12-31', 'High', 'Audit the EMEA transit routes']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'ImpactFlow_Task_Import_Template.xlsx');
    showInfo('Registry template downloaded');
  };

  const handleExecuteImport = async () => {
    // Validate required mappings
    if (!columnMapping.title || !columnMapping.dueDate) {
      showError('Please map required fields: Title and Due Date');
      return;
    }

    if (parsedData.length === 0) {
      showError('No data to import');
      return;
    }

    setIsImporting(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) {
        showError('Please log in to import tasks');
        setIsImporting(false);
        return;
      }

      // Transform parsed data to task format
      const tasksToImport = parsedData.map((row, index) => {
        // Get values from mapped columns
        const title = String(row[columnMapping.title] || '').trim();
        const dueDateRaw = String(row[columnMapping.dueDate] || '').trim();
        const description = columnMapping.description ? String(row[columnMapping.description] || '').trim() : '';
        const priorityRaw = columnMapping.priority ? String(row[columnMapping.priority] || '').trim() : 'Medium';

        // Parse and format due date
        let dueDate = '';
        if (dueDateRaw) {
          // Handle Excel date serial numbers (e.g., 45658)
          if (/^\d+$/.test(dueDateRaw) && parseFloat(dueDateRaw) > 25569) {
            // Excel serial date (days since 1900-01-01)
            const excelEpoch = new Date(1900, 0, 1);
            const days = parseFloat(dueDateRaw) - 2; // Excel counts from 1900-01-01, but has a bug with 1900 being a leap year
            const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
            if (!isNaN(date.getTime())) {
              dueDate = date.toISOString().split('T')[0];
            }
          } else {
            // Try various date formats
            let parsedDate: Date | null = null;
            
            // YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateRaw)) {
              parsedDate = new Date(dueDateRaw);
            }
            // DD/MM/YYYY or DD/MM/YY format
            else if (dueDateRaw.includes('/')) {
              const parts = dueDateRaw.split('/').map(p => p.trim());
              if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                let year = parseInt(parts[2], 10);
                if (year < 100) year += 2000; // Convert YY to YYYY
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                  parsedDate = new Date(year, month, day);
                }
              }
            }
            // MM/DD/YYYY format (US format)
            else if (dueDateRaw.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
              const parts = dueDateRaw.split('/');
              const month = parseInt(parts[0], 10) - 1;
              const day = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                parsedDate = new Date(year, month, day);
              }
            }
            // Try direct Date parse as fallback
            if (!parsedDate || isNaN(parsedDate.getTime())) {
              parsedDate = new Date(dueDateRaw);
            }
            
            if (parsedDate && !isNaN(parsedDate.getTime())) {
              dueDate = parsedDate.toISOString().split('T')[0];
            }
          }
        }

        // Normalize priority
        const priorityMap: { [key: string]: 'Low' | 'Medium' | 'High' } = {
          'low': 'Low',
          'medium': 'Medium',
          'high': 'High',
          'l': 'Low',
          'm': 'Medium',
          'h': 'High'
        };
        const priority = priorityMap[priorityRaw.toLowerCase()] || 'Medium';

        return {
          title,
          dueDate,
          description,
          priority,
          status: 'Todo' as const,
          assigneeId: userId, // Assign to current user by default
          _rowIndex: index, // For debugging
          _rawDate: dueDateRaw // For debugging
        };
      }).filter(task => {
        const isValid = task.title && task.dueDate;
        if (!isValid) {
          console.warn('Filtered out invalid task:', {
            title: task.title,
            dueDate: task.dueDate,
            rawDate: (task as any)._rawDate,
            rowIndex: (task as any)._rowIndex
          });
        }
        return isValid;
      }).map(({ _rowIndex, _rawDate, ...task }) => task); // Remove debug fields

      if (tasksToImport.length === 0) {
        // Provide more helpful error message
        const sampleRow = parsedData[0];
        const sampleTitle = sampleRow ? String(sampleRow[columnMapping.title] || '').trim() : 'N/A';
        const sampleDate = sampleRow ? String(sampleRow[columnMapping.dueDate] || '').trim() : 'N/A';
        console.error('Import validation failed:', {
          totalRows: parsedData.length,
          mappedTitle: columnMapping.title,
          mappedDueDate: columnMapping.dueDate,
          sampleTitle,
          sampleDate,
          parsedData: parsedData.slice(0, 3) // First 3 rows for debugging
        });
        showError(`No valid tasks found to import. Please check that:\n1. Title column is mapped correctly\n2. Due Date column is mapped correctly\n3. Date format is valid (YYYY-MM-DD, DD/MM/YYYY, or DD/MM/YY)\n\nSample data - Title: "${sampleTitle}", Date: "${sampleDate}"`);
        setIsImporting(false);
        return;
      }

      // Call bulk import API
      const response = await apiBulkImportTasks(tasksToImport);
      const result = response.data || response;
      
      const successCount = result.successful || tasksToImport.length;
      const failedCount = result.failed || 0;
      
      if (failedCount > 0) {
        showError(`Imported ${successCount} task(s), but ${failedCount} failed. Please check the data format.`);
      } else {
        showSuccess(`Successfully imported ${successCount} task(s)`);
      }
      
      setIsImportOpen(false);
      
      // Reset state
      setParsedData([]);
      setDetectedColumns([]);
      setColumnMapping({ title: '', dueDate: '', description: '', priority: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh tasks list
      fetchData();
      // Also dispatch event for consistency
      window.dispatchEvent(new Event('refresh-tasks'));
    } catch (err: any) {
      console.error('Import error:', err);
      showError(err.message || 'Failed to import tasks. Please check your data format.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        // Handle CSV files - use XLSX to parse CSV for better handling of quoted values
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array', sheetStubs: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON with header row, preserving cell types for date detection
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1, 
              defval: '',
              raw: false, // Convert dates to strings
              dateNF: 'yyyy-mm-dd' // Format dates as YYYY-MM-DD
            }) as any[][];
            
            if (jsonData.length === 0) {
              showError('File is empty');
              return;
            }
            
            // First row is headers
            const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
            if (headers.length === 0) {
              showError('No headers found in file');
              return;
            }
            
            setDetectedColumns(headers);
            
          // Parse data rows
          const parsedRows: any[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row: any = {};
            headers.forEach((header, index) => {
              const cellValue = jsonData[i][index];
              // Handle Excel date serial numbers - if it's a number > 25569, it's likely an Excel date
              if (typeof cellValue === 'number' && cellValue > 25569 && header.toLowerCase().includes('date')) {
                // Convert Excel serial date to ISO string
                const excelEpoch = new Date(1900, 0, 1);
                const days = cellValue - 2; // Excel counts from 1900-01-01
                const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
                row[header] = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
              } else {
                row[header] = cellValue != null ? String(cellValue).trim() : '';
              }
            });
            if (Object.values(row).some(v => v)) { // Only add non-empty rows
              parsedRows.push(row);
            }
          }
            setParsedData(parsedRows);
            
            // Auto-map columns based on header names
            const autoMapping: { [key: string]: string } = {
              title: headers.find(h => h.toLowerCase().includes('title') || h.toLowerCase().includes('name')) || '',
              dueDate: headers.find(h => h.toLowerCase().includes('due') || (h.toLowerCase().includes('date') && !h.toLowerCase().includes('created') && !h.toLowerCase().includes('updated'))) || '',
              description: headers.find(h => h.toLowerCase().includes('description') || h.toLowerCase().includes('desc')) || '',
              priority: headers.find(h => h.toLowerCase().includes('priority') || h.toLowerCase().includes('prio')) || ''
            };
            setColumnMapping(autoMapping);
            setImportStep('mapping');
          } catch (parseError: any) {
            console.error('CSV parse error:', parseError);
            showError('Failed to parse CSV file: ' + (parseError.message || 'Unknown error'));
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Handle Excel files
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON with date formatting
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false, // Convert dates to strings
            dateNF: 'yyyy-mm-dd' // Format dates as YYYY-MM-DD
          }) as any[][];
          
          if (jsonData.length === 0) {
            showError('File is empty');
            return;
          }
          
          // First row is headers
          const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
          setDetectedColumns(headers);
          
          // Parse data rows
          const parsedRows: any[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row: any = {};
            headers.forEach((header, index) => {
              const cellValue = jsonData[i][index];
              // Handle Excel date serial numbers - if it's a number > 25569, it's likely an Excel date
              if (typeof cellValue === 'number' && cellValue > 25569 && header.toLowerCase().includes('date')) {
                // Convert Excel serial date to ISO string
                const excelEpoch = new Date(1900, 0, 1);
                const days = cellValue - 2; // Excel counts from 1900-01-01
                const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
                row[header] = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
              } else {
                row[header] = cellValue != null ? String(cellValue).trim() : '';
              }
            });
            if (Object.values(row).some(v => v)) { // Only add non-empty rows
              parsedRows.push(row);
            }
          }
          setParsedData(parsedRows);
          
          // Auto-map columns based on header names
          const autoMapping: { [key: string]: string } = {
            title: headers.find(h => h.toLowerCase().includes('title') || h.toLowerCase().includes('name')) || '',
            dueDate: headers.find(h => h.toLowerCase().includes('due') || h.toLowerCase().includes('date')) || '',
            description: headers.find(h => h.toLowerCase().includes('description') || h.toLowerCase().includes('desc')) || '',
            priority: headers.find(h => h.toLowerCase().includes('priority') || h.toLowerCase().includes('prio')) || ''
          };
          setColumnMapping(autoMapping);
          setImportStep('mapping');
        };
        reader.readAsArrayBuffer(file);
      } else {
        showError('Unsupported file format. Please use CSV, XLS, or XLSX.');
      }
    } catch (error: any) {
      console.error('Error parsing file:', error);
      showError('Failed to parse file: ' + (error.message || 'Unknown error'));
    }
  };

  const toggleStatus = async (id: string, current: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = current === 'Done' ? 'Todo' : 'Done';
    try {
      await apiUpdateTask(id, { status: newStatus as any });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
    } catch (err) { showError('Status update failed'); }
  };

  const filteredTasks = tasks.filter(t => {
    const archiveMatch = viewMode === 'archived' ? t.archived : !t.archived;
    if (!archiveMatch) return false;
    if (!searchQuery.trim()) return true;
    return t.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => {
                setViewMode('active');
                setSelectedTaskIds([]);
              }} 
              className={`text-sm font-bold pb-1 transition-all ${viewMode === 'active' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
            >
              Active
            </button>
            <button 
              onClick={() => {
                setViewMode('archived');
                setSelectedTaskIds([]);
              }} 
              className={`text-sm font-bold pb-1 transition-all ${viewMode === 'archived' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
            >
              Archive ({tasks.filter(t => t.archived).length})
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setIsImportOpen(true); setImportStep('upload'); }} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"><FileUp className="w-4 h-4" /> Bulk Import</button>
          <button onClick={onCreateTask} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg"><Plus className="w-4 h-4" /> New Task</button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery} 
            onChange={e => {
              setSearchQuery(e.target.value);
              setSelectedTaskIds([]);
            }} 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100" 
          />
        </div>
        <div className="flex bg-white p-1 border border-slate-200 rounded-xl shadow-sm">
          <button onClick={() => setDisplayMode('list')} className={`p-2 rounded-lg ${displayMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setDisplayMode('card')} className={`p-2 rounded-lg ${displayMode === 'card' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><Grid className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Select All Header */}
      {!isLoading && filteredTasks.length > 0 && (
        <div className="flex items-center gap-3 pb-2">
          <input 
            type="checkbox" 
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            checked={filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length}
            onChange={selectAllTasks}
          />
          <span className="text-sm font-semibold text-slate-600">
            Select All Tasks
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
          <Box className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No {viewMode} tasks found</p>
        </div>
      ) : displayMode === 'list' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
           <div className="divide-y divide-slate-50">
             {filteredTasks.map(task => {
               const isSelected = selectedTaskIds.includes(task.id);
               return (
                 <div 
                   key={task.id} 
                   className={`flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors ${task.archived ? 'bg-slate-50/50' : ''} ${isSelected ? 'bg-indigo-50/30 border-l-4 border-indigo-400' : ''}`}
                 >
                   <div onClick={(e) => e.stopPropagation()}>
                     <input 
                       type="checkbox" 
                       className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                       checked={isSelected}
                       onChange={() => setSelectedTaskIds(prev => isSelected ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                     />
                   </div>
                   <button onClick={(e) => toggleStatus(task.id, task.status, e)} className="text-slate-300 hover:text-indigo-600">
                     {task.status === 'Done' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6" />}
                   </button>
                   <div className="flex-1 overflow-hidden">
                     <p className={`font-bold text-sm ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{projects.find(p => p.id === task.projectId)?.title || 'General'}</p>
                   </div>
                   <div className="flex items-center gap-3">
                     <button 
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         setArchiveConfirmTask(task); 
                       }} 
                       className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                     >
                       {task.archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                     </button>
                     <button 
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         setDeleteConfirmTask(task); 
                       }} 
                       className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map(task => {
            const isSelected = selectedTaskIds.includes(task.id);
            return (
             <div 
               key={task.id} 
               className={`bg-white p-6 rounded-3xl border ${isSelected ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200'} relative group`}
             >
                <div className="flex justify-between items-start mb-4">
                   <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><CheckSquare className="w-4 h-4" /></div>
                   <div className="flex items-center gap-1">
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                       <button 
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           setArchiveConfirmTask(task); 
                         }} 
                         className="p-1.5 text-slate-400 hover:text-indigo-600"
                       >
                         <Archive className="w-3.5 h-3.5" />
                       </button>
                       <button 
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           setDeleteConfirmTask(task); 
                         }} 
                         className="p-1.5 text-slate-400 hover:text-red-500"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                     </div>
                     <div onClick={(e) => e.stopPropagation()} className={`${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                       <input 
                         type="checkbox" 
                         className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                         checked={isSelected}
                         onChange={() => setSelectedTaskIds(prev => isSelected ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                       />
                     </div>
                   </div>
                </div>
                <h4 className={`font-bold text-slate-900 mb-2 ${task.status === 'Done' ? 'line-through opacity-40' : ''}`}>{task.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-6">{task.description}</p>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{task.dueDate}</span>
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${task.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>{task.priority}</div>
                </div>
             </div>
            );
          })}
        </div>
      )}
      
      {/* Enhanced Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
             <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                   <FileUp className="w-7 h-7" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Enterprise Registry Import</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mt-2">Logistical Data Migration</p>
                 </div>
               </div>
               <button onClick={() => setIsImportOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
                 <X className="w-6 h-6 text-slate-400" />
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {importStep === 'upload' ? (
                  <div className="space-y-10 animate-in fade-in duration-300">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8">
                       <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-6">
                         <Info className="w-4 h-4" /> Registry Data Requirements
                       </h4>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                         <div className="space-y-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Column: Title *
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">Official objective identifier.</p>
                         </div>
                         <div className="space-y-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Column: Due Date *
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">Format as YYYY-MM-DD.</p>
                         </div>
                         <div className="space-y-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Column: Priority
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">Low, Medium, or High.</p>
                         </div>
                         <div className="space-y-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Column: Description
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">Strategic context/notes.</p>
                         </div>
                       </div>
                    </div>

                    <div className="flex flex-col gap-5">
                      <button onClick={() => fileInputRef.current?.click()} className="w-full py-16 border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group shadow-sm bg-white">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:scale-110 transition-all border border-slate-100 shadow-inner">
                          <FileSpreadsheet className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                          <span className="text-lg font-black text-slate-900 block mb-1">Select Local Registry</span>
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Supports CSV, XLS, XLSX</span>
                        </div>
                      </button>
                      
                      <button onClick={handleDownloadTemplate} className="w-full py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="w-5 h-5 text-indigo-500" /> Download Registry Schema (Excel Template)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between">
                       <h4 className="text-lg font-black text-slate-900">Smart Mapping Interface</h4>
                       <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Data Detected
                       </span>
                    </div>
                    
                    <p className="text-sm text-slate-500 leading-relaxed">
                      We've detected {detectedColumns.length} columns and {parsedData.length} rows in your file. Ensure the ImpactFlow system properties are correctly mapped below.
                    </p>

                    <div className="space-y-4 bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                      {[
                        { label: 'Task Name (Title)', key: 'title', required: true, icon: <FileText className="w-4 h-4" /> },
                        { label: 'Due Date', key: 'dueDate', required: true, icon: <Calendar className="w-4 h-4" /> },
                        { label: 'Task Description', key: 'description', required: false, icon: <Info className="w-4 h-4" /> },
                        { label: 'Priority Level', key: 'priority', required: false, icon: <Tag className="w-4 h-4" /> }
                      ].map(prop => (
                        <div key={prop.key} className="flex flex-col sm:flex-row sm:items-center gap-4 group">
                          <div className="flex-1 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all">
                              {prop.icon}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">{prop.label} {prop.required && <span className="text-red-500">*</span>}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block" />
                          <select 
                            value={columnMapping[prop.key] || ''}
                            onChange={(e) => setColumnMapping({ ...columnMapping, [prop.key]: e.target.value })}
                            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100"
                          >
                            <option value="">-- Select Source Column --</option>
                            {detectedColumns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4 pt-6">
                      <button 
                        onClick={() => {
                          setImportStep('upload');
                          setParsedData([]);
                          setDetectedColumns([]);
                          setColumnMapping({ title: '', dueDate: '', description: '', priority: '' });
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }} 
                        className="flex-1 py-5 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-[24px] hover:bg-slate-50 transition-all"
                      >
                        Back to Upload
                      </button>
                      <button 
                        onClick={handleExecuteImport}
                        disabled={isImporting || !columnMapping.title || !columnMapping.dueDate}
                        className="flex-[2] py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[24px] hover:bg-indigo-700 transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Importing...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" /> Execute Registry Deploy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
             </div>
             
             <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFileSelect} />
          </div>
        </div>
      )}

      {/* Archive Task Confirmation Modal */}
      {archiveConfirmTask && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600">
                  {archiveConfirmTask.archived ? <RotateCcw className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{archiveConfirmTask.archived ? 'Restore Task?' : 'Archive Task?'}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {archiveConfirmTask.archived 
                      ? 'This will restore the task to active status.'
                      : 'This will move the task to archive. You can restore it later.'}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-900 mb-1">{archiveConfirmTask.title}</p>
                {archiveConfirmTask.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{archiveConfirmTask.description}</p>
                )}
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setArchiveConfirmTask(null)}
                disabled={archivingTaskId === archiveConfirmTask.id}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchiveTask(archiveConfirmTask.id)}
                disabled={archivingTaskId === archiveConfirmTask.id}
                className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {archivingTaskId === archiveConfirmTask.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {archiveConfirmTask.archived ? 'Restoring...' : 'Archiving...'}
                  </>
                ) : (
                  archiveConfirmTask.archived ? 'Restore Task' : 'Archive Task'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {deleteConfirmTask && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Delete Task?</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. The task will be permanently removed.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-900 mb-1">{deleteConfirmTask.title}</p>
                {deleteConfirmTask.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{deleteConfirmTask.description}</p>
                )}
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirmTask(null)}
                disabled={deletingTaskId === deleteConfirmTask.id}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTask(deleteConfirmTask.id)}
                disabled={deletingTaskId === deleteConfirmTask.id}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingTaskId === deleteConfirmTask.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Task'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl px-8 py-4 flex items-center gap-8 border border-white/10 ring-4 ring-indigo-500/10">
            <span className="text-sm font-black flex items-center gap-3">
              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px]">
                {selectedTaskIds.length}
              </div>
              Selected
            </span>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setBulkDeleteConfirmOpen(true);
                }}
                disabled={isBulkDeletingTasks}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isBulkDeletingTasks ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
              <button 
                onClick={() => setSelectedTaskIds([])} 
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirmOpen && selectedTaskIds.length > 0 && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Delete {selectedTaskIds.length} Task{selectedTaskIds.length > 1 ? 's' : ''}?
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. The tasks will be permanently removed.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                {tasks.filter(t => selectedTaskIds.includes(t.id)).slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center gap-3 mb-2 last:mb-0">
                    <CheckSquare className="w-4 h-4 text-indigo-500" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900">{task.title}</p>
                      <p className="text-[10px] text-slate-500">{projects.find(p => p.id === task.projectId)?.title || 'General'}</p>
                    </div>
                  </div>
                ))}
                {selectedTaskIds.length > 5 && (
                  <p className="text-xs text-slate-400 font-medium mt-2 text-center">
                    + {selectedTaskIds.length - 5} more
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setBulkDeleteConfirmOpen(false)}
                disabled={isBulkDeletingTasks}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteTasks}
                disabled={isBulkDeletingTasks}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isBulkDeletingTasks ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  `Delete ${selectedTaskIds.length} Task${selectedTaskIds.length > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
