import React, { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  LogOut,
  Loader2,
  Menu,
  X,
} from 'lucide-react';
import { Copilot } from './Copilot';
import { ThemeToggle } from './ThemeToggle';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 hidden md:flex flex-col flex-shrink-0 transition-colors duration-200">
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-slate-800">
          <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">ProjectSync</span>
          <ThemeToggle />
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <item.icon
                  className={`flex-shrink-0 w-5 h-5 mr-3 ${
                    isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-slate-800">
          <div className="flex items-center px-3 py-2 mb-2 text-sm text-gray-700 dark:text-slate-300">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold mr-3 uppercase text-sm">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="truncate flex-1">
              <p className="font-semibold text-gray-900 dark:text-white truncate leading-tight">
                {user?.fullName || 'Active User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email || 'Logged in'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 flex-shrink-0 z-30 transition-colors duration-200">
        <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">ProjectSync</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown / Slide-out Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-xl px-4 py-4 animate-in slide-in-from-top-2 transition-colors duration-200">
          <nav className="space-y-1 mb-4">
            {navigation.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-semibold'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <item.icon
                    className={`flex-shrink-0 w-5 h-5 mr-3 ${
                      isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs uppercase">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="text-xs">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{user?.fullName || 'User'}</p>
                <p className="text-gray-500 dark:text-slate-400 truncate max-w-[140px]">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Groq Agent Copilot */}
      <Copilot />
    </div>
  );
};
