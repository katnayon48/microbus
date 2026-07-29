import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface SignaturePadProps {
  onClear?: () => void;
  initialImage?: string;
}

export interface SignaturePadHandle {
  clear: () => void;
  getSignatureData: () => string | null;
  isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(({ onClear, initialImage }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      
      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return; // Wait until visible

          canvas.width = rect.width;
          canvas.height = rect.height;
          
          if (ctx) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Clear canvas first
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setIsEmpty(true);
            
            // If there's an initial image, draw it after resize
            if (initialImage) {
              const img = new Image();
              img.crossOrigin = "anonymous"; // Added for safety
              img.onload = () => {
                ctx.drawImage(img, 0, 0);
                setIsEmpty(false);
              };
              img.src = initialImage;
            }
          }
        }
      };
      
      resizeCanvas();
      
      // Use ResizeObserver for more reliable size updates
      const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
      });
      if (canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
      }

      window.addEventListener('resize', resizeCanvas);
      return () => {
        window.removeEventListener('resize', resizeCanvas);
        resizeObserver.disconnect();
      };
    }
  }, [initialImage]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        if (onClear) onClear();
      }
    },
    getSignatureData: () => {
      if (isEmpty) return null;
      return canvasRef.current?.toDataURL('image/png') || null;
    },
    isEmpty: () => isEmpty
  }));

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent scrolling when drawing on touch devices
    if (e.type === 'touchstart') {
      // e.preventDefault(); // Handled by touch-none class usually, but let's be safe
    }
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const { x, y } = getCoordinates(e, canvas);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const { x, y } = getCoordinates(e, canvas);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (isEmpty) setIsEmpty(false);
    }
  };

  const endDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  return (
    <div className="w-full space-y-2">
      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden touch-none relative h-36 shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="w-full h-full cursor-crosshair"
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-[10px] uppercase tracking-[0.3em] font-black opacity-40">Digital Signature</span>
          </div>
        )}
      </div>
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
