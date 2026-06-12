import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type MobileProfileMenuContextValue = {
  open: boolean;
  anchorEl: HTMLElement | null;
  openMenu: (anchor: HTMLElement) => void;
  closeMenu: () => void;
  toggleMenu: (anchor: HTMLElement) => void;
};

const MobileProfileMenuContext = createContext<MobileProfileMenuContextValue | undefined>(undefined);

export function MobileProfileMenuProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setAnchorEl(null);
  }, []);

  const openMenu = useCallback((anchor: HTMLElement) => {
    setAnchorEl(anchor);
    setOpen(true);
  }, []);

  const toggleMenu = useCallback(
    (anchor: HTMLElement) => {
      if (open && anchorEl === anchor) {
        closeMenu();
        return;
      }
      openMenu(anchor);
    },
    [open, anchorEl, closeMenu, openMenu],
  );

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  const value = useMemo(
    () => ({ open, anchorEl, openMenu, closeMenu, toggleMenu }),
    [open, anchorEl, openMenu, closeMenu, toggleMenu],
  );

  return (
    <MobileProfileMenuContext.Provider value={value}>{children}</MobileProfileMenuContext.Provider>
  );
}

export function useMobileProfileMenu() {
  const context = useContext(MobileProfileMenuContext);
  if (!context) {
    throw new Error('useMobileProfileMenu must be used within MobileProfileMenuProvider');
  }
  return context;
}
