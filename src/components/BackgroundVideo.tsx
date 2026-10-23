import React from 'react';

interface BackgroundVideoProps {
  overlayOpacity?: string;
  className?: string;
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({
  overlayOpacity = 'bg-black/65',
  className = '',
}) => {
  return (
    <div
      className={`fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    >
      <img
        src="/background_image.jpg"
        alt="Sami Trade Smart Background"
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center select-none pointer-events-none"
      />
      <div className={`absolute inset-0 ${overlayOpacity}`} />
    </div>
  );
};
