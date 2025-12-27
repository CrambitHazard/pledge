import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3.5 rounded-2xl font-bold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-violet-600 text-white shadow-xl shadow-violet-200 hover:bg-violet-700 hover:shadow-violet-300 hover:-translate-y-0.5",
    secondary: "bg-orange-100 text-orange-900 hover:bg-orange-200 shadow-sm hover:shadow-md",
    outline: "border-2 border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;