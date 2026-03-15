import { GoogleGenAI } from '@google/genai';
import { PageStatus, WorkbookPage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const OCRService = {
  processImage: async (dataUri: string): Promise<{ title: string, markdown: string }> => {
    try {
      // Extract base64 data and mime type from data URI
      const matches = dataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid image data URI');
      }
      const mimeType = matches[1];
      const base64Data = matches[2];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: 'Extract all the text and math equations from this image. Format the output as Markdown. Use $ for inline math and $$ for block math (LaTeX). Do not include any conversational text. Also, provide a short, descriptive title for this page based on its content on the very first line, prefixed with "TITLE: ". The title MUST be in Chinese (e.g., "TITLE: 一元二次方程练习").',
            },
          ],
        },
      });

      const text = response.text || '';
      const lines = text.split('\n');
      let title = 'Untitled Page';
      let markdown = text;

      if (lines[0].startsWith('TITLE: ')) {
        title = lines[0].replace('TITLE: ', '').trim();
        markdown = lines.slice(1).join('\n').trim();
      }

      return { title, markdown };
    } catch (error) {
      console.error('OCR Error:', error);
      return { title: 'Error', markdown: 'Error processing image with AI.' };
    }
  },
};

export const LLMService = {
  gradeAnswer: async (questionText: string, drawingData: any[]): Promise<string> => {
    try {
      // In a real app, we would render the drawingData (strokes) to an image
      // and send it along with the questionText to Gemini.
      // For this prototype, we'll just ask Gemini to grade based on the text if no strokes exist,
      // or simulate a response if strokes exist (since we can't easily render canvas to base64 here without DOM access).
      
      const prompt = `
      You are an expert tutor grading a student's work.
      Here is the original worksheet content:
      
      ${questionText}
      
      The student has provided handwritten answers (simulated). 
      Please provide encouraging, constructive feedback on their work. Format your response in Markdown with LaTeX math if needed.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || 'No feedback generated.';
    } catch (error) {
      console.error('Grading Error:', error);
      return 'Error generating feedback with AI.';
    }
  },

  analyzeWeaknesses: async (pages: WorkbookPage[], timeRange: string): Promise<string> => {
    try {
      const gradedPages = pages.filter(p => p.status === PageStatus.Graded && p.gradingFeedback);
      if (gradedPages.length === 0) return "Not enough graded data to analyze weaknesses.";

      const prompt = `
      You are an expert AI tutor. Analyze the following graded assignments of a student over the past ${timeRange}.
      Identify their core weaknesses, recurring mistakes, and provide a summary of areas they need to focus on.
      Format as Markdown.

      Data:
      ${gradedPages.map(p => `
      --- Assignment ---
      Content: ${p.parsedMarkdown}
      Feedback: ${p.gradingFeedback}
      `).join('\n')}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || 'No insights generated.';
    } catch (error) {
      console.error('Insights Error:', error);
      return 'Error generating insights with AI.';
    }
  },

  generateSimilarQuestions: async (extractedText: string, feedback: string): Promise<string> => {
    try {
      const prompt = `
      You are an expert AI tutor. A student just completed a practice and received the following feedback.
      Based on their mistakes and the original questions, generate 3 new "similar but slightly different" questions (举一反三) to help them practice their weak points.
      Format as Markdown with LaTeX math ($ and $$). Do not include conversational filler, just the questions.

      Original Content:
      ${extractedText}

      Feedback:
      ${feedback}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || 'No questions generated.';
    } catch (error) {
      console.error('Generate Similar Error:', error);
      return 'Error generating questions with AI.';
    }
  }
};
