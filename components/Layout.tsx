
import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, List, Trophy, Zap, LogOut, Users, Menu, X } from 'lucide-react';
import { api } from '../services/supabaseService';
import Logo from './Logo';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  let user;
  try {
    user = api.getUser();
  } catch (e) {
    user = null; // Handle case where token exists but user doesn't in DB
  }

  const navItems = [
    { path: '/', icon: CheckCircle2, label: 'Dashboard' },
    { path: '/resolutions', icon: List, label: 'My Goals' },
    { path: '/group-resolutions', icon: Users, label: 'Group Goals' },
    { path: '/leaderboard', icon: Trophy, label: 'Rankings' },
    { path: '/feed', icon: Zap, label: 'Feed' },
  ];

  const isAuthPage = location.pathname === '/auth';
  const hasGroup = user?.groupId;

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (isAuthPage) {
    return <div className="min-h-screen bg-[#FFFBF5] flex flex-col justify-center">{children}</div>;
  }

  if (!hasGroup) {
      return <div className="min-h-screen bg-[#FFFBF5]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] font-sans text-slate-900 selection:bg-violet-200 selection:text-violet-900">
      {/* Top Navigation Bar - Glassmorphism */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFBF5]/80 backdrop-blur-lg border-b border-slate-200/50 supports-[backdrop-filter]:bg-[#FFFBF5]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center flex-1">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="bg-violet-600 p-2 rounded-xl shadow-lg shadow-violet-200 rotate-3 hover:rotate-6 transition-transform">
                  <Logo className="text-white h-6 w-6" />
                </div>
                <span className="font-extrabold text-2xl tracking-tight text-slate-900 hidden sm:block">
                  Pledge
                </span>
              </div>
              
              {/* Desktop Nav Links */}
              <div className="hidden sm:ml-12 sm:flex sm:space-x-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-violet-100 text-violet-700 shadow-sm'
                          : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon size={18} className={`mr-2 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Mobile Menu Button & Profile */}
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg hover:bg-white transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X size={24} className="text-slate-700" />
                ) : (
                  <Menu size={24} className="text-slate-700" />
                )}
              </button>

              {/* Profile */}
              <Link 
                to="/profile"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 p-1.5 rounded-full hover:bg-white transition-all border border-transparent hover:border-slate-100 hover:shadow-sm ${
                    location.pathname === '/profile' ? 'bg-white border-slate-100 shadow-sm' : ''
                }`}
               >
                 <div className="text-right hidden md:block px-2">
                    <p className="text-sm font-bold text-slate-800 leading-none">{user?.name}</p>
                 </div>
                 <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold ring-4 ring-slate-100 shadow-sm">
                    {user?.avatarInitials}
                 </div>
               </Link>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200/50 bg-[#FFFBF5]/95 backdrop-blur-lg">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-violet-100 text-violet-700 shadow-sm'
                        : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={20} className={`mr-3 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
