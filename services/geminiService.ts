
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Hàm hỗ trợ dọn dẹp chuỗi JSON từ phản hồi của AI
 */
const cleanJsonResponse = (text: string): string => {
  // Loại bỏ các khối markdown ```json ... ``` nếu có
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
};

/**
 * Hàm nhận diện mã đề từ bài thi
 */
export const identifyExamCode = async (
  base64Data: string,
  mimeType: string
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API_KEY chưa được cấu hình.");

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: "Hãy đọc nội dung bài thi này và tìm mã đề (Exam Code). Ví dụ: SKE 1, SKE1, SKG 2... Chỉ trả về chuỗi mã đề, không thêm lời dẫn. Nếu không thấy, trả về 'UNKNOWN'." },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return (response.text || "UNKNOWN").trim();
  } catch (error) {
    console.error("Identify Code Error:", error);
    return "UNKNOWN";
  }
};

/**
 * Hàm chấm điểm bài thi (Đã sửa lỗi JSON)
 */
export const processExamImage = async (
  base64Data: string, 
  mimeType: string,
  answerKeyContent: string,
  modelName: string = 'gemini-3-pro-preview'
): Promise<any> => {
  
  if (!process.env.API_KEY) {
    throw new Error("API_KEY chưa được cấu hình.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      BẠN LÀ MỘT GIÁO VIÊN TIẾNG ANH TẠI VUS. 
      NHIỆM VỤ: Chấm điểm bài thi học sinh dựa trên ĐÁP ÁN MẪU.
      
      ĐÁP ÁN MẪU (KEY):
      """
      ${answerKeyContent}
      """

      YÊU CẦU:
      1. So sánh câu trả lời của học sinh với ĐÁP ÁN MẪU.
      2. Tính điểm tổng (0-100).
      3. Nhận xét ngắn gọn bằng TIẾNG VIỆT.
      4. Phân tích điểm 4 kỹ năng (0-100).
      5. Danh sách corrections: ghi lại câu hỏi, trạng thái (correct/incorrect) và giải thích ngắn gọn.
      
      QUAN TRỌNG: Chỉ trả về JSON thuần túy theo schema. Không thêm văn bản giải thích ngoài JSON.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType, 
              data: base64Data
            }
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            skills: {
              type: Type.OBJECT,
              properties: {
                listening: { type: Type.NUMBER },
                reading: { type: Type.NUMBER },
                writing: { type: Type.NUMBER },
                speaking: { type: Type.NUMBER }
              }
            },
            corrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  status: { type: Type.STRING },
                  text: { type: Type.STRING }
                }
              }
            }
          },
          required: ["score", "feedback", "skills"]
        }
      }
    });

    const rawText = response.text || '{}';
    try {
      return JSON.parse(cleanJsonResponse(rawText));
    } catch (parseError) {
      console.error("JSON Parse Error on raw text:", rawText);
      throw new Error("Dữ liệu từ AI không đúng định dạng JSON. Vui lòng thử lại.");
    }
  } catch (error) {
    console.error("Gemini Grading Error:", error);
    throw error;
  }
};
