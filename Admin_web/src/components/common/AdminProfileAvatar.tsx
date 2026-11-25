import React, { useState } from 'react';
import adminPortraitImg from '../../assets/users/admin-profile-portrait.png';

export const ADMIN_PROFILE_AVATAR_URL = '/assets/admin-profile-portrait.png';

export interface AdminProfileAvatarProps {
  size?: number | string;
  className?: string;
  imgClassName?: string;
  alt?: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  objectPosition?: string;
}

/**
 * Reusable Global Admin Profile Avatar Component
 * Displays the official uploaded portrait (female doctor wearing a white coat)
 * consistently across the entire CareID Admin Portal.
 */
export const AdminProfileAvatar: React.FC<AdminProfileAvatarProps> = ({
  size = 40,
  className = '',
  imgClassName = '',
  alt = 'Admin Profile',
  title = 'My Profile & Information',
  onClick,
  style,
  imgStyle,
  objectPosition = 'center 15%'
}) => {
  const [imgError, setImgError] = useState(false);

  const dimensionStyle: React.CSSProperties =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }
      : size === 'full'
      ? { width: '100%', height: '100%' }
      : { width: size, height: size, minWidth: size, minHeight: size };

  return (
    <div
      className={`admin-profile-avatar-root rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative select-none ${className}`}
      style={{
        ...dimensionStyle,
        ...style
      }}
      onClick={onClick}
      title={title}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <img
        src={imgError ? adminPortraitImg : ADMIN_PROFILE_AVATAR_URL}
        alt={alt}
        className={`w-full h-full object-cover rounded-full ${imgClassName}`}
        style={{
          objectFit: 'cover',
          objectPosition,
          ...imgStyle
        }}
        onError={() => {
          if (!imgError) {
            setImgError(true);
          }
        }}
      />
    </div>
  );
};

export default AdminProfileAvatar;

