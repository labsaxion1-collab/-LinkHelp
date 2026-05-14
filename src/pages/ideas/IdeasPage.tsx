import React, { useState } from 'react';
import { 
  Lightbulb, Plus, Search, ChevronUp, MessageSquare, Image as ImageIcon, 
  Trash2, X, Filter, Target, Zap, Rocket, Shield, Wrench, Sparkles, Smartphone,
  CheckCircle2, Clock, CircleDot, Bug, Monitor, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData } from '@/context/AppDataContext';
import { mockUsers } from '@/data/mockUsers';
import { ROUTES } from '@/utils/constants';

const CATEGORIES = [
  { id: 'features', name: 'App Features', icon: Sparkles },
  { id: 'payments', name: 'Payments', icon: Target },
  { id: 'safety', name: 'Safety', icon: Shield },
  { id: 'helper_tools', name: 'Helper Tools', icon: Wrench },
  { id: 'experience', name: 'Customer Experience', icon: Zap },
  { id: 'design', name: 'Design', icon: Monitor },
  { id: 'bugs', name: 'Bug Report', icon: Bug },
  { id: 'services', name: 'New Services', icon: Plus },
  { id: 'ai', name: 'AI Features', icon: Sparkles },
  { id: 'notifications', name: 'Notifications', icon: CircleDot },
  { id: 'mobile', name: 'Mobile Experience', icon: Smartphone }
];

const MOCK_IDEAS = [
  {
    id: 1,
    title: 'Add a "Tip" feature for helpers after completion',
    description: 'I would love to be able to leave a tip for my last helper directly from the app instead of using physical cash. It would be super convenient and appreciative!',
    category: 'payments',
    votes: 428,
    comments: 32,
    creatorType: 'Client',
    status: 'planned',
    timestamp: '2 days ago',
    voted: true
  },
  {
    id: 2,
    title: 'Background Check Badges for Helpers',
    description: 'To increase trust, helpers who pass a background check should get a special badge on their profile.',
    category: 'safety',
    votes: 315,
    comments: 45,
    creatorType: 'Both',
    status: 'in_progress',
    timestamp: '1 week ago',
    voted: false
  },
  {
    id: 3,
    title: 'Real-time location tracking for emergency requests',
    description: 'If I request someone for an emergency, it would be great to see them on a map like Uber.',
    category: 'features',
    votes: 890,
    comments: 112,
    creatorType: 'Client',
    status: 'implemented',
    timestamp: '1 month ago',
    voted: true
  },
  {
    id: 4,
    title: 'Helper tools: Earnings Dashboard',
    description: 'A dedicated screen where helpers can track daily, weekly, and monthly earnings with a chart.',
    category: 'helper_tools',
    votes: 210,
    comments: 18,
    creatorType: 'Helper',
    status: 'under_review',
    timestamp: '4 hours ago',
    voted: false
  }
];

const STATUS_CONFIG = {
  'planned': { label: 'Planned', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'in_progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'implemented': { label: 'Implemented', color: 'bg-green-100 text-green-700 border-green-200' },
  'under_review': { label: 'Under Review', color: 'bg-gray-100 text-gray-700 border-gray-200' }
};

export default function IdeasPage() {
  const { t } = useLanguage();
  const { addNotification } = useAppData();
  const [ideas, setIdeas] = useState(MOCK_IDEAS);
  const [activeTab, setActiveTab] = useState<'feed' | 'roadmap'>('feed');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('trending');
  
  // Create Modal State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newUserType, setNewUserType] = useState('client');

  return (
    <div className="min-h-screen bg-[#fafafa]">
      
      {/* Top Navbar Simulation for context */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link to={ROUTES.clientDashboard} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="font-bold text-xl flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-yellow-500 fill-yellow-50" />
            LinkHelp Ideas
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm font-medium text-gray-600 border border-gray-200">
            <Search className="w-4 h-4" />
            <input type="text" placeholder="Search ideas..." className="bg-transparent border-none outline-none w-48 placeholder-gray-400" />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-50 via-white to-white pointer-events-none"></div>
        <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="inline-block py-1 px-3 rounded-full bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase tracking-wider mb-4 border border-yellow-200">
                Community Driven
              </span>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-4 tracking-tight">
                {t('ideas.title')}
              </h1>
              <p className="text-lg text-gray-600 font-medium mb-8">
                {t('ideas.subtitle')}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gray-900 text-white hover:bg-black font-bold px-6 py-3.5 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-5 h-5" />
                  {t('ideas.suggest')}
                </button>
              </div>
            </div>
            
            <div className="hidden lg:block w-[320px] relative">
              <div className="absolute inset-0 bg-yellow-300 rounded-[3rem] blur-2xl opacity-20 animate-pulse"></div>
              <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-xl relative z-10 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-col items-center gap-1">
                    <button className="text-blue-600 bg-blue-50 p-1.5 rounded-lg">
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <span className="font-bold text-lg">1,240</span>
                  </div>
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-green-200">
                    Implemented
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Dark Mode Support</h3>
                <p className="text-sm text-gray-500 line-clamp-2">Native support for dark mode matching system preferences for better nighttime reading.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200 mb-8 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('feed')}
            className={`font-bold pb-4 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'feed' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t('ideas.feed')}
          </button>
          <button 
            onClick={() => setActiveTab('roadmap')}
            className={`font-bold pb-4 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'roadmap' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t('ideas.roadmap')}
          </button>
        </div>

        {activeTab === 'feed' && (
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Feed Main */}
            <div className="flex-1 space-y-6">
              
              {/* Filters */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl inline-flex shadow-inner">
                  <button onClick={() => setFilter('trending')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'trending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                    {t('ideas.trending')}
                  </button>
                  <button onClick={() => setFilter('top')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'top' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                    {t('ideas.most_voted')}
                  </button>
                  <button onClick={() => setFilter('new')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                    {t('ideas.newest')}
                  </button>
                </div>
                <button className="flex items-center gap-2 text-gray-600 font-bold hover:text-gray-900 text-sm px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <Filter className="w-4 h-4" /> Filter
                </button>
              </div>

              {/* Ideas List */}
              <div className="space-y-4">
                {ideas.map(idea => (
                  <div key={idea.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-md transition-all flex gap-4 lg:gap-6 group">
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <button 
                        onClick={() => {
                           setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, voted: !i.voted, votes: i.voted ? i.votes - 1 : i.votes + 1 } : i));
                           if (!idea.voted) {
                             addNotification({
                               userId: mockUsers.client.id, // For demo, whoever
                               type: 'system',
                               title: 'Você curtiu uma ideia',
                               message: `Sua curtida em "${idea.title}" gerou votos para o autor!`,
                             });
                           }
                        }}
                        className={`p-2 rounded-xl border ${idea.voted ? 'bg-blue-50 border-blue-200 text-blue-600 flex-col flex items-center justify-center w-12 h-14' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors flex-col flex items-center justify-center w-12 h-14'}`}
                      >
                        <ChevronUp className={`w-5 h-5 ${idea.voted ? 'stroke-[3px]' : ''}`} />
                        <span className={`text-xs font-black ${idea.voted ? 'text-blue-700' : 'text-gray-700'}`}>{idea.votes}</span>
                      </button>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {idea.status === 'implemented' && (
                          <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Implemented
                          </span>
                        )}
                        {idea.status !== 'implemented' && (
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${STATUS_CONFIG[idea.status as keyof typeof STATUS_CONFIG].color}`}>
                            {STATUS_CONFIG[idea.status as keyof typeof STATUS_CONFIG].label}
                          </span>
                        )}
                        <span className="text-gray-400 text-xs font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{idea.category}</span>
                        <span className="text-gray-400 text-xs font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{idea.creatorType}</span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 leading-tight">
                        {idea.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {idea.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs font-medium text-gray-500 mt-auto pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors bg-gray-50 px-2 py-1 rounded-md">
                            <MessageSquare className="w-4 h-4" />
                            {idea.comments} {t('ideas.comments')}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {idea.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Stats & Categories */}
            <div className="w-full lg:w-[280px] space-y-6">
              
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                  <Rocket className="w-5 h-5 text-blue-500" /> My Impact
                </h3>
                <p className="text-sm text-blue-700/80 mb-4">Your influence on the platform</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-blue-50 p-3 rounded-lg text-center shadow-sm">
                    <span className="block text-2xl font-black text-gray-900">12</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Votes</span>
                  </div>
                  <div className="bg-white border border-blue-50 p-3 rounded-lg text-center shadow-sm">
                    <span className="block text-2xl font-black text-gray-900">2</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Ideas</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Categories</h3>
                <div className="space-y-1">
                  {CATEGORIES.slice(0, 8).map(cat => (
                    <button key={cat.id} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group">
                      <div className="flex items-center gap-2">
                        <cat.icon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{cat.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 group-hover:text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        {Math.floor(Math.random() * 50) + 10}
                      </span>
                    </button>
                  ))}
                  <button className="text-blue-600 text-xs font-bold px-2 pt-2 hover:underline">View all categories...</button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Roadmap Tab */}
        {activeTab === 'roadmap' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Planned */}
            <div className="bg-white border border-gray-200 rounded-3xl p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <h3 className="font-bold text-gray-900 text-lg">Planned</h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-auto font-bold">4</span>
              </div>
              <div className="space-y-3 flex-1">
                {[1, 2].map(i => (
                  <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 hover:border-yellow-300 transition-colors cursor-pointer group">
                    <span className="inline-block px-2 py-1 bg-white border border-gray-200 rounded-md text-[10px] font-bold text-gray-500 mb-2">Payments</span>
                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-yellow-700 transition-colors leading-tight mb-2">
                      In-app Helper Tipping
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1"><ChevronUp className="w-3 h-3" /> 428 votes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white border border-gray-200 rounded-3xl p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                <h3 className="font-bold text-gray-900 text-lg">In Progress</h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-auto font-bold">2</span>
              </div>
              <div className="space-y-3 flex-1">
                {[1].map(i => (
                  <div key={i} className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 hover:border-blue-300 transition-colors cursor-pointer group">
                    <span className="inline-block px-2 py-1 bg-white border border-blue-100 rounded-md text-[10px] font-bold text-blue-600 mb-2">Safety</span>
                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors leading-tight mb-2">
                      Background Check Badges
                    </h4>
                    <div className="flex items-center justify-between text-xs text-blue-500">
                      <span className="flex items-center gap-1"><ChevronUp className="w-3 h-3" /> 315 votes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Released */}
            <div className="bg-white border border-gray-200 rounded-3xl p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <h3 className="font-bold text-gray-900 text-lg">Released</h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-auto font-bold">12</span>
              </div>
              <div className="space-y-3 flex-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-green-50/30 border border-green-100 rounded-2xl p-4 hover:border-green-300 transition-colors cursor-pointer group">
                    <span className="inline-block px-2 py-1 bg-white border border-green-100 rounded-md text-[10px] font-bold text-green-700 mb-2">Features</span>
                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-green-700 transition-colors leading-tight mb-2">
                      Emergency Location Tracking
                    </h4>
                    <div className="flex items-center justify-between text-xs text-green-600">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Create Idea Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 max-h-[90vh]" onClick={e => e.stopPropagation()}>
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Suggest an Idea
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto hide-scrollbar space-y-6 bg-gray-50/50">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Add in-app tipping for helpers" 
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-gray-900 font-medium" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                <select 
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 font-medium appearance-none"
                >
                  <option value="" disabled>Select a category...</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-bold text-gray-700">Description</label>
                  <span className={`text-xs font-bold ${newDesc.length > 900 ? 'text-red-500' : 'text-gray-400'}`}>{newDesc.length}/1000</span>
                </div>
                <textarea 
                  rows={5}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Describe your idea in detail. Why is it useful? How would it work?" 
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">I am using LinkHelp primarily as a:</label>
                <div className="flex gap-3">
                  <button onClick={() => setNewUserType('client')} className={`flex-1 py-2.5 rounded-xl border font-bold text-sm transition-all ${newUserType === 'client' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>Client</button>
                  <button onClick={() => setNewUserType('helper')} className={`flex-1 py-2.5 rounded-xl border font-bold text-sm transition-all ${newUserType === 'helper' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>Helper</button>
                  <button onClick={() => setNewUserType('both')} className={`flex-1 py-2.5 rounded-xl border font-bold text-sm transition-all ${newUserType === 'both' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>Both</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Attachment <span className="text-gray-400 font-normal">(Optional)</span></label>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer bg-white">
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm font-bold text-gray-900">Click to upload</span>
                  <span className="text-xs text-gray-500">or drag and drop an image</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={!newTitle || !newCategory || !newDesc}
                onClick={() => {
                  const newIdea = {
                    id: ideas.length + 1,
                    title: newTitle,
                    description: newDesc,
                    category: newCategory,
                    votes: 1,
                    comments: 0,
                    creatorType: newUserType === 'client' ? 'Client' : newUserType === 'helper' ? 'Helper' : 'Both',
                    status: 'under_review' as any,
                    timestamp: 'Just now',
                    voted: true
                  };
                  setIdeas(prev => [newIdea, ...prev]);
                  setShowCreateModal(false);
                  
                  addNotification({
                    userId: mockUsers.client.id, // Mocked to client for demo
                    type: 'system',
                    title: 'Ideia enviada com sucesso! 🚀',
                    message: `Sua ideia "${newTitle}" entrou em fase de revisão. Você ganhará LinkCredits se aprovada!`,
                    actionUrl: '/ideas',
                  });

                  setNewTitle('');
                  setNewDesc('');
                  setNewCategory('');
                }}
                className="bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md active:translate-y-0 hover:-translate-y-0.5"
              >
                Submit Idea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
