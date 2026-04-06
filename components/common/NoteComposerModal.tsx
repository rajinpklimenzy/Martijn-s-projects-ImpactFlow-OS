/**
 * Phase 5: NoteComposerModal Component
 * Modal for creating notes on contacts/companies
 */

import React, { useState, useRef } from 'react';
import { X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { apiUpdateContact, apiUpdateCompany } from '../../utils/api';
// Helper function to extract mentioned user IDs from text
// Note: This is a simplified version - full implementation would map usernames to user IDs
const extractMentionedUsers = (text: string): string[] => {
  if (!text) return [];
  const mentionRegex = /@(\w+)/g;
  const matches = Array.from(text.matchAll(mentionRegex));
  if (!matches || matches.length === 0) return [];
  // Extract usernames (without @) - in real implementation, would map to user IDs via user lookup
  return matches.map(m => m[1]);
};
import { apiCreateNotification } from '../../utils/api';
import { useUsers } from '../../hooks/useCRMData';
import { User as UserType } from '../../types';

interface NoteComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'contact' | 'company';
  entityId: string;
  entityName: string;
  onSuccess?: () => void;
}

const NoteComposerModal: React.FC<NoteComposerModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  onSuccess
}) => {
  const { showSuccess, showError } = useToast();
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteImagePreview, setNoteImagePreview] = useState<string>('');
  const [noteImageFile, setNoteImageFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { data: users = [] } = useUsers();

  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [filteredMentionUsers, setFilteredMentionUsers] = useState<UserType[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError('Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNoteImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setNoteImageFile(file);
    }
  };

  const handleNoteTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;

    setNoteText(text);
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
    const textUpToCursor = noteText.substring(0, mentionCursorPosition);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    const textAfterCursor = noteText.substring(mentionCursorPosition);

    const beforeMention = noteText.substring(0, lastAtSymbol);
    const newText = `${beforeMention}@${user.name} ${textAfterCursor}`;

    setNoteText(newText);
    setShowMentionDropdown(false);
  };

  const handleSubmit = async () => {
    if (!noteText.trim() && !noteImageFile) {
      showError('Please enter a note or attach an image');
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
      const newNote = {
        id: `note_${Date.now()}`,
        userId: currentUser.id || 'system',
        userName: currentUser.name || 'Unknown User',
        text: noteText.trim(),
        createdAt: new Date().toISOString(),
        ...(noteImagePreview && noteImageFile ? {
          imageUrl: noteImagePreview,
          imageName: noteImageFile.name,
          imageMimeType: noteImageFile.type
        } : {})
      };

      // Get current entity to append note
      let currentNotes: any[] = [];
      if (entityType === 'contact') {
        const { apiGetContact } = await import('../../utils/api');
        const entityResponse = await apiGetContact(entityId);
        const entity = entityResponse.data || entityResponse;
        currentNotes = entity.notes || [];
        const updatedNotes = [...currentNotes, newNote];
        await apiUpdateContact(entityId, { notes: updatedNotes });
      } else {
        const { apiGetCompany } = await import('../../utils/api');
        const entityResponse = await apiGetCompany(entityId);
        const entity = entityResponse.data || entityResponse;
        currentNotes = entity.notes || [];
        const updatedNotes = [...currentNotes, newNote];
        await apiUpdateCompany(entityId, { notes: updatedNotes });
      }

      // Send mention notifications
      const mentionedUserIds = extractMentionedUsers(noteText);
      for (const userId of mentionedUserIds) {
        try {
          await apiCreateNotification({
            userId,
            type: 'mention',
            title: `You were mentioned in a ${entityType} note`,
            message: `${currentUser.name || 'Someone'} mentioned you in ${entityName}`,
            relatedId: entityId,
            relatedType: entityType,
            read: false
          });
        } catch (err) {
          // console.error('Failed to send notification:', err);
        }
      }

      setNoteText('');
      setNoteImagePreview('');
      setNoteImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      
      showSuccess(mentionedUserIds.length > 0 
        ? `Note added and ${mentionedUserIds.length} user(s) notified`
        : 'Note added successfully');
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showError(err.message || 'Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-y-auto">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Add Note</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Note for {entityName}
                </label>
                <div className="relative">
                  <textarea
                    value={noteText}
                    onChange={handleNoteTextChange}
                    placeholder="Add a note... (Use @ to mention users)"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 min-h-[120px]"
                    rows={6}
                  />
                  {showMentionDropdown && filteredMentionUsers.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-10 text-sm">
                      {filteredMentionUsers.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleMentionSelect(user)}
                          className="w-full px-3 py-2 flex flex-col items-start hover:bg-indigo-50 text-left"
                        >
                          <span className="font-medium text-slate-900">{user.name}</span>
                          <span className="text-xs text-slate-500">{user.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {noteImagePreview && (
                <div className="relative">
                  <img 
                    src={noteImagePreview} 
                    alt="Preview" 
                    className="max-w-full max-h-64 rounded-lg border border-slate-200"
                  />
                  <button
                    onClick={() => {
                      setNoteImagePreview('');
                      setNoteImageFile(null);
                      if (imageInputRef.current) imageInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-slate-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <label className="cursor-pointer">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                <ImageIcon className="w-4 h-4" />
                Attach Image
              </span>
            </label>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (!noteText.trim() && !noteImageFile)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Add Note
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NoteComposerModal;
