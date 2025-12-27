
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import Logo from '../components/Logo';
import { api } from '../services/mockService';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Get invite code from location state (if coming from invite link)
  const inviteCode = (location.state as any)?.inviteCode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const success = api.login(email, password);
      if (success) {
        // If there's an invite code, redirect to join page, otherwise go to dashboard
        if (inviteCode) {
          navigate(`/join/${inviteCode}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        setError('Invalid credentials');
      }
    } else {
      if (!name.trim()) {
        setError('Name is required');
        return;
      }
      const success = api.signup(name, email, password);
      if (success) {
        // If there's an invite code, redirect to join page, otherwise go to dashboard
        if (inviteCode) {
          navigate(`/join/${inviteCode}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        setError('Email already exists');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#FFFBF5]">
      {/* Left side - Branding/Art */}
      <div className="hidden lg:flex lg:w-1/2 bg-violet-600 items-center justify-center relative overflow-hidden">
        {/* Abstract Pastel Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-700 z-10"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-30 z-10">
             <div className="w-[800px] h-[800px] bg-rose-300 rounded-full blur-[120px] absolute -top-40 -left-40 mix-blend-overlay"></div>
             <div className="w-[600px] h-[600px] bg-sky-300 rounded-full blur-[100px] absolute bottom-0 right-0 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-20 text-white max-w-lg px-12">
             <div className="bg-white/20 p-6 rounded-3xl w-fit mb-8 backdrop-blur-md border border-white/20 shadow-2xl">
                 <Logo className="h-14 w-14 text-white drop-shadow-md" />
             </div>
             <h1 className="text-6xl font-black mb-6 leading-tight tracking-tight">Consistency is the only currency.</h1>
             <p className="text-2xl text-violet-100 font-medium leading-relaxed">Make your Pledge. Track your promises. Compete on discipline, not motivation.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 relative">
        {/* Mobile background blob */}
        <div className="lg:hidden absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-violet-200 rounded-full blur-[80px] opacity-50 z-0"></div>

        <div className="w-full max-w-md space-y-10 bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white z-10">
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              {isLogin ? 'Welcome back' : 'Join the Pledge'}
            </h2>
            <p className="text-slate-500 font-medium text-lg">
              {isLogin 
                ? 'Enter your credentials to access your dashboard.' 
                : 'Create your account to start your resolution journey.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-bold text-center">
                    {error}
                </div>
            )}
            
            {!isLogin && (
               <Input 
                 placeholder="Full Name" 
                 type="text" 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 required 
               />
            )}
            <Input 
              label="Email"
              placeholder="name@example.com" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
            <Input 
              label="Password"
              placeholder="••••••••" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            
            <div className="pt-4">
              <Button type="submit" fullWidth className="text-lg py-4">
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </div>
          </form>

          <div className="text-center pt-2">
            <button 
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors bg-violet-50 px-4 py-2 rounded-full"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
