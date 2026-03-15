export enum PageStatus {
  Scanning = 'Scanning',
  Parsed = 'Parsed',
  Graded = 'Graded',
}

export interface WorkbookPage {
  id: string;
  workbookId: string;
  title?: string; // Auto-extracted title
  originalImageUri?: string; // Base64 or URL
  parsedMarkdown: string;
  drawingData: any[]; // Array of drawing strokes
  status: PageStatus;
  gradingFeedback?: string;
  createdAt?: string;
  isGenerated?: boolean;
}

export type Subject = 'Math' | 'English' | 'Chinese';

export interface Workbook {
  id: string;
  userId: string;
  title: string;
  subject: Subject;
  createdAt: string; // ISO date string
  updatedAt: string;
  pages?: WorkbookPage[]; // Optional, as we might load pages separately
}
