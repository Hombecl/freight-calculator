import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkToHome?: boolean;
}

export default function Logo({ size = 'md', showText = true, linkToHome = true }: LogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const content = (
    <div className="flex items-center gap-2 md:gap-3">
      <svg viewBox="0 0 60 60" className={sizes[size]}>
        <polygon points="30,5 55,17 30,29 5,17" fill="#60A5FA"/>
        <polygon points="5,17 30,29 30,55 5,43" fill="#2563EB"/>
        <polygon points="30,29 55,17 55,43 30,55" fill="#1D4ED8"/>
        <line x1="30" y1="5" x2="30" y2="0" stroke="#93C5FD" strokeWidth="1.5"/>
        <line x1="27" y1="0" x2="33" y2="0" stroke="#93C5FD" strokeWidth="1.5"/>
        <line x1="57" y1="30" x2="61" y2="28" stroke="#93C5FD" strokeWidth="1.5"/>
        <line x1="61" y1="25" x2="61" y2="31" stroke="#93C5FD" strokeWidth="1.5"/>
      </svg>
      {showText && (
        <h1 className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-blue-600">Dim</span>
          <span className="text-slate-800">Pack</span>
          <span className="text-blue-400">3D</span>
        </h1>
      )}
    </div>
  );

  if (linkToHome) {
    return (
      <Link to="/" className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
