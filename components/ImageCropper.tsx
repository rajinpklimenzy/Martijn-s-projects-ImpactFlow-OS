import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
  circularCrop?: boolean;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCrop,
  onCancel,
  aspectRatio = 1,
  circularCrop = true
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.5); // Start at 50% to allow zooming out
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cropSizeRef = useRef(300); // Default crop size

  // Calculate crop area based on current position and zoom
  const getCropArea = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return null;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const cropSize = cropSizeRef.current;
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    const imageRect = imageRef.current.getBoundingClientRect();
    const imageLeft = imageRect.left - containerRect.left;
    const imageTop = imageRect.top - containerRect.top;

    // Calculate crop area in image coordinates
    // Account for zoom and crop position
    const cropX = (centerX - cropSize / 2 - imageLeft - crop.x) / zoom;
    const cropY = (centerY - cropSize / 2 - imageTop - crop.y) / zoom;

    // Calculate actual crop size accounting for zoom
    const actualCropSize = cropSize / zoom;

    return {
      x: Math.max(0, cropX * (imageRef.current.naturalWidth / imageRef.current.width)),
      y: Math.max(0, cropY * (imageRef.current.naturalHeight / imageRef.current.height)),
      width: Math.min(imageRef.current.naturalWidth, actualCropSize * (imageRef.current.naturalWidth / imageRef.current.width)),
      height: Math.min(imageRef.current.naturalHeight, actualCropSize * (imageRef.current.naturalHeight / imageRef.current.height))
    };
  }, [crop, zoom]);

  const getCroppedImg = useCallback(async () => {
    if (!imageRef.current) return;

    setIsProcessing(true);
    try {
      const cropArea = getCropArea();
      if (!cropArea) {
        throw new Error('Failed to calculate crop area');
      }

      const image = imageRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }

      const size = Math.min(cropArea.width, cropArea.height);
      canvas.width = size;
      canvas.height = size;

      if (circularCrop) {
        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.clip();
      }

      ctx.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        size,
        size
      );

      // Convert to base64
      const croppedImage = canvas.toDataURL('image/jpeg', 0.9);
      onCrop(croppedImage);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [getCropArea, circularCrop, onCrop]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
  }, [crop]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current || !imageRef.current) return;

    const container = containerRef.current;
    const image = imageRef.current;
    const containerRect = container.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Calculate max movement based on zoom and image size
    // When zoomed out (< 1), allow more movement; when zoomed in (> 1), restrict movement
    const scaledImageWidth = imageRect.width * zoom;
    const scaledImageHeight = imageRect.height * zoom;
    
    const maxX = Math.max(0, (scaledImageWidth - containerRect.width) / 2);
    const maxY = Math.max(0, (scaledImageHeight - containerRect.height) / 2);

    // When zoomed out, allow free movement; when zoomed in, restrict to bounds
    if (zoom <= 1) {
      // Allow free movement when zoomed out
      setCrop({ x: newX, y: newY });
    } else {
      // Restrict movement when zoomed in
      setCrop({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      cropSizeRef.current = Math.min(containerRect.width * 0.8, containerRect.height * 0.8, 300);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-black text-xl text-slate-900">Crop Your Photo</h3>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="p-6">
          <div
            ref={containerRef}
            className="relative w-full h-[400px] bg-slate-100 rounded-xl overflow-hidden"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop"
              className="absolute top-1/2 left-1/2 select-none"
              style={{
                transform: `translate(-50%, -50%) scale(${zoom}) translate(${crop.x / zoom}px, ${crop.y / zoom}px)`,
                maxWidth: 'none',
                maxHeight: 'none',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
              onLoad={() => {
                setImageLoaded(true);
                if (containerRef.current && imageRef.current) {
                  const container = containerRef.current;
                  const containerRect = container.getBoundingClientRect();
                  cropSizeRef.current = Math.min(containerRect.width * 0.8, containerRect.height * 0.8, 300);
                }
              }}
              draggable={false}
            />
            
            {/* Crop Overlay */}
            <div 
              className="absolute inset-0 pointer-events-none"
              onMouseDown={handleMouseDown}
              style={{ pointerEvents: isProcessing ? 'none' : 'auto', cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <div
                className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg ${
                  circularCrop ? 'rounded-full' : 'rounded-lg'
                }`}
                style={{
                  width: `${cropSizeRef.current}px`,
                  height: `${cropSizeRef.current}px`,
                  aspectRatio: aspectRatio.toString()
                }}
              />
              <div 
                className="absolute inset-0 bg-slate-900/50"
                style={{
                  clipPath: circularCrop 
                    ? `circle(${cropSizeRef.current / 2}px at 50% 50%)` 
                    : `inset(calc(50% - ${cropSizeRef.current / 2}px))`
                }}
              />
            </div>
          </div>

          {/* Zoom Control */}
          <div className="mt-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Zoom: {Math.round(zoom * 100)}%
            </label>
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => {
                const newZoom = parseFloat(e.target.value);
                setZoom(newZoom);
                // Reset crop position when zooming to prevent image going out of bounds
                if (newZoom < 1) {
                  setCrop({ x: 0, y: 0 });
                }
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              disabled={isProcessing}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>30%</span>
              <span>300%</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={getCroppedImg}
            disabled={isProcessing || !imageLoaded}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Apply Crop
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
