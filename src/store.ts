import { Workbook, PageStatus, WorkbookPage, Subject } from './types';
import { db, auth } from './firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export const subscribeToWorkbooks = (callback: (workbooks: Workbook[]) => void) => {
  const user = auth.currentUser;
  if (!user) return () => {};

  const q = query(
    collection(db, 'workbooks'),
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, async (snapshot) => {
    const workbooks: Workbook[] = [];
    for (const docSnapshot of snapshot.docs) {
      const workbookData = docSnapshot.data() as Workbook;
      
      // Fetch pages for this workbook
      const pagesQuery = query(
        collection(db, `workbooks/${workbookData.id}/pages`),
        orderBy('createdAt', 'asc')
      );
      
      const pagesSnapshot = await getDocs(pagesQuery);
      const pages = pagesSnapshot.docs.map(p => p.data() as WorkbookPage);
      
      workbooks.push({ ...workbookData, pages });
    }
    callback(workbooks);
  });
};

export const createWorkbook = async (title: string, subject: Subject): Promise<Workbook> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const newWorkbook: Workbook = {
    id: uuidv4(),
    userId: user.uid,
    title,
    subject,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pages: []
  };

  await setDoc(doc(db, 'workbooks', newWorkbook.id), {
    id: newWorkbook.id,
    userId: newWorkbook.userId,
    title: newWorkbook.title,
    subject: newWorkbook.subject,
    createdAt: newWorkbook.createdAt,
    updatedAt: newWorkbook.updatedAt
  });
  return newWorkbook;
};

export const updateWorkbook = async (workbookId: string, updates: Partial<Workbook>) => {
  await updateDoc(doc(db, 'workbooks', workbookId), {
    ...updates,
    updatedAt: new Date().toISOString()
  });
};

export const addPageToWorkbook = async (workbookId: string, imageUri: string, title: string = 'New Page'): Promise<WorkbookPage> => {
  const newPage: WorkbookPage = {
    id: uuidv4(),
    workbookId,
    title,
    originalImageUri: imageUri,
    parsedMarkdown: '',
    drawingData: [],
    status: 'Scanning',
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, `workbooks/${workbookId}/pages`, newPage.id), newPage);
  return newPage;
};

export const updatePage = async (workbookId: string, updatedPage: WorkbookPage) => {
  await updateDoc(doc(db, `workbooks/${workbookId}/pages`, updatedPage.id), {
    ...updatedPage
  });
};

export const deletePageFromWorkbook = async (workbookId: string, pageId: string): Promise<void> => {
  await deleteDoc(doc(db, `workbooks/${workbookId}/pages`, pageId));
};

export const deleteWorkbook = async (workbookId: string): Promise<void> => {
  // Delete all pages in the subcollection first
  const pagesQuery = query(collection(db, `workbooks/${workbookId}/pages`));
  const pagesSnapshot = await getDocs(pagesQuery);
  const deletePromises = pagesSnapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  
  // Delete the workbook document
  await deleteDoc(doc(db, 'workbooks', workbookId));
};

export const addGeneratedPageToWorkbook = async (workbookId: string, text: string): Promise<WorkbookPage> => {
  const newPage: WorkbookPage = {
    id: uuidv4(),
    workbookId,
    title: 'Generated Practice',
    originalImageUri: '',
    parsedMarkdown: text,
    drawingData: [],
    status: 'Parsed',
    createdAt: new Date().toISOString(),
    isGenerated: true,
  };

  await setDoc(doc(db, `workbooks/${workbookId}/pages`, newPage.id), newPage);
  return newPage;
};

