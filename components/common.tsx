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

  // Get first letter and color
  const firstLetter = useMemo(() => {
    if (fallbackText) {
      // Extract first letter, handling special cases
      const match = fallbackText.trim().match(/[a-zA-Z0-9]/);
      return match ? match[0].toUpperCase() : '?';
    }
    return alt ? alt.trim().charAt(0).toUpperCase() || '?' : '?';
  }, [fallbackText, alt]);

  const colorScheme = useMemo(() => getColorForLetter(firstLetter), [firstLetter]);

  // Calculate font size based on container size (approximate)
  const getFontSize = () => {
    // Try to extract size from className or use default
    if (className?.includes('w-6') || className?.includes('h-6')) return 'text-xs';
    if (className?.includes('w-8') || className?.includes('h-8')) return 'text-sm';
    if (className?.includes('w-10') || className?.includes('h-10')) return 'text-base';
    if (className?.includes('w-12') || className?.includes('h-12')) return 'text-lg';
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
