import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { NicheGroupCard } from './components/NicheGroup';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ImageFile, NicheGroup, classifyImages } from './lib/classifier';
import { Download, RefreshCw, Trash2, ArrowRight, Sparkles, Layers, FolderTree, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [groups, setGroups] = useState<NicheGroup[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<ImageFile | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const addLog = (msg: string, percent?: number) => {
    setLog(prev => [...prev.slice(-4), msg]);
    if (percent !== undefined) setProgress(percent);
  };

  const handleFilesSelected = async (files: File[]) => {
    setIsProcessing(true);
    setLog([]);
    addLog("Bắt đầu tải file...");
    
    const loadedImages: ImageFile[] = [];
    
    for (const file of files) {
      if (file.name.endsWith('.zip')) {
        addLog(`Đang giải nén: ${file.name}`);
        const zip = new JSZip();
        const content = await zip.loadAsync(file);
        
        const entries = Object.keys(content.files).filter(name => 
          !content.files[name].dir && /\.(jpg|jpeg|png|webp)$/i.test(name)
        );

        for (const name of entries) {
          const blob = await content.files[name].async('blob');
          const base64 = await blobToBase64(blob);
          loadedImages.push({
            id: Math.random().toString(36).substr(2, 9),
            name: name.split('/').pop() || name,
            data: base64,
            blob,
            size: blob.size
          });
        }
      } else if (file.type.startsWith('image/')) {
        const base64 = await blobToBase64(file);
        loadedImages.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          data: base64,
          blob: file,
          size: file.size
        });
      }
    }

    if (loadedImages.length === 0) {
      addLog("Không tìm thấy ảnh hợp lệ!");
      setIsProcessing(false);
      return;
    }

    setImages(loadedImages);
    setProgress(0);
    addLog(`Đã tải ${loadedImages.length} ảnh. Nhấn "Bắt đầu phân tích" để tiếp tục.`);
    setIsProcessing(false);
  };

  const startClassification = async () => {
    if (images.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    setProgress(0);
    addLog("Đang khởi tạo AI...");
    
    try {
      const resultGroups = await classifyImages(images, (msg, percent) => addLog(msg, percent));
      
      // Tách nhóm: Tiêu chuẩn 5 ảnh/folder, tối đa 8 ảnh nếu là nhóm lẻ
      const splitGroups: NicheGroup[] = [];
      resultGroups.forEach(group => {
        const total = group.imageIds.length;
        if (total <= 8) {
          splitGroups.push(group);
        } else {
          // Chia nhỏ thành các folder 5 ảnh
          let i = 0;
          let chunkIndex = 1;
          while (i < total) {
            let remaining = total - i;
            let chunkSize = 5;
            
            // Nếu phần còn lại là 6, 7, hoặc 8, thì lấy hết luôn để tránh folder lẻ quá nhỏ (ví dụ 1, 2, 3 ảnh)
            if (remaining >= 6 && remaining <= 8) {
              chunkSize = remaining;
            } else if (remaining < 5) {
              chunkSize = remaining;
            }
            
            const chunk = group.imageIds.slice(i, i + chunkSize);
            splitGroups.push({
              id: Math.random().toString(36).substr(2, 9),
              name: `${group.name} ${chunkIndex++}`,
              imageIds: chunk
            });
            i += chunkSize;
          }
        }
      });

      setGroups(splitGroups);
      addLog("Phân loại hoàn tất!");
    } catch (error) {
      addLog("Lỗi: " + (error instanceof Error ? error.message : "Không xác định"));
    } finally {
      setIsProcessing(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleRenameGroup = (id: string, newName: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, name: newName } : g));
  };

  const handleDeleteGroup = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Xóa nhóm này?",
      message: "Bạn có chắc muốn xóa nhóm này? Ảnh sẽ không bị mất, chúng vẫn nằm trong danh sách tổng.",
      onConfirm: () => {
        setGroups(prev => prev.filter(g => g.id !== id));
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRemoveImage = (groupId: string, imageId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, imageIds: g.imageIds.filter(id => id !== imageId) };
      }
      return g;
    }));
  };

  const handleDownloadGroup = async (group: NicheGroup) => {
    addLog(`Đang chuẩn bị tải nhóm: ${group.name}...`);
    const zip = new JSZip();
    const folder = zip.folder(group.name);
    
    if (folder) {
      for (const imageId of group.imageIds) {
        const img = images.find(i => i.id === imageId);
        if (img) {
          folder.file(img.name, img.blob);
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${group.name}_${new Date().getTime()}.zip`);
    addLog(`Đã tải xuống nhóm: ${group.name}`);
  };

  const handleExport = async () => {
    addLog("Đang chuẩn bị file ZIP...");
    const zip = new JSZip();
    
    for (const group of groups) {
      const folder = zip.folder(group.name);
      if (folder) {
        for (const imageId of group.imageIds) {
          const img = images.find(i => i.id === imageId);
          if (img) {
            folder.file(img.name, img.blob);
          }
        }
      }
    }

    const report = {
      totalImages: images.length,
      totalGroups: groups.length,
      groups: groups.map(g => ({
        name: g.name,
        count: g.imageIds.length,
        files: g.imageIds.map(id => images.find(i => i.id === id)?.name)
      }))
    };
    zip.file("report.json", JSON.stringify(report, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `Phan_Loai_Anh_${new Date().getTime()}.zip`);
    addLog("Đã tải xuống file ZIP!");
  };

  const reset = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Làm mới hệ thống?",
      message: "Hành động này sẽ xóa toàn bộ dữ liệu hiện tại, bao gồm ảnh đã tải lên và các nhóm đã phân loại.",
      onConfirm: () => {
        setImages([]);
        setGroups([]);
        setLog([]);
        setProgress(0);
        setIsProcessing(false);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-orange-500/10">
      {/* Background Atmosphere - Very subtle */}
      <div className="bg-blob top-[-20%] left-[-10%] bg-slate-200" />
      <div className="bg-blob bottom-[-20%] right-[-10%] bg-orange-100" />
      
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-16 space-y-16 relative z-10">
        {images.length === 0 ? (
          <div className="max-w-4xl mx-auto pt-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
              className="text-center mb-24 space-y-10"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 text-[9px] font-bold tracking-[0.2em] uppercase border border-slate-200">
                <Sparkles className="w-3 h-3 text-orange-500" /> Intelligence by Nguyen Ival
              </div>
              <h2 className="text-7xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[1]">
                Phân loại hình ảnh. <br />
                <span className="text-orange-600">Thông minh & Tự động.</span>
              </h2>
              <p className="text-slate-500 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                Sử dụng trí tuệ nhân tạo Gemini 1.5 Flash để tự động hóa quy trình sắp xếp tài liệu số của bạn.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
            >
              <FileUploader onFilesSelected={handleFilesSelected} isProcessing={isProcessing} />
            </motion.div>
          </div>
        ) : (
          <div className="space-y-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-10 rounded-[3rem] border-2 border-slate-200 shadow-xl shadow-slate-200/40"
            >
              <div className="flex items-center gap-8">
                <div className="relative">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-slate-200 shadow-inner">
                    <Layers className="w-10 h-10 text-orange-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-slate-900 font-black text-4xl tracking-tight">Kết quả phân tích</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">
                    {groups.length} NHÓM • {images.length} TỔNG ẢNH
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                {groups.length === 0 && !isProcessing && (
                  <button 
                    onClick={startClassification}
                    className="group flex items-center gap-3 px-10 py-5 rounded-2xl bg-orange-600 hover:bg-orange-700 transition-all text-white font-black uppercase tracking-widest shadow-xl shadow-orange-600/20"
                  >
                    <ArrowRight className="w-5 h-5" /> 
                    Bắt đầu phân tích
                  </button>
                )}
                <button 
                  onClick={reset}
                  className="group flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-red-100 bg-red-50 hover:bg-red-500 hover:border-red-500 transition-all text-xs font-black uppercase tracking-widest text-red-600 hover:text-white shadow-lg shadow-red-500/5"
                >
                  <Trash2 className="w-4 h-4 transition-colors" /> 
                  Làm mới hệ thống
                </button>
                {groups.length > 0 && (
                  <button 
                    onClick={handleExport}
                    disabled={isProcessing}
                    className="group flex items-center gap-3 px-10 py-5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-bold uppercase tracking-widest shadow-xl shadow-slate-900/10"
                  >
                    <Download className="w-5 h-5" /> 
                    Xuất file ZIP
                  </button>
                )}
              </div>
            </motion.div>

            {isProcessing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-slate-200 rounded-[2rem] p-8 shadow-xl shadow-slate-200/30 space-y-4"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-slate-900 font-black text-xl tracking-tight">Đang phân tích dữ liệu...</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Vui lòng không đóng trình duyệt</p>
                  </div>
                  <span className="text-orange-600 font-black text-3xl tracking-tighter">{progress}%</span>
                </div>
                <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-1">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg shadow-orange-500/20"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            )}

            {log.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 font-mono text-[10px] text-slate-500 overflow-hidden shadow-inner"
              >
                <div className="flex items-center gap-2 mb-4 text-slate-400 font-bold uppercase tracking-[0.2em]">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Processing Status
                </div>
                <div className="space-y-2">
                  {log.map((msg, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <span className="text-slate-300">{new Date().toLocaleTimeString()}</span>
                      <span className={cn("font-medium", msg.includes("Lỗi") ? "text-red-500" : "text-slate-500")}>
                        {msg}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="grid gap-6">
              <AnimatePresence mode="popLayout">
                {groups.map((group, idx) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                  >
                    <NicheGroupCard 
                      group={group} 
                      images={images}
                      onRename={handleRenameGroup}
                      onDelete={handleDeleteGroup}
                      onRemoveImage={handleRemoveImage}
                      onDownload={() => handleDownloadGroup(group)}
                      onPreview={(img) => setPreviewImage(img)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {groups.length === 0 && !isProcessing && (
                <div className="text-center py-40 border-2 border-dashed border-slate-100 rounded-[4rem] bg-slate-50/30">
                  <Layers className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em]">Chưa có dữ liệu phân loại</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 bg-slate-900/90 backdrop-blur-xl"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-5xl w-full max-h-full bg-white rounded-[3rem] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-6 right-6 z-10">
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-4 bg-white/80 backdrop-blur-md text-slate-900 rounded-2xl hover:bg-white transition-all shadow-xl border border-slate-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex flex-col md:flex-row h-full max-h-[85vh]">
                <div className="flex-1 bg-slate-50 flex items-center justify-center overflow-hidden p-4">
                  <img
                    src={previewImage.data}
                    alt={previewImage.name}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="w-full md:w-80 p-10 flex flex-col justify-between bg-white border-l border-slate-100">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-slate-900 font-black text-2xl tracking-tight break-words">
                        {previewImage.name}
                      </h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Thông tin hình ảnh</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-slate-400 text-xs font-medium">Kích thước</span>
                        <span className="text-slate-900 font-bold text-xs">{(previewImage.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-slate-400 text-xs font-medium">Định dạng</span>
                        <span className="text-slate-900 font-bold text-xs uppercase">{previewImage.name.split('.').pop()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewImage.data;
                      link.download = previewImage.name;
                      link.click();
                    }}
                    className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-3"
                  >
                    <Download className="w-5 h-5" />
                    Tải ảnh này
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <footer className="border-t border-slate-100 py-16 mt-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm rotate-45" />
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">© 2026 NGUYEN IVAL VISION</p>
          </div>
          <div className="flex gap-12 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
            <a href="#" className="hover:text-slate-900 transition-colors">Design</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Legal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
