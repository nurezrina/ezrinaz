import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, X } from 'lucide-react';

export const ImpersonationBanner: React.FC = () => {
  const { user, isImpersonating, actingAs, stopImpersonation } = useAuth();

  if (!isImpersonating || !actingAs) return null;

  return (
    <div className="bg-amber-500 text-virtus-navy px-8 py-2 flex items-center justify-between font-bold text-sm shadow-md sticky top-0 z-[100]">
      <div className="flex items-center gap-4">
        <ShieldCheck size={18} />
        <span>
          Impersonating: {actingAs.actingAsDisplayName || actingAs.displayName} ({actingAs.actingAsRole || actingAs.role}) 
          <span className="mx-2 opacity-50">|</span>
          Real user: {user?.displayName} ({user?.role})
        </span>
      </div>
      <button 
        onClick={stopImpersonation}
        className="bg-virtus-navy text-white px-4 py-1 rounded-lg hover:bg-virtus-navy/80 transition-colors text-xs"
      >
        Stop Impersonation
      </button>
    </div>
  );
};
