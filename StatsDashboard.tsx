import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LostFoundItem, ItemStatus } from '../types';

interface StatsDashboardProps {
  items: LostFoundItem[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatsDashboard: React.FC<StatsDashboardProps> = ({ items }) => {
  const categoryData = Object.values(items.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || { name: item.category, value: 0 };
    acc[item.category].value += 1;
    return acc;
  }, {} as Record<string, { name: string; value: number }>));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Success Rate</div>
          <div className="text-4xl font-black text-emerald-600">
            {items.length > 0 ? Math.round((items.filter(i => i.status === ItemStatus.RETURNED).length / items.length) * 100) : 0}%
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Reunited items</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Reports</div>
          <div className="text-4xl font-black text-indigo-600">{items.length}</div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Active ecosystem</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Lost Today</div>
          <div className="text-4xl font-black text-red-500">{items.filter(i => i.status === ItemStatus.LOST).length}</div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Items looking for owner</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-indigo-500"></i> Category Insights
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={10} width={90} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-emerald-500"></i> Recent Activity
          </h3>
          <div className="space-y-4 flex-grow overflow-y-auto pr-2">
            {items.slice(0, 5).map(i => (
              <div key={i.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <img src={i.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <div className="text-xs font-bold text-slate-800">{i.title}</div>
                  <div className="text-[9px] text-slate-400 uppercase font-black">{i.location}</div>
                </div>
                <div className={`ml-auto text-[9px] font-black px-2 py-0.5 rounded-full ${i.status === ItemStatus.LOST ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>{i.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;