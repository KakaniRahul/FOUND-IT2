import React from 'react';
import { LostFoundItem, ItemStatus } from '../types';

interface ItemCardProps {
  item: LostFoundItem;
  onClick: (item: LostFoundItem) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
  const isLost = item.status === ItemStatus.LOST;
  const isReturned = item.status === ItemStatus.RETURNED;

  return (
    <div 
      onClick={() => onClick(item)}
      className={`group relative bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border ${isReturned ? 'opacity-50 grayscale' : 'border-slate-100 hover:-translate-y-2'} cursor-pointer flex flex-col h-[400px]`}
    >
      <div className="relative h-52 overflow-hidden">
        <img 
          src={item.imageUrl} 
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg ${isLost ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {item.status}
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex-grow">
          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{item.category}</span>
          <h3 className="font-black text-slate-800 text-xl mt-1 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{item.title}</h3>
          <p className="text-slate-400 text-xs font-medium line-clamp-2 mt-2 leading-relaxed">{item.description}</p>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center text-[10px] text-slate-400 font-black gap-2">
            <i className="fa-solid fa-location-dot text-indigo-400"></i>
            <span className="truncate max-w-[120px] uppercase tracking-tighter">{item.location}</span>
          </div>
          <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{item.date}</div>
        </div>
      </div>
      
      {isReturned && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[2px] pointer-events-none">
           <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl -rotate-12 border-4 border-white">REUNITED 🎉</div>
        </div>
      )}
    </div>
  );
};

export default ItemCard;