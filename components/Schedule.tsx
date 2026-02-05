
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, MapPin, Calendar as CalendarIcon, ChevronLeft, 
  ChevronRight, Plus, ExternalLink, Sparkles, Loader2, X, 
  CheckCircle2, Circle, LayoutGrid, List, Info, Tag, User, 
  FileText, Edit2, Eye, Archive, Trash2, MessageSquare, History, Send, AtSign, ImageIcon, Upload as UploadIcon, Save, CheckSquare, Check
} from 'lucide-react';
import { CalendarEvent, Task, TaskNote, Project, User as UserType } from '../types';
import { 
  apiGetGoogleCalendarStatus, 
  apiGetGoogleCalendarEvents,
  apiGetCalendarEvents,
  apiGetTasks,
  apiGetProjects,
  apiGetUsers,
  apiGetTaskCategories,
  apiUpdateTask,
  apiDeleteTask,
  apiCreateNotification
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface ScheduleProps {
  currentUser?: any;
  onNavigate: (tab: string) => void;
  onNewEvent: () => void;
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

const Schedule: React.FC<ScheduleProps> = ({ currentUser, onNavigate, onNewEvent }) => {
  const { showError, showSuccess } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
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
  const [taskCategories, setTaskCategories] = useState<string[]>([]);
  const [editCategoryIsNew, setEditCategoryIsNew] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [noteImagePreview, setNoteImagePreview] = useState<string>('');
  const [noteImageFile, setNoteImageFile] = useState<File | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [filteredMentionUsers, setFilteredMentionUsers] = useState<UserType[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const [showEvents, setShowEvents] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const noteImageInputRef = useRef<HTMLInputElement>(null);
  
  const hours = Array.from({ length: 24 }, (_, i) => i); // 12 AM to 11 PM (full day)

  // Auto-detect browser timezone
  const timezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  const dateKey = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  useEffect(() => {
    const checkConnectionStatus = async () => {
      if (!currentUser?.id) return;
      try {
        const response = await apiGetGoogleCalendarStatus(currentUser.id);
        setIsGoogleConnected(response.connected || false);
      } catch (err) {
        setIsGoogleConnected(false);
      }
    };
    checkConnectionStatus();
  }, [currentUser]);

  // Filter out daily recurring events (like "Office", "Working Hours", etc.)
  const filterDailyRecurringEvents = (events: CalendarEvent[]): CalendarEvent[] => {
    return events.filter(event => {
      // If the event has a recurringEventId, it's a recurring event instance
      // We'll check if it's likely a daily recurring event by examining patterns
      if (event.recurringEventId) {
        const title = (event.title || '').toLowerCase().trim();
        
        // Common patterns for daily recurring "non-event" entries
        const dailyPatterns = [
          'office',
          'working hours',
          'work hours',
          'availability',
          'busy',
          'out of office',
          'lunch',
          'break'
        ];
        
        // Check if the event title matches any daily pattern
        const isDailyPattern = dailyPatterns.some(pattern => title.includes(pattern));
        
        if (isDailyPattern) {
          return false; // Filter out this event
        }
      }
      
      return true; // Keep this event
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingEvents(true);
      
      // Calculate date range based on view mode
      const start = new Date(selectedDate);
      const end = new Date(selectedDate);
      
      if (viewMode === 'monthly') {
        // Get first and last day of the month
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of current month
        end.setHours(23, 59, 59, 999);
      } else if (viewMode === 'weekly') {
        // Get Monday to Sunday of the week
        const d = new Date(selectedDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        const monday = new Date(d.setDate(diff));
        start.setTime(monday.getTime());
        start.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        end.setTime(sunday.getTime());
        end.setHours(23, 59, 59, 999);
      } else {
        // Daily view - just the selected date
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }
      
      const formatDate = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      
      const startDate = formatDate(start);
      const endDate = formatDate(end);
      
      const allEvents: CalendarEvent[] = [];
      
      // Fetch Google Calendar events
      if (isGoogleConnected && currentUser?.id) {
        try {
          const response = await apiGetGoogleCalendarEvents(
            startDate, 
            endDate, 
            currentUser.id
          );
          const googleEvents = response.data || [];
          // Filter out daily recurring events
          const filteredGoogleEvents = filterDailyRecurringEvents(googleEvents);
          allEvents.push(...filteredGoogleEvents);
        } catch (err: any) {
          console.warn('[Schedule] Failed to fetch Google Calendar events:', err.message);
        }
      }
      
      // Fetch Firestore calendar events (including events created from emails)
      if (currentUser?.id) {
        try {
          const firestoreResponse = await apiGetCalendarEvents(
            currentUser.id,
            undefined, // emailId - get all events
            startDate,
            endDate
          );
          if (firestoreResponse.success && firestoreResponse.data) {
            const firestoreEvents = firestoreResponse.data.map((event: any) => ({
              id: event.id,
              title: event.title,
              description: event.description || '',
              start: event.start,
              end: event.end,
              type: event.type || 'meeting',
              location: event.location || '',
              participants: event.participants || [],
              color: event.color || '#4f46e5',
              isAllDay: event.isAllDay || false,
              source: 'firestore',
              googleEventId: event.googleEventId || null,
              htmlLink: event.htmlLink || null,
              relatedEntity: event.relatedEntity || null
            }));
            allEvents.push(...firestoreEvents);
          }
        } catch (err: any) {
          console.warn('[Schedule] Failed to fetch Firestore calendar events:', err.message);
        }
      }
      
      // Deduplicate events by ID and merge
      const uniqueEvents = new Map<string, CalendarEvent>();
      allEvents.forEach(event => {
        const key = event.googleEventId || event.id;
        if (!uniqueEvents.has(key)) {
          uniqueEvents.set(key, event);
        }
      });
      
      setEvents(Array.from(uniqueEvents.values()));

      try {
        const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
        
        if (!userId) {
          setAllTasks([]);
          setDailyTasks([]);
          return;
        }
        
        // Fetch tasks assigned to the current user only
        const tasksResponse = await apiGetTasks(userId);
        const fetchedTasks = Array.isArray(tasksResponse?.data || tasksResponse) 
          ? (tasksResponse?.data || tasksResponse) 
          : [];
        
        // Filter: only show non-archived tasks that have a due date
        // Handle both null and empty string cases
        const tasksWithDueDate = fetchedTasks.filter((t: Task) => {
          const hasDueDate = t.dueDate && 
            t.dueDate !== null && 
            t.dueDate !== undefined && 
            String(t.dueDate).trim() !== '' &&
            String(t.dueDate).trim().toLowerCase() !== 'ongoing';
          return !t.archived && hasDueDate;
        });
        
        // Store all non-archived tasks with due dates assigned to current user - they will be filtered by date when displaying
        setAllTasks(tasksWithDueDate);
        
        // For daily view, filter tasks for the selected date
        const filteredTasks = tasksWithDueDate.filter((t: Task) => t.dueDate === dateKey);
        setDailyTasks(filteredTasks);
      } catch (err) {
        setAllTasks([]);
        setDailyTasks([]);
      }

      try {
        const [projRes, userRes, catRes] = await Promise.all([
          apiGetProjects(currentUser?.id),
          apiGetUsers(),
          apiGetTaskCategories()
        ]);
        setProjects(Array.isArray(projRes?.data || projRes) ? (projRes?.data || projRes) : []);
        setUsers(Array.isArray(userRes?.data || userRes) ? (userRes?.data || userRes) : []);
        setTaskCategories(Array.isArray((catRes as any)?.data) ? (catRes as any).data : []);
      } catch (err) {
        setProjects([]);
        setUsers([]);
        setTaskCategories([]);
      }

      setIsLoadingEvents(false);
    };

    fetchData();
  }, [dateKey, isGoogleConnected, currentUser, viewMode, selectedDate]);

  const goToPrevious = () => {
    const prev = new Date(selectedDate);
    if (viewMode === 'daily') prev.setDate(prev.getDate() - 1);
    else if (viewMode === 'weekly') prev.setDate(prev.getDate() - 7);
    else prev.setMonth(prev.getMonth() - 1);
    setSelectedDate(prev);
  };

  const goToNext = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'daily') next.setDate(next.getDate() + 1);
    else if (viewMode === 'weekly') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const getEventPosition = (event: CalendarEvent) => {
    let eventStart = new Date(event.start);
    let eventEnd = new Date(event.end);
    const timelineStart = new Date(selectedDate);
    timelineStart.setHours(0, 0, 0, 0); // Start from midnight
    const minutesFromStart = (eventStart.getTime() - timelineStart.getTime()) / (1000 * 60);
    const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
    const topPosition = minutesFromStart * (80 / 60) + 20; // Add 20px offset to match hour positions
    const height = durationMinutes * (80 / 60);
    return { top: topPosition, height: Math.max(height, 50) };
  };

  const formatTime = (timeStr: string): string => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return timeStr;
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'text-red-500 bg-red-50 border-red-100';
      case 'Medium': return 'text-amber-500 bg-amber-50 border-amber-100';
      default: return 'text-blue-500 bg-blue-50 border-blue-100';
    }
  };

  // Week helpers: Monday to Sunday
  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekDays = (date: Date): Date[] => {
    const monday = getMondayOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };


  const getMonthDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    const days: Date[] = [];
    const current = new Date(startDate);
    while (current <= lastDay || days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
      if (days.length >= 42) break;
    }
    return days;
  };

  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTasksForDate = (dateKey: string): Task[] => {
    return allTasks.filter(t => t.dueDate === dateKey);
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = formatDateKey(date);
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = event.end ? new Date(event.end) : eventStart;
      
      // Check if event overlaps with the date
      return eventStart <= dateEnd && eventEnd >= dateStart;
    });
  };

  const formatDueDateDisplay = (ymd: string): string => {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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

  // Sync editCategoryIsNew when entering edit mode
  useEffect(() => {
    if (!isEditingTask) {
      setEditCategoryIsNew(false);
      return;
    }
    if (selectedTask?.category && !taskCategories.includes(selectedTask.category)) {
      setEditCategoryIsNew(true);
    } else if (editFormData.category && taskCategories.includes(editFormData.category)) {
      setEditCategoryIsNew(false);
    } else if (editFormData.category && !taskCategories.includes(editFormData.category)) {
      setEditCategoryIsNew(true);
    }
  }, [isEditingTask, editFormData.category, taskCategories]);

  // Fetch task categories when task detail is open
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
      
      setAllTasks(prev => prev.map(t => 
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
        projectId: editFormData.projectId || undefined,
        updatedAt: new Date().toISOString()
      });
      
      setIsEditingTask(false);
      showSuccess('Task updated successfully');
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

  const handleNoteTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewNoteText(text);
    setMentionCursorPosition(cursorPos);
    
    const textUpToCursor = text.substring(0, cursorPos);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const searchQuery = textUpToCursor.substring(lastAtSymbol + 1);
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
    
    return [...new Set(mentions)];
  };

  const renderNoteTextWithMentions = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    const mentionRegex = /@([A-Za-z0-9\s]+?)(?=\s|$|[.,!?])/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const mentionedName = match[1].trim();
      const user = users.find(u => u.name.toLowerCase() === mentionedName.toLowerCase());
      if (user) {
        parts.push(
          <span key={key++} className="font-bold text-indigo-600">@{mentionedName}</span>
        );
      } else {
        parts.push(`@${mentionedName}`);
      }
      lastIndex = mentionRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const handleAddNote = async () => {
    if (!selectedTask) return;
    
    if (!newNoteText.trim() && !noteImageFile) {
      showError('Please add a note or attach an image');
      return;
    }

    setIsAddingNote(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
      const note: TaskNote = {
        id: `note_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name || 'Unknown User',
        text: newNoteText.trim(),
        createdAt: new Date().toISOString()
      };

      if (noteImagePreview && noteImageFile) {
        note.imageUrl = noteImagePreview;
        note.imageName = noteImageFile.name;
        note.imageMimeType = noteImageFile.type;
      }

      const updatedNotes = [...(selectedTask.notes || []), note];
      await apiUpdateTask(selectedTask.id, { notes: updatedNotes });

      const mentionedUserIds = extractMentionedUsers(newNoteText);
      if (mentionedUserIds.length > 0) {
        for (const userId of mentionedUserIds) {
          try {
            await apiCreateNotification({
              userId,
              notificationType: 'task-mention',
              title: 'You were mentioned in a task',
              message: `${currentUser.name || 'Someone'} mentioned you in task: "${selectedTask.title}"`,
              link: `/?tab=tasks&task=${selectedTask.id}`
            });
          } catch (err) {
            console.error('Failed to send mention notification:', err);
          }
        }
      }

      setSelectedTask({ ...selectedTask, notes: updatedNotes });
      setAllTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, notes: updatedNotes } : t));
      setNewNoteText('');
      setNoteImagePreview('');
      setNoteImageFile(null);
      if (noteImageInputRef.current) noteImageInputRef.current.value = '';
      showSuccess('Note added successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedTask || !noteToDelete) return;

    try {
      setDeletingNoteId(noteToDelete);
      const updatedNotes = selectedTask.notes?.filter(note => note.id !== noteToDelete) || [];
      await apiUpdateTask(selectedTask.id, { notes: updatedNotes });
      setSelectedTask({ ...selectedTask, notes: updatedNotes });
      setAllTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, notes: updatedNotes } : t));
      showSuccess('Note deleted successfully');
      setNoteToDelete(null);
    } catch (err: any) {
      showError(err.message || 'Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  // Helper to render current view content
  const renderViewContent = () => {
    if (viewMode === 'daily') {
      return (
        <div className="p-8 pt-12 pb-12 relative min-h-[2000px] bg-white">
          {hours.map((hour) => {
            const hourTop = hour * 80 + 20; // Add 20px offset to prevent cutting off the first hour
            return (
              <div key={hour} className="absolute left-0 right-0 group" style={{ top: `${hourTop}px` }}>
                <span className="absolute left-4 top-0 -translate-y-1/2 text-[10px] font-black text-slate-300 w-16 text-right pr-6 uppercase tracking-widest">
                  {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </span>
                <div className="absolute left-24 top-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-200 transition-colors" />
                <div className="absolute left-24 top-0 right-8 h-px bg-slate-50" />
              </div>
            );
          })}
          
          {showEvents && events.map((event) => {
            const position = getEventPosition(event);
            return (
              <div
                key={event.id}
                className={`absolute left-28 right-8 p-4 rounded-3xl border shadow-sm transition-all hover:scale-[1.01] hover:shadow-xl group overflow-hidden bg-indigo-50 border-indigo-100`}
                style={{ top: `${position.top}px`, height: `${position.height}px` }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/20 group-hover:w-2 transition-all" />
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-black text-sm truncate text-indigo-900`}>{event.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Clock className="w-3 h-3 text-indigo-400" /> {formatTime(event.start)} - {formatTime(event.end)}
                      </span>
                    </div>
                  </div>
                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-400 hover:text-indigo-600 transition-all active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {!isLoadingEvents && ((showEvents && events.length === 0) || (!showEvents && (!showTasks || dailyTasks.length === 0))) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40">
              <CalendarIcon className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">No schedule entries for this day</p>
            </div>
          )}
        </div>
      );
    }

    if (viewMode === 'weekly') {
      const weekDays = getWeekDays(selectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return (
        <div className="p-6 bg-white">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
              <div key={day} className="text-center py-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const dayKey = formatDateKey(day);
              const dayTasks = showTasks ? getTasksForDate(dayKey) : [];
              const dayEvents = showEvents ? getEventsForDate(day) : [];
              
              // Show both tasks and events if both exist, up to 2 items total
              // Priority: show at least one of each type if both exist
              let visibleTasks: Task[] = [];
              let visibleEvents: CalendarEvent[] = [];
              
              if (showTasks && showEvents) {
                // Both enabled: try to show one of each, then fill remaining slots
                if (dayTasks.length > 0 && dayEvents.length > 0) {
                  // Show one task and one event
                  visibleTasks = dayTasks.slice(0, 1);
                  visibleEvents = dayEvents.slice(0, 1);
                } else if (dayTasks.length > 0) {
                  // Only tasks available
                  visibleTasks = dayTasks.slice(0, 2);
                } else if (dayEvents.length > 0) {
                  // Only events available
                  visibleEvents = dayEvents.slice(0, 2);
                }
              } else if (showTasks) {
                // Only tasks enabled
                visibleTasks = dayTasks.slice(0, 2);
              } else if (showEvents) {
                // Only events enabled
                visibleEvents = dayEvents.slice(0, 2);
              }
              
              const allItems = [...dayTasks, ...dayEvents];
              const isToday = day.toDateString() === today.toDateString();
              const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
              
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDate(new Date(day));
                    setViewMode('daily');
                  }}
                  className={`min-h-[120px] p-2 rounded-xl border-2 transition-all cursor-pointer ${
                    isToday 
                      ? 'bg-indigo-50 border-indigo-300' 
                      : isCurrentMonth
                      ? 'bg-white border-slate-100 hover:border-slate-200'
                      : 'bg-slate-50 border-slate-50'
                  }`}
                >
                  <div className={`text-xs font-black mb-2 ${isToday ? 'text-indigo-600' : isCurrentMonth ? 'text-slate-900' : 'text-slate-400'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1 max-h-[80px] overflow-y-auto">
                    {showTasks && visibleTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className={`p-1.5 rounded-lg text-[9px] font-bold cursor-pointer hover:opacity-80 transition-all truncate ${
                          task.priority === 'High' ? 'bg-red-100 text-red-700' :
                          task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {showEvents && visibleEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (event.htmlLink) {
                            window.open(event.htmlLink, '_blank');
                          }
                        }}
                        className="p-1.5 rounded-lg text-[9px] font-bold cursor-pointer hover:opacity-80 transition-all truncate bg-indigo-100 text-indigo-700"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {(visibleTasks.length + visibleEvents.length < allItems.length) && (
                      <div className="text-[9px] text-slate-400 font-bold px-1.5">
                        +{allItems.length - (visibleTasks.length + visibleEvents.length)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (viewMode === 'monthly') {
      const monthDays = getMonthDays(selectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      return (
        <div className="p-6 bg-white">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center py-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{day}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, idx) => {
              const dayKey = formatDateKey(day);
              const dayTasks = showTasks ? getTasksForDate(dayKey) : [];
              const dayEvents = showEvents ? getEventsForDate(day) : [];
              
              // Show both tasks and events if both exist, up to 2 items total for monthly view
              // This allows both to be visible even in the compact monthly view
              let visibleTasks: Task[] = [];
              let visibleEvents: CalendarEvent[] = [];
              
              if (showTasks && showEvents) {
                // Both enabled: show one of each if both exist, otherwise show what's available
                if (dayTasks.length > 0 && dayEvents.length > 0) {
                  // Show both: one task and one event
                  visibleTasks = dayTasks.slice(0, 1);
                  visibleEvents = dayEvents.slice(0, 1);
                } else if (dayTasks.length > 0) {
                  // Only tasks available
                  visibleTasks = dayTasks.slice(0, 1);
                } else if (dayEvents.length > 0) {
                  // Only events available
                  visibleEvents = dayEvents.slice(0, 1);
                }
              } else if (showTasks) {
                // Only tasks enabled
                visibleTasks = dayTasks.slice(0, 1);
              } else if (showEvents) {
                // Only events enabled
                visibleEvents = dayEvents.slice(0, 1);
              }
              
              const allItems = [...dayTasks, ...dayEvents];
              const isToday = day.toDateString() === today.toDateString();
              const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
              
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDate(new Date(day));
                    setViewMode('daily');
                  }}
                  className={`min-h-[100px] p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isToday 
                      ? 'bg-indigo-50 border-indigo-300' 
                      : isCurrentMonth
                      ? 'bg-white border-slate-100 hover:border-slate-200'
                      : 'bg-slate-50 border-slate-50'
                  }`}
                >
                  <div className={`text-[10px] font-black mb-1 ${isToday ? 'text-indigo-600' : isCurrentMonth ? 'text-slate-900' : 'text-slate-400'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5 max-h-[70px] overflow-y-auto">
                    {showTasks && visibleTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className={`p-1 rounded text-[8px] font-bold cursor-pointer hover:opacity-80 transition-all truncate ${
                          task.priority === 'High' ? 'bg-red-100 text-red-700' :
                          task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {showEvents && visibleEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (event.htmlLink) {
                            window.open(event.htmlLink, '_blank');
                          }
                        }}
                        className="p-1 rounded text-[8px] font-bold cursor-pointer hover:opacity-80 transition-all truncate bg-indigo-100 text-indigo-700"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {(visibleTasks.length + visibleEvents.length < allItems.length) && (
                      <div className="text-[8px] text-slate-400 font-bold px-1">
                        +{allItems.length - (visibleTasks.length + visibleEvents.length)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <div className="flex items-center gap-3 mt-1">
            {viewMode === 'monthly' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prev = new Date(selectedDate);
                    prev.setMonth(prev.getMonth() - 1);
                    setSelectedDate(prev);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="text-slate-500 text-sm font-medium min-w-[140px] text-center">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
                <button
                  onClick={() => {
                    const next = new Date(selectedDate);
                    next.setMonth(next.getMonth() + 1);
                    setSelectedDate(next);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : viewMode === 'weekly' ? (
              <p className="text-slate-500 text-sm font-medium">
                {(() => {
                  const weekDays = getWeekDays(selectedDate);
                  const start = weekDays[0];
                  const end = weekDays[6];
                  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                })()}
              </p>
            ) : (
              <p className="text-slate-500 text-sm font-medium">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
              <Clock className="w-3 h-3 text-indigo-600" />
              <span className="text-[10px] font-bold text-indigo-600 tracking-wide">{timezone}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Events & Tasks Toggle */}
          <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showEvents}
                  onChange={(e) => setShowEvents(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                  showEvents 
                    ? 'bg-indigo-600 border-indigo-600' 
                    : 'bg-white border-slate-300 group-hover:border-indigo-400'
                }`}>
                  {showEvents && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Events</span>
            </label>
            <div className="w-px h-4 bg-slate-200" />
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showTasks}
                  onChange={(e) => setShowTasks(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                  showTasks 
                    ? 'bg-indigo-600 border-indigo-600' 
                    : 'bg-white border-slate-300 group-hover:border-indigo-400'
                }`}>
                  {showTasks && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Tasks</span>
            </label>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  viewMode === mode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={goToPrevious}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className={`px-4 py-1.5 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all ${
                isToday() ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Today
            </button>
            <button 
              onClick={goToNext}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={onNewEvent}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</h3>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-[9px] font-bold text-slate-500 tracking-wide">{timezone}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoadingEvents && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${isGoogleConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                {isGoogleConnected ? 'Google Workspace Connected' : 'Google Disconnected'}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto relative bg-white">
            {viewMode === 'daily' && showTasks && dailyTasks.length > 0 && (
              <div className="px-6 py-6 bg-slate-50/50 border-b border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                   <CheckCircle2 className="w-3 h-3" /> Today's Deliverables
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dailyTasks.map(task => (
                    <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all flex items-start gap-3">
                      <div className="mt-1">
                        {task.status === 'Done' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {renderViewContent()}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <Sparkles className="w-8 h-8 text-indigo-400 mb-6" />
              <h3 className="text-2xl font-black mb-2 leading-tight">Unified Workspace</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 opacity-80">Synchronize your calendar, billing, and accounting software in one central hub.</p>
              
              <button
                onClick={() => onNavigate('integrations')}
                className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900 flex items-center justify-center gap-3"
              >
                Go to Integrations
              </button>
            </div>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
               <Info className="w-6 h-6" />
             </div>
             <div className="space-y-1">
               <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Workspace Statistics</p>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">No data collected for current period. Stats will populate as you add tasks and events.</p>
             </div>
          </div>
        </div>
      </div>

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
                  <CheckCircle2 className="w-8 h-8" />
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
                          category: selectedTask.category || '',
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
            <div className="p-8 border-t border-slate-100 bg-white flex gap-4 shrink-0">
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
                <p className="text-xs font-bold text-slate-900">{deleteConfirmTask.title}</p>
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirmTask(null)}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!deleteConfirmTask) return;
                  try {
                    await apiDeleteTask(deleteConfirmTask.id);
                    setAllTasks(prev => prev.filter(t => t.id !== deleteConfirmTask.id));
                    setDailyTasks(prev => prev.filter(t => t.id !== deleteConfirmTask.id));
                    setDeleteConfirmTask(null);
                    setSelectedTask(null);
                    showSuccess('Task deleted successfully');
                  } catch (err: any) {
                    showError(err.message || 'Failed to delete task');
                  }
                }}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
