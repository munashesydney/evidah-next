'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

export default function TrainingSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const selectedCompany = params?.selectedCompany as string;

  const isActive = (path: string) => {
    if (path === '/training') {
      return pathname === `/${selectedCompany}/training`;
    }
    return pathname?.includes(path);
  };

  return (
    <div className="flex flex-nowrap overflow-x-scroll no-scrollbar md:block md:overflow-auto px-3 py-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700/60 min-w-[15rem] md:space-y-3">
      {/* Group 1 */}
      <div>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-3">Training Management</div>
        <ul className="flex flex-nowrap md:block mr-3 md:mr-0">
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link 
              href={`/${selectedCompany}/training`}
              className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                isActive('/training') && pathname === `/${selectedCompany}/training`
                  ? 'bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]'
                  : ''
              }`}
            >
              <svg 
                className={`shrink-0 fill-current mr-2 ${
                  isActive('/training') && pathname === `/${selectedCompany}/training`
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} 
                width="16" 
                height="16" 
                viewBox="0 0 16 16"
              >
                <path d="M8.5 5.6a.5.5 0 1 0-1 0v.716l-2 1a.5.5 0 0 0 0 .895l7 3.5a.5.5 0 0 0 .448-.894L8.5 8.35V5.6z"/>
                <path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2zm13 2v2H1V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1zm-1 3v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V7h14z"/>
              </svg>
              <span 
                className={`text-sm font-medium ${
                  isActive('/training') && pathname === `/${selectedCompany}/training`
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Refresh Knowledge
              </span>
            </Link>
          </li>
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link 
              href={`/${selectedCompany}/training/documents`}
              className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                isActive('/training/documents')
                  ? 'bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]'
                  : ''
              }`}
            >
              <svg 
                className={`shrink-0 fill-current mr-2 ${
                  isActive('/training/documents')
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} 
                width="16" 
                height="16" 
                viewBox="0 0 16 16"
              >
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span 
                className={`text-sm font-medium ${
                  isActive('/training/documents')
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Documents
              </span>
            </Link>
          </li>
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link 
              href={`/${selectedCompany}/training/rules`}
              className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                isActive('/training/rules')
                  ? 'bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]'
                  : ''
              }`}
            >
              <svg 
                className={`shrink-0 fill-current mr-2 ${
                  isActive('/training/rules')
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} 
                width="16" 
                height="16" 
                viewBox="0 0 16 16"
              >
                <path d="M8 3.414V6a1 1 0 1 1-2 0V1a1 1 0 0 1 1-1h5a1 1 0 0 1 0 2H9.414l6.293 6.293a1 1 0 1 1-1.414 1.414L8 3.414Zm0 9.172V10a1 1 0 1 1 2 0v5a1 1 0 0 1-1 1H4a1 1 0 0 1 0-2h2.586L.293 7.707a1 1 0 0 1 1.414-1.414L8 12.586Z" />
              </svg>
              <span 
                className={`text-sm font-medium ${
                  isActive('/training/rules')
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Rules
              </span>
            </Link>
          </li>
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link 
              href={`/${selectedCompany}/training/faq`}
              className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                isActive('/training/faq')
                  ? 'bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]'
                  : ''
              }`}
            >
              <svg 
                className={`shrink-0 fill-current mr-2 ${
                  isActive('/training/faq')
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} 
                width="16" 
                height="16" 
                viewBox="0 0 16 16"
              >
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.326 0-2.786.647-2.754 2.533zm1.326 7.025c-.281 0-.52-.028-.72-.06-.148.79-.516 1.48-1.069 1.95-.576.485-.947.72-1.4.72-.281 0-.52-.028-.72-.06.148-.79.516-1.48 1.069-1.95.576-.485.947-.72 1.4-.72.281 0 .52.028.72.06-.148.79-.516 1.48-1.069 1.95-.576.485-.947.72-1.4.72z"/>
              </svg>
              <span 
                className={`text-sm font-medium ${
                  isActive('/training/faq')
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                FAQ
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

