import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { PenTool, Hand, CheckCircle, ArrowLeft, Loader2, Sparkles, Printer, Eraser, Trash2 } from 'lucide-react';
import { subscribeToWorkbooks, updatePage, addGeneratedPageToWorkbook } from '../store';
import { PageStatus, WorkbookPage, Workbook } from '../types';
import { OCRService, LLMService } from '../services/MockServices';
import { DrawingCanvas, Stroke } from './DrawingCanvas';

export const InteractiveCanvasView: React.FC = () => {
  const { workbookId, pageId } = useParams<{ workbookId: string; pageId: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<WorkbookPage | null>(null);
  const [activeTool, setActiveTool] = useState<'hand' | 'pen' | 'eraser'>('pen');
  const [eraserWidth, setEraserWidth] = useState(20);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isGrading, setIsGrading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToWorkbooks((workbooks: Workbook[]) => {
      const workbook = workbooks.find((w) => w.id === workbookId);
      if (workbook) {
        const foundPage = workbook.pages?.find((p) => p.id === pageId);
        if (foundPage) {
          setPage(foundPage);
          setStrokes(foundPage.drawingData || []);
          if (foundPage.status === PageStatus.Scanning) {
            processImage(foundPage);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [workbookId, pageId]);

  const processImage = async (currentPage: WorkbookPage) => {
    try {
      const { title, markdown } = await OCRService.processImage(currentPage.originalImageUri || '');
      const updatedPage = {
        ...currentPage,
        title: title !== 'Untitled Page' ? title : currentPage.title,
        parsedMarkdown: markdown,
        status: PageStatus.Parsed,
      };
      setPage(updatedPage);
      updatePage(workbookId!, updatedPage);
    } catch (error) {
      console.error('OCR failed', error);
    }
  };

  const handleGrade = async () => {
    if (!page) return;
    setIsGrading(true);
    try {
      const feedback = await LLMService.gradeAnswer(page.parsedMarkdown || '', strokes);
      const updatedPage = {
        ...page,
        status: PageStatus.Graded,
        gradingFeedback: feedback,
        drawingData: strokes,
      };
      setPage(updatedPage);
      updatePage(workbookId!, updatedPage);
    } catch (error) {
      console.error('Grading failed', error);
    } finally {
      setIsGrading(false);
    }
  };

  const handleStrokesChange = (newStrokes: Stroke[]) => {
    setStrokes(newStrokes);
    if (page) {
      updatePage(workbookId!, { ...page, drawingData: newStrokes });
    }
  };

  const handleGenerateSimilar = async () => {
    if (!page || !page.parsedMarkdown || !page.gradingFeedback) return;
    setIsGenerating(true);
    const newQuestions = await LLMService.generateSimilarQuestions(page.parsedMarkdown, page.gradingFeedback);
    const newPage = await addGeneratedPageToWorkbook(workbookId!, newQuestions);
    setIsGenerating(false);
    navigate(`/workbook/${workbookId}/page/${newPage.id}`);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all drawings?')) {
      handleStrokesChange([]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!page) return <div className="p-8">Loading page...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100 print:bg-white print:h-auto">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white shadow-sm z-10 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">
            {page.status === PageStatus.Scanning ? 'Scanning Document...' : page.title || 'Interactive Canvas'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
            title="Print Page"
          >
            <Printer className="w-5 h-5" />
          </button>

          {/* Tool Picker (Hand vs Pen vs Eraser) */}
          <div className="flex bg-gray-100 rounded-lg p-1 items-center">
            <button
              onClick={() => setActiveTool('hand')}
              className={`p-2 rounded-md transition-colors ${
                activeTool === 'hand' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Scroll/Pan (Hand)"
            >
              <Hand className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTool('pen')}
              className={`p-2 rounded-md transition-colors ${
                activeTool === 'pen' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Draw (Pencil)"
            >
              <PenTool className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              className={`p-2 rounded-md transition-colors ${
                activeTool === 'eraser' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Eraser"
            >
              <Eraser className="w-5 h-5" />
            </button>
            
            {/* Eraser Size Slider */}
            {activeTool === 'eraser' && (
              <div className="flex items-center gap-2 ml-2 px-2 border-l border-gray-300">
                <span className="text-xs text-gray-500 font-medium">Size</span>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={eraserWidth}
                  onChange={(e) => setEraserWidth(Number(e.target.value))}
                  className="w-20 accent-indigo-600"
                  title={`Eraser Size: ${eraserWidth}px`}
                />
              </div>
            )}
          </div>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
            title="Clear All Drawings"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Grade Button */}
          {page.status === PageStatus.Parsed && (
            <button
              onClick={handleGrade}
              disabled={isGrading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGrading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              <span>Grade with AI</span>
            </button>
          )}

          {/* Generate Similar Button */}
          {page.status === PageStatus.Graded && (
            <button
              onClick={handleGenerateSimilar}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              <span>Generate Similar Practice</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex justify-center bg-gray-200 p-4 print:p-0 print:bg-white print:overflow-visible">
        {page.status === PageStatus.Scanning ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 print:hidden">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-600" />
            <p className="text-lg">AI is processing your document...</p>
          </div>
        ) : (
          <div 
            ref={printRef}
            className="relative w-full max-w-[800px] h-full bg-white shadow-xl rounded-lg overflow-hidden flex flex-col print:shadow-none print:max-w-none print:h-auto print:overflow-visible"
          >
            {/* Dual Layer Container */}
            <div className={`relative flex-1 ${activeTool === 'hand' ? 'overflow-y-auto' : 'overflow-hidden'} print:overflow-visible`}>
              <div className="relative min-h-full">
                {/* Base Layer: Markdown + MathJax/KaTeX */}
                <div className="p-8 prose prose-lg max-w-none print:p-4">
                  {page.isGenerated && (
                    <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-full border border-amber-200 print:border-black print:text-black">
                      <Sparkles className="w-4 h-4" />
                      Generated Practice (举一反三)
                    </div>
                  )}
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {page.parsedMarkdown || ''}
                  </ReactMarkdown>
                </div>

                {/* Ink Layer: PencilKit Wrapper Equivalent */}
                <DrawingCanvas
                  strokes={strokes}
                  onStrokesChange={handleStrokesChange}
                  activeTool={activeTool}
                  eraserWidth={eraserWidth}
                />
              </div>
            </div>
          </div>
        )}

        {/* Grading Feedback Sidebar */}
        {page.status === PageStatus.Graded && page.gradingFeedback && (
          <div className="w-80 ml-4 bg-white shadow-xl rounded-lg p-6 overflow-y-auto print:hidden">
            <h2 className="text-xl font-bold mb-4 text-green-700 flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              AI Feedback
            </h2>
            <div className="prose prose-sm">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {page.gradingFeedback}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
