import React from 'react';

interface SocialLinksProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  direction?: 'horizontal' | 'vertical';
}

const SocialLinks: React.FC<SocialLinksProps> = ({ 
  className = '',
  size = 'md',
  direction = 'horizontal'
}) => {
  const socialData = [
    {
      name: 'About Pixel',
      url: 'https://pixel.xx.kg',
      icon: '🎨',
      label: 'Meet Pixel - Digital Artist & Survival Expert'
    },
    {
      name: 'Nostr',
      url: 'https://primal.net/p/nprofile1qqs9cg5jpwtkzjtwjv048guzct009n5ayn4lp9skq0k608cmyjul90ct5v9cc',
      icon: '🟣',
      label: 'Nostr Profile'
    },
    {
      name: 'Telegram',
      url: 'https://t.me/PixelSurvival_bot',
      icon: '💬',
      label: 'Telegram Bot'
    },
    {
      name: 'GitHub',
      url: 'https://github.com/anabelle/pixel',
      icon: '💻',
      label: 'Main Repository'
    },
    {
      name: 'X',
      url: 'https://x.com/PixelSurvivor',
      icon: '🐦',
      label: 'X Profile'
    }
  ];

  const sizeClasses = {
    sm: 'social-links-sm',
    md: 'social-links-md', 
    lg: 'social-links-lg'
  };

  const directionClass = direction === 'vertical' ? 'social-links-vertical' : 'social-links-horizontal';

  return (
    <div className={`social-links ${sizeClasses[size]} ${directionClass} ${className}`}>
      {socialData.map((social) => (
        <a
          key={social.name}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
          aria-label={social.label}
          title={social.label}
        >
          <span className="social-icon" aria-hidden="true">{social.icon}</span>
          <span className="social-text">{social.name}</span>
        </a>
      ))}
    </div>
  );
};

export default SocialLinks;