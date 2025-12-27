
import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = '', ...props }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      {...props}
    >
      {/* Abstract Interlocking Knot / 'P' Shape */}
      <path d="M15 7h2a5 5 0 0 1 0 10h-2m-6 0H7A5 5 0 0 1 7 7h2" />
      <path d="M8 7v10M16 7v10" />
      <path d="M7 12h10" strokeOpacity="0.2" strokeWidth="1.5" />
    </svg>
  );
};

export default Logo;
