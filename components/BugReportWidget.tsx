
import React, { useState, useRef, useEffect } from 'react';
import { Bug, Send, X, Sparkles, MessageSquare, Lightbulb, Loader2, CheckCircle2, Image as ImageIcon, Video, Trash2, Upload, Link as LinkIcon } from 'lucide-react';
import { apiCreateFeedback } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const BugReportWidget: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [allowTransition, setAllowTransition] = useState(false);

  // Prevent widget panel from "sliding in from wrong position" on first load (Tailwind delay)
  useEffect(() => {
    const t = setTimeout(() => setAllowTransition(true), 500);
    return () => clearTimeout(t);
  }, []);
  
  const [formData, setFormData] = useState({
    type: 'bug' as 'bug' | 'feature' | 'idea',
    title: '',
    description: ''
  });
  const [attachments, setAttachments] = useState<Array<{ file?: File; url?: string; preview: string; type: 'image' | 'video'; source: 'file' | 'url' }>>([]);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  const [attachmentMode, setAttachmentMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef(attachments);

  // Keep ref in sync with state
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(att => {
        if (att.source === 'file' && att.type === 'video' && att.preview.startsWith('blob:')) {
          URL.revokeObjectURL(att.preview);
        }
      });
    };
  }, []);

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

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingAttachment(true);
    try {
        const newAttachments: Array<{ file: File; preview: string; type: 'image' | 'video'; source: 'file' }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          showError('Please select only image or video files');
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          showError(`File "${file.name}" is too large. Maximum size is 10MB`);
          continue;
        }

        const isImage = file.type.startsWith('image/');
        let preview = '';

        if (isImage) {
          // Compress image
          preview = await compressImage(file, 1920, 1080, 0.8);
        } else {
          // For video, create preview URL
          preview = URL.createObjectURL(file);
        }

        newAttachments.push({
          file,
          preview,
          type: isImage ? 'image' : 'video',
          source: 'file'
        });
      }

      setAttachments(prev => [...prev, ...newAttachments]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      showError(err.message || 'Failed to process file');
    } finally {
      setIsProcessingAttachment(false);
    }
  };

  // Validate URL
  const isValidImageOrVideoUrl = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const video = document.createElement('video');
      
      // Check if URL ends with common image/video extensions
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
      const urlLower = url.toLowerCase();
      
      const isImageUrl = imageExtensions.some(ext => urlLower.includes(ext)) || 
                        urlLower.includes('image') ||
                        urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
      const isVideoUrl = videoExtensions.some(ext => urlLower.includes(ext)) || 
                        urlLower.includes('video') ||
                        urlLower.match(/\.(mp4|mov|avi|webm|mkv)(\?|$)/i);
      
      if (!isImageUrl && !isVideoUrl) {
        // Try to load as image first
        img.onload = () => resolve(true);
        img.onerror = () => {
          // Try as video
          video.onloadedmetadata = () => resolve(true);
          video.onerror = () => resolve(false);
          video.src = url;
        };
        img.src = url;
      } else {
        resolve(true);
      }
    });
  };

  // Handle URL addition
  const handleAddUrl = async () => {
    if (!urlInput.trim()) {
      showError('Please enter a valid URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput.trim());
    } catch {
      showError('Please enter a valid URL');
      return;
    }

    setIsValidatingUrl(true);
    try {
      const isValid = await isValidImageOrVideoUrl(urlInput.trim());
      if (!isValid) {
        showError('URL does not appear to be a valid image or video');
        return;
      }

      // Determine type based on URL
      const urlLower = urlInput.toLowerCase();
      const isImage = urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i) || 
                     urlLower.includes('image') ||
                     (!urlLower.match(/\.(mp4|mov|avi|webm|mkv)(\?|$)/i) && !urlLower.includes('video'));

      const newAttachment = {
        url: urlInput.trim(),
        preview: urlInput.trim(),
        type: (isImage ? 'image' : 'video') as 'image' | 'video',
        source: 'url' as const
      };

      setAttachments(prev => [...prev, newAttachment]);
      setUrlInput('');
      showSuccess('URL added successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to validate URL');
    } finally {
      setIsValidatingUrl(false);
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    const attachment = attachments[index];
    // Revoke object URL if it's a video file
    if (attachment.source === 'file' && attachment.type === 'video' && attachment.preview.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    setIsSubmitting(true);
    try {
      // Separate URLs from file attachments
      const urlAttachments = attachments.filter(att => att.source === 'url');
      const fileAttachments = attachments.filter(att => att.source === 'file');
      
      // Get the first URL (we'll store it in the url field)
      const feedbackUrl = urlAttachments.length > 0 ? urlAttachments[0].url : '';

      // Convert file attachments to base64
      const attachmentData = await Promise.all(
        fileAttachments.map(async (attachment) => {
          // File attachment - convert to base64
          if (attachment.type === 'image') {
            return {
              type: 'image',
              data: attachment.preview, // Already base64
              filename: attachment.file!.name,
              mimeType: attachment.file!.type,
              source: 'file'
            };
          } else {
            // Convert video to base64
            return new Promise<{ type: string; data: string; filename: string; mimeType: string; source: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve({
                  type: 'video',
                  data: reader.result as string,
                  filename: attachment.file!.name,
                  mimeType: attachment.file!.type,
                  source: 'file'
                });
              };
              reader.onerror = reject;
              reader.readAsDataURL(attachment.file!);
            });
          }
        })
      );

      const payload = {
        ...formData,
        userId: currentUser?.id || 'anonymous',
        status: 'planned',
        url: feedbackUrl || undefined, // Store URL in separate field
        attachments: attachmentData.length > 0 ? attachmentData : [] // Only file attachments
      };
      
      await apiCreateFeedback(payload);
      
      setIsSuccess(true);
      showSuccess('Integrated into Roadmap');
      
      // Dispatch event to refresh roadmap
      window.dispatchEvent(new Event('refresh-roadmap'));
      
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
        setFormData({ type: 'bug', title: '', description: '' });
        // Clean up object URLs
        attachments.forEach(att => {
          if (att.type === 'video' && att.preview.startsWith('blob:')) {
            URL.revokeObjectURL(att.preview);
          }
        });
        setAttachments([]);
      }, 2000);
    } catch (err: any) {
      console.error('[FEEDBACK] Submission failed:', err);
      showError(`Submission error: ${err.message || 'Registry error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] flex items-center pointer-events-none">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto h-32 w-10 bg-slate-900 text-white flex flex-col items-center justify-center rounded-l-2xl shadow-2xl hover:w-12 group border-l border-y border-white/10 ${allowTransition ? 'transition-all duration-300' : ''} ${isOpen ? 'translate-x-full' : ''}`}
      >
        <span className="[writing-mode:vertical-lr] text-[11px] font-black uppercase tracking-[0.3em] rotate-180">Feedback</span>
      </button>

      <div
        className={`pointer-events-auto fixed right-0 top-1/2 -translate-y-1/2 w-[90vw] sm:w-80 bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.15)] rounded-l-[32px] border-l border-slate-100 transform overflow-hidden ${allowTransition ? 'transition-all duration-500 ease-out' : ''} ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={!allowTransition ? { transform: isOpen ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(100%)' } : undefined}
      >
        {isSuccess ? (
          <div className="p-10 text-center animate-in zoom-in-95 duration-300">
             <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
             </div>
             <h3 className="text-xl font-black text-slate-900 mb-2">Submitted</h3>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Entry Stored Successfully</p>
          </div>
        ) : (
          <div className="flex flex-col h-full max-h-[80vh]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-600 rounded-xl text-white">
                   <MessageSquare className="w-4 h-4" />
                 </div>
                 <div>
                   <h3 className="text-sm font-black text-slate-900">Feedback Hub</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">Community Input</p>
                 </div>
               </div>
               <button 
                 onClick={() => {
                   setIsOpen(false);
                  // Clean up attachments when closing
                  attachments.forEach(att => {
                    if (att.source === 'file' && att.type === 'video' && att.preview.startsWith('blob:')) {
                      URL.revokeObjectURL(att.preview);
                    }
                  });
                  setAttachments([]);
                  setUrlInput('');
                 }} 
                 className="p-2 hover:bg-white rounded-full text-slate-400 transition-all"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Classification</label>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  {[
                    { id: 'bug', icon: <Bug className="w-3 h-3" />, label: 'Bug' },
                    { id: 'feature', icon: <Sparkles className="w-3 h-3" />, label: 'Feature' },
                    { id: 'idea', icon: <Lightbulb className="w-3 h-3" />, label: 'Idea' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFormData({...formData, type: tab.id as any})}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${formData.type === tab.id ? 'bg-white text-indigo-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Title</label>
                <input 
                  required
                  type="text"
                  placeholder="Summary..."
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Context</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Provide details..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[20px] text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 resize-none"
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Attachments (Screenshots/Videos)</label>
                
                {/* Mode Toggle */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAttachmentMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                      attachmentMode === 'upload'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentMode('url')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                      attachmentMode === 'url'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    URL
                  </button>
                </div>

                {/* File Upload Mode */}
                {attachmentMode === 'upload' && (
                  <label className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      {isProcessingAttachment ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900">Add Screenshot or Video</p>
                      <p className="text-[10px] text-slate-400">PNG, JPG, MP4, MOV (Max 10MB)</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileSelect}
                      disabled={isProcessingAttachment}
                      className="hidden"
                    />
                  </label>
                )}

                {/* URL Input Mode */}
                {attachmentMode === 'url' && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/image.png or video.mp4"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !isValidatingUrl && urlInput.trim()) {
                          e.preventDefault();
                          handleAddUrl();
                        }
                      }}
                      disabled={isValidatingUrl}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      disabled={isValidatingUrl || !urlInput.trim()}
                      className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[80px]"
                    >
                      {isValidatingUrl ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="hidden sm:inline">Adding...</span>
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-4 h-4" />
                          <span className="hidden sm:inline">Add</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="relative group p-2 bg-slate-50 rounded-xl border border-slate-200">
                        {attachment.type === 'image' ? (
                          <div className="flex items-center gap-3">
                            <img 
                              src={attachment.preview} 
                              alt={`Attachment ${index + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                              onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23e0e7ff" width="64" height="64"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%234f46e5" font-size="24"%3E%3F%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <ImageIcon className="w-4 h-4 text-indigo-600" />
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {attachment.source === 'file' ? attachment.file!.name : 'Image URL'}
                                </p>
                                {attachment.source === 'url' && (
                                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-bold rounded">URL</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">
                                {attachment.source === 'file' 
                                  ? `${(attachment.file!.size / 1024).toFixed(1)} KB`
                                  : attachment.url
                                }
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <Video className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Video className="w-4 h-4 text-indigo-600" />
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {attachment.source === 'file' ? attachment.file!.name : 'Video URL'}
                                </p>
                                {attachment.source === 'url' && (
                                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-bold rounded">URL</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">
                                {attachment.source === 'file' 
                                  ? `${(attachment.file!.size / (1024 * 1024)).toFixed(2)} MB`
                                  : attachment.url
                                }
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={isSubmitting || isProcessingAttachment || isValidatingUrl}
                className="w-full py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Feedback
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default BugReportWidget;
