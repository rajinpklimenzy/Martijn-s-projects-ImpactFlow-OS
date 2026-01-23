
import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

export const ImageWithFallback: React.FC<{
        src?: string;
        alt?: string;
        className?: string;
        fallbackText?: string;
        isAvatar?: boolean;
}> = ({ src, alt, className, fallbackText, isAvatar }) => {
        const [error, setError] = useState(!src);

        if (error) {
                return (
                        <div className={`${className} bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase text-[10px] overflow-hidden`}>
                                {isAvatar ? (
                                        <img
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackText || 'U')}&background=f1f5f9&color=64748b&bold=true`}
                                                className="w-full h-full"
                                                alt={alt}
                                        />
                                ) : (
                                        <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100">
                                                <Building2 className="w-1/2 h-1/2 opacity-30" />
                                                <span className="text-[8px] mt-0.5">{fallbackText?.substring(0, 3)}</span>
                                        </div>
                                )}
                        </div>
                );
        }

        return (
                <img
                        src={src}
                        alt={alt}
                        className={className}
                        onError={() => setError(true)}
                />
        );
};
