import React from 'react';

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      aria-busy="true" 
      aria-label="Loading card content"
      className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs animate-pulse space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-slate-200 rounded-md" />
            <div className="h-3 w-24 bg-slate-100 rounded-md" />
          </div>
        </div>
        <div className="h-6 w-16 bg-slate-200 rounded-lg" />
      </div>

      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-100 rounded-md" />
        <div className="h-3 w-4/5 bg-slate-100 rounded-md" />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="h-10 bg-slate-100 rounded-xl" />
        <div className="h-10 bg-slate-100 rounded-xl" />
        <div className="h-10 bg-slate-100 rounded-xl" />
      </div>

      <div className="pt-2 flex justify-between items-center">
        <div className="h-7 w-24 bg-slate-200 rounded-xl" />
        <div className="h-7 w-28 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
};

export const SkeletonRow: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      aria-busy="true" 
      aria-label="Loading row content"
      className={`p-4 rounded-xl bg-white border border-slate-200/80 animate-pulse flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-1/3 bg-slate-200 rounded-md" />
          <div className="h-2.5 w-1/4 bg-slate-100 rounded-md" />
        </div>
      </div>
      <div className="h-6 w-20 bg-slate-200 rounded-lg shrink-0" />
      <div className="h-8 w-24 bg-slate-100 rounded-xl shrink-0" />
    </div>
  );
};

export const SkeletonStat: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      aria-busy="true" 
      aria-label="Loading metric"
      className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs animate-pulse space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-slate-200 rounded-md" />
        <div className="w-8 h-8 rounded-xl bg-slate-100" />
      </div>
      <div className="h-8 w-20 bg-slate-300 rounded-lg" />
      <div className="h-2 w-full bg-slate-100 rounded-full" />
    </div>
  );
};
