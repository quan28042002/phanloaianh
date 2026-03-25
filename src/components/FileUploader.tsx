import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileArchive, FolderOpen, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, isProcessing }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesSelected(acceptedFiles);
    }
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isProcessing,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/zip': ['.zip']
    }
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative group cursor-pointer transition-all duration-700",
        "border-4 border-dashed rounded-[3rem] p-24 text-center overflow-hidden",
        isDragActive 
          ? "border-orange-500 bg-orange-50/30 shadow-2xl shadow-orange-500/10" 
          : "border-slate-200 hover:border-orange-500/30 bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-orange-500/5",
        isProcessing && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      
      <motion.div 
        initial={false}
        animate={{ scale: isDragActive ? 1.02 : 1 }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        <div className={cn(
          "w-28 h-28 rounded-[2rem] flex items-center justify-center transition-all duration-700 shadow-md border-2 border-slate-200",
          isDragActive 
            ? "bg-orange-600 text-white scale-110 rotate-12 border-orange-500" 
            : "bg-slate-50 text-slate-500 group-hover:text-orange-600 group-hover:bg-white group-hover:shadow-2xl group-hover:border-orange-500/40"
        )}>
          <Upload className="w-12 h-12" />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-slate-900 font-black text-4xl tracking-tighter">
            {isDragActive ? "Thả ngay tại đây!" : "Bắt đầu phân loại"}
          </h3>
          <p className="text-slate-400 text-lg max-w-sm mx-auto leading-relaxed font-medium">
            Kéo thả file <span className="text-orange-600 font-bold">.ZIP</span> hoặc chọn thư mục ảnh để AI xử lý tự động.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-6">
          <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl">
            <FileArchive className="w-4 h-4 text-orange-500" /> ZIP ARCHIVE
          </div>
          <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl">
            <FolderOpen className="w-4 h-4 text-amber-500" /> FOLDER SCAN
          </div>
          <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl">
            <Zap className="w-4 h-4 text-yellow-500" /> FAST AI
          </div>
        </div>
      </motion.div>

      {isProcessing && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-[3rem] flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-slate-900 font-black text-xl tracking-[0.2em] uppercase">Analyzing Content</p>
          </div>
        </div>
      )}
    </div>
  );
};
