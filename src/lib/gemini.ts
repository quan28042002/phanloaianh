import { GoogleGenAI } from "@google/genai";

// Khởi tạo Gemini AI
// Lưu ý: API Key được lấy từ process.env.GEMINI_API_KEY đã được hệ thống inject
export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Không tìm thấy GEMINI_API_KEY. Vui lòng cấu hình trong Settings.");
  }
  return new GoogleGenAI({ apiKey });
};
