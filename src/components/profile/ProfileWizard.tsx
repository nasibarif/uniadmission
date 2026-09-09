import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { QualificationType, DegreeLevel } from '../../types';
import { 
  User, 
  GraduationCap, 
  BookOpen, 
  DollarSign, 
  Award, 
  FileCheck, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export const ProfileWizard: React.FC = () => {
  const { profile, setProfile, report, setActiveTab } = useApp();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [savedAlert, setSavedAlert] = useState<boolean>(false);

  const steps = [
    { id: 1, label: 'Personal Info', icon: User },
    { id: 2, label: 'Academics & Grades', icon: GraduationCap },
    { id: 3, label: 'Study & Countries', icon: BookOpen },
    { id: 4, label: 'Finances & Budget', icon: DollarSign },
    { id: 5, label: 'Tests & Scores', icon: FileCheck },
    { id: 6, label: 'Extracurriculars', icon: Award }
  ];

  // Helper updater
  const updatePersonal = (field: string, val: any) => {
    setProfile(prev => ({ ...prev, personal: { ...prev.personal, [field]: val } }));
  };

  const updateAcademic = (field: string, val: any) => {
    setProfile(prev => ({ ...prev, academic: { ...prev.academic, [field]: val } }));
  };

  const updateIntended = (field: string, val: any) => {
    setProfile(prev => ({ ...prev, intendedStudy: { ...prev.intendedStudy, [field]: val } }));
  };

  const updateFinancial = (field: string, val: any) => {
    setProfile(prev => ({ ...prev, financial: { ...prev.financial, [field]: val } }));
  };

  const updateEnglishTest = (field: string, val: any) => {
    setProfile(prev => ({
      ...prev,
      standardizedTests: {
        ...prev.standardizedTests,
        englishTest: { ...prev.standardizedTests.englishTest, [field]: val }
      }
    }));
  };

  const updateStdTest = (field: string, val: any) => {
    setProfile(prev => ({
      ...prev,
      standardizedTests: {
        ...prev.standardizedTests,
        standardizedTest: { ...prev.standardizedTests.standardizedTest, [field]: val }
      }
    }));
  };

  // Subject helpers
  const addSubject = () => {
    setProfile(prev => ({
      ...prev,
      academic: {
        ...prev.academic,
        subjects: [...(prev.academic.subjects || []), { subject: '', grade: 'A+' }]
      }
    }));
  };

  const removeSubject = (index: number) => {
    setProfile(prev => ({
      ...prev,
      academic: {
        ...prev.academic,
        subjects: prev.academic.subjects.filter((_, i) => i !== index)
      }
    }));
  };

  const updateSubject = (index: number, field: 'subject' | 'grade', value: string) => {
    setProfile(prev => ({
      ...prev,
      academic: {
        ...prev.academic,
        subjects: prev.academic.subjects.map((s, i) => i === index ? { ...s, [field]: value } : s)
      }
    }));
  };

  // EC helpers
  const addExtracurricular = () => {
    setProfile(prev => ({
      ...prev,
      extracurriculars: [
        ...prev.extracurriculars,
        {
          id: `ec-${Date.now()}`,
          title: 'New Activity / Role',
          role: 'Member / Participant',
          organization: 'Organization Name',
          category: 'Leadership',
          description: '',
          hoursPerWeek: 4,
          achievements: ''
        }
      ]
    }));
  };

  const removeExtracurricular = (id: string) => {
    setProfile(prev => ({
      ...prev,
      extracurriculars: prev.extracurriculars.filter(e => e.id !== id)
    }));
  };

  const updateExtracurricular = (id: string, field: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      extracurriculars: prev.extracurriculars.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const triggerSave = () => {
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2000);
  };

  // Step 26: Progressive Onboarding Completeness Meter
  const calculateCompleteness = () => {
    let score = 0;
    if (profile.personal.fullName && profile.personal.nationality) score += 15;
    if (profile.academic.qualification && profile.academic.institution && profile.academic.gpa) score += 25;
    if (profile.intendedStudy.major && profile.intendedStudy.degreeLevel && profile.preferences.countries.length > 0) score += 20;
    if (profile.financial.maxYearlyBudgetUSD !== undefined) score += 15;
    if (profile.standardizedTests.englishTest.type || profile.standardizedTests.standardizedTest.type) score += 15;
    if (profile.extracurriculars.length > 0) score += 10;
    return Math.min(100, score);
  };

  const completeness = calculateCompleteness();

  const stepMatchingTips: Record<number, { title: string; explanation: string }> = {
    1: {
      title: 'Why personal info improves matching',
      explanation: 'Nationality and residency determine international tuition categories, post-study work visa rights, and bilateral government scholarship eligibility.'
    },
    2: {
      title: 'Why academic history improves matching',
      explanation: 'Standardized GPA and curriculum rigor prevent applying to programs where you miss hard institutional cutoffs, preserving your budget for high-odds schools.'
    },
    3: {
      title: 'Why degree & country preferences improve matching',
      explanation: 'Selecting target intake and country preferences aligns recommendations with open admission cycles and high-demand program quotas.'
    },
    4: {
      title: 'Why financial budgeting improves matching',
      explanation: 'Setting realistic annual ceilings filters out universities that lack sufficient financial aid or institutional scholarships to bridge the tuition gap.'
    },
    5: {
      title: 'Why test scores improve matching',
      explanation: 'English proficiency scores satisfy immigration compliance, while SAT/GRE scores separate competitive reach schools from target matches.'
    },
    6: {
      title: 'Why extracurriculars improve matching',
      explanation: 'Top-tier holistic universities (US T50, UK Russell Group, Canada U15) evaluate leadership, project impact, and intellectual curiosity alongside GPA.'
    }
  };

  const currentTip = stepMatchingTips[currentStep];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header with Live Score & Completeness Meter (Step 26) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>Student Profile Builder</span>
              {savedAlert && (
                <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold animate-pulse">
                  ✓ Auto-saved
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete your academic, financial, test, and extracurricular profile to evaluate your candidacy against published requirements and scholarship criteria.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Current AI Score</span>
              <div className="text-xl font-black text-emerald-600">{report.overallScore}/100</div>
            </div>
            <button
              onClick={() => setActiveTab('assessment')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>View Full Assessment</span>
            </button>
          </div>
        </div>

        {/* Completeness Meter Bar */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Profile Completeness: <strong className="text-blue-700">{completeness}%</strong></span>
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              completeness >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {completeness >= 80 ? 'High-Precision Matching Ready' : 'Fill Remaining Sections for Sharper Matching'}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                completeness >= 80 ? 'bg-emerald-500' : completeness >= 50 ? 'bg-blue-600' : 'bg-amber-500'
              }`}
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      </div>

      {/* Contextual "Why This Improves Matching" Tip Banner (Step 26) */}
      {currentTip && (
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{currentTip.title}: </span>
            <span className="text-slate-600 text-[11px]">{currentTip.explanation}</span>
          </div>
        </div>
      )}

      {/* Step Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                isActive
                  ? 'border-blue-500 bg-blue-50 text-blue-800 font-bold shadow-xs'
                  : isDone
                  ? 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  : 'border-slate-200 bg-slate-50/70 text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] block uppercase tracking-wider text-slate-400 font-semibold">Step {step.id}</span>
                <span className="text-xs truncate block">{step.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Form Container */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
        
        {/* STEP 1: PERSONAL INFO */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              1. Personal & Contact Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  value={profile.personal.fullName}
                  onChange={(e) => updatePersonal('fullName', e.target.value)}
                  placeholder="e.g. Rahim Chowdhury"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.personal.email}
                  onChange={(e) => updatePersonal('email', e.target.value)}
                  placeholder="e.g. rahim@example.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nationality / Citizenship
                </label>
                <input
                  type="text"
                  value={profile.personal.nationality}
                  onChange={(e) => updatePersonal('nationality', e.target.value)}
                  placeholder="e.g. Bangladesh / India / Pakistan"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current City & Country of Residence
                </label>
                <input
                  type="text"
                  value={profile.personal.currentCity}
                  onChange={(e) => updatePersonal('currentCity', e.target.value)}
                  placeholder="e.g. Dhaka, Bangladesh"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ACADEMICS & GRADES */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              2. Academic Qualifications & High School Rigor
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Qualification Curriculum
                </label>
                <select
                  value={profile.academic.qualification}
                  onChange={(e) => updateAcademic('qualification', e.target.value as QualificationType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                >
                  <option value="HSC">HSC (Higher Secondary Certificate)</option>
                  <option value="A-Levels">Cambridge / Edexcel A-Levels</option>
                  <option value="IB Diploma">IB Diploma Programme</option>
                  <option value="CBSE / ICSE">CBSE / ICSE (India)</option>
                  <option value="High School Diploma (US)">US High School Diploma</option>
                  <option value="Bachelor (Applying for Master)">Bachelor's Degree (For Master's)</option>
                  <option value="Other">Other National Curriculum</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standardized GPA Value
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={profile.academic.gpa}
                  onChange={(e) => updateAcademic('gpa', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Raw GPA / Result Description
                </label>
                <input
                  type="text"
                  value={profile.academic.rawGpaText}
                  onChange={(e) => updateAcademic('rawGpaText', e.target.value)}
                  placeholder="e.g. GPA 5.00 (Golden A+) or A*A*A"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Graduation Year
                </label>
                <input
                  type="number"
                  value={profile.academic.graduationYear}
                  onChange={(e) => updateAcademic('graduationYear', parseInt(e.target.value) || 2026)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  School / College Name
                </label>
                <input
                  type="text"
                  value={profile.academic.institution}
                  onChange={(e) => updateAcademic('institution', e.target.value)}
                  placeholder="e.g. Notre Dame College, Dhaka"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Subject-wise Results Table */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Subject-Wise Breakdown
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    List major subjects (Higher Math, Physics, Chemistry, English, etc.)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSubject}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1 border border-blue-200"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Subject</span>
                </button>
              </div>

              <div className="space-y-2">
                {profile.academic.subjects?.map((subj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={subj.subject}
                      onChange={(e) => updateSubject(idx, 'subject', e.target.value)}
                      placeholder="e.g. Higher Mathematics"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={subj.grade}
                      onChange={(e) => updateSubject(idx, 'grade', e.target.value)}
                      placeholder="Grade (e.g. A+, A*, 100)"
                      className="w-28 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeSubject(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INTENDED STUDY & COUNTRIES */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              3. Intended Major & Country Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intended Degree Level
                </label>
                <select
                  value={profile.intendedStudy.degreeLevel}
                  onChange={(e) => updateIntended('degreeLevel', e.target.value as DegreeLevel)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                >
                  <option value="Bachelor's">Bachelor's Degree (Undergraduate)</option>
                  <option value="Master's">Master's Degree (Graduate)</option>
                  <option value="PhD">PhD / Doctorate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Target Major
                </label>
                <input
                  type="text"
                  value={profile.intendedStudy.major}
                  onChange={(e) => updateIntended('major', e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Intake Term
                </label>
                <select
                  value={profile.intendedStudy.targetIntake}
                  onChange={(e) => updateIntended('targetIntake', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                >
                  <option value="Fall 2026">Fall 2026</option>
                  <option value="Spring 2027">Spring 2027</option>
                  <option value="Fall 2027">Fall 2027</option>
                  <option value="Fall 2028">Fall 2028</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Career Aspirations & Long-term Goal
                </label>
                <textarea
                  rows={2}
                  value={profile.intendedStudy.careerGoal}
                  onChange={(e) => updateIntended('careerGoal', e.target.value)}
                  placeholder="e.g. Become an AI software engineer and tech entrepreneur solving climate logistics."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Country Multi-Select Chips */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                Country Preferences (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'USA', flag: '🇺🇸' },
                  { name: 'Canada', flag: '🇨🇦' },
                  { name: 'UK', flag: '🇬🇧' },
                  { name: 'Australia', flag: '🇦🇺' },
                  { name: 'Germany', flag: '🇩🇪' },
                  { name: 'Japan', flag: '🇯🇵' },
                  { name: 'South Korea', flag: '🇰🇷' },
                  { name: 'Netherlands', flag: '🇳🇱' },
                  { name: 'Sweden', flag: '🇸🇪' }
                ].map((c) => {
                  const isSelected = profile.preferences.countries.includes(c.name);
                  return (
                    <button
                      type="button"
                      key={c.name}
                      onClick={() => {
                        const updated = isSelected
                          ? profile.preferences.countries.filter(x => x !== c.name)
                          : [...profile.preferences.countries, c.name];
                        setProfile(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, countries: updated }
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: FINANCES & BUDGET */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              4. Financial Profile & Scholarship Requirements
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum Total Yearly Budget (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    step="1000"
                    value={profile.financial.maxYearlyBudgetUSD}
                    onChange={(e) => updateFinancial('maxYearlyBudgetUSD', parseInt(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Tuition + estimated room & board.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tuition Budget Component (USD/yr)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    step="1000"
                    value={profile.financial.tuitionBudgetUSD}
                    onChange={(e) => updateFinancial('tuitionBudgetUSD', parseInt(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scholarship Dependency / Need
                </label>
                <select
                  value={profile.financial.scholarshipNeed}
                  onChange={(e) => updateFinancial('scholarshipNeed', e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                >
                  <option value="Full (100%)">Full Ride (100% Tuition + Living Needed)</option>
                  <option value="Substantial (50-80%)">Substantial (50–80% Tuition Waiver Needed)</option>
                  <option value="Partial (20-40%)">Partial Merit Award (20–40% Needed)</option>
                  <option value="Low / None">Low / None (Self-Funded)</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <input
                type="checkbox"
                id="partTime"
                checked={profile.financial.willingToWorkPartTime}
                onChange={(e) => updateFinancial('willingToWorkPartTime', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="partTime" className="text-xs text-slate-700 font-medium cursor-pointer">
                I am willing to work part-time (20 hrs/week) during studies to offset living expenses (Earn ~$8,000–$14,000/yr).
              </label>
            </div>
          </div>
        )}

        {/* STEP 5: TESTS & SCORES */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              5. English Proficiency & Standardized Tests
            </h3>

            {/* English Test */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                English Proficiency Test
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Test Type</label>
                  <select
                    value={profile.standardizedTests.englishTest.type}
                    onChange={(e) => updateEnglishTest('type', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="IELTS">IELTS Academic</option>
                    <option value="TOEFL">TOEFL iBT</option>
                    <option value="Duolingo">Duolingo English Test (DET)</option>
                    <option value="PTE">PTE Academic</option>
                    <option value="None">Not taken yet / Planning to take</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Overall Band / Score</label>
                  <input
                    type="number"
                    step="0.5"
                    value={profile.standardizedTests.englishTest.overallScore}
                    onChange={(e) => updateEnglishTest('overallScore', parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 7.0 or 100"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Standardized Test */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Standardized Admissions Exam
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Type</label>
                  <select
                    value={profile.standardizedTests.standardizedTest.type}
                    onChange={(e) => updateStdTest('type', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="SAT">Digital SAT</option>
                    <option value="ACT">ACT</option>
                    <option value="GRE">GRE (for Graduate/Master's)</option>
                    <option value="None">None / Test-Optional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Score</label>
                  <input
                    type="number"
                    value={profile.standardizedTests.standardizedTest.totalScore}
                    onChange={(e) => updateStdTest('totalScore', parseInt(e.target.value) || 0)}
                    placeholder="e.g. 1410 or 322"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Math / Quant</label>
                  <input
                    type="number"
                    value={profile.standardizedTests.standardizedTest.math || ''}
                    onChange={(e) => updateStdTest('math', parseInt(e.target.value) || 0)}
                    placeholder="e.g. 780"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Verbal / Reading</label>
                  <input
                    type="number"
                    value={profile.standardizedTests.standardizedTest.verbal || ''}
                    onChange={(e) => updateStdTest('verbal', parseInt(e.target.value) || 0)}
                    placeholder="e.g. 630"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: EXTRACURRICULARS */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  6. Extracurricular Leadership, Projects & Honors
                </h3>
                <p className="text-xs text-slate-500">
                  Highlight leadership, clubs, hackathons, volunteering, research, and technical projects.
                </p>
              </div>
              <button
                type="button"
                onClick={addExtracurricular}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Activity</span>
              </button>
            </div>

            <div className="space-y-4">
              {profile.extracurriculars.map((ec) => (
                <div key={ec.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => removeExtracurricular(ec.id)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title / Role</label>
                      <input
                        type="text"
                        value={ec.title}
                        onChange={(e) => updateExtracurricular(ec.id, 'title', e.target.value)}
                        placeholder="e.g. Founder & President"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Organization / Club</label>
                      <input
                        type="text"
                        value={ec.organization}
                        onChange={(e) => updateExtracurricular(ec.id, 'organization', e.target.value)}
                        placeholder="e.g. High School Programming Club"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                      <select
                        value={ec.category}
                        onChange={(e) => updateExtracurricular(ec.id, 'category', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Leadership">Leadership</option>
                        <option value="Competitions">Competitions & Olympiads</option>
                        <option value="Research">Research & Projects</option>
                        <option value="Volunteering">Volunteering & Community</option>
                        <option value="Clubs">Clubs & Student Societies</option>
                        <option value="Sports">Sports & Athletics</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description & Impact</label>
                    <textarea
                      rows={2}
                      value={ec.description}
                      onChange={(e) => updateExtracurricular(ec.id, 'description', e.target.value)}
                      placeholder="e.g. Organized 4 coding bootcamps and trained 120+ students in Python and algorithms."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Step Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => {
                  triggerSave();
                  setCurrentStep(prev => prev + 1);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerSave();
                  setActiveTab('assessment');
                }}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <Sparkles className="h-4 w-4" />
                <span>Save & Generate Full Assessment Report</span>
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
