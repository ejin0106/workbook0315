import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { subscribeToWorkbooks } from '../store';
import { LLMService } from '../services/MockServices';
import { Workbook } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export const InsightsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workbookId = searchParams.get('workbookId');
  
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [insights, setInsights] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToWorkbooks((data) => {
      setWorkbooks(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchInsights = async () => {
      if (workbooks.length === 0) return;
      
      setIsLoading(true);
      
      let targetWorkbooks = workbooks;
      if (workbookId) {
        targetWorkbooks = workbooks.filter(w => w.id === workbookId);
      }
      
      const allPages = targetWorkbooks.flatMap(w => w.pages || []);
      
      // Filter by timeRange
      const now = Date.now();
      const rangeMs = timeRange === 'day' ? 86400000 : timeRange === 'week' ? 604800000 : timeRange === 'month' ? 2592000000 : Infinity;
      const filteredPages = allPages.filter(p => {
        if (!p.createdAt) return false;
        const createdAtTime = new Date(p.createdAt).getTime();
        return now - createdAtTime <= rangeMs;
      });

      const result = await LLMService.analyzeWeaknesses(filteredPages, timeRange);
      setInsights(result);
      setIsLoading(false);
    };

    fetchInsights();
  }, [timeRange, workbooks, workbookId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            {workbookId ? 'Workbook Insights' : 'Learning Insights'}
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          {(['day', 'week', 'month', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${timeRange === range ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {range}
            </button>
          ))}
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Analyzing your recent performance...</p>
            </div>
          ) : (
            <div className="prose prose-indigo max-w-none">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {insights}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
