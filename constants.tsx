import React from 'react';
import { Course, Student, AnswerKey, GradeStatus, ExamSession } from './types';

// VUS Logo Component - Updated to use provided external URL
export const VusLogo = () => (
  <img 
    src="https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/HR/vus-logo-2025%20(1).svg" 
    alt="VUS Logo" 
    className="h-10 w-auto object-contain"
  />
);

export const MOCK_COURSES: Course[] = [
  { id: 'c1', name: 'SuperKids SKE 3A', code: 'SKE', schedule: 'Mon-Wed 17:30', room: 'R.101', studentCount: 4, campus: 'Nguyen Chi Thanh' },
  { id: 'c2', name: 'SuperKids SKE 4B', code: 'SKE', schedule: 'Tue-Thu 18:00', room: 'R.204', studentCount: 3, campus: 'Nguyen Chi Thanh' },
  { id: 'c3', name: 'SuperKids SKG 2A', code: 'SKG', schedule: 'Sat-Sun 09:00', room: 'Lab 1', studentCount: 3, campus: 'Nguyen Chi Thanh' },
  { id: 'c4', name: 'SuperKids SKG 5C', code: 'SKG', schedule: 'Sat-Sun 14:00', room: 'Lab 3', studentCount: 3, campus: 'Nguyen Chi Thanh' },
  { id: 'c5', name: 'Young Leaders 6', code: 'YL', schedule: 'Mon-Wed 19:30', room: 'R.301', studentCount: 5, campus: 'Nguyen Chi Thanh' },
];

export const MOCK_STUDENTS: Record<string, Student[]> = {
  'c2': [
    { id: 's1', name: 'Hoàng Nhật Minh', avatarInitials: 'H', totalExams: 0 },
    { id: 's2', name: 'Vũ Thị Mai Anh', avatarInitials: 'V', totalExams: 0 },
    { id: 's3', name: 'Đặng Tuấn Kiệt', avatarInitials: 'Đ', totalExams: 0 },
  ]
};

export const MOCK_ANSWER_KEYS: AnswerKey[] = [
  { id: 'k1', name: 'Starters - Reading & Writing Sample', code: 'SKE1', content: '1. Tick\n2. Cross...' },
  { id: 'k2', name: 'Movers - Reading & Writing Test A', code: 'SKG1', content: '1. Library...' },
  { id: 'k3', name: 'A2 Key (KET) - Reading Part 1 & 2', code: 'YC3', content: '1. B\n2. A...' },
];

// Simulating history
export const MOCK_HISTORY: ExamSession[] = [];