'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LiveChatPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params?.selectedCompany as string;

  useEffect(() => {
    // Redirect to basic settings by default
    router.replace(`/${selectedCompany}/settings/live-chat/basic`);
  }, [router, selectedCompany]);

  return null;
}

