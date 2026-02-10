import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

// Quill editor modules configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'image'],
    ['clean']
  ],
};

// Quill editor formats configuration
const quillFormats = [
  'header',
  'bold', 'italic', 'underline',
  'list', 'bullet',
  'link', 'image'
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

/**
 * RichTextEditor Component
 * A reusable rich text editor component using Quill
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Enter text...',
  readOnly = false,
  className = ''
}) => {
  return (
    <div className={className}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={readOnly ? { toolbar: false } : quillModules}
        formats={quillFormats}
        readOnly={readOnly}
        placeholder={placeholder}
      />
    </div>
  );
};

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

/**
 * RichTextDisplay Component
 * Safely renders HTML content with DOMPurify sanitization
 */
export const RichTextDisplay: React.FC<RichTextDisplayProps> = ({ 
  content, 
  className = '' 
}) => {
  if (!content || content.trim() === '') {
    return null;
  }

  // Sanitize HTML content to prevent XSS attacks
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'img', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
