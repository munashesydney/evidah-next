import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Evidah',
  description: 'Sign in to your Evidah account',
  robots: {
    index: true,
    follow: true,
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

