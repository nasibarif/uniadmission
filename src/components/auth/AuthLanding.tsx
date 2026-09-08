import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SAMPLE_PROFILES } from '../../data/sampleProfiles';
import { 
  GraduationCap, 
  Sparkles, 
  Building2, 
  Award, 
  Globe2, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const AuthLanding: React.FC = () => {
  const { signIn, signUp, loginAsDemo } = useApp();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Sign in form
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  
  // Sign up form
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpError, setSignUpError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setIsLoading(true);

    const result = signIn(signInEmail, signInPassword);
    setIsLoading(false);
    if (!result.success) {
      setSignInError(result.error || 'Failed to sign in. Please check your credentials.');
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    setIsLoading(true);

    const result = signUp(signUpName, signUpEmail, signUpPassword);
    setIsLoading(false);
    if (!result.success) {
      setSignUpError(result.error || 'Failed to create account.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-100">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                UniAdmission
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                ADVISOR
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loginAsDemo(0)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Explore Demo Profile</span>
            </button>
            <button
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
            >
              {authMode === 'signin' ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1">
        
        {/* Left 7 Cols: Hero & Value Proposition */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>AI-Powered Global University & Scholarship Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Stop Guessing Your Admissions Chances. <span className="text-blue-600">Start Planning Strategically.</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
            UniAdmission analyzes your unique academic curriculum (HSC, A-Levels, IB, CBSE), GPA, IELTS, SAT, and financial budget to build your personalized Reach, Target, and Safe university portfolio with full-ride scholarship matches.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>32+ Verified Global Universities</span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Real acceptance rates, tuition costs, and SAT/IELTS thresholds across US, Canada, UK, Germany, and Europe.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Award className="h-4 w-4 text-emerald-600" />
                <span>20+ Full-Ride Scholarships</span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Eligibility algorithms for DAAD, Fulbright, Chevening, Pearson, KAIST, and Texas In-State Waivers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Globe2 className="h-4 w-4 text-indigo-600" />
                <span>12 Country ROI Matrices</span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Compare post-study work visas (STEM OPT 3 yrs, PGWP 3 yrs), blocked accounts, and student minimum wages.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                <span>Live Gemini AI Counselor & SOP</span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                24/7 strategic advisor chat, 5-paragraph SOP generator, and AI resume STAR bullet optimizer.
              </p>
            </div>
          </div>

          {/* Instant Demo Profile Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Instant Test-Drive with Sample Candidates:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_PROFILES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => loginAsDemo(idx)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-200 text-left transition"
                >
                  <p className="text-xs font-bold text-slate-900 truncate">{sample.name}</p>
                  <p className="text-[10px] text-blue-600 font-semibold truncate">{sample.tag}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{sample.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Authentication Card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6">
            
            {/* Tabs */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setSignInError(null); }}
                className={`py-2 text-xs font-bold rounded-xl transition ${
                  authMode === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setSignUpError(null); }}
                className={`py-2 text-xs font-bold rounded-xl transition ${
                  authMode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* SIGN IN FORM */}
            {authMode === 'signin' ? (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Welcome Back</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sign in to access your saved applications and matches.</p>
                </div>

                {signInError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{signInError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="e.g. rahim@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>{isLoading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="text-center pt-1">
                  <p className="text-xs text-slate-500">
                    Default demo password: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-mono">demo123</code>
                  </p>
                </div>
              </form>
            ) : (
              
              /* SIGN UP FORM */
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Start Your Admission Journey</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Create your student account to build your tailored university portfolio.</p>
                </div>

                {signUpError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{signUpError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="e.g. Ayesha Rahman"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="e.g. ayesha@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="Minimum 4 characters"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isLoading ? 'Creating account...' : 'Create Account & Start Profile'}</span>
                </button>
              </form>
            )}

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© 2026 UniAdmission Advisor Inc. All rights reserved. Powered by Google Gemini AI.</p>
      </footer>

    </div>
  );
};
