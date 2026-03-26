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
  
  // Xử lý theo batch để tối ưu (mỗi batch 15 ảnh để dễ nhận diện các bộ 10 ảnh)
  const batchSize = 15;
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
      Bạn là một chuyên gia phân loại hình ảnh quảng cáo (niche research) cực kỳ chính xác.
      Tôi gửi cho bạn ${batch.length} tấm ảnh.
      Nhiệm vụ của bạn:
      1. Phân tích sâu nội dung hình ảnh, màu sắc, phong cách thiết kế và đặc biệt là VĂN BẢN (TEXT/HEADLINE).
      2. Gom các ảnh có cùng "ngách" (niche) vào cùng một nhóm.
      3. QUY TẮC PHÂN CHIA QUAN TRỌNG:
         - Một ngách thường có khoảng 10 ảnh. Bạn PHẢI chia 10 ảnh đó thành 2 nhóm (mỗi nhóm khoảng 5 ảnh).
         - Ví dụ: Nếu thấy 10 ảnh về "Câu cá", hãy chia thành "Câu cá - Nhóm 1" (5 ảnh) và "Câu cá - Nhóm 2" (5 ảnh).
         - TUYỆT ĐỐI KHÔNG được tạo nhóm chỉ có đúng 2 ảnh. Nếu một nhóm có 2 ảnh, hãy gộp nó vào một nhóm khác có nội dung gần nhất hoặc giữ nó trong nhóm lớn hơn.
         - Các nhóm nên có số lượng ảnh từ 3 đến 7 ảnh là lý tưởng.
      4. TIÊU CHÍ GOM NHÓM:
         - Ưu tiên TEXT giống nhau hoặc cùng chủ đề thông điệp.
         - Ưu tiên phong cách thiết kế (layout, font, màu sắc) tương đồng.
      5. Đặt tên ngách bằng tiếng Việt chuyên nghiệp (ví dụ: "Thời trang Vintage - P1", "Đồ gia dụng thông minh").
      
      Định dạng trả về duy nhất là JSON:
      {
        "groups": [
          { "name": "Tên ngách", "indices": [0, 1, 2...] }
        ]
      }
    `;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [...imageParts, { text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.2 // Giảm độ ngẫu nhiên để tăng chính xác
        }
      });

      const responseText = result.text || "{}";
      const parsed = JSON.parse(responseText);

      if (parsed.groups) {
        parsed.groups.forEach((g: any) => {
          const groupImageIds = g.indices
            .map((idx: number) => batch[idx]?.id)
            .filter(Boolean);
          
          if (groupImageIds.length > 0) {
            groups.push({
              id: Math.random().toString(36).substr(2, 9),
              name: g.name,
              imageIds: groupImageIds,
            });
          }
        });
      }
    } catch (error) {
      console.error("Lỗi phân loại batch:", error);
      groups.push({
        id: "error-" + i,
        name: "Chưa phân loại được",
        imageIds: batch.map(img => img.id),
      });
    }
  }

  // HẬU XỬ LÝ: Xử lý quy tắc "Không có folder 2 ảnh"
  const finalGroups: NicheGroup[] = [];
  const leftoverImages: string[] = [];

  // Bước 1: Gom các nhóm có tên giống hệt nhau (nếu có do xử lý batch)
  const mergedGroups: { [name: string]: string[] } = {};
  groups.forEach(g => {
    if (!mergedGroups[g.name]) {
      mergedGroups[g.name] = [];
    }
    mergedGroups[g.name].push(...g.imageIds);
  });

  // Bước 2: Kiểm tra kích thước và xử lý nhóm có 2 ảnh
  const groupNames = Object.keys(mergedGroups);
  
  groupNames.forEach((name, index) => {
    const ids = mergedGroups[name];
    
    if (ids.length === 2) {
      // Nếu nhóm có 2 ảnh, cố gắng đẩy vào nhóm trước hoặc sau
      if (index > 0) {
        const prevName = groupNames[index - 1];
        mergedGroups[prevName].push(...ids);
        delete mergedGroups[name];
      } else if (index < groupNames.length - 1) {
        const nextName = groupNames[index + 1];
        mergedGroups[nextName].push(...ids);
        delete mergedGroups[name];
      } else {
        // Nếu là nhóm duy nhất mà có 2 ảnh, đưa vào leftover
        leftoverImages.push(...ids);
        delete mergedGroups[name];
      }
    }
  });

  // Tạo danh sách finalGroups từ mergedGroups đã xử lý
  Object.entries(mergedGroups).forEach(([name, ids]) => {
    if (ids.length > 0) {
      finalGroups.push({
        id: Math.random().toString(36).substr(2, 9),
        name,
        imageIds: ids
      });
    }
  });

  // Xử lý nốt leftover nếu có
  if (leftoverImages.length > 0) {
    if (finalGroups.length > 0) {
      finalGroups[0].imageIds.push(...leftoverImages);
    } else {
      finalGroups.push({
        id: "misc",
        name: "Nhóm tổng hợp",
        imageIds: leftoverImages
      });
    }
  }

  onProgress("Phân loại hoàn tất!", 100);
  return finalGroups;
};
