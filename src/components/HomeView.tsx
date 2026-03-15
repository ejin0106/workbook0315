import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, FileImage, Trash2, BarChart2, LogOut, Sparkles, Loader2, Edit2 } from 'lucide-react';
import { subscribeToWorkbooks, createWorkbook, addPageToWorkbook, deletePageFromWorkbook, updateWorkbook, updatePage } from '../store';
import { Workbook, Subject, WorkbookPage } from '../types';
import { auth } from '../firebase';

export const HomeView: React.FC = () => {
  const navigate = useNavigate();
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject>('Math');
  const [isScanning, setIsScanning] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkbookTitle, setNewWorkbookTitle] = useState('New Practice');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeWorkbookId, setActiveWorkbookId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit states
  const [editingWorkbookId, setEditingWorkbookId] = useState<string | null>(null);
  const [editWorkbookTitle, setEditWorkbookTitle] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editPageTitle, setEditPageTitle] = useState('');

  // Delete state
  const [pageToDelete, setPageToDelete] = useState<{workbookId: string, pageId: string} | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToWorkbooks((data) => {
      setWorkbooks(data);
    });
    return () => unsubscribe();
  }, []);

  const filteredWorkbooks = workbooks.filter(w => w.subject === activeSubject);

  const handleCreateWorkbook = () => {
    setNewWorkbookTitle(`New ${activeSubject} Practice`);
    setIsCreateModalOpen(true);
  };

  const confirmCreateWorkbook = async () => {
    if (newWorkbookTitle.trim()) {
      setIsCreating(true);
      try {
        await createWorkbook(newWorkbookTitle.trim(), activeSubject);
        setIsCreateModalOpen(false);
      } catch (error) {
        console.error("Failed to create workbook:", error);
        alert(`Failed to create workbook: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const cancelCreateWorkbook = () => {
    setIsCreateModalOpen(false);
  };

  const handleScanDocumentClick = (workbookId: string) => {
    setActiveWorkbookId(workbookId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeWorkbookId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUri = event.target?.result as string;
        setIsScanning(true);
        // Simulate VisionKit processing delay
        setTimeout(async () => {
          const newPage = await addPageToWorkbook(activeWorkbookId, dataUri);
          setIsScanning(false);
          setActiveWorkbookId(null);
          if (fileInputRef.current) fileInputRef.current.value = ''; // reset input
          navigate(`/workbook/${activeWorkbookId}/page/${newPage.id}`);
        }, 1500);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteClick = (workbookId: string, pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPageToDelete({ workbookId, pageId });
  };

  const confirmDelete = async () => {
    if (pageToDelete) {
      await deletePageFromWorkbook(pageToDelete.workbookId, pageToDelete.pageId);
      setPageToDelete(null);
    }
  };

  const startEditWorkbook = (workbook: Workbook, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkbookId(workbook.id);
    setEditWorkbookTitle(workbook.title);
  };

  const saveWorkbookTitle = async (workbookId: string) => {
    if (editWorkbookTitle.trim()) {
      await updateWorkbook(workbookId, { title: editWorkbookTitle.trim() });
    }
    setEditingWorkbookId(null);
  };

  const startEditPage = (page: WorkbookPage, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(page.id);
    setEditPageTitle(page.title || '');
  };

  const savePageTitle = async (workbookId: string, page: WorkbookPage) => {
    if (editPageTitle.trim()) {
      await updatePage(workbookId, { ...page, title: editPageTitle.trim() });
    }
    setEditingPageId(null);
  };

  const handleSignOut = () => {
    auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
          <BookOpen className="w-10 h-10 text-indigo-600" />
          AI Smart Workbook
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-200 font-medium rounded-xl shadow-sm hover:bg-gray-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <button
            onClick={handleCreateWorkbook}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Workbook
          </button>
        </div>
      </header>

      {/* Subject Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 pb-px">
        {(['Math', 'English', 'Chinese'] as Subject[]).map(subject => (
          <button
            key={subject}
            onClick={() => setActiveSubject(subject)}
            className={`px-6 py-3 text-lg font-medium rounded-t-xl transition-colors ${
              activeSubject === subject 
                ? 'bg-white text-indigo-600 border-t border-l border-r border-gray-200 shadow-[0_4px_0_0_white]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {subject}
          </button>
        ))}
      </div>

      {filteredWorkbooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-white rounded-2xl border border-gray-200 border-dashed">
          <BookOpen className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-xl">No {activeSubject} workbooks yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredWorkbooks.map((workbook) => (
            <div
              key={workbook.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-2 group/title">
                  {editingWorkbookId === workbook.id ? (
                    <input
                      type="text"
                      value={editWorkbookTitle}
                      onChange={(e) => setEditWorkbookTitle(e.target.value)}
                      onBlur={() => saveWorkbookTitle(workbook.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveWorkbookTitle(workbook.id);
                        if (e.key === 'Escape') setEditingWorkbookId(null);
                      }}
                      className="text-xl font-semibold text-gray-800 w-full border-b border-indigo-500 outline-none bg-transparent"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center gap-2 overflow-hidden">
                      <h2 className="text-xl font-semibold text-gray-800 truncate" title={workbook.title}>
                        {workbook.title}
                      </h2>
                      <button
                        onClick={(e) => startEditWorkbook(workbook, e)}
                        className="p-1 text-gray-400 hover:text-indigo-600 opacity-0 group-hover/title:opacity-100 transition-opacity"
                        title="Edit title"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/insights?workbookId=${workbook.id}`)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors shrink-0"
                    title="Workbook Insights"
                  >
                    <BarChart2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  {new Date(workbook.createdAt).toLocaleDateString()} • {workbook.pages?.length || 0} pages
                </p>

                <div className="space-y-3">
                  {workbook.pages?.map((page, index) => (
                    <div
                      key={page.id}
                      onClick={() => navigate(`/workbook/${workbook.id}/page/${page.id}`)}
                      className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors flex justify-between items-center cursor-pointer group"
                    >
                      <div className="flex flex-col overflow-hidden mr-2 flex-1">
                        {editingPageId === page.id ? (
                          <input
                            type="text"
                            value={editPageTitle}
                            onChange={(e) => setEditPageTitle(e.target.value)}
                            onBlur={() => savePageTitle(workbook.id, page)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') savePageTitle(workbook.id, page);
                              if (e.key === 'Escape') setEditingPageId(null);
                            }}
                            className="text-sm font-medium text-gray-700 w-full border-b border-indigo-500 outline-none bg-transparent"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-1 group/pagetitle">
                            <span className="text-sm font-medium text-gray-700 truncate flex items-center gap-1" title={page.title || `Page ${index + 1}`}>
                              {page.isGenerated && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
                              <span className="truncate">{page.title || `Page ${index + 1}`}</span>
                            </span>
                            <button
                              onClick={(e) => startEditPage(page, e)}
                              className="p-1 text-gray-400 hover:text-indigo-600 opacity-0 group-hover/pagetitle:opacity-100 transition-opacity shrink-0"
                              title="Edit title"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {page.createdAt && (
                          <span className="text-xs text-gray-400 mt-0.5">
                            {new Date(page.createdAt).toLocaleDateString()} {new Date(page.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          page.status === 'Graded' ? 'bg-green-100 text-green-800' :
                          page.status === 'Parsed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {page.status}
                        </span>
                        <button
                          onClick={(e) => handleDeleteClick(workbook.id, page.id, e)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete page"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 pt-0 mt-auto">
                <button
                  onClick={() => handleScanDocumentClick(workbook.id)}
                  disabled={isScanning}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
                >
                  <FileImage className="w-5 h-5" />
                  Scan New Page
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Scanning Overlay */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl flex flex-col items-center shadow-2xl">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800">VisionKit Scanning...</h2>
            <p className="text-gray-500 mt-2">Simulating VNDocumentCameraViewController</p>
          </div>
        </div>
      )}

      {/* Create Workbook Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">New {activeSubject} Workbook</h2>
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Workbook Title
              </label>
              <input
                type="text"
                id="title"
                value={newWorkbookTitle}
                onChange={(e) => setNewWorkbookTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Enter title..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmCreateWorkbook();
                  if (e.key === 'Escape') cancelCreateWorkbook();
                }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelCreateWorkbook}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateWorkbook}
                disabled={isCreating}
                className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {pageToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Page?</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this page? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPageToDelete(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
