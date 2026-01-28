import React, { useState, useMemo } from 'react';

// Generate a color based on the first letter for consistent coloring
const getColorForLetter = (letter: string): { bg: string; text: string } => {
  const charCode = letter.toUpperCase().charCodeAt(0);
  const colors = [
    { bg: 'bg-indigo-500', text: 'text-white' },
    { bg: 'bg-emerald-500', text: 'text-white' },
    { bg: 'bg-amber-500', text: 'text-white' },
    { bg: 'bg-rose-500', text: 'text-white' },
    { bg: 'bg-blue-500', text: 'text-white' },
    { bg: 'bg-purple-500', text: 'text-white' },
    { bg: 'bg-pink-500', text: 'text-white' },
    { bg: 'bg-cyan-500', text: 'text-white' },
    { bg: 'bg-orange-500', text: 'text-white' },
    { bg: 'bg-teal-500', text: 'text-white' },
    { bg: 'bg-lime-500', text: 'text-white' },
    { bg: 'bg-violet-500', text: 'text-white' },
    { bg: 'bg-fuchsia-500', text: 'text-white' },
    { bg: 'bg-sky-500', text: 'text-white' },
    { bg: 'bg-red-500', text: 'text-white' },
    { bg: 'bg-green-500', text: 'text-white' },
  ];
  return colors[charCode % colors.length];
};

export const ImageWithFallback: React.FC<{
  src?: string;
  alt?: string;
  className?: string;
  fallbackText?: string;
  isAvatar?: boolean;
}> = ({ src, alt, className, fallbackText, isAvatar }) => {
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get initials based on text
  // For companies (isAvatar=false): Use first letter if one word, first letters of first two words if multiple words
  // For avatars (isAvatar=true): Use first letter only
  const firstLetter = useMemo(() => {
    const text = fallbackText || alt || '';
    const trimmed = text.trim();
    
    if (!trimmed) return '?';
    
    // For company logos (isAvatar=false), extract initials from words
    if (!isAvatar) {
      const words = trimmed.split(/\s+/).filter(word => word.length > 0);
      
      if (words.length === 0) return '?';
      
      if (words.length === 1) {
        // Single word: use first letter
        const match = words[0].match(/[a-zA-Z0-9]/);
        return match ? match[0].toUpperCase() : '?';
      } else {
        // Multiple words: use first letters of first two words
        const firstWordMatch = words[0].match(/[a-zA-Z0-9]/);
        const secondWordMatch = words[1].match(/[a-zA-Z0-9]/);
        const first = firstWordMatch ? firstWordMatch[0].toUpperCase() : '';
        const second = secondWordMatch ? secondWordMatch[0].toUpperCase() : '';
        return first && second ? `${first}${second}` : first || '?';
      }
    } else {
      // For avatars, use first letter only
      const match = trimmed.match(/[a-zA-Z0-9]/);
      return match ? match[0].toUpperCase() : '?';
    }
  }, [fallbackText, alt, isAvatar]);

  const colorScheme = useMemo(() => getColorForLetter(firstLetter), [firstLetter]);

  // Calculate font size based on container size (approximate)
  const getFontSize = () => {
    // Try to extract size from className or use default
    if (className?.includes('w-5') || className?.includes('h-5')) return 'text-[10px]';
    if (className?.includes('w-6') || className?.includes('h-6')) return 'text-xs';
    if (className?.includes('w-8') || className?.includes('h-8')) return 'text-sm';
    if (className?.includes('w-10') || className?.includes('h-10')) return 'text-base';
    if (className?.includes('w-12') || className?.includes('h-12')) return 'text-lg';
    if (className?.includes('w-14') || className?.includes('h-14')) return 'text-lg';
    if (className?.includes('w-16') || className?.includes('h-16')) return 'text-xl';
    if (className?.includes('w-20') || className?.includes('h-20')) return 'text-2xl';
    if (className?.includes('w-24') || className?.includes('h-24')) return 'text-3xl';
    return 'text-base';
  };

  // Determine rounded class based on isAvatar and existing className
  const getRoundedClass = () => {
    if (isAvatar) return 'rounded-full';
    if (className?.includes('rounded-3xl')) return 'rounded-3xl';
    if (className?.includes('rounded-xl')) return 'rounded-xl';
    if (className?.includes('rounded-lg')) return 'rounded-lg';
    if (className?.includes('rounded-md')) return 'rounded-md';
    if (className?.includes('rounded-sm')) return 'rounded-sm';
    return 'rounded-lg';
  };

  const roundedClass = getRoundedClass();

  // Clean className to remove conflicting rounded classes
  const cleanClassName = (className || '')
    .replace(/\brounded-(full|3xl|xl|lg|md|sm)\b/g, '')
    .trim();

  // For company logos (isAvatar=false), always show initials instead of logo
  // For avatars (isAvatar=true), show logo if available, initials as fallback
  if (!isAvatar) {
    // Always show initials for companies
    const baseClasses = `${cleanClassName} ${roundedClass} ${colorScheme.bg} ${colorScheme.text} flex items-center justify-center font-bold overflow-hidden select-none object-cover`;
    
    return (
      <div className={baseClasses}>
        <span className={getFontSize()}>{firstLetter}</span>
      </div>
    );
  }

  // For avatars, show logo if available, initials as fallback
  // Show fallback if no src or error occurred
  if (!src || error) {
    const baseClasses = `${cleanClassName} ${roundedClass} ${colorScheme.bg} ${colorScheme.text} flex items-center justify-center font-bold overflow-hidden select-none object-cover`;
    
    return (
      <div className={baseClasses}>
        <span className={getFontSize()}>{firstLetter}</span>
      </div>
    );
  }

  // Show fallback while loading, then show image once loaded
  return (
    <>
      {!imageLoaded && (
        <div className={`${cleanClassName} ${roundedClass} ${colorScheme.bg} ${colorScheme.text} flex items-center justify-center font-bold overflow-hidden select-none object-cover`}>
          <span className={getFontSize()}>{firstLetter}</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${cleanClassName} ${roundedClass} object-cover`}
        onError={() => setError(true)}
        onLoad={() => setImageLoaded(true)}
        style={{ display: imageLoaded ? 'block' : 'none' }}
      />
    </>
  );
};
