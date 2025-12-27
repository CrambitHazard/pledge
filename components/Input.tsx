import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="w-full group">
      {label && <label className="block text-sm font-bold text-slate-700 mb-2 group-focus-within:text-violet-600 transition-colors">{label}</label>}
      <input
        className={`w-full px-5 py-3.5 bg-white border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all placeholder:text-slate-300 text-slate-900 font-medium shadow-sm group-hover:border-slate-300 ${className}`}
        {...props}
      />
    </div>
  );
};

export default Input;