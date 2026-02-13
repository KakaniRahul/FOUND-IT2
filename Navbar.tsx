import React, { useState } from 'react';
import { Notification, UserProfile } from '../types';

interface NavbarProps {
  activeTab: 'explore' | 'report' | 'stats' | 'activities' | 'profile';
  setActiveTab: (tab: 'explore' | 'report' | 'stats' | 'activities' | 'profile') => void;
  notifications: Notification[];
  user: UserProfile | null;
  onMarkRead: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, notifications, user, onMarkRead }) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('explore')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <i className="fa-solid fa-magnifying-glass-location text-xl"></i>
            </div>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 hidden sm:block tracking-tight">
              Campus Finder
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { id: 'explore', icon: 'fa-compass', label: 'Explore' },
              { id: 'report', icon: 'fa-plus-circle', label: 'Report' },
              { id: 'activities', icon: 'fa-bolt', label: 'My Activity' },
              { id: 'stats', icon: 'fa-chart-simple', label: 'Insights' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`}
              >
                <i className={`fa-solid ${tab.icon}`}></i>
                <span className="hidden lg:block">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => { setShowNotifs(!showNotifs); onMarkRead(); }}
                className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <i className="fa-solid fa-bell text-lg"></i>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">Notifications</h4>
                    <button onClick={() => setShowNotifs(false)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-indigo-50/30' : ''}`}>
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'MATCH' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            <i className={`fa-solid ${n.type === 'MATCH' ? 'fa-wand-magic-sparkles' : 'fa-check-circle'} text-xs`}></i>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{n.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[9px] text-slate-300 mt-1 uppercase font-bold">{n.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="p-10 text-center text-slate-300">
                        <i className="fa-solid fa-bell-slash text-2xl mb-2"></i>
                        <p className="text-xs">No notifications yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-9 h-9 rounded-full border-2 overflow-hidden shadow-sm transition-all ${activeTab === 'profile' ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-100 hover:border-indigo-200'}`}
            >
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed || 'Oliver'}`} alt="User" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;