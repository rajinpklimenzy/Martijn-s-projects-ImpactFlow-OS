
import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, Circle, Clock, MoreVertical, Plus, Filter, Search, 
  Calendar, ChevronRight, X, User, Layout, Trash2, Tag, Loader2, 
  CheckSquare, FileUp, List, Grid, Download, AlertCircle, Save,
  Archive, RotateCcw, Box, FileSpreadsheet, Info, ArrowRight, Table,
  FileText, Edit2, Eye, MessageSquare, Upload as UploadIcon, Image as ImageIcon,
  ArrowUpDown, ArrowUp, ChevronDown, AtSign, Bell, History, Send, FolderKanban
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Task, Project, User as UserType, TaskNote } from '../types';
import { apiGetTasks, apiUpdateTask, apiDeleteTask, apiGetProjects, apiGetUsers, apiGetTaskCategories, apiCreateTask, apiBulkImportTasks, apiCreateNotification } from '../utils/api';
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
  const [viewMode, setViewMode] = useState<'active' | 'archived' | 'week'>('active');
  const [displayMode, setDisplayMode] = useState<'list' | 'card'>('list');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'category' | 'owner' | 'none'>('none');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'mapping'>('upload');
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({
    title: '',
    category: '',
    dueDate: '',
    description: '',
    priority: '',
    owner: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [archivingTaskId, setArchivingTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [archiveConfirmTask, setArchiveConfirmTask] = useState<Task | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  
  // View and Edit state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    category: '',
    description: '',
    dueDate: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    status: 'Todo' as 'Todo' | 'In Progress' | 'Review' | 'Done',
    assigneeId: '',
    projectId: ''
  });
  
  // Multi-select state
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeletingTasks, setIsBulkDeletingTasks] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkProjectModalOpen, setBulkProjectModalOpen] = useState(false);
  const [isBulkAssigningProject, setIsBulkAssigningProject] = useState(false);
  const [bulkAssignProjectId, setBulkAssignProjectId] = useState('');
  
  // Notes state
  const [newNoteText, setNewNoteText] = useState('');
  const [noteImagePreview, setNoteImagePreview] = useState<string>('');
  const [noteImageFile, setNoteImageFile] = useState<File | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  
  // Mentions state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [filteredMentionUsers, setFilteredMentionUsers] = useState<UserType[]>([]);
  
  // Activity log state
  const [showActivityLog, setShowActivityLog] = useState(false);

  // Task categories for edit dropdown (select + create new)
  const [taskCategories, setTaskCategories] = useState<string[]>([]);
  const [editCategoryIsNew, setEditCategoryIsNew] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteImageInputRef = useRef<HTMLInputElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Date helpers: use local date only so timezone never shifts the calendar day
  const dateToLocalYYYYMMDD = (d: Date): string => {
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  const formatDueDateDisplay = (ymd: string): string => {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Week view helpers: Monday to Sunday
  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(d.setDate(diff));
  };
  const getWeekRange = (monday: Date): { start: Date; end: Date } => {
    const start = new Date(monday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Sunday
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };
  const getThisWeek = (): { start: Date; end: Date } => {
    return getWeekRange(getMondayOfWeek(new Date()));
  };
  const getNextWeek = (): { start: Date; end: Date } => {
    const thisMonday = getMondayOfWeek(new Date());
    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7);
    return getWeekRange(nextMonday);
  };
  const getTaskWeek = (dueDate: string | null | undefined): 'thisWeek' | 'nextWeek' | 'future' | 'ongoing' => {
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return 'ongoing';
    const [y, m, d] = dueDate.split('-').map(Number);
    const taskDate = new Date(y, m - 1, d);
    taskDate.setHours(0, 0, 0, 0);
    const thisWeek = getThisWeek();
    const nextWeek = getNextWeek();
    if (taskDate >= thisWeek.start && taskDate <= thisWeek.end) return 'thisWeek';
    if (taskDate >= nextWeek.start && taskDate <= nextWeek.end) return 'nextWeek';
    if (taskDate > nextWeek.end) return 'future';
    return 'ongoing'; // Past dates or invalid
  };

  /** Returns Monday of the week (YYYY-MM-DD) for the given due date, or null for ongoing. */
  const getWeekKey = (dueDate: string | null | undefined): string | null => {
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
    const [y, m, d] = dueDate.split('-').map(Number);
    const taskDate = new Date(y, m - 1, d);
    const monday = getMondayOfWeek(taskDate);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      console.log('[TASKS] Fetching data (all tasks). Current userId:', userId);
      
      // IMPORTANT:
      // Always fetch ALL tasks (no userId filter), so that:
      // - Imported tasks for any owner are visible in the registry
      // - Admins can see the full portfolio
      // Owner-specific views can be added later via client-side filters.
      const [taskRes, projRes, userRes] = await Promise.all([
        apiGetTasks(),          // <-- no userId query param; returns all tasks
        apiGetProjects(),
        apiGetUsers()
      ]);
      
      console.log('[TASKS] API Responses:', {
        tasks: taskRes,
        tasksData: (taskRes as any)?.data,
        tasksCount: Array.isArray((taskRes as any)?.data) ? (taskRes as any).data.length : Array.isArray(taskRes) ? taskRes.length : 'not array',
        projects: (projRes as any)?.data?.length ?? (Array.isArray(projRes) ? projRes.length : 'unknown'),
        users: (userRes as any)?.data?.length ?? (Array.isArray(userRes) ? userRes.length : 'unknown')
      });
      
      // Handle response structure: backend returns { success: true, data: [...] }
      // apiFetch returns the parsed JSON, so taskRes is already { success: true, data: [...] }
      let tasksData = [];
      if (Array.isArray(taskRes)) {
        tasksData = taskRes;
      } else if (taskRes?.data && Array.isArray(taskRes.data)) {
        tasksData = taskRes.data;
      } else if (taskRes?.success && taskRes?.data && Array.isArray(taskRes.data)) {
        tasksData = taskRes.data;
      }
      
      let projectsData = [];
      if (Array.isArray(projRes)) {
        projectsData = projRes;
      } else if (projRes?.data && Array.isArray(projRes.data)) {
        projectsData = projRes.data;
      } else if (projRes?.success && projRes?.data && Array.isArray(projRes.data)) {
        projectsData = projRes.data;
      }
      
      let usersData = [];
      if (Array.isArray(userRes)) {
        usersData = userRes;
      } else if (userRes?.data && Array.isArray(userRes.data)) {
        usersData = userRes.data;
      } else if (userRes?.success && userRes?.data && Array.isArray(userRes.data)) {
        usersData = userRes.data;
      }
      
      setTasks(tasksData);
      setProjects(projectsData);
      setUsers(usersData);
      
      console.log('[TASKS] State updated:', {
        tasksCount: Array.isArray(tasksData) ? tasksData.length : 0,
        projectsCount: Array.isArray(projectsData) ? projectsData.length : 0,
        usersCount: Array.isArray(usersData) ? usersData.length : 0
      });
    } catch (err: any) {
      console.error('[TASKS] Fetch error:', err);
      showError(err.message || 'Failed to load tasks');
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, [currentUser]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('refresh-tasks', handleRefresh);
    return () => window.removeEventListener('refresh-tasks', handleRefresh);
  }, []);

  // Initialize edit form when task is selected
  useEffect(() => {
    if (selectedTask && !isEditingTask) {
      setEditFormData({
        title: selectedTask.title,
        category: selectedTask.category || '',
        description: selectedTask.description || '',
        dueDate: selectedTask.dueDate || '',
        priority: selectedTask.priority || 'Medium',
        status: selectedTask.status || 'Todo',
        assigneeId: selectedTask.assigneeId,
        projectId: selectedTask.projectId || ''
      });
    }
  }, [selectedTask, isEditingTask]);

  // Fetch task categories when task detail panel is open (for edit dropdown)
  useEffect(() => {
    if (!selectedTask) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGetTaskCategories();
        const list = Array.isArray((res as any)?.data) ? (res as any).data : [];
        if (!cancelled) setTaskCategories(list);
      } catch {
        if (!cancelled) setTaskCategories([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTask?.id]);

  // Sync editCategoryIsNew: reset when not editing; when category is in list show dropdown, else show create-new
  useEffect(() => {
    if (!isEditingTask) {
      setEditCategoryIsNew(false);
      return;
    }
    if (editFormData.category && taskCategories.includes(editFormData.category)) {
      setEditCategoryIsNew(false);
    } else if (editFormData.category && !taskCategories.includes(editFormData.category)) {
      setEditCategoryIsNew(true);
    }
    // when category is '' leave editCategoryIsNew unchanged (user may have selected "+ Create new")
  }, [isEditingTask, editFormData.category, taskCategories]);

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

  const handleBulkAssignProject = async () => {
    if (!bulkAssignProjectId) {
      showError('Please select a project');
      return;
    }
    setIsBulkAssigningProject(true);
    try {
      const targetIds = [...selectedTaskIds];
      await Promise.all(
        targetIds.map(id =>
          apiUpdateTask(id, {
            projectId: bulkAssignProjectId === '__none__' ? null : bulkAssignProjectId
          })
        )
      );
      setTasks(prev =>
        prev.map(t =>
          targetIds.includes(t.id)
            ? { ...t, projectId: bulkAssignProjectId === '__none__' ? null : bulkAssignProjectId }
            : t
        )
      );
      setSelectedTaskIds([]);
      setBulkProjectModalOpen(false);
      setBulkAssignProjectId('');
      showSuccess(
        `Assigned ${targetIds.length} task${targetIds.length > 1 ? 's' : ''} to ${
          bulkAssignProjectId === '__none__' ? 'No project' : projects.find(p => p.id === bulkAssignProjectId)?.title || 'project'
        }`
      );
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to assign project');
    } finally {
      setIsBulkAssigningProject(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create Excel template using xlsx with future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
    const futureDateStr = futureDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    const ws = XLSX.utils.aoa_to_sheet([
      ['Title', 'Task Category', 'Due Date', 'Priority (Low/Medium/High)', 'Description', 'Owner (Name or Email)'],
      ['Update Logistics Map', 'Operations', futureDateStr, 'High', 'Audit the EMEA transit routes', 'rpk@wx.agency']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'ImpactFlow_Task_Import_Template.xlsx');
    showInfo('Registry template downloaded');
  };

  const handleExecuteImport = async () => {
    // Validate required mappings (only title is required by backend, but dueDate is recommended)
    if (!columnMapping.title) {
      showError('Please map the required field: Title');
      return;
    }

    if (parsedData.length === 0) {
      showError('No data to import');
      return;
    }

    setIsImporting(true);
    try {
      console.log('[IMPORT] ===== STARTING IMPORT PROCESS =====');
      console.log('[IMPORT] Column mapping:', columnMapping);
      console.log('[IMPORT] Parsed data rows:', parsedData.length);
      console.log('[IMPORT] Sample parsed row:', parsedData[0]);
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) {
        showError('Please log in to import tasks');
        setIsImporting(false);
        return;
      }

      // Transform parsed data to task format
      console.log('[IMPORT] Starting import with:', { 
        parsedDataRows: parsedData.length, 
        columnMapping, 
        usersCount: users.length,
        currentUserId: userId 
      });
      
      const tasksToImport = parsedData.map((row, index) => {
        console.log(`[IMPORT] Processing row ${index}:`, row);
        console.log(`[IMPORT] Column mapping:`, columnMapping);
        
        // Get values from mapped columns
        const title = String(row[columnMapping.title] || '').trim();
        const category = columnMapping.category ? String(row[columnMapping.category] || '').trim() : '';
        const dueDateRaw = String(row[columnMapping.dueDate] || '').trim();
        const description = columnMapping.description ? String(row[columnMapping.description] || '').trim() : '';
        const priorityRaw = columnMapping.priority ? String(row[columnMapping.priority] || '').trim() : 'Medium';
        const ownerRaw = columnMapping.owner ? String(row[columnMapping.owner] || '').trim() : '';
        
        console.log(`[IMPORT] Extracted values for row ${index}:`, {
          title,
          category,
          dueDateRaw,
          description,
          priorityRaw,
          ownerRaw,
          rowKeys: Object.keys(row),
          mappedTitleKey: columnMapping.title,
          mappedDueDateKey: columnMapping.dueDate
        });

        // Parse and format due date
        let dueDate = '';
        // "Ongoing" means no due date – keep empty
        if (dueDateRaw && dueDateRaw.toLowerCase().trim() === 'ongoing') {
          dueDate = '';
        } else if (dueDateRaw) {
          // Handle Excel date serial numbers (e.g., 45658)
          if (/^\d+$/.test(dueDateRaw) && parseFloat(dueDateRaw) > 25569) {
            // Excel serial date (days since 1900-01-01)
            const excelEpoch = new Date(1900, 0, 1);
            const days = parseFloat(dueDateRaw) - 2; // Excel counts from 1900-01-01, but has a bug with 1900 being a leap year
            const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
            if (!isNaN(date.getTime())) {
              dueDate = dateToLocalYYYYMMDD(date);
            }
          } else {
            // Try various date formats
            let parsedDate: Date | null = null;
            
            // YYYY-MM-DD format – keep as-is to avoid UTC interpretation
            if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateRaw)) {
              dueDate = dueDateRaw;
              parsedDate = new Date(0); // skip further parsing
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
            // "February 15, 2026" / "Feb 15, 2026" – month name, day, year
            else if (!parsedDate || isNaN(parsedDate.getTime())) {
              const longDateMatch = dueDateRaw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
              if (longDateMatch) {
                const [, monthStr, dayStr, yearStr] = longDateMatch;
                const d = new Date(`${monthStr.trim()} ${dayStr}, ${yearStr}`);
                if (!isNaN(d.getTime())) parsedDate = d;
              }
            }
            // Try direct Date parse as fallback
            if (!parsedDate || isNaN(parsedDate.getTime())) {
              parsedDate = new Date(dueDateRaw);
            }
            
            if (parsedDate && !isNaN(parsedDate.getTime()) && !dueDate) {
              dueDate = dateToLocalYYYYMMDD(parsedDate);
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

        // Match owner by name or email
        let assigneeId = userId; // Default to current user
        if (ownerRaw && users.length > 0) {
          const ownerLower = ownerRaw.toLowerCase().trim();
          const matchedUser = users.find(user => 
            user.name.toLowerCase().trim() === ownerLower || 
            user.email.toLowerCase().trim() === ownerLower ||
            user.name.toLowerCase().trim().includes(ownerLower) ||
            user.email.toLowerCase().trim().includes(ownerLower)
          );
          if (matchedUser) {
            assigneeId = matchedUser.id;
            console.log(`[IMPORT] Matched owner "${ownerRaw}" to user:`, matchedUser.name, matchedUser.id);
          } else {
            console.warn(`[IMPORT] Could not match owner "${ownerRaw}", using current user`);
          }
        }
        
        // Ensure assigneeId is always set
        if (!assigneeId) {
          console.error('[IMPORT] No assigneeId available, using current user as fallback');
          assigneeId = userId;
        }

        const taskData = {
          title: title.trim(),
          category: category || undefined, // Optional category field
          dueDate: dueDate || null, // Allow null/empty dueDate (backend allows it)
          description: description.trim() || '',
          priority,
          status: 'Todo' as const,
          assigneeId,
          _rowIndex: index, // For debugging
          _rawDate: dueDateRaw // For debugging
        };
        
        // Validate required fields match backend requirements
        if (!taskData.title || !taskData.assigneeId) {
          console.error(`[IMPORT] Row ${index} missing required fields:`, {
            hasTitle: !!taskData.title,
            hasAssigneeId: !!taskData.assigneeId,
            taskData
          });
        }
        
        // Log if assigneeId is missing
        if (!assigneeId) {
          console.warn(`[IMPORT] Row ${index}: No assigneeId found, using current user:`, { title, ownerRaw, userId });
        }
        
        console.log(`[IMPORT] Task data for row ${index}:`, taskData);
        return taskData;
      }).filter(task => {
        // Backend only requires title and assigneeId (dueDate is optional)
        const isValid = task.title && task.assigneeId;
        if (!isValid) {
          console.error('[IMPORT] Filtered out invalid task:', {
            title: task.title,
            dueDate: task.dueDate,
            assigneeId: task.assigneeId,
            rawDate: (task as any)._rawDate,
            rowIndex: (task as any)._rowIndex,
            fullTask: task,
            missingFields: {
              title: !task.title,
              assigneeId: !task.assigneeId
            }
          });
        } else {
          console.log('[IMPORT] Valid task:', {
            title: task.title,
            dueDate: task.dueDate || 'Not set',
            assigneeId: task.assigneeId,
            priority: task.priority,
            status: task.status
          });
        }
        return isValid;
      }).map(({ _rowIndex, _rawDate, ...task }) => {
        // Ensure assigneeId is always present
        if (!task.assigneeId) {
          console.warn('[IMPORT] Task missing assigneeId, using current user:', task);
          task.assigneeId = userId;
        }
        return task;
      }); // Remove debug fields

      console.log('[IMPORT] Final tasks to import:', tasksToImport);
      console.log('[IMPORT] Tasks count:', tasksToImport.length);
      
      if (tasksToImport.length === 0) {
        // Provide more helpful error message
        const sampleRow = parsedData[0];
        const sampleTitle = sampleRow ? String(sampleRow[columnMapping.title] || '').trim() : 'N/A';
        const sampleDate = sampleRow ? String(sampleRow[columnMapping.dueDate] || '').trim() : 'N/A';
        console.error('[IMPORT] Validation failed - no valid tasks:', {
          totalRows: parsedData.length,
          columnMapping,
          mappedTitle: columnMapping.title,
          mappedDueDate: columnMapping.dueDate,
          sampleRow,
          sampleTitle,
          sampleDate,
          sampleRowKeys: sampleRow ? Object.keys(sampleRow) : [],
          parsedData: parsedData.slice(0, 3) // First 3 rows for debugging
        });
        showError(`No valid tasks found to import. Please check that:\n1. Title column is mapped correctly (current: "${columnMapping.title}")\n2. Due Date column is mapped correctly (current: "${columnMapping.dueDate}")\n3. Date format is valid (YYYY-MM-DD, February 15 2026, DD/MM/YYYY, or "Ongoing" for no date)\n\nSample data - Title: "${sampleTitle}", Date: "${sampleDate}"\n\nAvailable columns: ${detectedColumns.join(', ')}`);
        setIsImporting(false);
        return;
      }

      // Call bulk import API
      console.log('[IMPORT] ===== STARTING API CALL =====');
      
      // Remove debug fields before sending to API
      const tasksForAPI = tasksToImport.map(({ _rowIndex, _rawDate, ...task }) => task);
      
      console.log('[IMPORT] Tasks to import count:', tasksForAPI.length);
      console.log('[IMPORT] Tasks for API (cleaned):', JSON.stringify(tasksForAPI, null, 2));
      console.log('[IMPORT] Sample task structure:', {
        title: tasksForAPI[0]?.title,
        dueDate: tasksForAPI[0]?.dueDate,
        assigneeId: tasksForAPI[0]?.assigneeId,
        priority: tasksForAPI[0]?.priority,
        status: tasksForAPI[0]?.status,
        description: tasksForAPI[0]?.description,
        hasProjectId: !!tasksForAPI[0]?.projectId
      });
      
      // Validate all tasks have required fields before sending
      const invalidTasks = tasksForAPI.filter(t => !t.title || !t.assigneeId);
      if (invalidTasks.length > 0) {
        console.error('[IMPORT] Invalid tasks found:', invalidTasks);
        showError(`Cannot import: ${invalidTasks.length} task(s) missing required fields (title or assigneeId)`);
        setIsImporting(false);
        return;
      }
      
      let response: any;
      try {
        response = await apiBulkImportTasks(tasksForAPI);
        console.log('[IMPORT] API call successful');
      } catch (apiError: any) {
        console.error('[IMPORT] API call failed:', apiError);
        console.error('[IMPORT] Error details:', {
          message: apiError.message,
          status: apiError.status,
          code: apiError.code,
          stack: apiError.stack
        });
        showError(`Failed to import tasks: ${apiError.message || 'Unknown error'}`);
        setIsImporting(false);
        return;
      }
      
      console.log('[IMPORT] Raw API Response:', JSON.stringify(response, null, 2));
      console.log('[IMPORT] Response type:', typeof response);
      console.log('[IMPORT] Response keys:', response ? Object.keys(response) : 'null');
      
      // Backend returns: { success: true, data: { successful: X, failed: Y, created: [...], ... } }
      // apiFetch returns the parsed JSON directly, so response is: { success: true, data: {...} }
      let importData: any = {};
      let createdTasks: any[] = [];
      
      if (response) {
        // apiFetch returns the full response object
        // Backend structure: { success: true, data: { created: [...], successful: X, failed: Y } }
        if (response.success && response.data) {
          // Standard structure: { success: true, data: { created: [...], ... } }
          importData = response.data;
          createdTasks = importData.created || [];
        } else if (response.data && Array.isArray(response.data.created)) {
          // Nested structure: { data: { created: [...], ... } }
          importData = response.data;
          createdTasks = importData.created || [];
        } else if (response.created && Array.isArray(response.created)) {
          // Direct structure: { created: [...], ... }
          importData = response;
          createdTasks = importData.created || [];
        } else {
          // Fallback: try to find created array anywhere
          console.warn('[IMPORT] Unexpected response structure, searching for created tasks...');
          importData = response.data || response;
          createdTasks = importData.created || importData.data?.created || [];
        }
        
        console.log('[IMPORT] Extracted importData:', importData);
        console.log('[IMPORT] Created tasks:', createdTasks);
        console.log('[IMPORT] Created tasks count:', createdTasks.length);
        console.log('[IMPORT] Created task IDs:', createdTasks.map((t: any) => t?.id));
        console.log('[IMPORT] Created task details:', createdTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          assigneeId: t.assigneeId
        })));
      } else {
        console.error('[IMPORT] No response received from API');
        showError('No response received from server. Please check your connection.');
        setIsImporting(false);
        return;
      }
      
      const successCount = importData.successful ?? (createdTasks.length ?? 0);
      const failedCount = importData.failed ?? 0;
      
      console.log('[IMPORT] Import results:', { 
        successCount, 
        failedCount, 
        total: tasksToImport.length,
        createdTasks: createdTasks.length,
        createdTaskIds: createdTasks.map((t: any) => t.id),
        errors: importData.errors
      });
      
      // Add imported tasks directly to state immediately (before refresh)
      // This ensures tasks show up even if they have different assigneeId
      if (createdTasks && createdTasks.length > 0) {
        console.log('[IMPORT] ===== ADDING TASKS TO STATE =====');
        console.log('[IMPORT] Adding imported tasks directly to state:', createdTasks);
        console.log('[IMPORT] First created task:', createdTasks[0]);
        
        setTasks(prevTasks => {
          // Merge new tasks, avoiding duplicates by ID
          const existingIds = new Set(prevTasks.map(t => t.id));
          const newTasks = createdTasks
            .filter((t: any) => {
              const hasId = t && t.id;
              const isNew = !existingIds.has(t.id);
              if (!hasId) {
                console.error('[IMPORT] Task missing ID:', t);
                return false;
              }
              if (!isNew) {
                console.warn('[IMPORT] Task already exists, skipping:', t.id);
                return false;
              }
              return true;
            })
            .map((t: any) => {
              const mappedTask: Task = {
                id: t.id,
                title: t.title || '',
                category: t.category || undefined,
                description: t.description || '',
                dueDate: t.dueDate || '',
                priority: (t.priority || 'Medium') as 'Low' | 'Medium' | 'High',
                status: (t.status || 'Todo') as 'Todo' | 'In Progress' | 'Review' | 'Done',
                assigneeId: t.assigneeId || userId,
                projectId: t.projectId || undefined,
                archived: t.archived || false,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt
              };
              console.log('[IMPORT] Mapped task:', mappedTask);
              return mappedTask;
            });
          
          const merged = [...newTasks, ...prevTasks];
          console.log('[IMPORT] ===== STATE UPDATE COMPLETE =====');
          console.log('[IMPORT] Merged tasks:', { 
            previousCount: prevTasks.length, 
            newCount: newTasks.length, 
            totalCount: merged.length,
            newTaskIds: newTasks.map(t => t.id),
            newTaskTitles: newTasks.map(t => t.title)
          });
          return merged;
        });
      } else {
        console.error('[IMPORT] ===== NO TASKS TO ADD =====');
        console.error('[IMPORT] No created tasks to add to state. createdTasks:', createdTasks);
        console.error('[IMPORT] Response structure:', response);
        console.error('[IMPORT] Import data:', importData);
      }
      
      if (failedCount > 0) {
        const errorDetails = importData.errors?.map((e: any) => `Row ${e.index + 1}: ${e.error}`).join('\n') || '';
        showError(`Imported ${successCount} task(s), but ${failedCount} failed.\n${errorDetails}`);
      } else {
        showSuccess(`Successfully imported ${successCount} task(s)`);
      }
      
      // Reset state first
      setParsedData([]);
      setDetectedColumns([]);
      setColumnMapping({ title: '', category: '', dueDate: '', description: '', priority: '', owner: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      setIsImportOpen(false);
      
      // Refresh tasks list after a short delay to ensure database consistency
      // Use a longer delay to ensure database has fully processed the import
      setTimeout(async () => {
        console.log('[IMPORT] Refreshing tasks list from server...');
        try {
          await fetchData();
          console.log('[IMPORT] Tasks list refreshed from server');
          
          // Double-check: if tasks still not showing, try fetching all tasks (not filtered by userId)
          const currentTasksCount = tasks.length;
          console.log('[IMPORT] Current tasks count after refresh:', currentTasksCount);
          
          if (currentTasksCount === 0 && createdTasks.length > 0) {
            console.warn('[IMPORT] Tasks not showing after refresh, fetching all tasks...');
            // Try fetching without userId filter to see if tasks exist
            const allTasksRes = await apiGetTasks(); // No userId = all tasks
            console.log('[IMPORT] All tasks response:', allTasksRes);
          }
        } catch (refreshError) {
          console.error('[IMPORT] Error refreshing tasks:', refreshError);
        }
      }, 1500);
      
      // Also dispatch event for consistency
      window.dispatchEvent(new Event('refresh-tasks'));
    } catch (err: any) {
      console.error('Import error:', err);
      showError(err.message || 'Failed to import tasks. Please check your data format.');
    } finally {
      setIsImporting(false);
    }
  };

  // Intelligent header detection - checks if first row contains column name indicators
  const isHeaderRow = (firstRow: any[]): boolean => {
    if (!firstRow || firstRow.length === 0) {
      console.log('[IMPORT] Header detection: empty or null firstRow');
      return false;
    }
    
    console.log('[IMPORT] Header detection - firstRow:', firstRow);
    console.log('[IMPORT] Header detection - firstRow length:', firstRow.length);
    console.log('[IMPORT] Header detection - firstRow values:', firstRow.map((cell, idx) => `[${idx}]: "${cell}"`));
    
    // Common header indicators (case-insensitive)
    const headerKeywords = [
      'task', 'title', 'name', 'category', 'due', 'date', 'priority', 
      'description', 'owner', 'assignee', 'status', 'project', 'desc'
    ];
    
    // Check if at least 40% of cells contain header keywords
    let matchCount = 0;
    const cellsToCheck = firstRow.filter(cell => cell && String(cell).trim() !== '');
    
    console.log('[IMPORT] Header detection - non-empty cells:', cellsToCheck);
    
    for (const cell of cellsToCheck) {
      const cellStr = String(cell).toLowerCase().trim();
      // Check if cell contains any header keyword
      if (headerKeywords.some(keyword => cellStr.includes(keyword))) {
        matchCount++;
        console.log(`[IMPORT] Header detection - matched keyword in: "${cell}"`);
      }
      // Also check for common patterns like "Task Name", "Task Category", etc.
      if (cellStr.match(/^(task|due|owner|assignee|priority|description|category|status)/)) {
        matchCount++;
        console.log(`[IMPORT] Header detection - matched pattern in: "${cell}"`);
      }
    }
    
    const matchRatio = cellsToCheck.length > 0 ? matchCount / cellsToCheck.length : 0;
    console.log('[IMPORT] Header detection result:', { 
      firstRow, 
      totalCells: firstRow.length,
      cellsToCheck: cellsToCheck.length, 
      matchCount, 
      matchRatio,
      isHeader: matchRatio >= 0.4 
    });
    
    return matchRatio >= 0.4; // If 40% or more cells look like headers, treat as header row
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
            
            // Get the range to determine number of columns
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            const numCols = range.e.c - range.s.c + 1; // end column - start column + 1
            console.log('[IMPORT] CSV worksheet range:', worksheet['!ref']);
            console.log('[IMPORT] CSV number of columns from range:', numCols);
            
            // Convert to JSON with header row, preserving cell types for date detection
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1, 
              defval: '', // Include empty cells as empty strings
              raw: false, // Convert dates to strings
              dateNF: 'yyyy-mm-dd', // Format dates as YYYY-MM-DD
              blankrows: true // Include blank rows
            }) as any[][];
            
            console.log('[IMPORT] CSV raw data length:', jsonData.length);
            console.log('[IMPORT] CSV first row length:', jsonData[0]?.length);
            console.log('[IMPORT] CSV first row:', jsonData[0]);
            
            if (jsonData.length === 0) {
              showError('File is empty');
              return;
            }
            
            // Ensure first row has all columns by padding with empty strings if needed
            if (jsonData[0] && jsonData[0].length < numCols) {
              console.log(`[IMPORT] CSV: Padding first row from ${jsonData[0].length} to ${numCols} columns`);
              while (jsonData[0].length < numCols) {
                jsonData[0].push('');
              }
            }
            
            // Intelligently detect if first row is a header row
            const hasHeaderRow = isHeaderRow(jsonData[0]);
            console.log('[IMPORT] CSV Header detection result:', hasHeaderRow);
            
            let headers: string[];
            let dataStartIndex: number;
            
            if (hasHeaderRow) {
              // First row is headers - preserve all columns including empty ones
              headers = jsonData[0].map((h, idx) => {
                const headerValue = String(h || '').trim();
                // If header is empty, use generic name
                return headerValue || `Column ${idx + 1}`;
              });
              dataStartIndex = 1;
              console.log('[IMPORT] CSV raw first row:', jsonData[0]);
              console.log('[IMPORT] CSV processed headers:', headers);
            } else {
              // No header row - generate generic column names
              headers = jsonData[0].map((_, idx) => `Column ${idx + 1}`);
              dataStartIndex = 0;
              showInfo('No header row detected. Using generic column names (Column 1, Column 2, etc.)');
            }
            
            if (headers.length === 0) {
              showError('No columns found in file');
              return;
            }
            
            console.log('[IMPORT] CSV detected headers:', headers);
            console.log('[IMPORT] CSV detected headers count:', headers.length);
            console.log('[IMPORT] CSV detected headers array:', headers);
            setDetectedColumns(headers);
            console.log('[IMPORT] CSV setDetectedColumns called with:', headers);
            
          // Parse data rows - ensure all rows have the same number of columns
          const parsedRows: any[] = [];
          for (let i = dataStartIndex; i < jsonData.length; i++) {
            const row: any = {};
            const dataRow = jsonData[i] || [];
            
            // Pad data row if needed
            while (dataRow.length < headers.length) {
              dataRow.push('');
            }
            
            headers.forEach((header, index) => {
              const cellValue = dataRow[index];
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
            console.log('[IMPORT] CSV parsed rows:', parsedRows);
            console.log('[IMPORT] CSV parsed rows count:', parsedRows.length);
            setParsedData(parsedRows);
            
            // Auto-map columns based on header names
            const autoMapping: { [key: string]: string } = {
              title: headers.find(h => h.toLowerCase().includes('title') || (h.toLowerCase().includes('task') && h.toLowerCase().includes('name')) || (!h.toLowerCase().includes('category') && h.toLowerCase().includes('name'))) || '',
              category: headers.find(h => h.toLowerCase().includes('category') || (h.toLowerCase().includes('task') && h.toLowerCase().includes('cat'))) || '',
              dueDate: headers.find(h => h.toLowerCase().includes('due') || (h.toLowerCase().includes('date') && !h.toLowerCase().includes('created') && !h.toLowerCase().includes('updated'))) || '',
              description: headers.find(h => h.toLowerCase().includes('description') || h.toLowerCase().includes('desc')) || '',
              priority: headers.find(h => h.toLowerCase().includes('priority') || h.toLowerCase().includes('prio')) || '',
              owner: headers.find(h => h.toLowerCase().includes('owner') || h.toLowerCase().includes('assignee') || h.toLowerCase().includes('assigned') || (h.toLowerCase().includes('task') && h.toLowerCase().includes('owner'))) || ''
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
          
          // Get the range to determine number of columns
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          const numCols = range.e.c - range.s.c + 1; // end column - start column + 1
          console.log('[IMPORT] Excel worksheet range:', worksheet['!ref']);
          console.log('[IMPORT] Excel number of columns from range:', numCols);
          
          // Convert to JSON with date formatting - ensure all columns are included
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false, // Convert dates to strings
            dateNF: 'yyyy-mm-dd', // Format dates as YYYY-MM-DD
            defval: '', // Include empty cells as empty strings
            blankrows: true // Include blank rows
          }) as any[][];
          
          console.log('[IMPORT] Excel raw data length:', jsonData.length);
          console.log('[IMPORT] Excel first row length:', jsonData[0]?.length);
          console.log('[IMPORT] Excel first row:', jsonData[0]);
          
          if (jsonData.length === 0) {
            showError('File is empty');
            return;
          }
          
          // Ensure first row has all columns by padding with empty strings if needed
          if (jsonData[0] && jsonData[0].length < numCols) {
            console.log(`[IMPORT] Padding first row from ${jsonData[0].length} to ${numCols} columns`);
            while (jsonData[0].length < numCols) {
              jsonData[0].push('');
            }
          }
          
          // Intelligently detect if first row is a header row
          const hasHeaderRow = isHeaderRow(jsonData[0]);
          console.log('[IMPORT] Excel Header detection result:', hasHeaderRow);
          
          let headers: string[];
          let dataStartIndex: number;
          
          if (hasHeaderRow) {
            // First row is headers - preserve all columns including empty ones
            headers = jsonData[0].map((h, idx) => {
              const headerValue = String(h || '').trim();
              // If header is empty, use generic name
              return headerValue || `Column ${idx + 1}`;
            });
            dataStartIndex = 1;
            console.log('[IMPORT] Excel raw first row:', jsonData[0]);
            console.log('[IMPORT] Excel processed headers:', headers);
          } else {
            // No header row - generate generic column names
            headers = jsonData[0].map((_, idx) => `Column ${idx + 1}`);
            dataStartIndex = 0;
            showInfo('No header row detected. Using generic column names (Column 1, Column 2, etc.)');
          }
          
          console.log('[IMPORT] Detected headers:', headers);
          console.log('[IMPORT] Detected headers count:', headers.length);
          console.log('[IMPORT] Detected headers array:', headers);
          console.log('[IMPORT] Raw JSON data:', jsonData);
          setDetectedColumns(headers);
          console.log('[IMPORT] setDetectedColumns called with:', headers);
          
          // Parse data rows - ensure all rows have the same number of columns
          const parsedRows: any[] = [];
          for (let i = dataStartIndex; i < jsonData.length; i++) {
            const row: any = {};
            const dataRow = jsonData[i] || [];
            
            // Pad data row if needed
            while (dataRow.length < headers.length) {
              dataRow.push('');
            }
            
            headers.forEach((header, index) => {
              const cellValue = dataRow[index];
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
          console.log('[IMPORT] Parsed rows:', parsedRows);
          console.log('[IMPORT] Parsed rows count:', parsedRows.length);
          setParsedData(parsedRows);
          
          // Auto-map columns based on header names
          const autoMapping: { [key: string]: string } = {
            title: headers.find(h => h.toLowerCase().includes('title') || (h.toLowerCase().includes('task') && h.toLowerCase().includes('name')) || (!h.toLowerCase().includes('category') && h.toLowerCase().includes('name'))) || '',
            category: headers.find(h => h.toLowerCase().includes('category') || (h.toLowerCase().includes('task') && h.toLowerCase().includes('cat'))) || '',
            dueDate: headers.find(h => h.toLowerCase().includes('due') || (h.toLowerCase().includes('date') && !h.toLowerCase().includes('created') && !h.toLowerCase().includes('updated'))) || '',
            description: headers.find(h => h.toLowerCase().includes('description') || h.toLowerCase().includes('desc')) || '',
            priority: headers.find(h => h.toLowerCase().includes('priority') || h.toLowerCase().includes('prio')) || '',
            owner: headers.find(h => h.toLowerCase().includes('owner') || h.toLowerCase().includes('assignee') || h.toLowerCase().includes('assigned') || (h.toLowerCase().includes('task') && h.toLowerCase().includes('owner'))) || ''
          };
          console.log('[IMPORT] Auto-mapping:', autoMapping);
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
    setUpdatingTaskId(id);
    try {
      await apiUpdateTask(id, { status: newStatus as any });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
      if (selectedTask?.id === id) {
        setSelectedTask({ ...selectedTask, status: newStatus as any });
      }
      showSuccess(newStatus === 'Done' ? 'Task marked as done' : 'Task marked as todo');
    } catch (err) { 
      showError('Status update failed'); 
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    
    if (!editFormData.title.trim()) {
      showError('Task title is required');
      return;
    }
    
    if (!editFormData.assigneeId) {
      showError('Assignee is required');
      return;
    }
    
    setIsUpdatingTask(true);
    try {
      await apiUpdateTask(selectedTask.id, {
        title: editFormData.title.trim(),
        category: editFormData.category.trim() || undefined,
        description: editFormData.description.trim() || '',
        dueDate: editFormData.dueDate || null,
        priority: editFormData.priority,
        status: editFormData.status,
        assigneeId: editFormData.assigneeId,
        projectId: editFormData.projectId || null
      });
      
      setTasks(prev => prev.map(t => 
        t.id === selectedTask.id 
          ? { 
              ...t, 
              title: editFormData.title.trim(),
              category: editFormData.category.trim() || undefined,
              description: editFormData.description.trim() || '',
              dueDate: editFormData.dueDate || '',
              priority: editFormData.priority,
              status: editFormData.status,
              assigneeId: editFormData.assigneeId,
              projectId: editFormData.projectId || undefined
            } 
          : t
      ));
      
      setSelectedTask({
        ...selectedTask,
        title: editFormData.title.trim(),
        category: editFormData.category.trim() || undefined,
        description: editFormData.description.trim() || '',
        dueDate: editFormData.dueDate || '',
        priority: editFormData.priority,
        status: editFormData.status,
        assigneeId: editFormData.assigneeId,
        projectId: editFormData.projectId || undefined
      });
      
      setIsEditingTask(false);
      showSuccess('Task updated successfully');
      window.dispatchEvent(new Event('refresh-tasks'));
    } catch (err: any) {
      showError(err.message || 'Failed to update task');
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const compressNoteImage = (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.8): Promise<string> => {
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
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            reject(new Error('Canvas context not available'));
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleNoteImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('Image size must be less than 10MB');
      return;
    }

    try {
      const compressed = await compressNoteImage(file, 1200, 1200, 0.8);
      setNoteImagePreview(compressed);
      setNoteImageFile(file);
    } catch (err: any) {
      showError(err.message || 'Failed to process image');
    }
  };

  // Handle mentions in note textarea
  const handleNoteTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewNoteText(text);
    setMentionCursorPosition(cursorPos);
    
    // Check for @ mentions
    const textUpToCursor = text.substring(0, cursorPos);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const searchQuery = textUpToCursor.substring(lastAtSymbol + 1);
      
      // Only show dropdown if @ is at start of word
      const charBeforeAt = lastAtSymbol > 0 ? textUpToCursor[lastAtSymbol - 1] : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtSymbol === 0) {
        if (!searchQuery.includes(' ') && !searchQuery.includes('\n')) {
          setMentionSearchQuery(searchQuery);
          const filtered = users.filter(u => 
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setFilteredMentionUsers(filtered.slice(0, 5));
          setShowMentionDropdown(true);
          return;
        }
      }
    }
    
    setShowMentionDropdown(false);
  };

  const handleMentionSelect = (user: UserType) => {
    const textUpToCursor = newNoteText.substring(0, mentionCursorPosition);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    const textAfterCursor = newNoteText.substring(mentionCursorPosition);
    
    const beforeMention = newNoteText.substring(0, lastAtSymbol);
    const newText = `${beforeMention}@${user.name} ${textAfterCursor}`;
    
    setNewNoteText(newText);
    setShowMentionDropdown(false);
    
    // Focus back to textarea
    if (noteTextareaRef.current) {
      noteTextareaRef.current.focus();
      const newCursorPos = lastAtSymbol + user.name.length + 2;
      noteTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }
  };

  const extractMentionedUsers = (text: string): string[] => {
    const mentionRegex = /@([A-Za-z0-9\s]+?)(?=\s|$|[.,!?])/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1].trim();
      const user = users.find(u => u.name.toLowerCase() === mentionedName.toLowerCase());
      if (user && user.id !== (currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id)) {
        mentions.push(user.id);
      }
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  };

  const renderNoteTextWithMentions = (text: string) => {
    const mentionRegex = /@([A-Za-z0-9\s]+?)(?=\s|$|[.,!?])/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add mention with styling
      const mentionedName = match[1].trim();
      const user = users.find(u => u.name.toLowerCase() === mentionedName.toLowerCase());
      if (user) {
        parts.push(
          <span key={match.index} className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
            @{user.name}
          </span>
        );
      } else {
        parts.push(`@${mentionedName}`);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  const handleAddNote = async () => {
    if (!selectedTask) return;
    if (!newNoteText.trim() && !noteImageFile) {
      showError('Please enter a note or upload an image');
      return;
    }

    setIsAddingNote(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const userName = currentUser?.name || JSON.parse(localStorage.getItem('user_data') || '{}').name || 'Unknown User';

      const newNote: TaskNote = {
        id: `note_${Date.now()}`,
        userId,
        userName,
        text: newNoteText.trim(),
        imageUrl: noteImagePreview || undefined,
        imageName: noteImageFile?.name || undefined,
        imageMimeType: noteImageFile?.type || undefined,
        createdAt: new Date().toISOString()
      };

      const updatedNotes = [...(selectedTask.notes || []), newNote];

      await apiUpdateTask(selectedTask.id, {
        notes: updatedNotes
      });

      setSelectedTask({
        ...selectedTask,
        notes: updatedNotes
      });

      setTasks(prev => prev.map(t => 
        t.id === selectedTask.id 
          ? { ...t, notes: updatedNotes } 
          : t
      ));

      // Send notifications to mentioned users
      const mentionedUserIds = extractMentionedUsers(newNoteText);
      for (const mentionedUserId of mentionedUserIds) {
        try {
          await apiCreateNotification({
            userId: mentionedUserId,
            type: 'mention',
            title: 'You were mentioned in a task',
            message: `${userName} mentioned you in task "${selectedTask.title}"`,
            relatedId: selectedTask.id,
            relatedType: 'task',
            read: false
          });
        } catch (notifErr) {
          console.error('Failed to send notification:', notifErr);
        }
      }

      setNewNoteText('');
      setNoteImagePreview('');
      setNoteImageFile(null);
      if (noteImageInputRef.current) noteImageInputRef.current.value = '';

      const successMsg = mentionedUserIds.length > 0 
        ? `Note added and ${mentionedUserIds.length} user(s) notified`
        : 'Note added successfully';
      showSuccess(successMsg);
    } catch (err: any) {
      showError(err.message || 'Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const confirmDeleteNote = async () => {
    if (!selectedTask || !currentUser || !noteToDelete) return;

    try {
      setDeletingNoteId(noteToDelete);

      const updatedNotes = selectedTask.notes?.filter(note => note.id !== noteToDelete) || [];

      await apiUpdateTask(selectedTask.id, {
        notes: updatedNotes
      });

      setSelectedTask({
        ...selectedTask,
        notes: updatedNotes
      });

      setTasks(prev => prev.map(t => 
        t.id === selectedTask.id 
          ? { ...t, notes: updatedNotes } 
          : t
      ));

      showSuccess('Note deleted successfully');
      setNoteToDelete(null);
    } catch (err: any) {
      showError(err.message || 'Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const closeTaskDetail = () => {
    setSelectedTask(null);
    setIsEditingTask(false);
    setNewNoteText('');
    setNoteImagePreview('');
    setNoteImageFile(null);
    setShowMentionDropdown(false);
    setShowActivityLog(false);
    if (noteImageInputRef.current) noteImageInputRef.current.value = '';
  };

  let filteredTasks = tasks.filter(t => {
    if (viewMode === 'archived') {
      if (!t.archived) return false;
    } else if (viewMode === 'week') {
      if (t.archived) return false; // Week view only shows active tasks
    } else {
      if (t.archived) return false; // Active view
    }
    if (!searchQuery.trim()) return true;
    return t.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Apply sorting
  if (sortBy === 'dueDate') {
    filteredTasks = [...filteredTasks].sort((a, b) => {
      // Tasks without due date go to the end
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });
  } else if (sortBy === 'priority') {
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    filteredTasks = [...filteredTasks].sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 4;
      const bPriority = priorityOrder[b.priority] || 4;
      return aPriority - bPriority;
    });
  } else if (sortBy === 'category') {
    filteredTasks = [...filteredTasks].sort((a, b) => {
      const aCategory = (a.category || 'Uncategorized').toLowerCase();
      const bCategory = (b.category || 'Uncategorized').toLowerCase();
      return aCategory.localeCompare(bCategory);
    });
  } else if (sortBy === 'owner') {
    filteredTasks = [...filteredTasks].sort((a, b) => {
      const aOwner = users.find(u => u.id === a.assigneeId)?.name || 'Unassigned';
      const bOwner = users.find(u => u.id === b.assigneeId)?.name || 'Unassigned';
      return aOwner.localeCompare(bOwner);
    });
  }

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
        
        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'category' | 'owner' | 'none')}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer hover:bg-slate-50 transition-all"
          >
            <option value="none">No Sort</option>
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="category">Sort by Category</option>
            <option value="owner">Sort by Owner</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
        
        <div className="flex bg-white p-1 border border-slate-200 rounded-xl shadow-sm">
          <button onClick={() => setDisplayMode('list')} className={`p-2 rounded-lg ${displayMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setDisplayMode('card')} className={`p-2 rounded-lg ${displayMode === 'card' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><Grid className="w-4 h-4" /></button>
          <button 
            onClick={() => {
              if (viewMode === 'week') {
                setViewMode('active');
              } else {
                setViewMode('week');
              }
              setSelectedTaskIds([]);
            }} 
            className={`p-2 rounded-lg ${viewMode === 'week' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
            title="Week View"
          >
            <Calendar className="w-4 h-4" />
          </button>
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
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No {viewMode === 'week' ? 'tasks' : viewMode} tasks found</p>
        </div>
      ) : viewMode === 'week' ? (
        <div className="space-y-8">
          {(() => {
            const ongoingTasks = filteredTasks.filter(t => !getWeekKey(t.dueDate));
            const tasksWithDueDate = filteredTasks.filter(t => getWeekKey(t.dueDate));
            const weekKeyToTasks: Record<string, Task[]> = {};
            tasksWithDueDate.forEach(t => {
              const key = getWeekKey(t.dueDate)!;
              if (!weekKeyToTasks[key]) weekKeyToTasks[key] = [];
              weekKeyToTasks[key].push(t);
            });
            const sortedWeekKeys = Object.keys(weekKeyToTasks).sort();
            const thisWeekMondayStr = (() => {
              const m = getMondayOfWeek(new Date());
              return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
            })();
            const nextWeekMondayStr = (() => {
              const thisMon = getMondayOfWeek(new Date());
              const nextMon = new Date(thisMon);
              nextMon.setDate(thisMon.getDate() + 7);
              return `${nextMon.getFullYear()}-${String(nextMon.getMonth() + 1).padStart(2, '0')}-${String(nextMon.getDate()).padStart(2, '0')}`;
            })();
            const formatWeekRange = (start: Date, end: Date) => {
              const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return `${startStr} - ${endStr}`;
            };
            const getWeekLabel = (weekKey: string) => {
              if (weekKey === thisWeekMondayStr) return 'This Week';
              if (weekKey === nextWeekMondayStr) return 'Next Week';
              const [y, m, d] = weekKey.split('-').map(Number);
              const monday = new Date(y, m - 1, d);
              const { start, end } = getWeekRange(monday);
              return `Week of ${formatWeekRange(start, end)}`;
            };
            const getWeekRangeForKey = (weekKey: string) => {
              const [y, m, d] = weekKey.split('-').map(Number);
              return getWeekRange(new Date(y, m - 1, d));
            };
            // Sort tasks within each week by due date
            sortedWeekKeys.forEach(key => {
              weekKeyToTasks[key].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
            });
            const renderTaskList = (taskList: Task[]) => {
              if (taskList.length === 0) return null;
              return displayMode === 'list' ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="divide-y divide-slate-50">
                    {taskList.map(task => {
                      const isSelected = selectedTaskIds.includes(task.id);
                      return (
                        <div 
                          key={task.id} 
                          onClick={() => setSelectedTask(task)}
                          className={`flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/30 border-l-4 border-indigo-400' : ''}`}
                        >
                          <div onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              checked={isSelected}
                              onChange={() => setSelectedTaskIds(prev => isSelected ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                            />
                          </div>
                          <button 
                            onClick={(e) => toggleStatus(task.id, task.status, e)} 
                            disabled={updatingTaskId === task.id}
                            className="text-slate-300 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                          >
                            {updatingTaskId === task.id ? (
                              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                            ) : task.status === 'Done' ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <Circle className="w-6 h-6" />
                            )}
                          </button>
                          <div className="flex-1 overflow-hidden">
                            <p className={`font-bold text-sm ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {task.category && (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <Tag className="w-3 h-3 text-indigo-400" />
                                    <span className="text-[10px] text-indigo-600 font-bold uppercase">{task.category}</span>
                                  </div>
                                  <span className="text-slate-300">•</span>
                                </>
                              )}
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{projects.find(p => p.id === task.projectId)?.title || 'General'}</p>
                              <span className="text-slate-300">•</span>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] text-slate-400 font-bold">
                                  {task.dueDate ? formatDueDateDisplay(task.dueDate) : 'Ongoing'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              task.priority === 'High' ? 'bg-red-50 text-red-600' : 
                              task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {task.priority}
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-full">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-600">{users.find(u => u.id === task.assigneeId)?.name || 'Unassigned'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><Eye className="w-4 h-4" /></button>
                              <button onClick={(e) => { e.stopPropagation(); setArchiveConfirmTask(task); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><Archive className="w-4 h-4" /></button>
                              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmTask(task); }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {taskList.map(task => {
                    const isSelected = selectedTaskIds.includes(task.id);
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`bg-white p-6 rounded-3xl border ${isSelected ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200'} relative group cursor-pointer hover:shadow-lg transition-all`}
                      >
                        <div className="absolute top-4 left-4" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className={`${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer`}
                            checked={isSelected}
                            onChange={() => setSelectedTaskIds(prev => isSelected ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                          />
                        </div>
                        <div className="mt-6">
                          <p className={`font-bold text-sm mb-3 ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                          <div className="space-y-2 mb-4">
                            {task.category && (
                              <div className="flex items-center gap-2">
                                <Tag className="w-3 h-3 text-indigo-400" />
                                <span className="text-[10px] text-indigo-600 font-bold uppercase">{task.category}</span>
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{projects.find(p => p.id === task.projectId)?.title || 'General'}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                          {task.dueDate ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[10px] font-black text-slate-400 uppercase">
                                {formatDueDateDisplay(task.dueDate)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-slate-400 uppercase">Ongoing</span>
                          )}
                          <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                            task.priority === 'High' ? 'bg-red-50 text-red-600' : 
                            task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {task.priority}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            };
            return (
              <>
                {sortedWeekKeys.map(weekKey => {
                  const taskList = weekKeyToTasks[weekKey];
                  if (!taskList || taskList.length === 0) return null;
                  const range = getWeekRangeForKey(weekKey);
                  const label = getWeekLabel(weekKey);
                  const isThisOrNext = label === 'This Week' || label === 'Next Week';
                  return (
                    <div key={weekKey}>
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <h2 className="text-lg font-black text-slate-900">{label}</h2>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black">
                          {formatWeekRange(range.start, range.end)}
                        </span>
                        <span className="text-sm text-slate-400 font-bold">({taskList.length})</span>
                      </div>
                      {renderTaskList(taskList)}
                    </div>
                  );
                })}
                {ongoingTasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-lg font-black text-slate-900">Ongoing</h2>
                      <span className="text-sm text-slate-400 font-bold">({ongoingTasks.length} tasks)</span>
                    </div>
                    {renderTaskList(ongoingTasks)}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : displayMode === 'list' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
           <div className="divide-y divide-slate-50">
             {filteredTasks.map(task => {
               const isSelected = selectedTaskIds.includes(task.id);
               return (
                 <div 
                   key={task.id} 
                   onClick={() => setSelectedTask(task)}
                   className={`flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors cursor-pointer ${task.archived ? 'bg-slate-50/50' : ''} ${isSelected ? 'bg-indigo-50/30 border-l-4 border-indigo-400' : ''}`}
                 >
                   <div onClick={(e) => e.stopPropagation()}>
                     <input 
                       type="checkbox" 
                       className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                       checked={isSelected}
                       onChange={() => setSelectedTaskIds(prev => isSelected ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                     />
                   </div>
                  <button 
                    onClick={(e) => toggleStatus(task.id, task.status, e)} 
                    disabled={updatingTaskId === task.id}
                    className="text-slate-300 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    {updatingTaskId === task.id ? (
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    ) : task.status === 'Done' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>
                  <div className="flex-1 overflow-hidden">
                    <p className={`font-bold text-sm ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {task.category && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-indigo-400" />
                            <span className="text-[10px] text-indigo-600 font-bold uppercase">{task.category}</span>
                          </div>
                          <span className="text-slate-300">•</span>
                        </>
                      )}
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{projects.find(p => p.id === task.projectId)?.title || 'General'}</p>
                      <>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] text-slate-400 font-bold">
                            {task.dueDate
                              ? formatDueDateDisplay(task.dueDate)
                              : 'Ongoing'}
                          </span>
                        </div>
                      </>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Priority Badge */}
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      task.priority === 'High' ? 'bg-red-50 text-red-600' : 
                      task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {task.priority}
                    </div>
                    
                    {/* Assignee */}
                    {task.assigneeId && (() => {
                      const assignee = users.find(u => u.id === task.assigneeId);
                      return assignee ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full" title={assignee.name}>
                          <User className="w-3 h-3 text-indigo-600" />
                          <span className="text-[10px] font-bold text-indigo-600 max-w-[120px] truncate">
                            {assignee.name}
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                     <button 
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         setSelectedTask(task);
                       }} 
                       className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                       title="View task"
                     >
                       <Eye className="w-4 h-4" />
                     </button>
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
               onClick={() => setSelectedTask(task)}
               className={`bg-white p-6 rounded-3xl border ${isSelected ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200'} relative group cursor-pointer hover:shadow-lg transition-all`}
             >
                <div className="flex justify-between items-start mb-4">
                   <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><CheckSquare className="w-4 h-4" /></div>
                   <div className="flex items-center gap-1">
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                       <button 
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           setSelectedTask(task);
                         }} 
                         className="p-1.5 text-slate-400 hover:text-indigo-600"
                         title="View task"
                       >
                         <Eye className="w-3.5 h-3.5" />
                       </button>
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
               <p className="text-xs text-slate-500 line-clamp-2 mb-4">{task.description}</p>
               
               {/* Category */}
               {task.category && (
                 <div className="flex items-center gap-2 mb-2">
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full">
                     <Tag className="w-3.5 h-3.5 text-indigo-600" />
                     <span className="text-[10px] font-bold text-indigo-600">
                       {task.category}
                     </span>
                   </div>
                 </div>
               )}
               
               {/* Assignee */}
               {task.assigneeId && (() => {
                 const assignee = users.find(u => u.id === task.assigneeId);
                 return assignee ? (
                   <div className="flex items-center gap-2 mb-4">
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
                       <User className="w-3.5 h-3.5 text-emerald-600" />
                       <span className="text-[10px] font-bold text-emerald-600">
                         {assignee.name}
                       </span>
                     </div>
                   </div>
                 ) : null;
               })()}
               
               <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                 {task.dueDate ? (
                   <div className="flex items-center gap-1.5">
                     <Calendar className="w-3.5 h-3.5 text-slate-400" />
                     <span className="text-[10px] font-black text-slate-400 uppercase">
                       {formatDueDateDisplay(task.dueDate)}
                     </span>
                   </div>
                 ) : (
                   <span className="text-[10px] font-black text-slate-400 uppercase">Ongoing</span>
                 )}
                 <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                   task.priority === 'High' ? 'bg-red-50 text-red-600' : 
                   task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 
                   'bg-slate-50 text-slate-600'
                 }`}>
                   {task.priority}
                 </div>
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
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Column: Task Category
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">Organizational category (optional). New categories from the file are added automatically.</p>
                         </div>
                         <div className="space-y-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Column: Due Date *
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">e.g. YYYY-MM-DD or February 15, 2026. Use &quot;Ongoing&quot; for no date.</p>
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
                         <div className="space-y-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Column: Task Owner
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">Task owner name or email (optional).</p>
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
                        { label: 'Task Category', key: 'category', required: false, icon: <Tag className="w-4 h-4" /> },
                        { label: 'Due Date', key: 'dueDate', required: true, icon: <Calendar className="w-4 h-4" /> },
                        { label: 'Task Description', key: 'description', required: false, icon: <Info className="w-4 h-4" /> },
                        { label: 'Priority Level', key: 'priority', required: false, icon: <Tag className="w-4 h-4" /> },
                        { label: 'Task Owner', key: 'owner', required: false, icon: <User className="w-4 h-4" /> }
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
                          setColumnMapping({ title: '', category: '', dueDate: '', description: '', priority: '', owner: '' });
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
                  setBulkProjectModalOpen(true);
                  setBulkAssignProjectId('');
                }}
                disabled={isBulkAssigningProject}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <FolderKanban className="w-3.5 h-3.5" />
                Assign to project
              </button>
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

      {/* Bulk Assign to Project Modal */}
      {bulkProjectModalOpen && selectedTaskIds.length > 0 && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Assign to project
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Change the linked project for {selectedTaskIds.length} selected task{selectedTaskIds.length > 1 ? 's' : ''}.
                  </p>
                </div>
              </div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Project</label>
              <select
                value={bulkAssignProjectId}
                onChange={(e) => setBulkAssignProjectId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%22%3E%3Cpath%20stroke%3D%226b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
              >
                <option value="">Select project...</option>
                <option value="__none__">None (General)</option>
                {projects.filter(p => !p.archived).map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => { setBulkProjectModalOpen(false); setBulkAssignProjectId(''); }}
                disabled={isBulkAssigningProject}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssignProject}
                disabled={isBulkAssigningProject || !bulkAssignProjectId}
                className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isBulkAssigningProject ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  `Assign ${selectedTaskIds.length} task${selectedTaskIds.length > 1 ? 's' : ''}`
                )}
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

      {/* Task Detail View Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-[110] overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300" 
            onClick={closeTaskDetail} 
          />
          <div className="absolute right-0 inset-y-0 w-full max-w-xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            
            {/* Header */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 relative">
              <button 
                onClick={closeTaskDetail} 
                className="absolute top-6 right-6 p-2 hover:bg-white rounded-full text-slate-400 transition-all shadow-sm z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-[24px] flex items-center justify-center text-white shadow-xl bg-indigo-500 shadow-indigo-100">
                  <CheckSquare className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  {isEditingTask ? (
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2 bg-white border-2 border-indigo-200 rounded-xl text-xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                      placeholder="Task title"
                    />
                  ) : (
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedTask.title}</h2>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      selectedTask.status === 'Done' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : selectedTask.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : selectedTask.status === 'Review'
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      {selectedTask.status}
                    </span>
                    <span className="text-slate-400 text-xs font-bold">• Task ID: #{selectedTask.id.substring(0, 8)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isEditingTask ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingTask(false);
                        setEditFormData({
                          title: selectedTask.title,
                          description: selectedTask.description || '',
                          dueDate: selectedTask.dueDate || '',
                          priority: selectedTask.priority || 'Medium',
                          status: selectedTask.status || 'Todo',
                          assigneeId: selectedTask.assigneeId,
                          projectId: selectedTask.projectId || ''
                        });
                      }}
                      disabled={isUpdatingTask}
                      className="px-4 py-2 border border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateTask}
                      disabled={isUpdatingTask || !editFormData.title.trim() || !editFormData.assigneeId}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdatingTask ? (
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
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingTask(true)}
                    className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Task
                  </button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Task Details */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Assignee */}
                  <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assignee</p>
                    {isEditingTask ? (
                      <select
                        value={editFormData.assigneeId}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, assigneeId: e.target.value }))}
                        className="w-full px-4 py-2 bg-white border-2 border-indigo-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 mt-2"
                      >
                        <option value="">Select Assignee</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black text-sm">
                          {users.find(u => u.id === selectedTask.assigneeId)?.name?.charAt(0) || 'U'}
                        </div>
                        <p className="text-sm font-bold text-slate-900">
                          {users.find(u => u.id === selectedTask.assigneeId)?.name || 'Unassigned'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Linked Project */}
                  <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Linked Project</p>
                    {isEditingTask ? (
                      <select
                        value={editFormData.projectId}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, projectId: e.target.value }))}
                        className="w-full px-4 py-2 bg-white border-2 border-indigo-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 mt-2"
                      >
                        <option value="">None</option>
                        {projects.filter(p => !p.archived).map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-bold text-slate-900 mt-2">
                        {selectedTask.projectId ? (projects.find(p => p.id === selectedTask.projectId)?.title || 'Unknown Project') : 'None'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" /> Description
                  </h3>
                  {isEditingTask ? (
                    <textarea
                      rows={6}
                      value={editFormData.description}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 resize-none"
                      placeholder="Add task description..."
                    />
                  ) : (
                    <div className="p-6 bg-slate-950 rounded-[32px] text-indigo-50 relative overflow-hidden shadow-2xl">
                      <p className="text-sm leading-relaxed italic opacity-90 z-10 relative">
                        {selectedTask.description || 'No description provided.'}
                      </p>
                      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                    </div>
                  )}
                </div>

                {/* Task Category */}
                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Task Category
                  </p>
                  {isEditingTask ? (
                    <div className="space-y-2 mt-2">
                      <select
                        value={editCategoryIsNew ? '__new__' : (editFormData.category || '')}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '__new__') {
                            setEditCategoryIsNew(true);
                            setEditFormData(prev => ({ ...prev, category: '' }));
                          } else {
                            setEditCategoryIsNew(false);
                            setEditFormData(prev => ({ ...prev, category: v }));
                          }
                        }}
                        className="w-full px-4 py-2 bg-white border-2 border-indigo-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%22%3E%3Cpath%20stroke%3D%226b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
                      >
                        <option value="">None</option>
                        {taskCategories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="__new__">+ Create new category...</option>
                      </select>
                      {editCategoryIsNew && (
                        <input
                          type="text"
                          value={editFormData.category}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value.trim() }))}
                          placeholder="Enter new category name"
                          className="w-full px-4 py-2 bg-white border-2 border-indigo-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      {selectedTask.category ? (
                        <>
                          <Tag className="w-4 h-4 text-indigo-600" />
                          <p className="text-sm font-bold text-indigo-700">{selectedTask.category}</p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-400">No category</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Due Date & Priority */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                    {isEditingTask ? (
                      <input
                        type="date"
                        value={editFormData.dueDate}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-4 py-2 bg-white border-2 border-indigo-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 mt-2"
                      />
                    ) : (
                      <p className="text-sm font-bold text-slate-900 mt-2">
                        {selectedTask.dueDate ? formatDueDateDisplay(selectedTask.dueDate) : 'Ongoing'}
                      </p>
                    )}
                  </div>

                  <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority</p>
                    {isEditingTask ? (
                      <div className="flex gap-2 mt-2">
                        {(['Low', 'Medium', 'High'] as const).map(priority => (
                          <button
                            key={priority}
                            onClick={() => setEditFormData(prev => ({ ...prev, priority }))}
                            className={`flex-1 px-3 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                              editFormData.priority === priority
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            {priority}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase mt-2 ${
                        selectedTask.priority === 'High' 
                          ? 'bg-red-50 text-red-600' 
                          : selectedTask.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-slate-50 text-slate-600'
                      }`}>
                        {selectedTask.priority}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  {isEditingTask ? (
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-4 py-2 bg-white border-2 border-indigo-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 mt-2"
                    >
                      <option value="Todo">Todo</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Done">Done</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-3 mt-2">
                      {selectedTask.status === 'Done' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : selectedTask.status === 'In Progress' ? (
                        <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400" />
                      )}
                      <p className="text-sm font-bold text-slate-900 capitalize">
                        {selectedTask.status}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes/Comments Section */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" /> 
                    Notes & Comments 
                    {selectedTask.notes && selectedTask.notes.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px]">
                        {selectedTask.notes.length}
                      </span>
                    )}
                  </h3>

                  {/* Add New Note */}
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        ref={noteTextareaRef}
                        rows={3}
                        value={newNoteText}
                        onChange={handleNoteTextChange}
                        onBlur={() => {
                          // Delay hiding dropdown to allow click
                          setTimeout(() => setShowMentionDropdown(false), 200);
                        }}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
                        placeholder="Add a note or comment... (Use @ to mention users)"
                      />
                      
                      {/* Mention Dropdown */}
                      {showMentionDropdown && filteredMentionUsers.length > 0 && (
                        <div className="absolute bottom-full mb-2 left-0 w-full max-w-sm bg-white border-2 border-indigo-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                          <div className="p-2">
                            <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                              <AtSign className="w-3 h-3" />
                              Mention User
                            </div>
                            {filteredMentionUsers.map(user => (
                              <button
                                key={user.id}
                                onClick={() => handleMentionSelect(user)}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 rounded-lg transition-all text-left"
                              >
                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                                  {user.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Image Upload */}
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer group">
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-all">
                            {noteImagePreview ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : (
                              <UploadIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-900">
                              {noteImagePreview ? (noteImageFile?.name || 'Image selected') : 'Attach Image'}
                            </p>
                            <p className="text-[10px] text-slate-400">PNG, JPG (Max 10MB)</p>
                          </div>
                        </div>
                        <input
                          ref={noteImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleNoteImageSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={handleAddNote}
                        disabled={isAddingNote || (!newNoteText.trim() && !noteImageFile)}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                        {isAddingNote ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send
                          </>
                        )}
                      </button>
                    </div>

                    {/* Image Preview */}
                    {noteImagePreview && (
                      <div className="relative">
                        <img
                          src={noteImagePreview}
                          alt="Note attachment preview"
                          className="w-full max-h-48 object-contain rounded-lg border-2 border-slate-200"
                        />
                        <button
                          onClick={() => {
                            setNoteImagePreview('');
                            setNoteImageFile(null);
                            if (noteImageInputRef.current) noteImageInputRef.current.value = '';
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notes List */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {selectedTask.notes && selectedTask.notes.length > 0 ? (
                      [...selectedTask.notes].reverse().map((note) => {
                        const canDelete = currentUser?.role === 'Admin' || note.userId === currentUser?.id;
                        return (
                          <div key={note.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">
                                  {note.userName?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{note.userName}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {new Date(note.createdAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </p>
                                </div>
                              </div>
                              {canDelete && (
                                <button
                                  onClick={() => setNoteToDelete(note.id)}
                                  disabled={deletingNoteId === note.id}
                                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-50"
                                  title="Delete note"
                                >
                                  {deletingNoteId === note.id ? (
                                    <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                                  )}
                                </button>
                              )}
                            </div>
                            {note.text && (
                              <p className="text-sm text-slate-700 leading-relaxed pl-10">
                                {renderNoteTextWithMentions(note.text)}
                              </p>
                            )}
                            {note.imageUrl && (
                              <div className="pl-10">
                                <img
                                  src={note.imageUrl}
                                  alt={note.imageName || 'Note attachment'}
                                  className="max-w-full max-h-64 object-contain rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`<img src="${note.imageUrl}" style="max-width:100%;height:auto;" />`);
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-400 font-medium">No notes yet</p>
                        <p className="text-xs text-slate-400 mt-1">Add your first note above</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Activity Log Section */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setShowActivityLog(!showActivityLog)}
                    className="w-full flex items-center justify-between group"
                  >
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                      <History className="w-4 h-4 text-indigo-500" /> 
                      Activity Log
                    </h3>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showActivityLog ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {showActivityLog && (
                    <div className="space-y-2 pl-6 border-l-2 border-indigo-100">
                      <div className="flex items-start gap-3 pb-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900">Task created</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            }) : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      
                      {selectedTask.updatedAt && selectedTask.updatedAt !== selectedTask.createdAt && (
                        <div className="flex items-start gap-3 pb-3">
                          <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-900">Task updated</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(selectedTask.updatedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {selectedTask.notes && selectedTask.notes.map((note, idx) => (
                        <div key={note.id} className="flex items-start gap-3 pb-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-900">
                              {note.userName} added a comment
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(note.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {(!selectedTask.notes || selectedTask.notes.length === 0) && (!selectedTask.updatedAt || selectedTask.updatedAt === selectedTask.createdAt) && (
                        <p className="text-xs text-slate-400 italic">No recent activity</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
              <button 
                onClick={() => {
                  setDeleteConfirmTask(selectedTask);
                  closeTaskDetail();
                }} 
                className="px-6 py-4 border border-red-200 bg-white text-red-600 hover:bg-red-50 rounded-[24px] transition-all group shrink-0 active:scale-95"
              >
                <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={closeTaskDetail} 
                className="flex-1 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[24px] hover:bg-indigo-700 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="w-5 h-5" /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Note Confirmation Dialog */}
      {noteToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-900 mb-2">Delete Note?</h3>
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete this note? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-6 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setNoteToDelete(null)}
                disabled={deletingNoteId === noteToDelete}
                className="flex-1 px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteNote}
                disabled={deletingNoteId === noteToDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingNoteId === noteToDelete ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
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
