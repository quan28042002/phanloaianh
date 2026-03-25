import { getGeminiClient } from "./gemini";

export interface ImageFile {
  id: string;
  name: string;
  data: string; // base64
  blob: Blob;
  size: number;
}

export interface NicheGroup {
  id: string;
  name: string;
  imageIds: string[];
}

export const classifyImages = async (
  images: ImageFile[],
  onProgress: (msg: string, percentage: number) => void
): Promise<NicheGroup[]> => {
  const ai = getGeminiClient();
  const groups: NicheGroup[] = [];
  
  // Xử lý theo batch để tối ưu (mỗi batch 10-15 ảnh)
  const batchSize = 12;
  const totalBatches = Math.ceil(images.length / batchSize);

  onProgress(`Bắt đầu phân tích ${images.length} ảnh...`, 0);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, images.length);
    const batch = images.slice(start, end);
    const currentPercentage = Math.round(((i) / totalBatches) * 100);

    onProgress(`Đang xử lý cụm ảnh ${i + 1}/${totalBatches}...`, currentPercentage);

    const imageParts = batch.map((img) => ({
      inlineData: {
        data: img.data.split(",")[1], // Lấy phần base64
        mimeType: "image/jpeg",
      },
    }));

    const prompt = `
      Bạn là một chuyên gia phân loại nội dung hình ảnh chuyên sâu, đặc biệt là các mẫu quảng cáo. 
      Tôi gửi cho bạn ${batch.length} tấm ảnh.
      Nhiệm vụ của bạn:
      1. Phân tích nội dung và đặc biệt là VĂN BẢN (TEXT), TIÊU ĐỀ (HEADLINE) trong từng ảnh.
      2. Gom các ảnh có cùng "ngách" (niche) nội dung vào cùng một nhóm.
      3. TIÊU CHÍ GOM NHÓM QUAN TRỌNG NHẤT:
         - CỨ CÓ TEXT GIỐNG NHAU HOẶC TƯƠNG TỰ NHAU THÌ CHO NÓ LÀ MỘT NGÁCH.
         - Nếu các ảnh có câu TIÊU ĐỀ CHÍNH (headline) giống nhau -> Cùng một ngách.
         - Nếu các ảnh có nội dung văn bản, ngôn ngữ và chủ đề giống nhau -> Cùng một ngách.
         - Tránh chia nhỏ quá mức. Nếu chúng cùng phục vụ một mục đích quảng cáo hoặc cùng một chủ đề sản phẩm/dịch vụ, hãy để chúng vào một nhóm lớn.
      4. Đặt tên ngách bằng tiếng Việt (ngắn gọn, 2-5 từ, ví dụ: "Spa làm đẹp", "Nội thất phòng khách", "Thời trang nữ").
      5. Trả về kết quả dưới dạng JSON mảng các nhóm.
      
      Quy tắc:
      - Ưu tiên tuyệt đối sự đồng nhất về nội dung văn bản và thông điệp.
      - Tên nhóm phải bao quát được toàn bộ các ảnh trong nhóm đó.
      
      Định dạng trả về duy nhất là JSON:
      {
        "groups": [
          { "name": "Tên ngách tiếng Việt", "indices": [0, 1, 2...] }
        ]
      }
      (indices là chỉ số của ảnh trong danh sách tôi gửi, bắt đầu từ 0)
    `;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [...imageParts, { text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const responseText = result.text || "{}";
      const parsed = JSON.parse(responseText);

      if (parsed.groups) {
        parsed.groups.forEach((g: any) => {
          const groupImageIds = g.indices
            .map((idx: number) => batch[idx]?.id)
            .filter(Boolean);
          
          if (groupImageIds.length > 0) {
            // Kiểm tra xem có thể gộp vào nhóm cuối cùng không (nếu cùng tên)
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.name === g.name) {
              lastGroup.imageIds.push(...groupImageIds);
            } else {
              groups.push({
                id: Math.random().toString(36).substr(2, 9),
                name: g.name,
                imageIds: groupImageIds,
              });
            }
          }
        });
      }
    } catch (error) {
      console.error("Lỗi phân loại batch:", error);
      // Fallback: Gom tất cả vào một nhóm lỗi nếu AI fail
      groups.push({
        id: "error-" + i,
        name: "Chưa phân loại được",
        imageIds: batch.map(img => img.id),
      });
    }
  }

  onProgress("Phân loại hoàn tất!", 100);
  return groups;
};
