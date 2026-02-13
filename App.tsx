
import React, { useState, useMemo, useEffect } from 'react';
import { ItemStatus, ItemCategory, LostFoundItem, ClaimRequest, CAMPUS_LOCATIONS, UserProfile, Notification } from './types';
import Navbar from './components/Navbar';
import ItemCard from './components/ItemCard';
import StatsDashboard from './components/StatsDashboard';
import { analyzeItem, generateItemImage, findMatches } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explore' | 'report' | 'stats' | 'activities' | 'profile'>('explore');
  
  // Initialize with empty arrays to ensure a clean start
  const [items, setItems] = useState<LostFoundItem[]>(() => {
    const saved = localStorage.getItem('campus_finder_items');
    return saved ? JSON.parse(saved) : [];
  });

  const [claims, setClaims] = useState<ClaimRequest[]>(() => {
    const saved = localStorage.getItem('campus_finder_claims');
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('campus_finder_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null);
  const [matches, setMatches] = useState<LostFoundItem[]>([]);
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimAnswer, setClaimAnswer] = useState('');
  const [isManualVerifying, setIsManualVerifying] = useState(false);
  const [manualVerifyName, setManualVerifyName] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<ItemStatus>(ItemStatus.LOST);
  const [formLocation, setFormLocation] = useState(CAMPUS_LOCATIONS[0]);
  const [formSpecificSpot, setFormSpecificSpot] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState('');

  useEffect(() => {
    localStorage.setItem('campus_finder_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('campus_finder_claims', JSON.stringify(claims));
  }, [claims]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, searchQuery, filterCategory]);

  useEffect(() => {
    if (selectedItem) {
      findMatches(selectedItem, items).then(matchIds => {
        setMatches(items.filter(i => matchIds.includes(i.id)));
      });
    } else {
      setMatches([]);
    }
  }, [selectedItem, items]);

  const addNotification = (title: string, message: string, type: Notification['type']) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title, message, timestamp: 'Just now', isRead: false, type
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleResetAllData = () => {
    if (window.confirm('WIPE ALL DATA: This will permanently delete every report and claim across the entire app. Continue?')) {
      setItems([]);
      setClaims([]);
      setSelectedItem(null);
      localStorage.removeItem('campus_finder_items');
      localStorage.removeItem('campus_finder_claims');
      addNotification("Registry Purged", "All reports have been successfully removed.", "REWARD");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReport = async () => {
    if (!user) { setActiveTab('profile'); return; }
    if (!formDescription) return;
    setIsProcessing(true);
    setProcessingStep('AI is analyzing details...');
    
    try {
      const aiResult = await analyzeItem(formDescription, formImage || undefined);
      let finalImageUrl = formImage;
      if (!finalImageUrl && aiResult) {
        setProcessingStep('Visualizing item...');
        finalImageUrl = await generateItemImage(aiResult.title, aiResult.aiDescription);
      }
      
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      const newItem: LostFoundItem = {
        id: Math.random().toString(36).substr(2, 9),
        title: aiResult?.title || 'New Item',
        description: aiResult?.aiDescription || formDescription,
        category: aiResult?.category as ItemCategory || ItemCategory.OTHER,
        location: formLocation,
        specificSpot: formSpecificSpot,
        date: formDate, time: formTime,
        status: formStatus,
        imageUrl: finalImageUrl || `https://picsum.photos/seed/${Math.random()}/400/300`,
        reporterName: user.name, reporterContact: user.contact,
        tags: aiResult?.tags || [], verificationQuestion: formQuestion,
        expiryDate: expiry.toISOString().split('T')[0], isSecurityVerified: false
      };
      
      setItems(prev => [newItem, ...prev]);
      setActiveTab('explore');
      setFormDescription(''); setFormImage(null); setFormQuestion(''); setFormSpecificSpot(''); setFormTime('');
      addNotification("Reported Successfully", "Your item is now live on the Global Campus Feed.", "REWARD");
    } finally { setIsProcessing(false); }
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this report? It will be removed from the public feed.')) {
      setItems(prev => prev.filter(item => item.id !== id));
      addNotification("Report Deleted", "Your item report has been removed.", "REWARD");
    }
  };

  const handleMarkReturned = (id: string) => {
    setIsManualVerifying(true);
  };

  const confirmManualReturn = () => {
    if (!selectedItem) return;
    const itemName = selectedItem.title;
    setItems(prev => prev.map(item => item.id === selectedItem.id ? { ...item, status: ItemStatus.RETURNED } : item));
    setSelectedItem(prev => prev ? { ...prev, status: ItemStatus.RETURNED } : null);
    addNotification("Reunited! 🎉", `${itemName} has been marked as returned to ${manualVerifyName || 'owner'}.`, "APPROVAL");
    setIsManualVerifying(false);
    setManualVerifyName('');
  };

  const handleClaim = () => {
    if (!user || !selectedItem || !claimAnswer) return;
    const newClaim: ClaimRequest = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: selectedItem.id, claimantName: user.name, claimantContact: user.contact,
      verificationAnswer: claimAnswer, status: 'PENDING', timestamp: new Date().toISOString()
    };
    setClaims(prev => [...prev, newClaim]);
    addNotification("Claim Sent", `Pending verification for ${selectedItem.title}`, 'CLAIM');
    setIsClaiming(false); setClaimAnswer('');
  };

  const resolveClaim = (claimId: string, approved: boolean) => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: approved ? 'APPROVED' : 'REJECTED' } : c));
    
    if (approved) {
      setItems(prev => prev.map(item => item.id === claim.itemId ? { ...item, status: ItemStatus.RETURNED } : item));
      const item = items.find(i => i.id === claim.itemId);
      addNotification("Item Returned! 🎉", `${item?.title} has been successfully verified and returned.`, 'APPROVAL');
      if (selectedItem?.id === claim.itemId) {
        setSelectedItem(prev => prev ? { ...prev, status: ItemStatus.RETURNED } : null);
      }
    } else {
      addNotification("Claim Rejected", "The verification answer was marked as incorrect.", "CLAIM");
    }
  };

  const saveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProfile: UserProfile = {
      name: formData.get('name') as string,
      studentId: formData.get('studentId') as string,
      contact: formData.get('contact') as string,
      hostel: formData.get('hostel') as string,
      avatarSeed: (formData.get('name') as string) || 'Oliver',
      heroPoints: user?.heroPoints || 0
    };
    setUser(newProfile);
    localStorage.setItem('campus_finder_user', JSON.stringify(newProfile));
    setActiveTab('explore');
  };

  const handleThankHero = (itemId: string, reporterName: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? {...i, hasBeenThanked: true} : i));
    addNotification("Hero Recognized! ✋", `You sent a high-five to ${reporterName}`, 'REWARD');
    if (user) {
        const updatedUser = { ...user, heroPoints: user.heroPoints + 10 };
        setUser(updatedUser);
        localStorage.setItem('campus_finder_user', JSON.stringify(updatedUser));
    }
  };

  const getStatusStep = (item: LostFoundItem) => {
    if (item.status === ItemStatus.RETURNED) return 3;
    const hasActiveClaims = claims.some(c => c.itemId === item.id && c.status === 'PENDING');
    if (hasActiveClaims) return 2;
    return 1;
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} notifications={notifications} user={user} onMarkRead={() => setNotifications(prev => prev.map(n => ({...n, isRead: true})))} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between bg-white/50 border border-slate-200 p-4 rounded-2xl backdrop-blur-md">
           <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full animate-pulse ${items.length > 0 ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Campus Registry Active</span>
           </div>
           <div className="flex items-center gap-4">
             <div className="text-[10px] font-bold text-slate-400">
               {items.length} Reports Found
             </div>
             {items.length > 0 && (
               <button 
                 onClick={handleResetAllData}
                 className="p-2 text-red-400 hover:text-red-600 transition-colors flex items-center gap-2"
                 title="Clear All Reports"
               >
                 <i className="fa-solid fa-trash-can text-xs"></i>
                 <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Purge Registry</span>
               </button>
             )}
           </div>
        </div>

        {!user && activeTab !== 'profile' && (
          <div className="mb-8 p-6 bg-indigo-600 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">👤</div>
              <div>
                <h3 className="text-lg font-bold">Setup Required</h3>
                <p className="text-indigo-100 text-sm">Please setup your profile to start using Campus Finder.</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('profile')} className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors">Setup Profile</button>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Global Feed</h1>
                <p className="text-slate-400 font-medium text-sm mt-1">Browse items reported by everyone across campus.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex items-center">
                  <input type="text" placeholder="Search across campus..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 shadow-sm text-sm font-medium" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  <i className="fa-solid fa-magnifying-glass absolute left-4 text-slate-300 text-xs"></i>
                </div>
                <select className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none shadow-sm text-sm font-bold" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="All">All Categories</option>
                  {Object.values(ItemCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(item => <ItemCard key={item.id} item={item} onClick={setSelectedItem} />)}
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[40px] border border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6"><i className="fa-solid fa-earth-americas text-slate-200 text-3xl"></i></div>
                <h3 className="text-xl font-bold text-slate-800">No public reports found</h3>
                <p className="text-slate-400 text-sm mt-2">The registry is currently empty. Be the first to help someone!</p>
                <button onClick={() => setActiveTab('report')} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">Report Item Now</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
             <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
               <div className="bg-indigo-600 p-10 text-white">
                  <h2 className="text-3xl font-black tracking-tight">Publish to Campus</h2>
                  <p className="opacity-70 font-medium text-sm mt-1">Your report will be visible to everyone instantly.</p>
               </div>
               <div className="p-10 space-y-8">
                  <div className="flex gap-4 p-1.5 bg-slate-100 rounded-2xl">
                    <button onClick={() => setFormStatus(ItemStatus.LOST)} className={`flex-1 py-4 rounded-xl font-black text-sm transition-all ${formStatus === ItemStatus.LOST ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>LOST</button>
                    <button onClick={() => setFormStatus(ItemStatus.FOUND)} className={`flex-1 py-4 rounded-xl font-black text-sm transition-all ${formStatus === ItemStatus.FOUND ? 'bg-white shadow-md text-emerald-600' : 'text-slate-400'}`}>FOUND</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">General Area</label>
                      <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" value={formLocation} onChange={e => setFormLocation(e.target.value)}>
                        {CAMPUS_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specific Spot</label>
                      <input type="text" placeholder="e.g. Room 302, Bench 2" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold" value={formSpecificSpot} onChange={e => setFormSpecificSpot(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                      <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</label>
                      <input type="time" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold" value={formTime} onChange={e => setFormTime(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea placeholder="Brand, color, unique marks..." className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none h-32 text-sm font-medium" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
                  </div>

                  {formStatus === ItemStatus.FOUND && (
                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                       <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 block">Security Question Gatekeeper</label>
                       <p className="text-[9px] text-amber-600 mb-3 font-medium">To prevent false claims, hide a detail and ask the owner to identify it.</p>
                       <input type="text" placeholder="e.g. What does the keychain look like?" className="w-full p-4 bg-white border border-amber-200 rounded-2xl outline-none text-sm" value={formQuestion} onChange={e => setFormQuestion(e.target.value)} />
                    </div>
                  )}

                  <div className="flex items-center gap-6">
                    <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                      <i className="fa-solid fa-camera text-slate-300"></i>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    {formImage && <img src={formImage} className="w-20 h-20 object-cover rounded-2xl shadow-md border border-white" />}
                  </div>

                  <button 
                    onClick={handleSubmitReport}
                    disabled={isProcessing || !formDescription}
                    className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? <span>{processingStep}</span> : "Publish Globally"}
                  </button>
               </div>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto animate-in zoom-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 p-10">
              <div className="flex flex-col items-center mb-10 text-center">
                <div className="w-24 h-24 rounded-full border-4 border-indigo-100 p-1 mb-4">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed || 'Oliver'}`} className="w-full h-full rounded-full bg-slate-50" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Profile Settings</h2>
                <div className="mt-2 flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                   <i className="fa-solid fa-star text-indigo-500 text-xs"></i>
                   <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">{user?.heroPoints || 0} Hero Points</span>
                </div>
              </div>

              <form onSubmit={saveProfile} className="space-y-6">
                <input name="name" defaultValue={user?.name} required placeholder="Full Name" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
                <input name="studentId" defaultValue={user?.studentId} required placeholder="Student ID" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
                <input name="contact" defaultValue={user?.contact} required placeholder="Contact (Phone/Email)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
                <select name="hostel" defaultValue={user?.hostel} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none">
                  <option value="Krishna Boys Hostel">Krishna Boys Hostel</option>
                  <option value="Tunga Boys Hostel">Tunga Boys Hostel</option>
                  <option value="Bhadra Boys Hostel">Bhadra Boys Hostel</option>
                  <option value="Netravati Girls Hostel">Netravati Girls Hostel</option>
                  <option value="Kaveri Girls Hostel">Kaveri Girls Hostel</option>
                  <option value="Other">Off Campus</option>
                </select>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-sm">Save Profile</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
           <div className="space-y-12">
              <div className="flex items-end justify-between">
                <div>
                   <h2 className="text-3xl font-black text-slate-800 tracking-tight">My Pipeline</h2>
                   <p className="text-slate-400 text-sm font-medium">Tracking items you've reported or claimed.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">My Public Reports</h4>
                    {items.filter(i => i.reporterName === user?.name).length > 0 ? (
                       items.filter(i => i.reporterName === user?.name).map(item => (
                         <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                               <img src={item.imageUrl} className="w-16 h-16 rounded-xl object-cover shadow-sm border border-slate-100" />
                               <div className="flex-grow">
                                  <h5 className="font-bold text-slate-800">{item.title}</h5>
                                  <div className="flex items-center gap-2 mt-1">
                                     <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${item.status === ItemStatus.LOST ? 'bg-red-50 text-red-500' : item.status === ItemStatus.FOUND ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>{item.status}</span>
                                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.location}</span>
                                  </div>
                               </div>
                               <div className="flex gap-2">
                                 {item.status !== ItemStatus.RETURNED && (
                                   <button onClick={() => { setSelectedItem(item); handleMarkReturned(item.id); }} className="p-2 text-emerald-400 hover:text-emerald-600 transition-colors" title="Mark as Reunited"><i className="fa-solid fa-circle-check"></i></button>
                                 )}
                                 <button onClick={() => setShowQRModal(item.id)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Generate QR Code"><i className="fa-solid fa-qrcode"></i></button>
                                 <button onClick={() => setSelectedItem(item)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><i className="fa-solid fa-up-right-from-square"></i></button>
                                 <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors" title="Delete Report"><i className="fa-solid fa-trash"></i></button>
                               </div>
                            </div>
                         </div>
                       ))
                    ) : (
                       <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-300">No public items reported by you yet.</div>
                    )}
                 </div>
                 
                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">My Active Claims</h4>
                    {claims.filter(c => c.claimantName === user?.name).length > 0 ? (
                      claims.filter(c => c.claimantName === user?.name).map(claim => {
                        const item = items.find(i => i.id === claim.itemId);
                        return (
                          <div key={claim.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                            <img src={item?.imageUrl} className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100" />
                            <div className="flex-grow">
                              <h5 className="font-bold text-slate-800 text-sm">Claim for {item?.title || 'Unknown Item'}</h5>
                              <div className={`text-[10px] font-black mt-1 uppercase tracking-tighter ${claim.status === 'APPROVED' ? 'text-emerald-500' : claim.status === 'PENDING' ? 'text-amber-500' : 'text-red-500'}`}>{claim.status}</div>
                            </div>
                            {claim.status === 'APPROVED' && item && !item.hasBeenThanked && (
                                <button 
                                    onClick={() => handleThankHero(item.id, item.reporterName)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-hand-holding-heart"></i> THANK FINDER
                                </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                       <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-300">No active claims.</div>
                    )}
                 </div>
              </div>

              {/* Reset Section */}
              <div className="pt-12 border-t border-slate-200">
                 <div className="bg-red-50 p-8 rounded-[40px] border border-red-100">
                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <i className="fa-solid fa-triangle-exclamation"></i> Danger Zone
                    </h4>
                    <p className="text-sm font-bold text-red-900 mb-4">Reset Entire Campus Registry</p>
                    <p className="text-xs text-red-400 mb-6 leading-relaxed">This will remove every single report and claim made in the application. This action cannot be undone.</p>
                    <button 
                       onClick={handleResetAllData}
                       className="px-6 py-3 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-600 active:scale-95 transition-all"
                    >
                       Remove All Reports In App
                    </button>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'stats' && <StatsDashboard items={items} />}
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[40px] w-full max-w-5xl my-auto flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-400 overflow-hidden">
            <div className="md:w-1/2 h-96 md:h-auto relative overflow-hidden bg-slate-100">
              <img src={selectedItem.imageUrl} className="w-full h-full object-cover" />
              <div className={`absolute top-8 left-8 px-4 py-2 rounded-2xl text-xs font-bold border border-white/20 uppercase tracking-widest backdrop-blur-md shadow-lg ${selectedItem.status === ItemStatus.LOST ? 'bg-red-500/80' : selectedItem.status === ItemStatus.FOUND ? 'bg-emerald-500/80' : 'bg-slate-500/80'} text-white`}>
                {selectedItem.status}
              </div>
            </div>
            
            <div className="md:w-1/2 p-10 flex flex-col max-h-[90vh]">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{selectedItem.category}</span>
                    <h2 className="text-3xl font-black text-slate-800 mt-3 leading-tight tracking-tight">{selectedItem.title}</h2>
                  </div>
                  <button onClick={() => { setSelectedItem(null); setIsClaiming(false); setIsManualVerifying(false); }} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><i className="fa-solid fa-xmark text-xl"></i></button>
               </div>

               <div className="mb-8 mt-2 px-2">
                 <div className="flex items-center justify-between relative">
                   <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
                   <div className={`absolute top-1/2 left-0 h-0.5 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-700`} style={{ width: `${getStatusStep(selectedItem) === 1 ? '0%' : getStatusStep(selectedItem) === 2 ? '50%' : '100%'}` }}></div>
                   
                   <div className="relative z-10 flex flex-col items-center">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg transition-all duration-300 ${getStatusStep(selectedItem) >= 1 ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' : 'bg-white border-2 border-slate-200 text-slate-300'}`}>
                       <i className="fa-solid fa-flag"></i>
                     </div>
                     <span className={`text-[9px] font-black mt-2 uppercase tracking-tighter ${getStatusStep(selectedItem) >= 1 ? 'text-indigo-600' : 'text-slate-300'}`}>Reported</span>
                   </div>

                   <div className="relative z-10 flex flex-col items-center">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg transition-all duration-300 ${getStatusStep(selectedItem) >= 2 ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' : 'bg-white border-2 border-slate-200 text-slate-300'}`}>
                       <i className="fa-solid fa-magnifying-glass"></i>
                     </div>
                     <span className={`text-[9px] font-black mt-2 uppercase tracking-tighter ${getStatusStep(selectedItem) >= 2 ? 'text-indigo-600' : 'text-slate-300'}`}>Verifying</span>
                   </div>

                   <div className="relative z-10 flex flex-col items-center">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg transition-all duration-300 ${getStatusStep(selectedItem) >= 3 ? 'bg-emerald-500 text-white ring-4 ring-emerald-50' : 'bg-white border-2 border-slate-200 text-slate-300'}`}>
                       <i className="fa-solid fa-check"></i>
                     </div>
                     <span className={`text-[9px] font-black mt-2 uppercase tracking-tighter ${getStatusStep(selectedItem) >= 3 ? 'text-emerald-500' : 'text-slate-300'}`}>Returned</span>
                   </div>
                 </div>
               </div>

               <div className="flex-grow overflow-y-auto space-y-8 pr-3 custom-scrollbar">
                  {selectedItem.reporterName === user?.name && selectedItem.status !== ItemStatus.RETURNED && (
                    <div className="space-y-6">
                       <div className="bg-indigo-50/50 p-6 rounded-[32px] border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <i className="fa-solid fa-user-shield"></i> VERIFICATION HUB
                          </h4>
                          
                          {claims.filter(c => c.itemId === selectedItem.id).length > 0 ? (
                            <div className="space-y-3">
                               {claims.filter(c => c.itemId === selectedItem.id).map(claim => (
                                  <div key={claim.id} className={`p-4 rounded-2xl border transition-all ${claim.status === 'PENDING' ? 'bg-white border-indigo-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                                     <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                           <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">{claim.claimantName.charAt(0)}</div>
                                           <span className="text-xs font-black text-slate-700">{claim.claimantName}</span>
                                        </div>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${claim.status === 'PENDING' ? 'bg-indigo-50 text-indigo-500' : claim.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>{claim.status}</span>
                                     </div>
                                     <p className="text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">" {claim.verificationAnswer} "</p>
                                     {claim.status === 'PENDING' && (
                                       <div className="flex gap-2 mt-4">
                                          <button onClick={() => resolveClaim(claim.id, true)} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"><i className="fa-solid fa-check"></i> VERIFY & RETURN</button>
                                          <button onClick={() => resolveClaim(claim.id, false)} className="px-4 py-2.5 bg-white text-red-400 border border-red-100 rounded-xl text-[10px] font-black hover:bg-red-50 transition-all">REJECT</button>
                                       </div>
                                     )}
                                  </div>
                               ))}
                            </div>
                          ) : (
                            <div className="text-center py-6">
                               <p className="text-[10px] font-bold text-slate-400">Waiting for owner requests...</p>
                            </div>
                          )}

                          <div className="mt-6 pt-6 border-t border-indigo-100">
                             {isManualVerifying ? (
                               <div className="bg-white p-4 rounded-2xl border border-indigo-100 animate-in zoom-in-95">
                                  <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Who are you returning it to?</label>
                                  <input type="text" placeholder="Enter name or ID..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs mb-3" value={manualVerifyName} onChange={e => setManualVerifyName(e.target.value)} />
                                  <div className="flex gap-2">
                                     <button onClick={confirmManualReturn} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Verify Reunion</button>
                                     <button onClick={() => setIsManualVerifying(false)} className="px-4 py-3 text-slate-400 font-bold text-xs">Cancel</button>
                                  </div>
                               </div>
                             ) : (
                               <button onClick={() => setIsManualVerifying(true)} className="w-full py-4 bg-white text-slate-900 border-2 border-slate-900/5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-3">
                                  <i className="fa-solid fa-handshake"></i> MANUAL IN-PERSON RETURN
                                </button>
                             )}
                          </div>
                       </div>
                    </div>
                  )}

                  <p className="text-slate-600 leading-relaxed text-sm">{selectedItem.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">General Area</p>
                        <p className="text-xs font-bold text-slate-700 truncate"><i className="fa-solid fa-location-dot mr-1.5 text-indigo-400"></i> {selectedItem.location}</p>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Reporter</p>
                        <p className="text-xs font-bold text-slate-700 truncate"><i className="fa-solid fa-user-check mr-1.5 text-indigo-400"></i> {selectedItem.reporterName}</p>
                     </div>
                  </div>

                  {selectedItem.reporterName !== user?.name && selectedItem.status !== ItemStatus.RETURNED && (
                    isClaiming ? (
                      <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 space-y-6 animate-in slide-in-from-bottom-2">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                           <i className="fa-solid fa-shield-halved"></i> Verification Gatekeeper
                        </p>
                        <p className="text-sm font-bold text-emerald-900 leading-relaxed italic">
                           Finder's Question: "{selectedItem.verificationQuestion || "Please provide unique details to verify ownership."}"
                        </p>
                        <textarea placeholder="Type your answer here..." className="w-full p-4 bg-white border border-emerald-200 rounded-2xl outline-none text-sm h-24 shadow-sm" value={claimAnswer} onChange={e => setClaimAnswer(e.target.value)} />
                        <div className="flex gap-4">
                          <button onClick={handleClaim} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs">Send Claim Request</button>
                          <button onClick={() => setIsClaiming(false)} className="flex-1 py-4 bg-white text-slate-400 rounded-2xl font-bold border border-emerald-100 text-xs uppercase">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { if(!user) { setActiveTab('profile'); return; } setIsClaiming(true); }} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95">
                        {selectedItem.status === ItemStatus.FOUND ? "YES, THIS IS MINE" : "I FOUND THIS ITEM"}
                        <i className="fa-solid fa-arrow-right text-xs"></i>
                      </button>
                    )
                  )}

                  {selectedItem.status === ItemStatus.RETURNED && (
                    <div className="bg-emerald-500 p-10 rounded-[48px] text-white text-center shadow-2xl animate-in zoom-in-95 overflow-hidden relative">
                       <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg border border-white/20">🎉</div>
                       <h4 className="text-2xl font-black mb-2 tracking-tight">Successfully Reunited!</h4>
                       <p className="text-emerald-100 text-sm font-medium leading-relaxed">This item has been successfully verified and returned to its owner.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {showQRModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Printable Tag</h3>
                <div className="bg-white p-4 rounded-3xl border-4 border-slate-900 inline-block mb-8 shadow-xl">
                   <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=campus-finder-item-${showQRModal}`} alt="QR Code" className="w-40 h-40" />
                </div>
                <button onClick={() => window.print()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl mb-3 hover:bg-indigo-700 transition-colors">Print Tag</button>
                <button onClick={() => setShowQRModal(null)} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600">Close</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
