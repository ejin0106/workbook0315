import React, { useRef, useEffect, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  isEraser?: boolean;
}

interface DrawingCanvasProps {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  activeTool: 'hand' | 'pen' | 'eraser';
  eraserWidth?: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  strokes,
  onStrokesChange,
  activeTool,
  eraserWidth = 20,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1200 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === canvas) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setCanvasSize({ width, height });
          }
        }
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all completed strokes
    strokes.forEach((stroke) => drawStroke(ctx, stroke));

    // Draw current stroke
    if (currentStroke) {
      drawStroke(ctx, currentStroke);
    }
  }, [strokes, currentStroke, canvasSize]);

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;
    
    ctx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over';
    ctx.beginPath();
    ctx.strokeStyle = stroke.isEraser ? 'rgba(0,0,0,1)' : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === 'hand') return;
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;

    setIsDrawing(true);
    setCurrentStroke({
      points: [point],
      color: '#000000', // Default black ink
      width: activeTool === 'eraser' ? eraserWidth : 3,
      isEraser: activeTool === 'eraser',
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentStroke || activeTool === 'hand') return;
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;

    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, point],
    });
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    onStrokesChange([...strokes, currentStroke]);
    setCurrentStroke(null);
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className={`absolute top-0 left-0 w-full h-full ${
        activeTool !== 'hand' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
      }`}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      onTouchCancel={stopDrawing}
    />
  );
};
