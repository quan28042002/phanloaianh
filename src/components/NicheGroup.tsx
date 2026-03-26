import React, { useState } from 'react';
import { Edit2, Check, Trash2, ChevronRight, ChevronDown, ImageIcon, Download } from 'lucide-react';
import { NicheGroup, ImageFile } from '../lib/classifier';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface NicheGroupProps {
  group: NicheGroup;
  images: ImageFile[];
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onRemoveImage: (groupId: string, imageId: string) => void;
  onDownload: () => void;
  onPreview: (image: ImageFile) => void;
}

export const NicheGroupCard: React.FC<NicheGroupProps> = ({ 
  group, 
  images, 
  onRename, 
  onDelete,
  onRemoveImage,
  onDownload,
  onPreview
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(group.name);
  const [isExpanded, setIsExpanded] = useState(true);

  const groupImages = group.imageIds.map(id => images.find(img => img.id === id)).filter(Boolean) as ImageFile[];

  const handleSave = () => {
    onRename(group.id, tempName);
    setIsEditing(false);
  };

  return (
    <motion.div 
      layout
      className="group bg-white border-2 border-slate-200 rounded-[2.5rem] overflow-hidden transition-all duration-700 hover:border-orange-500/40 hover:shadow-2xl hover:shadow-slate-300/60"
    >
      <div className="p-8 flex items-center justify-between bg-slate-100/40 border-b-2 border-slate-100">
        <div className="flex items-center gap-6 flex-1">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-orange-600 hover:border-orange-500/30 transition-all shadow-sm"
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
          
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-3 max-w-md">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-white border-2 border-orange-500/30 text-slate-900 px-5 py-3 rounded-2xl text-lg w-full focus:outline-none focus:ring-8 focus:ring-orange-500/5 font-black tracking-tight"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button onClick={handleSave} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-900/10">
                  <Check className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <h3 className="text-slate-900 font-black text-2xl tracking-tighter group-hover:text-orange-600 transition-colors">
                  {group.name}
                </h3>
                <div className="flex items-center gap-2 bg-white text-slate-400 px-4 py-1.5 rounded-full text-[9px] font-bold tracking-[0.2em] uppercase border border-slate-100 shadow-sm">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                  {group.imageIds.length} FILES
                </div>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onDownload}
            className="p-4 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-2xl transition-all duration-300 flex items-center gap-2 group/dl"
            title="Tải nhóm này"
          >
            <Download className="w-5 h-5 group-hover/dl:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Tải thư mục</span>
          </button>
          
          <button 
            onClick={() => onDelete(group.id)}
            className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300"
            title="Xóa nhóm"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="p-10 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-5">
              {groupImages.map((img, idx) => (
                <motion.div 
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  className="relative group/img aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 hover:border-orange-500/50 transition-all duration-700 cursor-pointer"
                  onClick={() => onPreview(img)}
                >
                  <img 
                    src={img.data} 
                    alt={img.name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-all duration-500 flex flex-col justify-between p-3">
                    <div className="flex justify-end">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveImage(group.id, img.id);
                        }}
                        className="p-2 bg-white text-red-500 rounded-xl hover:bg-red-500 hover:text-white shadow-2xl transform translate-y-[-20px] group-hover/img:translate-y-0 transition-all duration-500 border border-slate-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[8px] text-white font-bold truncate bg-black/40 backdrop-blur-md px-2 py-1.5 rounded-lg border border-white/10">
                      {img.name}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
