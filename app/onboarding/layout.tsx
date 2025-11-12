import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started - Evidah',
  description: 'Get started with Evidah - Transform your business with AI',
  robots: {
    index: true,
    follow: true,
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

