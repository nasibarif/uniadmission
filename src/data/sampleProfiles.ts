import type { StudentProfile } from '../types';

export const SAMPLE_PROFILES: { name: string; tag: string; description: string; profile: StudentProfile }[] = [
  {
    name: 'Rahim (HSC / STEM)',
    tag: 'Undergrad • CS • $20k Budget',
    description: 'HSC GPA 5.0, IELTS 7.0, target Computer Science, strong coding & leadership, moderate budget.',
    profile: {
      personal: {
        fullName: 'Rahim Chowdhury',
        email: 'rahim.chowdhury@example.com',
        phone: '+880 1712 345678',
        nationality: 'Bangladesh',
        currentCity: 'Dhaka'
      },
      academic: {
        qualification: 'HSC',
        gpa: 5.0,
        gpaScale: '5.0',
        rawGpaText: 'GPA 5.00 (Golden A+)',
        graduationYear: 2026,
        institution: 'Notre Dame College, Dhaka',
        subjects: [
          { subject: 'Higher Mathematics', grade: 'A+' },
          { subject: 'Physics', grade: 'A+' },
          { subject: 'Chemistry', grade: 'A+' },
          { subject: 'English', grade: 'A+' },
          { subject: 'ICT', grade: 'A+' },
          { subject: 'Bangla', grade: 'A+' }
        ],
        academicAwards: [
          'National Math Olympiad Divisional Winner (2025)',
          'High School Academic Excellence Medal',
          'Inter-College Science Fair 1st Prize'
        ]
      },
      intendedStudy: {
        degreeLevel: "Bachelor's",
        major: 'Computer Science',
        secondaryMajors: ['Software Engineering', 'Artificial Intelligence', 'Data Science'],
        targetIntake: 'Fall 2027',
        careerGoal: 'Become an AI Software Engineer & Tech Entrepreneur solving climate logistics.'
      },
      preferences: {
        countries: ['USA', 'Canada', 'Australia', 'Germany', 'South Korea'],
        preferredClimate: 'Moderate to Warm',
        preferredSetting: 'Urban'
      },
      financial: {
        maxYearlyBudgetUSD: 20000,
        tuitionBudgetUSD: 12000,
        livingBudgetUSD: 8000,
        scholarshipNeed: 'Substantial (50-80%)',
        willingToWorkPartTime: true
      },
      standardizedTests: {
        englishTest: {
          type: 'IELTS',
          overallScore: 7.0,
          reading: 7.5,
          listening: 7.5,
          speaking: 6.5,
          writing: 6.5,
          date: '2026-05-15'
        },
        standardizedTest: {
          type: 'SAT',
          totalScore: 1410,
          math: 780,
          verbal: 630,
          date: '2026-06-01'
        },
        apScores: []
      },
      extracurriculars: [
        {
          id: 'ec-1',
          title: 'Founder & President',
          role: 'Lead Organizer & Python Instructor',
          organization: 'Notre Dame High School Programming Club',
          category: 'Leadership',
          description: 'Organized 4 national competitive programming bootcamps and trained 120+ junior students.',
          hoursPerWeek: 6,
          achievements: 'Hosted inter-school code sprint with 45 schools participating.'
        },
        {
          id: 'ec-2',
          title: 'Robotics Team Lead Engineer',
          role: 'Firmware & Sensor Developer',
          organization: 'National STEM Robotics Initiative',
          category: 'Competitions',
          description: 'Designed autonomous line-following and obstacle-avoidance rescue rover using Arduino/C++.',
          hoursPerWeek: 5,
          achievements: 'Champion at National Youth Robotics Challenge 2025.'
        },
        {
          id: 'ec-3',
          title: 'Community Volunteer Teacher',
          role: 'Math & Digital Literacy Tutor',
          organization: 'Spreeha Community Foundation',
          category: 'Volunteering',
          description: 'Taught basic mathematics and computer typing skills to 40+ underprivileged children.',
          hoursPerWeek: 4,
          achievements: 'Completed 150+ hours of community service.'
        }
      ],
      achievements: [
        {
          id: 'ach-1',
          title: 'Flood Alert Smart SMS IoT Project',
          category: 'Project',
          description: 'Built low-cost IoT water-level telemetry device deployed in riverside communities sending real-time SMS alerts to 200 villagers.',
          year: '2025',
          link: 'https://github.com/rahim-iot-alert'
        },
        {
          id: 'ach-2',
          title: 'Harvard CS50x Certificate of Completion',
          category: 'Certification',
          description: 'Completed Harvard University’s rigorous introduction to Computer Science with high distinction.',
          year: '2024'
        }
      ]
    }
  },
  {
    name: 'Sarah (A-Levels / Business & Econ)',
    tag: 'Undergrad • Finance/Econ • $35k Budget',
    description: 'A*A*A in A-Levels, IELTS 8.0, SAT 1480, target Finance & Business, seeking UK / Canada / US top programs.',
    profile: {
      personal: {
        fullName: 'Sarah Jenkins',
        email: 'sarah.j@example.com',
        phone: '+44 7911 123456',
        nationality: 'United Kingdom / Dual Citizen',
        currentCity: 'London'
      },
      academic: {
        qualification: 'A-Levels',
        gpa: 4.0,
        gpaScale: '4.0',
        rawGpaText: 'A* A* A (Math, Economics, Further Math)',
        graduationYear: 2026,
        institution: 'Westminster City Academy',
        subjects: [
          { subject: 'Mathematics', grade: 'A*' },
          { subject: 'Economics', grade: 'A*' },
          { subject: 'Further Mathematics', grade: 'A' },
          { subject: 'Business Studies', grade: 'A*' }
        ],
        academicAwards: ['UK Senior Mathematical Challenge Gold Award', 'Young Economist Essay Finalist']
      },
      intendedStudy: {
        degreeLevel: "Bachelor's",
        major: 'Economics & Finance',
        secondaryMajors: ['Business Administration', 'Data Analytics'],
        targetIntake: 'Fall 2027',
        careerGoal: 'Investment Banking & Sustainable Venture Capital.'
      },
      preferences: {
        countries: ['USA', 'Canada', 'UK', 'Netherlands'],
        preferredClimate: 'Any',
        preferredSetting: 'Urban'
      },
      financial: {
        maxYearlyBudgetUSD: 35000,
        tuitionBudgetUSD: 22000,
        livingBudgetUSD: 13000,
        scholarshipNeed: 'Partial (20-40%)',
        willingToWorkPartTime: true
      },
      standardizedTests: {
        englishTest: {
          type: 'IELTS',
          overallScore: 8.0,
          reading: 8.5,
          listening: 8.5,
          speaking: 7.5,
          writing: 7.5,
          date: '2026-04-10'
        },
        standardizedTest: {
          type: 'SAT',
          totalScore: 1480,
          math: 790,
          verbal: 690,
          date: '2026-05-02'
        }
      },
      extracurriculars: [
        {
          id: 'ec-s1',
          title: 'Head of Student Investment Society',
          role: 'Managing Virtual £50k Portfolio',
          organization: 'School Finance Society',
          category: 'Leadership',
          description: 'Ran weekly financial literacy workshops and simulated trading competitions.',
          hoursPerWeek: 5,
          achievements: 'Generated 14% simulated alpha beating benchmark index.'
        },
        {
          id: 'ec-s2',
          title: 'Model United Nations Secretary-General',
          role: 'Chair of Economic Committee',
          organization: 'London Youth MUN',
          category: 'Leadership',
          description: 'Organized conference hosting 300+ delegates from 20 schools.',
          hoursPerWeek: 6,
          achievements: 'Best Delegate Award at Oxford MUN.'
        }
      ],
      achievements: [
        {
          id: 'ach-s1',
          title: 'Analysis Paper: Impact of Microfinance on Female Entrepreneurship',
          category: 'Publication',
          description: 'Published paper in Youth Economics Review summarizing empirical field data.',
          year: '2025'
        }
      ]
    }
  },
  {
    name: 'Liam (Master\'s / Data Science & AI)',
    tag: 'Postgrad • AI / Data Science • $15k Budget',
    description: 'BSc in Software Engineering (CGPA 3.75), IELTS 7.5, GRE 322, seeking funded Master\'s in Germany / Canada / South Korea.',
    profile: {
      personal: {
        fullName: 'Liam Chen',
        email: 'liam.chen@example.com',
        phone: '+60 12 345 6789',
        nationality: 'Malaysia',
        currentCity: 'Kuala Lumpur'
      },
      academic: {
        qualification: 'Bachelor (Applying for Master)',
        gpa: 3.75,
        gpaScale: '4.0',
        rawGpaText: '3.75 / 4.00 (First Class Honours)',
        graduationYear: 2025,
        institution: 'University of Malaya',
        subjects: [
          { subject: 'Data Structures & Algorithms', grade: 'A' },
          { subject: 'Machine Learning', grade: 'A+' },
          { subject: 'Database Systems', grade: 'A' },
          { subject: 'Linear Algebra', grade: 'A+' }
        ],
        academicAwards: ['Dean’s List for 6 Consecutive Semesters', 'National Data Hackathon 2nd Place']
      },
      intendedStudy: {
        degreeLevel: "Master's",
        major: 'Data Science & Machine Learning',
        secondaryMajors: ['Computer Science', 'Artificial Intelligence'],
        targetIntake: 'Fall 2027',
        careerGoal: 'Senior ML Researcher and Applied AI Engineer.'
      },
      preferences: {
        countries: ['Germany', 'Canada', 'South Korea', 'USA', 'Sweden'],
        preferredSetting: 'Urban'
      },
      financial: {
        maxYearlyBudgetUSD: 15000,
        tuitionBudgetUSD: 5000,
        livingBudgetUSD: 10000,
        scholarshipNeed: 'Substantial (50-80%)',
        willingToWorkPartTime: true
      },
      standardizedTests: {
        englishTest: {
          type: 'IELTS',
          overallScore: 7.5,
          reading: 8.0,
          listening: 8.0,
          speaking: 7.0,
          writing: 7.0
        },
        standardizedTest: {
          type: 'GRE',
          totalScore: 322,
          math: 168,
          verbal: 154
        }
      },
      extracurriculars: [
        {
          id: 'ec-l1',
          title: 'Open Source Maintainer',
          role: 'Core Contributor',
          organization: 'FastVision PyTorch Library',
          category: 'Research',
          description: 'Maintained computer vision pipeline with 1,200+ GitHub stars.',
          hoursPerWeek: 8,
          achievements: 'Merged 45 PRs used by 3,000+ developers.'
        }
      ],
      achievements: [
        {
          id: 'ach-l1',
          title: 'IEEE Conference Paper on Edge AI Object Detection',
          category: 'Publication',
          description: 'Co-authored peer-reviewed conference paper on lightweight neural networks for drone navigation.',
          year: '2025'
        },
        {
          id: 'ach-l2',
          title: 'Software Engineer Intern at Grab',
          category: 'Work Experience',
          description: 'Optimized real-time ETA prediction model reducing compute latency by 18%.',
          year: '2024'
        }
      ]
    }
  }
];
