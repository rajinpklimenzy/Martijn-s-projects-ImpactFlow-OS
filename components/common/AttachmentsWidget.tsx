/**
 * Phase 4: AttachmentsWidget Component
 * REQ-07 - Attachments widget for right sidebar
 */

import React from 'react';
import { Paperclip, FileText, Image, File, Download, X, Loader2 } from 'lucide-react';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size?: number;
  url?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

interface AttachmentsWidgetProps {
  attachments?: Attachment[];
  onDownload?: (attachment: Attachment) => void;
  onDelete?: (attachmentId: string) => void;
  onUpload?: () => void;
  maxItems?: number;
  isUploading?: boolean;
}

const AttachmentsWidget: React.FC<AttachmentsWidgetProps> = ({
  attachments = [],
  onDownload,
  onDelete,
  onUpload,
  maxItems = 5,
  isUploading = false
}) => {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type === 'application/pdf' || type.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const displayAttachments = attachments.slice(0, maxItems);
  const hasMore = attachments.length > maxItems;

  return (
    <div className="border-b border-slate-200 last:border-0">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Paperclip className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
          {attachments.length > 0 && (
            <span className="text-xs text-slate-500">({attachments.length})</span>
          )}
        </div>
        
        {attachments.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-slate-400 mb-3">No attachments</p>
            {onUpload && (
              <button
                onClick={onUpload}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload File'
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="text-slate-400">
                  {getFileIcon(attachment.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {attachment.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {attachment.size && (
                      <span className="text-xs text-slate-500">
                        {formatFileSize(attachment.size)}
                      </span>
                    )}
                    {attachment.uploadedAt && (
                      <span className="text-xs text-slate-400">
                        {new Date(attachment.uploadedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onDownload && (
                    <button
                      onClick={() => onDownload(attachment)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(attachment.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <p className="text-xs text-slate-400 text-center pt-2">
                +{attachments.length - maxItems} more
              </p>
            )}
            {onUpload && (
              <button
                onClick={onUpload}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 w-full mt-3 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload File'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttachmentsWidget;
