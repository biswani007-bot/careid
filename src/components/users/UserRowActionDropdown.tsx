import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eye, KeyRound, UserX, UserCheck } from 'lucide-react';
import type { UserItem } from '../../services/userService';

export interface UserRowActionDropdownProps {
  user: UserItem;
  triggerEl: HTMLElement | null;
  isOpen: boolean;
  onClose: () => void;
  onViewDetails: (user: UserItem) => void;
  onEditCredentials: (user: UserItem) => void;
  onToggleStatus: (user: UserItem) => void;
}

export const UserRowActionDropdown: React.FC<UserRowActionDropdownProps> = ({
  user,
  triggerEl,
  isOpen,
  onClose,
  onViewDetails,
  onEditCredentials,
  onToggleStatus,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Calculate coordinates & handle flip logic
  const updatePosition = useCallback(() => {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();

    const menuEl = menuRef.current;
    const menuHeight = menuEl ? menuEl.offsetHeight : 140;
    const menuWidth = menuEl ? menuEl.offsetWidth : 175;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + 4;

    // Flip upwards if not enough space below and more space above
    if (spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow) {
      top = Math.max(10, rect.top - menuHeight - 4);
    } else {
      top = Math.min(top, Math.max(10, window.innerHeight - menuHeight - 10));
    }

    // Align right edge of menu with right edge of trigger
    let left = rect.right - menuWidth;

    // Viewport edge clamping
    if (left < 10) {
      left = 10;
    }
    if (left + menuWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - menuWidth - 10);
    }

    setCoords({ top, left });
  }, [triggerEl]);

  // Run position update immediately on mount / change
  useLayoutEffect(() => {
    if (isOpen && triggerEl) {
      updatePosition();
    }
  }, [isOpen, triggerEl, updatePosition]);

  // Handle scroll, resize, outside clicks, and Escape key
  useEffect(() => {
    if (!isOpen || !triggerEl) return;

    // Reposition on scroll/resize; dismiss only if trigger completely scrolls offscreen
    const handleScrollOrResize = () => {
      const rect = triggerEl.getBoundingClientRect();
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        onClose();
      } else {
        updatePosition();
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    // Outside click listener
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerEl &&
        !triggerEl.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    // Escape listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerEl.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus the first item on open
    const timer = setTimeout(() => {
      itemRefs.current[0]?.focus();
    }, 20);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, triggerEl, onClose, updatePosition]);

  if (!isOpen || !triggerEl) return null;

  // Arrow key navigation between items
  const handleItemKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % 3;
      itemRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + 3) % 3;
      itemRefs.current[prevIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      itemRefs.current[2]?.focus();
    }
  };

  const isUserActive = user.status === 'ACTIVE';

  return createPortal(
    <div
      ref={menuRef}
      id={`user-actions-menu-${user.id}`}
      role="menu"
      aria-labelledby={`user-action-trigger-${user.id}`}
      className="user-actions-dropdown-menu"
      style={{
        top: coords ? coords.top : -9999,
        left: coords ? coords.left : -9999,
        visibility: coords ? 'visible' : 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. View Details */}
      <button
        ref={(el) => {
          itemRefs.current[0] = el;
        }}
        type="button"
        role="menuitem"
        className="user-actions-dropdown-item"
        onClick={() => {
          onClose();
          onViewDetails(user);
        }}
        onKeyDown={(e) => handleItemKeyDown(e, 0)}
      >
        <Eye size={14} className="text-[#494552] shrink-0" />
        <span>View Details</span>
      </button>

      {/* 2. Edit Credentials */}
      <button
        ref={(el) => {
          itemRefs.current[1] = el;
        }}
        type="button"
        role="menuitem"
        className="user-actions-dropdown-item"
        onClick={() => {
          onClose();
          onEditCredentials(user);
        }}
        onKeyDown={(e) => handleItemKeyDown(e, 1)}
      >
        <KeyRound size={14} className="text-[#494552] shrink-0" />
        <span>Edit Credentials</span>
      </button>

      <div className="user-actions-dropdown-divider" />

      {/* 3. Toggle Status */}
      <button
        ref={(el) => {
          itemRefs.current[2] = el;
        }}
        type="button"
        role="menuitem"
        className={`user-actions-dropdown-item ${
          isUserActive ? 'item-danger' : 'item-success'
        }`}
        onClick={() => {
          onClose();
          onToggleStatus(user);
        }}
        onKeyDown={(e) => handleItemKeyDown(e, 2)}
      >
        {isUserActive ? (
          <>
            <UserX size={14} className="shrink-0 text-[#ba1a1a]" />
            <span>Toggle Status</span>
          </>
        ) : (
          <>
            <UserCheck size={14} className="shrink-0 text-[#006a60]" />
            <span>Toggle Status</span>
          </>
        )}
      </button>
    </div>,
    document.body
  );
};

export default UserRowActionDropdown;
