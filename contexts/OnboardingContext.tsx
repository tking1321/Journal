import React, { createContext, useContext, useState } from 'react';

export interface OnboardingData {
  problem: string;
  duration: string;
  failedAttempts: string[];
  categories: { name: string; growthDescription: string }[];
  timeCommitment: string;
  dailyGoalLimit: number;
  coachingStyle: string;
  journalingStyle: string;
  biggestObstacle: string;
  successVision: string;
}

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  totalSteps: number;
}

const defaultData: OnboardingData = {
  problem: '',
  duration: '',
  failedAttempts: [],
  categories: [],
  timeCommitment: '',
  dailyGoalLimit: 3,
  coachingStyle: '',
  journalingStyle: '',
  biggestObstacle: '',
  successVision: '',
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const totalSteps = 11;

  function updateData(updates: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  return (
    <OnboardingContext.Provider value={{ data, updateData, totalSteps }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
}
