import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { ScannerReviewForm } from './ScannerReviewForm';
import { apiUploadBusinessCard, apiConfirmBusinessCard, apiGetCompanies, apiGetLeadSources } from '../../utils/api';
import { ExtractedData, Company, LeadSource, ScanSuggestions } from '../../types';
import { useToast } from '../../contexts/ToastContext';

type ScannerMode = 'select' | 'camera' | 'camera-loading' | 'upload' | 'processing' | 'review' | 'success';

interface BusinessCardScannerProps {
  onClose: () => void;
  onSuccess: () => void;
  currentUserId: string;
}

export const BusinessCardScanner: React.FC<BusinessCardScannerProps> = ({
  onClose,
  onSuccess,
  currentUserId
}) => {
  const { showSuccess, showError } = useToast();
  const [mode, setMode] = useState<ScannerMode>('select');
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [suggestions, setSuggestions] = useState<ScanSuggestions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load companies and lead sources
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [companiesRes, leadSourcesRes] = await Promise.all([
          apiGetCompanies(),
          apiGetLeadSources(true)
        ]);
        setCompanies(companiesRes.data || []);
        setLeadSources(leadSourcesRes.data || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, []);

  // Start camera
  const startCamera = async () => {
    console.log('Camera button clicked - starting camera...');
    setError(null);
    
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this browser');
      }
      
      setMode('camera-loading');
      
      // Request camera permission and stream
      // Try with rear camera first, fallback to any camera
      let stream;
      try {
        console.log('Requesting rear camera...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
      } catch (err) {
        console.log('Rear camera not available, trying any camera...');
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      
      console.log('Camera stream obtained:', stream);
      streamRef.current = stream;
      
      // Immediately switch to camera mode - video will render
      setMode('camera');
      
      // Wait for video element to be available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Stream set to video element');
        
        // Play the video
        try {
          await videoRef.current.play();
          console.log('✅ Camera started successfully');
        } catch (playErr) {
          console.error('Video play error:', playErr);
          // Video might autoplay anyway, so don't fail here
        }
      }
    } catch (err: any) {
      console.error('❌ Camera error:', err);
      let errorMessage = 'Camera access denied. Please grant camera permission or use file upload.';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device. Please use file upload instead.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported on this browser. Please use file upload.';
      }
      
      setError(errorMessage);
      setMode('select');
      stopCamera();
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `business-card-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedImage(file);
        setImagePreview(canvas.toDataURL('image/jpeg'));
        stopCamera();
        processImage(file);
      }
    }, 'image/jpeg', 0.95);
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
      setError('Invalid file type. Please upload JPG, PNG, or PDF.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setCapturedImage(file);
    
    // Create preview if image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    processImage(file);
  };

  // Process image (upload and OCR)
  const processImage = async (file: File) => {
    setMode('processing');
    setError(null);
    setIsProcessing(true);

    try {
      const response = await apiUploadBusinessCard(file, currentUserId);
      
      if (response.success) {
        setExtractedData(response.data.extractedData);
        setSuggestions(response.data.suggestions);
        setMode('review');
      } else {
        throw new Error('Failed to process business card');
      }
    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to process business card. Please try again.');
      setMode('select');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and create contact
  const handleConfirm = async (contactData: any, companyData: any, linkToExistingCompany: string | null) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Find business card scanner lead source
      const businessCardSource = leadSources.find(ls => ls.name === 'Business Card Scanner');
      
      const response = await apiConfirmBusinessCard({
        contactData,
        companyData,
        linkToExistingCompany,
        leadSourceId: businessCardSource?.id || '',
        scanConfidenceScore: calculateAverageConfidence(extractedData),
        originalScanData: extractedData,
        userId: currentUserId
      });

      if (response.success) {
        setMode('success');
        showSuccess('Contact created from business card!');
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        throw new Error('Failed to create contact');
      }
    } catch (err: any) {
      console.error('Confirm error:', err);
      setError(err.message || 'Failed to create contact. Please try again.');
      showError(err.message || 'Failed to create contact');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateAverageConfidence = (data: ExtractedData | null): number => {
    if (!data) return 0;
    
    const confidences = [
      data.name?.confidence || 0,
      data.email?.confidence || 0,
      data.phone?.confidence || 0,
      data.title?.confidence || 0,
      data.company?.confidence || 0
    ].filter(c => c > 0);
    
    if (confidences.length === 0) return 0;
    return Math.round(confidences.reduce((sum, c) => sum + c, 0) / confidences.length);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Mode: Select Input Method */}
        {mode === 'select' && (
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Scan Business Card</h2>
                <p className="text-sm text-gray-600 mt-1">Choose how to capture the business card</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Camera button clicked');
                  startCamera();
                }}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-center cursor-pointer"
                type="button"
              >
                <Camera className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-gray-900 mb-1">Use Camera</h3>
                <p className="text-sm text-gray-600">Take a photo of the card</p>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-gray-900 mb-1">Upload File</h3>
                <p className="text-sm text-gray-600">JPG, PNG, or PDF (10MB max)</p>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Mode: Camera Loading */}
        {mode === 'camera-loading' && (
          <div className="p-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Starting Camera...</h2>
            <p className="text-gray-600">Please allow camera access when prompted</p>
          </div>
        )}

        {/* Mode: Camera */}
        {mode === 'camera' && (
          <div className="relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto rounded-t-xl"
              style={{ minHeight: '400px' }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Camera positioning guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-4 border-white border-dashed rounded-xl opacity-50" 
                     style={{ width: '85%', height: '50%' }}>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                <p className="text-sm font-semibold">Center card in frame</p>
              </div>
            </div>
            
            <div className="absolute top-4 left-4">
              <button
                onClick={() => {
                  stopCamera();
                  setMode('select');
                }}
                className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <button
                onClick={capturePhoto}
                className="w-16 h-16 bg-white rounded-full border-4 border-blue-600 shadow-lg hover:bg-blue-50 transition-colors active:scale-95"
              >
                <Camera className="w-8 h-8 mx-auto text-blue-600" />
              </button>
            </div>
          </div>
        )}

        {/* Mode: Processing */}
        {mode === 'processing' && (
          <div className="p-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Business Card...</h2>
            <p className="text-gray-600">Extracting contact information</p>
            
            {imagePreview && (
              <div className="mt-6">
                <img src={imagePreview} alt="Captured" className="max-w-full max-h-40 mx-auto rounded-lg shadow-md" />
              </div>
            )}
          </div>
        )}

        {/* Mode: Review */}
        {mode === 'review' && extractedData && (
          <ScannerReviewForm
            extractedData={extractedData}
            suggestions={suggestions || { existingContact: null, existingCompany: null, createNewCompany: true }}
            source="business_card"
            onConfirm={handleConfirm}
            onCancel={onClose}
            isProcessing={isProcessing}
            companies={companies}
          />
        )}

        {/* Mode: Success */}
        {mode === 'success' && (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Created!</h2>
            <p className="text-gray-600">The contact has been successfully added to your CRM</p>
          </div>
        )}
      </div>
    </div>
  );
};
