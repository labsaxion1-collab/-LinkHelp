import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Shield, Star, Users, MapPin, Globe, Clock, Languages, HeartHandshake } from 'lucide-react';
import { categories } from '@/data/landingCategories';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { ROUTES } from '@/utils/constants';

export default function LandingPage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-32 overflow-hidden bg-slate-50 flex items-center justify-center">
        {/* Background Decorative Blur */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full pointer-events-none opacity-40">
          <div className="absolute top-20 left-0 w-72 h-72 bg-blue-300 rounded-full blur-[100px]"></div>
          <div className="absolute top-40 right-0 w-96 h-96 bg-blue-200 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 relative z-10 px-4 items-center">
          {/* Text Content */}
          <div className="max-w-2xl text-left animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-gray-600 font-medium text-sm border border-gray-200 shadow-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              {t('landing.trusted_badge')}
            </div>
            
            <h1 className="text-5xl lg:text-[4rem] font-bold tracking-tight text-gray-900 mb-6 leading-[1.1] font-display">
              {t('landing.hero_line1_find')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 drop-shadow-sm">{t('landing.hero_line1_help')}</span><br/> 
              {t('landing.hero_line2_offer')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 drop-shadow-sm">{t('landing.hero_line2_skills')}</span><br/>
              {t('landing.hero_line3_build')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 drop-shadow-sm">{t('landing.hero_line3_connections')}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl leading-relaxed font-medium">
              {t('landing.hero_sub')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link to={ROUTES.signup} className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-[0_8px_30px_rgb(37,99,235,0.24)] hover:shadow-[0_8px_30px_rgb(37,99,235,0.4)] hover:-translate-y-1 flex items-center justify-center gap-2 text-lg">
                {t('landing.cta_find')}
              </Link>
              <Link to={ROUTES.signup} className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-gray-900 border border-gray-200 font-bold hover:border-gray-300 hover:bg-gray-50 transition-all hover:-translate-y-1 shadow-sm flex items-center justify-center gap-2 text-lg">
                {t('landing.cta_helper')}
              </Link>
            </div>

            {/* Micro Social Proof */}
            <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
               <div className="flex -space-x-3">
                 <img className="w-8 h-8 rounded-full border-2 border-white object-cover" src="https://i.pravatar.cc/150?img=1" alt="" />
                 <img className="w-8 h-8 rounded-full border-2 border-white object-cover" src="https://i.pravatar.cc/150?img=2" alt="" />
                 <img className="w-8 h-8 rounded-full border-2 border-white object-cover" src="https://i.pravatar.cc/150?img=3" alt="" />
                 <img className="w-8 h-8 rounded-full border-2 border-white object-cover" src="https://i.pravatar.cc/150?img=4" alt="" />
               </div>
               <div>
                  <div className="flex items-center gap-1 text-yellow-500 mb-0.5">
                    <Icons.Star className="w-4 h-4 fill-current" /><Icons.Star className="w-4 h-4 fill-current" /><Icons.Star className="w-4 h-4 fill-current" /><Icons.Star className="w-4 h-4 fill-current" /><Icons.Star className="w-4 h-4 fill-current" />
                  </div>
                  <span><strong className="text-gray-900">{t('landing.reviews_score')}</strong> {t('landing.reviews_line')}</span>
               </div>
            </div>
          </div>

          {/* Visual Composition / Graphic */}
          <div className="relative h-[600px] hidden lg:block animate-in fade-in slide-in-from-right-8 duration-1000">
             {/* Center Map abstract */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/50 backdrop-blur-3xl rounded-full border border-white/40 shadow-2xl overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#2563EB 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                
                {/* Floating Map Pins */}
                <div className="absolute top-20 left-20 animate-bounce [animation-duration:3s]">
                   <div className="relative">
                     <div className="w-10 h-10 bg-white rounded-full p-1 shadow-lg border border-gray-100"><img src="https://i.pravatar.cc/150?img=33" className="w-full h-full rounded-full object-cover" /></div>
                     <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                   </div>
                </div>
                <div className="absolute bottom-24 right-20 animate-bounce [animation-duration:4s] [animation-delay:1s]">
                   <div className="relative">
                     <div className="w-12 h-12 bg-white rounded-full p-1 shadow-lg border border-gray-100"><img src="https://i.pravatar.cc/150?img=47" className="w-full h-full rounded-full object-cover" /></div>
                     <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                   </div>
                </div>
                
                <div className="text-center">
                  <div className="bg-white px-4 py-2 rounded-2xl shadow-lg border border-gray-100 inline-flex flex-col items-center justify-center mb-2">
                    <span className="text-3xl font-black text-gray-900">14</span>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('landing.helpers_online')}</p>
                  </div>
                </div>
             </div>

             {/* Floating Imagery Cards */}
             <div className="absolute top-4 -left-8 w-44 bg-white p-2 rounded-2xl shadow-xl transform rotate-[-6deg] hover:rotate-0 transition-transform duration-300 border border-gray-100">
               <img src="https://images.unsplash.com/photo-1584820927498-cafe8c1c969b?auto=format&fit=crop&q=80&w=400&h=300" className="w-full h-28 object-cover rounded-xl mb-2" alt="Cleaning" />
               <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-gray-900">{t('landing.card_cleaning')}</span>
                 <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5"><Icons.Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 4.9</span>
               </div>
             </div>

             <div className="absolute top-16 -right-4 w-52 bg-white p-2 rounded-2xl shadow-xl transform rotate-[4deg] hover:rotate-0 transition-transform duration-300 border border-gray-100 z-20">
               <img src="https://images.unsplash.com/photo-1604328698692-f76ea9498e76?auto=format&fit=crop&q=80&w=400&h=300" className="w-full h-32 object-cover rounded-xl mb-2" alt="Furniture Assembly" />
               <div className="flex items-center justify-between px-1">
                 <span className="text-xs font-bold text-gray-900">{t('landing.card_assembly')}</span>
                 <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5"><Icons.Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 5.0</span>
               </div>
             </div>

             <div className="absolute bottom-12 -left-4 w-48 bg-white p-2 rounded-2xl shadow-xl transform rotate-[8deg] hover:rotate-0 transition-transform duration-300 border border-gray-100 z-20">
               <img src="https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=400&h=300" className="w-full h-32 object-cover rounded-xl mb-2" alt="Manicure" />
               <div className="flex items-center justify-between px-1">
                 <span className="text-xs font-bold text-gray-900">{t('landing.card_manicure')}</span>
                 <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5"><Icons.Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 4.8</span>
               </div>
             </div>

             <div className="absolute bottom-4 -right-12 w-56 bg-white p-2 rounded-2xl shadow-xl transform rotate-[-4deg] hover:rotate-0 transition-transform duration-300 border border-gray-100">
               <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=300" className="w-full h-36 object-cover rounded-xl mb-2" alt="Translation" />
               <div className="flex items-center justify-between px-1">
                 <span className="text-xs font-bold text-gray-900">{t('landing.card_translation')}</span>
                 <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5"><Icons.Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 5.0</span>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Live Stats Banner */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-gray-800">
            <div className="px-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </div>
                <p className="text-3xl font-black text-white">1,240</p>
              </div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('landing.stat_helpers')}</p>
            </div>
            <div className="px-4">
              <p className="text-3xl font-black text-white mb-1">320</p>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('landing.stat_requests')}</p>
            </div>
            <div className="px-4">
              <p className="text-3xl font-black text-white mb-1 text-green-400">95%</p>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('landing.stat_satisfaction')}</p>
            </div>
            <div className="px-4">
              <p className="text-3xl font-black text-white mb-1">7<span className="text-lg text-gray-500 font-bold">m</span></p>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('landing.stat_response')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">{t('landing.trending_title')}</h2>
              <p className="text-gray-500 font-medium">{t('landing.trending_sub')}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((category) => {
              const IconComponent = (Icons as any)[category.icon];
              return (
                <div key={category.id} className="group cursor-pointer p-6 rounded-2xl border border-gray-100 bg-white hover:border-blue-100 hover:bg-gradient-to-br hover:from-white hover:to-blue-50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all text-center flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    {IconComponent && <IconComponent className="w-6 h-6" />}
                  </div>
                  <span className="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">{t(`categories.${category.id}`)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live Community Activity */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-bold mb-6 text-sm border border-green-200 shadow-sm shadow-green-100/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              {t('landing.community_badge')}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6 font-display">{t('landing.community_title')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed font-medium">{t('landing.community_sub')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto items-center">
            {/* Map/Activity UI Preview */}
            <div className="relative aspect-square md:aspect-auto md:h-[500px] w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('landing.live_feed')}</div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center space-y-6 relative overflow-hidden bg-gradient-to-br from-white to-gray-50">
                {/* Floating Activity Cards */}
                <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 w-[90%] transform -rotate-2 hover:rotate-0 transition-transform origin-bottom-left relative z-20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative">
                      <img src="https://i.pravatar.cc/150?img=12" alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                       <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{t('landing.demo_user_label')}</p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {t('landing.demo_accepted_line', { time: t('landing.demo_time_short') })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 w-[95%] self-end transform rotate-1 hover:rotate-0 transition-transform origin-bottom-right relative z-30 ring-1 ring-black/5">
                  <div className="flex items-start justify-between mb-2">
                     <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t('landing.demo_urgent_label')}</span>
                     <span className="text-[10px] font-semibold text-gray-400">{t('landing.demo_location_sample')}</span>
                  </div>
                  <p className="font-bold text-sm text-gray-900 mb-2">{t('landing.demo_urgent_body')}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                       <img className="w-6 h-6 rounded-full ring-2 ring-white border border-gray-100" src="https://i.pravatar.cc/150?img=33" alt="" />
                       <img className="w-6 h-6 rounded-full ring-2 ring-white border border-gray-100" src="https://i.pravatar.cc/150?img=47" alt="" />
                    </div>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">{t('landing.demo_helpers_interested', { count: 2 })}</span>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100 w-[80%] transform -rotate-1 hover:rotate-0 transition-transform origin-top-left relative z-10 opacity-70">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                       <Icons.Check className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{t('landing.demo_completed_title')}</p>
                      <p className="text-[10px] text-gray-500 font-medium">{t('landing.demo_completed_sub')}</p>
                    </div>
                  </div>
                </div>
                
                {/* Decorative background elements */}
                <Icons.Map className="absolute -bottom-10 -right-10 w-64 h-64 text-gray-100/50 -rotate-12 pointer-events-none" />
              </div>
            </div>
            
            {/* Value Prop */}
            <div className="space-y-8">
              <div className="flex gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                   <Icons.Zap className="w-5 h-5 text-blue-600" />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-gray-900 mb-2">{t('landing.value_speed_title')}</h3>
                   <p className="text-gray-500 leading-relaxed font-medium">{t('landing.value_speed_body')}</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                   <Icons.ShieldCheck className="w-5 h-5 text-green-600" />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-gray-900 mb-2">{t('landing.value_trust_title')}</h3>
                   <p className="text-gray-500 leading-relaxed font-medium">{t('landing.value_trust_body')}</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100">
                   <Icons.Navigation className="w-5 h-5 text-orange-600" />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-gray-900 mb-2">{t('landing.value_local_title')}</h3>
                   <p className="text-gray-500 leading-relaxed font-medium">{t('landing.value_local_body')}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Business Model Section */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">{t('landing.pricing_title')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">{t('landing.pricing_sub')}</p>
          </div>

          <div className={`grid gap-12 lg:gap-20 ${UI_VISIBILITY.clientCredits ? 'md:grid-cols-2' : 'max-w-xl mx-auto'}`}>
            {UI_VISIBILITY.clientCredits ? (
            <div className="bg-blue-50/50 p-8 md:p-12 rounded-3xl border border-blue-100">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-bold mb-6 text-sm">
                {t('landing.pricing_clients_badge')}
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">{t('landing.linkcredits_heading')}</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {t('landing.linkcredits_body')}
              </p>
              
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-blue-100 flex justify-between items-center shadow-sm">
                  <span className="font-semibold text-gray-900">{t('landing.linkcredits_pack_10')}</span>
                  <span className="font-bold text-blue-600">{t('landing.price_cad_399')}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-100 flex justify-between items-center shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">{t('landing.credits_popular')}</div>
                  <span className="font-semibold text-gray-900">{t('landing.linkcredits_pack_50')}</span>
                  <span className="font-bold text-blue-600">{t('landing.price_cad_1490')}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-100 flex justify-between items-center shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">{t('landing.credits_best_value')}</div>
                  <span className="font-semibold text-gray-900">{t('landing.linkcredits_pack_120')}</span>
                  <span className="font-bold text-blue-600">{t('landing.price_cad_2990')}</span>
                </div>
              </div>
            </div>
            ) : null}

            {/* Subscriptions for Helpers */}
            <div>
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 font-bold mb-6 text-sm">
                {t('landing.pricing_helpers_badge')}
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">{t('landing.subs_heading')}</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {t('landing.subs_body')}
              </p>

              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-gray-100 rounded-lg shrink-0">
                    <Icons.User className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{t('landing.tier_basic_title')}</h4>
                    <p className="text-gray-500 text-sm mt-1">{t('landing.tier_basic_desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-blue-100 rounded-lg shrink-0">
                    <Icons.Star className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{t('landing.tier_elite_title')}</h4>
                    <p className="text-gray-500 text-sm mt-1">{t('landing.tier_elite_desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-yellow-100 rounded-lg shrink-0">
                    <Icons.Crown className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{t('landing.tier_pro_help_title')}</h4>
                    <p className="text-gray-500 text-sm mt-1">{t('landing.tier_pro_help_desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newcomers Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 font-medium text-sm border border-orange-100 mb-6">
                <HeartHandshake className="w-4 h-4" />
                {t('landing.newcomers_badge')}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
                {t('landing.newcomers_title_before')}
                <span className="text-primary-600">{t('landing.newcomers_title_highlight')}</span>
                {t('landing.newcomers_title_after')}
              </h2>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                {t('landing.newcomers_body')}
              </p>
              
              <ul className="space-y-4 mb-8">
                {[
                  t('landing.newcomers_bullet_1'),
                  t('landing.newcomers_bullet_2'),
                  t('landing.newcomers_bullet_3'),
                  t('landing.newcomers_bullet_4'),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent-500 shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>

              <Link to={ROUTES.signup} className="inline-block px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-black transition shadow-sm">
                {t('landing.newcomers_cta')}
              </Link>
            </div>

            <div className="relative">
              <div className="aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden bg-gray-100 relative shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop" 
                  alt="People collaborating" 
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating cards */}
              <div className="absolute -bottom-8 -left-8 bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 hidden md:block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                    <Star className="w-6 h-6 text-green-500 fill-green-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">5.0</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{t('landing.newcomers_rating_label')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-8">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-4">{t('landing.trust_title')}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-12">{t('landing.trust_sub')}</p>
          
          <div className="grid md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="font-semibold text-lg mb-2">{t('landing.trust_verified_title')}</h3>
              <p className="text-gray-400 text-sm">{t('landing.trust_verified_body')}</p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="font-semibold text-lg mb-2">{t('landing.trust_payments_title')}</h3>
              <p className="text-gray-400 text-sm">{t('landing.trust_payments_body')}</p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="font-semibold text-lg mb-2">{t('landing.trust_reviews_title')}</h3>
              <p className="text-gray-400 text-sm">{t('landing.trust_reviews_body')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
