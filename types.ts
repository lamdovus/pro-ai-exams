
export enum GradeStatus {
  NOT_GRADED = 'NOT_GRADED',
  PROCESSING = 'PROCESSING',
  GRADED = 'GRADED'
}

export interface Student {
  id: string;
  name: string;
  avatarInitials: string;
  totalExams: number;
  lastExamScore?: number;
  campus?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string; 
  schedule: string;
  room: string;
  studentCount: number;
  campus: string;
}

export interface ApiCourseItem {
  course_id?: string;
  code: string;           
  person_id: number;      
  campus_id: number;      
  campuse_code: string;   
  course_code: string;    
  from_to_date: string;   
  classroom: string | null; 
  count_students: number; 
}

export interface ApiStudentItem {
  student_code: string;   
  full_name: string;
  campuse_code?: string;
}

export interface ApiResponse {
  items: ApiCourseItem[];
  hasMore?: boolean;
  limit?: number;
  offset?: number;
  count?: number;
  links?: { rel: string; href: string }[];
}

export interface ApiStudentResponse {
  items: ApiStudentItem[];
  hasMore?: boolean;
  links?: { rel: string; href: string }[];
}

export interface ExamSession {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  date: string;
  status: GradeStatus;
  score?: number;
  feedback?: string;
  skills?: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  };
}

export interface AnswerKey {
  id: string;
  name: string;
  code: string; 
  content: string; 
  pdfUrl?: string; 
  fileData?: string; // Base64 data for preview
  mimeType?: string; // IANA mime type
}
