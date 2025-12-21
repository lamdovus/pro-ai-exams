
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { 
  LayoutGrid, Users, FileText, Settings, LogOut, Bell, 
  Search, ChevronRight, Upload, CheckCircle2, 
  FilePlus, ChevronLeft, X, Loader2,
  Mail, ArrowRight, RefreshCcw, Edit3, ExternalLink,
  Plus, Trash2, Info, Calendar, FileType, AlertTriangle, Key, Save,
  FileUp, FileImage, Files, GraduationCap, History, BarChart3, Eye, Download, Maximize2, Sparkles, Check, Clock, ListChecks, Award, Flag
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI } from "@google/genai";

import { VusLogo, MOCK_ANSWER_KEYS, MOCK_HISTORY, MOCK_COURSES } from './constants.tsx';
import { Course, Student, AnswerKey, GradeStatus, ExamSession, ApiResponse, ApiStudentResponse } from './types.ts';
import { processExamImage, identifyExamCode } from './services/geminiService.ts';
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

// Cấu hình PDF.js worker
const PDF_WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

if (typeof window !== 'undefined') {
  const pdfjs: any = pdfjsLib;
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  } else if (pdfjs.default && pdfjs.default.GlobalWorkerOptions) {
    pdfjs.default.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  }
}

const PdfCanvasViewer = ({ base64Data }: { base64Data: string }) => {
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const renderPdf = async () => {
      if (!base64Data) return;
      setLoading(true);
      try {
        const pdfjs: any = (pdfjsLib as any).getDocument ? pdfjsLib : (pdfjsLib as any).default;
        if (!pdfjs || !pdfjs.getDocument) throw new Error("PDF.js library not loaded correctly");
        const loadingTask = pdfjs.getDocument({ data: atob(base64Data) });
        const pdf = await loadingTask.promise;
        if (!isMounted) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.className = "w-full h-auto mb-6 shadow-xl rounded-lg bg-white border border-gray-100 animate-in fade-in duration-500";
            containerRef.current.appendChild(canvas);
            await page.render({ canvasContext: context!, viewport: viewport }).promise;
          }
        }
      } catch (err) {
        console.error("PDF Render Error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    renderPdf();
    return () => { isMounted = false; };
  }, [base64Data]);

  return (
    <div className="w-full h-full overflow-y-auto p-6 bg-gray-100/30 flex flex-col items-center">
      {loading && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="animate-spin text-vus-blue" size={48} />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Đang vẽ tài liệu PDF...</p>
        </div>
      )}
      <div ref={containerRef} className="w-full max-w-3xl" />
    </div>
  );
};

const SkillBar = ({ label, score, color = 'bg-vus-blue' }: { label: string, score: number, color?: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-bold">{score}/100</span>
    </div>
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
      <div 
        className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} 
        style={{ width: `${score}%` }}
      ></div>
    </div>
  </div>
);

const ResultModal = ({ session, onClose }: { session: ExamSession, onClose: () => void }) => {
  if (!session) return null;
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-vus-blue/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-[210] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase">Chi tiết bài thi AI</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Học viên: {session.studentName} • Ngày {new Date(session.date).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full text-gray-400 transition-all"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-auto p-8 space-y-8 bg-[#fcfdfe]">
          <div className="text-center bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Award size={100} className="text-vus-blue" /></div>
             <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-vus-light text-vus-blue text-5xl font-black border-4 border-white shadow-xl mb-4">
               {session.score ?? '--'}
             </div>
             <p className="text-[10px] font-black text-vus-blue/40 uppercase tracking-[0.2em]">Điểm tổng quát</p>
          </div>

          {session.skills && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <SkillBar label="Listening" score={session.skills.listening} />
               <SkillBar label="Reading" score={session.skills.reading} />
               <SkillBar label="Writing" score={session.skills.writing} />
               <SkillBar label="Speaking" score={session.skills.speaking} />
            </div>
          )}

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2 text-vus-red">
               <Sparkles size={16} /> Nhận xét từ giáo viên AI
             </h3>
             <p className="text-sm text-gray-600 leading-relaxed font-medium">
               {session.feedback || "AI chưa cung cấp nhận xét cho bài này."}
             </p>
          </div>

          {(session as any).corrections && (session as any).corrections.length > 0 && (
             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2 text-vus-blue">
                 <ListChecks size={16} /> Chi tiết bài làm
               </h3>
               <div className="space-y-3">
                 {(session as any).corrections.map((c: any, i: number) => (
                   <div key={i} className={`p-4 rounded-2xl border ${c.status === 'correct' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                     <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Câu: {c.question}</p>
                     <p className="text-xs font-bold text-gray-700">{c.text}</p>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>

        <div className="p-8 border-t border-gray-100 bg-white flex justify-center">
           <button onClick={onClose} className="px-16 py-4 bg-vus-blue text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Đóng</button>
        </div>
      </div>
    </div>
  );
};

async function extractAnswerKeyWithAI(base64Data: string, mimeType: string): Promise<string> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

  if (!API_KEY) return "Vui lòng cấu hình VITE_GEMINI_API_KEY trong .env.local (rồi restart npm run dev).";

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Cách 1 (ổn định nhất): dùng flash để trích xuất text
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Hãy trích xuất nội dung đáp án mẫu từ tài liệu này dưới dạng text thuần túy." },
          { inlineData: { mimeType, data: base64Data } }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 0 } // flash ok với 0
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("extractAnswerKeyWithAI error:", error);
    return "Không thể trích xuất (Gemini lỗi). Vui lòng kiểm tra Console/Network.";
  }
}



async function fetchAllFromOrds<T>(baseUrl: string, headers: Record<string, string>): Promise<T[]> {
  let allItems: T[] = [];
  let nextUrl: string | null = baseUrl;
  try {
    while (nextUrl) {
      const response = await fetch(nextUrl, { method: 'GET', headers: { 'Content-Type': 'application/json', ...headers } });
      if (!response.ok) break;
      const data = await response.json();
      if (data.items) allItems = [...allItems, ...data.items];
      const nextLink = data.links?.find((l: any) => l.rel === 'next');
      if (data.hasMore && nextLink) nextUrl = nextLink.href.replace('http://', 'https://');
      else nextUrl = null;
    }
  } catch (e) { }
  return allItems;
}

async function fetchCoursesFromOrds(email: string): Promise<Course[]> {
  try {
    const initialUrl = `https://vhub.vus.edu.vn/ords/connect/exams/MyCourses`;
    const items = await fetchAllFromOrds<any>(initialUrl, { 'APP_USER': email });
    if (items.length === 0) return [];
    return items.map((item: any) => ({
      id: item.course_code || String(item.course_id || Math.random()),
      name: item.course_code || item.course_name || 'Khóa học VUS',
      code: item.code || 'ENG',
      schedule: item.from_to_date || 'N/A',
      room: item.classroom || 'TBD',
      studentCount: item.count_students || 0,
      campus: item.campuse_code || 'Campus'
    }));
  } catch (e) { return []; }
}

const SidebarItem = ({ icon: Icon, label, to, exact = false }: { icon: any, label: string, to: string, exact?: boolean }) => {
  const location = useLocation();
  const isActive = exact ? location.pathname === to : location.pathname.startsWith(to === '/' ? '____' : to) || (to === '/' && location.pathname === '/');
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-vus-blue text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>
      <Icon size={20} />
      <span className="font-bold text-sm">{label}</span>
    </Link>
  );
};

const Header = ({ userEmail, searchTerm, setSearchTerm }: { userEmail: string, searchTerm: string, setSearchTerm: (s: string) => void }) => (
  <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 sticky top-0 z-20">
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <span className="text-[12px] font-black text-vus-blue uppercase tracking-[0.4em] leading-none mb-1">VUS EXAM INTELLIGENCE</span>
        <div className="flex items-center gap-2">
           <div className="h-px w-6 bg-gradient-to-r from-transparent to-gray-200"></div>
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic bg-gradient-to-r from-vus-blue to-vus-red bg-clip-text text-transparent">
             Khơi mở tiềm năng — Kiến tạo tương lai
           </span>
           <div className="h-px w-6 bg-gradient-to-l from-transparent to-gray-200"></div>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <div className="relative hidden lg:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
        <input type="text" placeholder="Tìm kiếm nhanh..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-[13px] focus:outline-none focus:bg-white w-64 shadow-sm transition-all pointer-events-auto border-transparent focus:border-vus-blue/20" />
      </div>
      <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Giáo viên</p>
          <p className="text-xs text-gray-600 font-bold mt-1">{userEmail}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-vus-blue text-white flex items-center justify-center font-bold uppercase shadow-lg border-2 border-white">{userEmail ? userEmail.charAt(0) : 'T'}</div>
      </div>
    </div>
  </header>
);

const AnswerKeysManagement = ({ keys, onAddKey, onDeleteKey, searchTerm }: { keys: AnswerKey[], onAddKey: (key: Omit<AnswerKey, 'id'>) => void, onDeleteKey: (id: string) => void, searchTerm: string }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailKey, setDetailKey] = useState<AnswerKey | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentFileName: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (detailKey && detailKey.fileData) {
      try {
        const byteCharacters = atob(detailKey.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: detailKey.mimeType || 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (err) { setPreviewUrl(null); }
    } else setPreviewUrl(null);
  }, [detailKey]);

  const filteredKeys = useMemo(() => keys.filter(k => k.name.toLowerCase().includes(searchTerm.toLowerCase()) || k.code.toLowerCase().includes(searchTerm.toLowerCase())), [keys, searchTerm]);

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setBatchProgress({ current: 0, total: files.length, currentFileName: '' });
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBatchProgress(prev => ({ ...prev, current: i + 1, currentFileName: file.name }));
      try {
        const reader = new FileReader();
        const base64Data: string = await new Promise((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const extractedContent = await extractAnswerKeyWithAI(base64Data, file.type);
        onAddKey({ name: file.name.replace(/\.[^/.]+$/, ""), code: file.name.split('_')[0] || 'TBD', content: extractedContent, fileData: base64Data, mimeType: file.type });
      } catch (err) {
        console.error("Upload/Extract failed:", err);
        alert("Upload/Extract bị lỗi. Mở Console để xem chi tiết.");
      }
    }
    setIsProcessing(false);
    setIsModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Quản lý đáp án mẫu</h1>
          <p className="text-gray-400 font-medium mt-1 uppercase tracking-widest text-[10px]">Hiển thị {filteredKeys.length} bộ đáp án</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-vus-blue text-white rounded-xl text-sm font-black uppercase shadow-lg active:scale-95 transition-all hover:bg-blue-900"><Plus size={18} /> Thêm mới</button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {filteredKeys.map(key => (
          <div key={key.id} onClick={() => setDetailKey(key)} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-vus-blue/40 hover:shadow-xl cursor-pointer transition-all">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-vus-light text-vus-blue flex items-center justify-center border border-blue-50 transition-colors"><FileText size={24} /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-gray-900 uppercase truncate group-hover:text-vus-blue transition-colors">{key.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase bg-gray-50 px-2 py-0.5 rounded tracking-widest">MÃ: {key.code || 'TBD'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <div className="p-2.5 text-gray-300 group-hover:text-vus-blue"><Eye size={18} /></div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(key.id); }} className="p-2.5 text-gray-300 hover:text-vus-red hover:bg-red-50 rounded-xl transition-all">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-vus-blue/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-[210] p-10 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} className="text-vus-red" /></div>
            <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Xác nhận xóa?</h3>
            <p className="text-sm text-gray-500 font-medium mb-8">Bạn không thể hoàn tác sau khi xác nhận.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase text-xs">Hủy</button>
              <button onClick={() => { onDeleteKey(deleteConfirmId!); setDeleteConfirmId(null); }} className="flex-1 py-4 bg-vus-red text-white rounded-2xl font-black uppercase text-xs">Xóa</button>
            </div>
          </div>
        </div>
      )}

      {detailKey && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-vus-blue/40 backdrop-blur-md" onClick={() => setDetailKey(null)}></div>
          <div className="bg-white w-full max-w-7xl rounded-[3rem] shadow-2xl relative z-[110] overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
              <div><h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{detailKey.name}</h2><p className="text-[10px] font-black text-vus-blue uppercase tracking-widest mt-1">Mã: {detailKey.code}</p></div>
              <button onClick={() => setDetailKey(null)} className="p-3 hover:bg-gray-100 rounded-full text-gray-400"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-[#fafbfc]">
              <div className="flex flex-col h-full min-h-[500px] space-y-4">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 flex-1 overflow-hidden shadow-inner flex flex-col relative group">
                  {detailKey.fileData ? (detailKey.mimeType === 'application/pdf' ? <div className="w-full h-full flex flex-col"><div className="flex-1 overflow-hidden"><PdfCanvasViewer base64Data={detailKey.fileData} /></div></div> : <div className="w-full h-full p-10 flex items-center justify-center bg-gray-50/50"><img src={previewUrl || ''} className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl" /></div>) : <div className="text-center p-20 opacity-30 flex-1 flex items-center justify-center"><FileType size={64} /></div>}
                </div>
              </div>
              <div className="flex flex-col h-full space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nội dung trích xuất</p>
                <div className="bg-white rounded-[2.5rem] border border-blue-50 p-10 flex-1 overflow-auto shadow-sm">
                   <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed font-bold">{detailKey.content}</pre>
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-gray-100 bg-white flex justify-end">
               <button onClick={() => setDetailKey(null)} className="px-12 py-4 bg-vus-blue text-white rounded-2xl font-black uppercase text-xs active:scale-95">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-vus-blue/20 backdrop-blur-sm" onClick={() => !isProcessing && setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-[110] overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-black text-gray-900 uppercase">Thêm đáp án mẫu</h2><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button></div>
            <div className="p-10 space-y-6 text-center">
              <div onClick={() => !isProcessing && fileInputRef.current?.click()} className={`w-full py-20 bg-vus-light border-4 border-dashed border-vus-blue/10 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100/30 transition-all ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}>
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" multiple onChange={handleFilesUpload} />
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl text-vus-blue flex items-center justify-center mb-6">{isProcessing ? <Loader2 className="animate-spin" size={36} /> : <FileUp size={36} />}</div>
                <p className="text-lg font-black text-vus-blue uppercase">{isProcessing ? `Đang xử lý ${batchProgress.current}/${batchProgress.total}` : 'Chọn tệp tải lên'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="px-8 py-3 text-xs font-black uppercase text-gray-400">Hủy bỏ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StudentDetails = ({ courses, studentsCache, answerKeys, onGradeExam, examHistory }: any) => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course');
  const student = (studentsCache[courseId || ''] || []).find((s: any) => s.id === id) || { id, name: 'Học viên VUS', avatarInitials: 'S' };
  
  const [gradingModal, setGradingModal] = useState<{ show: boolean, step: number, status: string, result: ExamSession | null }>({ show: false, step: 0, status: '', result: null });
  const [viewingSession, setViewingSession] = useState<ExamSession | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const history = useMemo(() => examHistory.filter((s: any) => s.studentId === id).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()), [examHistory, id]);

  const handleGrade = async () => {
    if (!file) return;
    setGradingModal({ show: true, step: 1, status: 'Đang đọc bài thi...', result: null });
    try {
      const reader = new FileReader();
      const base64Data: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setGradingModal(prev => ({ ...prev, step: 2, status: 'Đang nhận diện mã đề...' }));
      const detectedCodeRaw = await identifyExamCode(base64Data, file.type);
      const detectedCode = detectedCodeRaw.replace(/\s+/g, '').toUpperCase();
      
      setGradingModal(prev => ({ ...prev, step: 3, status: `Đã thấy mã đề ${detectedCodeRaw}. Đang khớp đáp án...` }));
      const matchedKey = answerKeys.find((k: any) => {
        const keyId = k.code.replace(/\s+/g, '').toUpperCase();
        return detectedCode.includes(keyId) || keyId.includes(detectedCode);
      });

      if (!matchedKey) {
        throw new Error(`Không tìm thấy đáp án mẫu cho mã đề "${detectedCodeRaw}". Vui lòng kiểm tra lại thư viện đáp án.`);
      }

      setGradingModal(prev => ({ ...prev, step: 4, status: `Gemini đang chấm điểm bài làm...` }));
      const result = await processExamImage(base64Data, file.type, matchedKey.content);
      
      const session: ExamSession = {
        id: 'ex' + Date.now(),
        studentId: id || '',
        studentName: student.name,
        courseId: courseId || 'TBD',
        date: new Date().toISOString(),
        status: GradeStatus.GRADED,
        score: result.score,
        feedback: result.feedback,
        skills: result.skills,
        corrections: result.corrections
      } as ExamSession;

      onGradeExam(session);
      setFile(null);
      setGradingModal(prev => ({ ...prev, step: 5, status: 'Hoàn tất chấm điểm!', result: session }));
    } catch (err: any) {
      console.error(err);
      setGradingModal({ show: false, step: 0, status: '', result: null });
      alert(err.message || 'Có lỗi xảy ra trong quá trình chấm điểm.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link to={courseId ? `/class/${courseId}` : '/students'} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-vus-blue shadow-sm"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Chi tiết học viên</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Mã học viên: {id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center animate-in slide-in-from-left duration-500">
            <div className="w-24 h-24 rounded-3xl bg-vus-light text-vus-blue flex items-center justify-center text-3xl font-black border border-blue-50 shadow-inner mx-auto mb-6 transition-transform hover:scale-105">{student.avatarInitials}</div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{student.name}</h2>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden animate-in slide-in-from-left duration-700 delay-100">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={80} className="text-vus-blue" /></div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2"><Upload size={18} className="text-vus-blue" /> Chấm điểm thông minh</h3>
            <div className="space-y-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tải bài làm học viên</label>
                  <div onClick={() => fileInputRef.current?.click()} className={`w-full aspect-square max-h-[220px] bg-gray-50 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all group ${file ? 'border-vus-blue bg-blue-50' : 'border-gray-200 hover:bg-blue-50 hover:border-vus-blue/30'}`}>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                    {file ? <div className="text-center px-4 animate-in zoom-in"><FileText size={48} className="text-vus-blue mx-auto mb-2" /><p className="text-[10px] font-black text-gray-600 uppercase truncate max-w-[150px]">{file.name}</p></div> : <><FilePlus size={48} className="text-gray-300 group-hover:text-vus-blue transition-all mb-2" /><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nhấn để chọn tệp</p></>}
                  </div>
               </div>
               
               <button onClick={handleGrade} disabled={!file} className="w-full bg-vus-blue text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-100 hover:bg-blue-900 active:scale-95 transition-all disabled:bg-gray-200 flex items-center justify-center gap-2 mt-4">
                <GraduationCap size={18} /> Bắt đầu chấm điểm AI
               </button>
               <p className="text-[9px] text-gray-400 font-medium italic text-center mt-2 px-4 leading-normal">Hệ thống tự động khớp mã đề & chấm điểm.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6 animate-in slide-in-from-right duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2"><History size={18} className="text-vus-blue" /> Lịch sử chấm điểm</h3>
            {history.length === 0 ? <div className="py-24 text-center text-gray-300 font-black uppercase tracking-widest">Chưa có dữ liệu chấm điểm</div> : (
              <div className="space-y-4">
                {history.map((session: ExamSession) => (
                  <div 
                    key={session.id} 
                    onClick={() => setViewingSession(session)}
                    className="p-6 rounded-3xl border border-gray-50 bg-gray-50/30 flex justify-between items-center transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-vus-blue shadow-sm font-black group-hover:bg-vus-blue group-hover:text-white transition-colors">AI</div>
                       <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mã lớp: {session.courseId}</p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">{new Date(session.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(session.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                         <p className="text-3xl font-black text-vus-blue tracking-tighter">{session.score}</p>
                         <p className="text-[9px] font-black text-vus-blue/40 uppercase tracking-widest">Điểm số</p>
                      </div>
                      <ChevronRight size={20} className="text-gray-300 group-hover:text-vus-blue transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Tiến trình Chấm điểm AI */}
      {gradingModal.show && !gradingModal.result && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-vus-blue/80 backdrop-blur-xl animate-in fade-in duration-300"></div>
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl relative z-[310] p-12 text-center overflow-hidden animate-in zoom-in duration-300">
             <div className="relative mb-8 flex justify-center">
                <div className="absolute inset-0 animate-ping bg-vus-blue/10 rounded-full"></div>
                <Loader2 className="animate-spin text-vus-blue" size={80} />
             </div>
             <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Đang phân tích bằng AI</h3>
             <p className="text-sm text-gray-500 font-medium mb-10">{gradingModal.status}</p>
             <div className="space-y-4 text-left px-4">
                {[
                  { step: 1, label: 'Đọc tệp tin bài làm' },
                  { step: 2, label: 'Nhận diện mã đề thi' },
                  { step: 3, label: 'Đối soát đáp án mẫu' },
                  { step: 4, label: 'Gemini đang chấm điểm' }
                ].map(s => (
                  <div key={s.step} className={`flex items-center gap-3 transition-all duration-500 ${gradingModal.step >= s.step ? 'opacity-100 translate-x-0' : 'opacity-20 -translate-x-4'}`}>
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${gradingModal.step > s.step ? 'bg-vus-blue border-vus-blue text-white' : gradingModal.step === s.step ? 'border-vus-blue text-vus-blue' : 'border-gray-200 text-gray-300'}`}>
                        {gradingModal.step > s.step ? <Check size={12} strokeWidth={4} /> : <span className="text-[10px] font-black">{s.step}</span>}
                     </div>
                     <span className={`text-[11px] font-black uppercase tracking-wider ${gradingModal.step === s.step ? 'text-vus-blue' : 'text-gray-500'}`}>{s.label}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {(gradingModal.result || viewingSession) && (
        <ResultModal 
          session={gradingModal.result || viewingSession!} 
          onClose={() => {
            setGradingModal({ show: false, step: 0, status: '', result: null });
            setViewingSession(null);
          }} 
        />
      )}
    </div>
  );
};

const Dashboard = ({ courses, examSessions, onRefresh, isRefreshing, searchTerm }: any) => {
  const filteredCourses = useMemo(() => courses.filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.campus.toLowerCase().includes(searchTerm.toLowerCase())), [courses, searchTerm]);

  const getClassStats = (courseId: string, totalTarget: number) => {
    const courseSessions = examSessions.filter((s: ExamSession) => s.courseId === courseId);
    const uniqueGradedStudents = new Set(courseSessions.map((s: ExamSession) => s.studentId));
    const gradedCount = uniqueGradedStudents.size;
    
    if (gradedCount === 0) return { type: 'PENDING', label: 'Chưa chấm', color: 'bg-gray-100 text-gray-400 border-gray-200', icon: Clock };
    if (gradedCount >= totalTarget) return { type: 'COMPLETED', label: 'Hoàn thành', color: 'bg-green-50 text-green-600 border-green-200', icon: CheckCircle2 };
    return { type: 'PROGRESS', label: `Đang chấm (${gradedCount}/${totalTarget})`, color: 'bg-vus-light text-vus-blue border-blue-100', icon: BarChart3 };
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-tight">Lớp học của tôi</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Hiển thị {filteredCourses.length} lớp học đang quản lý</p>
          </div>
        </div>
        <button onClick={onRefresh} disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-600 uppercase hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"><RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} /> {isRefreshing ? 'Đang tải...' : 'Làm mới'}</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course: Course) => {
          const stats = getClassStats(course.id, course.studentCount);
          const StatusIcon = stats.icon;

          return (
            <Link 
              key={course.id} 
              to={`/class/${encodeURIComponent(course.id)}`} 
              className={`bg-white p-6 rounded-[2.5rem] border transition-all group relative overflow-hidden flex flex-col
                ${stats.type === 'COMPLETED' ? 'border-green-100 shadow-md shadow-green-50 hover:shadow-green-200' : 'border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1'}`}
            >
              <div className="flex justify-between items-start mb-5">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-colors ${stats.color}`}>
                  <StatusIcon size={12} strokeWidth={3} />
                  {stats.label}
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-vus-blue transition-all" />
              </div>

              <h3 className="text-lg font-black text-gray-900 mb-1 truncate group-hover:text-vus-blue transition-colors uppercase leading-tight">{course.name}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-8 tracking-widest">{course.campus}</p>
              
              <div className="mt-auto space-y-3 pt-5 border-t border-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium italic">
                  <Calendar size={14} className="text-gray-300" />
                  {course.schedule}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-vus-blue font-black text-xs uppercase tracking-tight">
                    <Users size={14} />
                    {course.studentCount} Học viên
                  </div>
                  {stats.type === 'PROGRESS' && (
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-vus-blue rounded-full" 
                        style={{ width: `${(examSessions.filter((s: ExamSession) => s.courseId === course.id).length / course.studentCount) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              {stats.type === 'COMPLETED' && (
                <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none transition-transform group-hover:scale-110">
                  <CheckCircle2 size={120} className="text-green-600" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const ClassDetails = ({ courses, studentsCache, onUpdateStudents, userEmail, searchTerm, examSessions }: any) => {
  const { id } = useParams();
  const courseId = decodeURIComponent(id || '');
  const course = courses.find((c: any) => c.id === courseId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!courseId || studentsCache[courseId]) return;
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const url = `https://vhub.vus.edu.vn/ords/connect/exams/StudentCourses?p_course_code=${encodeURIComponent(courseId)}`;
        const items = await fetchAllFromOrds<any>(url, { 'COURSE_CODE': courseId, 'APP_USER': userEmail || '' });
        onUpdateStudents(courseId, items.map((s: any) => ({ id: s.student_code, name: s.full_name, avatarInitials: s.full_name.split(' ').pop()?.charAt(0) || 'S', totalExams: 0 })));
      } catch (err) { onUpdateStudents(courseId, []); } finally { setLoading(false); }
    };
    fetchStudents();
  }, [courseId, userEmail, studentsCache, onUpdateStudents]);

  const filteredStudents = useMemo(() => {
    return (studentsCache[courseId] || []).filter((s: any) => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [studentsCache, courseId, searchTerm]);

  if (!course) return <div className="p-20 text-center font-black text-gray-400 uppercase">Không tìm thấy lớp học.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-8 font-black uppercase"><Link to="/" className="hover:text-vus-blue transition-colors">Danh sách lớp</Link><ChevronRight size={10} /><span className="text-gray-900">{course.name}</span></div>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase">Danh sách học viên</h2>
          <p className="text-gray-400 text-xs font-medium uppercase mt-1 tracking-widest">Lớp: {course.name} • {filteredStudents.length} học viên</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-vus-blue mb-4" size={40} />
            <p className="text-gray-400 font-black uppercase text-[10px]">Đang lấy danh sách...</p>
          </div>
        ) : filteredStudents.map((student: Student) => {
          const isGraded = examSessions.some((s: ExamSession) => s.studentId === student.id && s.courseId === courseId);

          return (
            <Link 
              key={student.id} 
              to={`/student/${student.id}?course=${encodeURIComponent(courseId)}`} 
              className={`bg-white p-5 rounded-3xl border flex items-center justify-between group transition-all hover:shadow-xl relative overflow-hidden
                ${isGraded ? 'border-green-100 bg-green-50/20' : 'border-gray-100'}`}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black border transition-colors
                  ${isGraded ? 'bg-green-100 text-green-700 border-green-200' : 'bg-vus-light text-vus-blue border-blue-100'}`}>
                  {student.avatarInitials}
                </div>
                <div>
                  <div className="font-black text-gray-900 group-hover:text-vus-blue transition-colors uppercase text-sm leading-tight">{student.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Mã: {student.id}</div>
                    {isGraded ? (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500 text-white text-[8px] font-black uppercase tracking-widest">
                        <Check size={8} strokeWidth={4} /> Đã chấm
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400 text-[8px] font-black uppercase tracking-widest">
                        Chưa chấm
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-vus-blue relative z-10" />
              
              {isGraded && (
                <div className="absolute top-0 right-0 p-1 opacity-20 transform translate-x-1/4 -translate-y-1/4">
                  <CheckCircle2 size={60} className="text-green-500" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// @ts-ignore
const StudentsList = ({ searchTerm, studentsCache, examSessions }: { searchTerm: string; studentsCache: Record<string, Student[]>, examSessions: ExamSession[] }) => {
  const allStudents = useMemo(() => {
    const students: (Student & { courseId: string })[] = [];
    Object.entries(studentsCache).forEach(([courseId, list]) => list.forEach((s) => { if (!students.find(existing => existing.id === s.id)) students.push({ ...s, courseId }); }));
    return students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [studentsCache, searchTerm]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8"><h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Học viên</h1><p className="text-gray-400 font-medium mt-1 uppercase tracking-widest text-[10px]">Hiển thị {allStudents.length} học viên</p></div>
      {allStudents.length === 0 ? <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-gray-100 text-center text-gray-300 font-black uppercase tracking-widest text-xs">Vui lòng vào danh sách lớp để đồng bộ dữ liệu.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allStudents.map((student) => {
            const isGraded = examSessions.some((s: ExamSession) => s.studentId === student.id && s.courseId === student.courseId);
            return (
              <Link 
                key={`${student.courseId}-${student.id}`} 
                to={`/student/${student.id}?course=${encodeURIComponent(student.courseId)}`} 
                className={`bg-white p-5 rounded-3xl border flex items-center justify-between group transition-all hover:shadow-lg
                  ${isGraded ? 'border-green-100 bg-green-50/10' : 'border-gray-100'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black border
                    ${isGraded ? 'bg-green-100 text-green-700 border-green-200' : 'bg-vus-light text-vus-blue border-blue-100'}`}>
                    {student.avatarInitials}
                  </div>
                  <div>
                    <div className="font-black text-gray-900 group-hover:text-vus-blue transition-colors uppercase text-sm leading-tight">{student.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Mã: {student.id} • Lớp: {student.courseId}</div>
                      {isGraded && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500 text-white text-[7px] font-black uppercase tracking-widest">
                          <Check size={8} strokeWidth={4} /> Đã chấm
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-vus-blue" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: (email: string, courses: Course[]) => void }) => {
  const [email, setEmail] = useState('thao.nguyentt@vus-etsc.edu.vn');
  const [loading, setLoading] = useState(false);
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const fetchedCourses = await fetchCoursesFromOrds(email);
      onLogin(email, fetchedCourses.length > 0 ? fetchedCourses : MOCK_COURSES);
    } catch (err) { onLogin(email, MOCK_COURSES); } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-10 border border-gray-100 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-8"><VusLogo /></div>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email nội bộ (VUS)</label><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-vus-blue/5 outline-none transition-all shadow-inner" required /></div></div>
          <button type="submit" disabled={loading} className="w-full bg-vus-blue text-white py-4 rounded-2xl font-black uppercase shadow-lg hover:bg-blue-900 disabled:bg-gray-200 flex items-center justify-center gap-2 transition-all active:scale-95">{loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}{loading ? 'Đang xử lý...' : 'Vào hệ thống'}</button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>(MOCK_ANSWER_KEYS);
  const [studentsCache, setStudentsCache] = useState<Record<string, Student[]>>({});
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const handleLogin = (email: string, fetchedCourses: Course[]) => { setUserEmail(email); setCourses(fetchedCourses); };
  const handleLogout = () => { setUserEmail(null); setCourses([]); setStudentsCache({}); setSearchTerm(''); };
  const addAnswerKey = (newKey: Omit<AnswerKey, 'id'>) => setAnswerKeys(prev => [{ ...newKey, id: 'k' + Date.now() }, ...prev]);
  const deleteAnswerKey = (id: string) => setAnswerKeys(prev => prev.filter(k => k.id !== id));
  const handleGradeExam = (session: ExamSession) => setExamSessions(prev => [session, ...prev]);
  const handleRefreshCourses = async () => {
    if (!userEmail || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const fetchedCourses = await fetchCoursesFromOrds(userEmail);
      setCourses(fetchedCourses.length > 0 ? fetchedCourses : MOCK_COURSES);
    } catch (err) { } finally { setIsRefreshing(false); }
  };
  if (!userEmail) return <LoginScreen onLogin={handleLogin} />;
  return (
    <HashRouter>
      <div className="flex h-screen bg-[#fcfdfe] overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col h-screen sticky top-0 z-30 shadow-sm">
          <div className="h-20 flex items-center px-6 mb-4 mt-2"><VusLogo /></div>
          <div className="flex-1 px-4 space-y-1.5">
            <SidebarItem icon={LayoutGrid} label="Lớp học của tôi" to="/" exact />
            <SidebarItem icon={FileText} label="Quản lý đáp án mẫu" to="/keys" />
            <SidebarItem icon={Users} label="Học viên" to="/students" />
            <SidebarItem icon={Settings} label="Cài đặt" to="/settings" />
          </div>
          <div className="p-4 border-t border-gray-50"><button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:text-vus-red hover:bg-red-50 rounded-xl transition-all font-bold text-sm"><LogOut size={20} /><span>Đăng xuất</span></button></div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <Header userEmail={userEmail} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <main className="flex-1 overflow-auto bg-[#fcfdfe]">
            <Routes>
              <Route path="/" element={<Dashboard courses={courses} examSessions={examSessions} onRefresh={handleRefreshCourses} isRefreshing={isRefreshing} searchTerm={searchTerm} />} />
              <Route path="/class/:id" element={<ClassDetails courses={courses} studentsCache={studentsCache} onUpdateStudents={(cid: string, s: any) => setStudentsCache(p => ({ ...p, [cid]: s }))} userEmail={userEmail} searchTerm={searchTerm} examSessions={examSessions} />} />
              <Route path="/student/:id" element={<StudentDetails courses={courses} studentsCache={studentsCache} answerKeys={answerKeys} onGradeExam={handleGradeExam} examHistory={examSessions} />} />
              <Route path="/keys" element={<AnswerKeysManagement keys={answerKeys} onDeleteKey={deleteAnswerKey} onAddKey={addAnswerKey} searchTerm={searchTerm} />} />
              <Route path="/students" element={<StudentsList searchTerm={searchTerm} studentsCache={studentsCache} examSessions={examSessions} />} />
              <Route path="/settings" element={<div className="p-8 text-gray-400 uppercase font-black text-center">Trang cài đặt đang được phát triển</div>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
