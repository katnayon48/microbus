import React, { useEffect, useRef } from 'react';

const COLORS = [
  { r: 26, g: 26, b: 75 },   // Deep Indigo
  { r: 75, g: 0, b: 130 },  // Cosmic Violet
  { r: 0, g: 128, b: 128 },  // Mystical Teal
  { r: 80, g: 200, b: 120 }, // Aurora Emerald Green
];

class Blob {
  x: number;
  y: number;
  radius: number;
  colorObj: { r: number, g: number, b: number };
  targetColor: { r: number, g: number, b: number };
  vx: number;
  vy: number;
  canvasWidth: number;
  canvasHeight: number;
  colorCounter: number;

  constructor(width: number, height: number, colorIndex: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.radius = Math.random() * 400 + 300;
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.colorObj = { ...COLORS[colorIndex] };
    this.targetColor = { ...COLORS[(colorIndex + 1) % COLORS.length] };
    this.vx = (Math.random() - 0.5) * 24;
    this.vy = (Math.random() - 0.5) * 24;
    this.colorCounter = Math.random();
  }

  draw(ctx: CanvasRenderingContext2D) {
    const factor = (Math.sin(this.colorCounter) + 1) / 2;
    const r = Math.round(this.colorObj.r + (this.targetColor.r - this.colorObj.r) * factor);
    const g = Math.round(this.colorObj.g + (this.targetColor.g - this.colorObj.g) * factor);
    const b = Math.round(this.colorObj.b + (this.targetColor.b - this.colorObj.b) * factor);
    const colorStr = `rgba(${r}, ${g}, ${b}, 0.8)`;

    ctx.beginPath();
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, colorStr);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface CanvasBackgroundProps {
  speedFactor?: number;
}

const CanvasBackground: React.FC<CanvasBackgroundProps> = ({ speedFactor = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(speedFactor);

  // Update ref when prop changes to avoid re-running the heavy useEffect loop
  useEffect(() => {
    speedRef.current = speedFactor;
  }, [speedFactor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let blobs: Blob[] = [];

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initBlobs();
    };

    const initBlobs = () => {
      blobs = COLORS.map((_, index) => new Blob(canvas.width, canvas.height, index));
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Black background base
      ctx.fillStyle = '#020208';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'screen';
      blobs.forEach(blob => {
        // Adjust blob movement and color shifting by the current speedRef
        const currentSpeed = speedRef.current;
        
        blob.x += blob.vx * currentSpeed;
        blob.y += blob.vy * currentSpeed;

        if (blob.x < -blob.radius || blob.x > blob.canvasWidth + blob.radius) blob.vx *= -1;
        if (blob.y < -blob.radius || blob.y > blob.canvasHeight + blob.radius) blob.vy *= -1;

        // Color morphing logic scaled by speed
        blob.colorCounter += 0.045 * currentSpeed;
        
        if (blob.colorCounter > Math.PI * 2) {
          blob.colorCounter = 0;
          blob.colorObj = { ...blob.targetColor };
          blob.targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        }

        blob.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
      style={{ filter: 'blur(80px)' }}
    />
  );
};

export default CanvasBackground;
