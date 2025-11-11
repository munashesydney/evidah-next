'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import UserAvatar from '@/public/images/user-avatar-32.png'

interface Company {
  id: string
  name: string
}

export default function DropdownProfile({ align }: {
  align?: 'left' | 'right'
}) {
  const params = useParams()
  const router = useRouter()
  const selectedCompany = params?.selectedCompany as string

  const [user, setUser] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [currentCompanyName, setCurrentCompanyName] = useState('Loading...')

  // Fetch user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        setUserEmail(user.email || '')
        
        // Get custom claims for role
        try {
          const idTokenResult = await user.getIdTokenResult();
          setUserRole(typeof idTokenResult.claims.role === 'string' ? idTokenResult.claims.role : '');
        } catch (error) {
          console.error('Error getting user role:', error);
        }

        // Fetch companies
        fetchCompanies(user.uid)
      } else {
        router.push('/sign-in')
      }
    })

    return () => unsubscribe()
  }, [router])

  // Update current company name when companies or selectedCompany changes
  useEffect(() => {
    if (companies.length > 0 && selectedCompany) {
      const currentCompany = companies.find(c => c.id === selectedCompany)
      setCurrentCompanyName(currentCompany?.name || selectedCompany)
    }
  }, [companies, selectedCompany])

  const fetchCompanies = async (uid: string) => {
    try {
      setLoadingCompanies(true)
      const response = await fetch(`/api/companies?uid=${uid}`)
      const result = await response.json()

      if (result.success) {
        setCompanies(result.data)
      } else {
        console.error('Failed to fetch companies:', result.error)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setLoadingCompanies(false)
    }
  }

  const handleCompanySelect = (companyId: string) => {
    // Navigate to the same route but with the new company
    const currentPath = window.location.pathname
    const pathParts = currentPath.split('/')
    
    // Replace the selectedCompany in the path
    if (pathParts[1] && pathParts[1] === selectedCompany) {
      pathParts[1] = companyId
      const newPath = pathParts.join('/')
      router.push(newPath)
    } else {
      // Fallback: navigate to dashboard
      router.push(`/${companyId}/dashboard`)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push('/sign-in')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <Menu as="div" className="relative inline-flex">
      <MenuButton className="inline-flex justify-center items-center group cursor-pointer hover:opacity-80 transition-opacity duration-150">
        <Image className="w-8 h-8 rounded-full" src={UserAvatar} width={32} height={32} alt="User" />
        <div className="flex items-center truncate">
          <span className="truncate ml-2 text-sm font-medium text-gray-600 dark:text-gray-100 group-hover:text-gray-800 dark:group-hover:text-white transition-colors duration-150">
            {currentCompanyName}
          </span>
          <svg className="w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-150" viewBox="0 0 12 12">
            <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
          </svg>
        </div>
      </MenuButton>
      <Transition
        as="div"
        className={`origin-top-right z-10 absolute top-full min-w-[11rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 ${align === 'right' ? 'right-0' : 'left-0'
          }`}
        enter="transition ease-out duration-200 transform"
        enterFrom="opacity-0 -translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <MenuItems as="div" className="focus:outline-hidden">
        <div className="pt-0.5 pb-2 px-3 mb-1 border-b border-gray-200 dark:border-gray-700/60">
          <div className="font-medium text-gray-800 dark:text-gray-100">{currentCompanyName}</div>
          {userEmail && (
            <div className="text-xs text-gray-500 dark:text-gray-400 italic">{userEmail}</div>
          )}
          {userRole && (
            <div className="text-xs text-gray-500 dark:text-gray-400 italic">{userRole}</div>
          )}
        </div>
        
        {/* Companies List */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700/60">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Companies
          </div>
          {loadingCompanies ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">Loading companies...</div>
          ) : companies.length > 0 ? (
            <div className="space-y-1">
              {companies.map((company) => (
                <MenuItem key={company.id} as="div">
                  {({ active }) => (
                    <button
                      onClick={() => handleCompanySelect(company.id)}
                      className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors duration-150 cursor-pointer ${
                        company.id === selectedCompany
                          ? 'text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
                          : 'text-gray-600 dark:text-gray-300'
                      } ${
                        active
                          ? company.id === selectedCompany
                            ? 'bg-violet-100 dark:bg-violet-900/30'
                            : 'bg-gray-100 dark:bg-gray-700/50'
                          : ''
                      }`}
                    >
                      {company.name}
                    </button>
                  )}
                </MenuItem>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">No companies found</div>
          )}
        </div>

        <ul className="focus:outline-hidden">
          <MenuItem as="li">
            {selectedCompany && (
              <Link
                className="font-medium text-sm flex items-center py-1 px-3 text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded transition-colors duration-150 cursor-pointer"
                href={`/${selectedCompany}/settings/account`}
              >
                Settings
              </Link>
            )}
          </MenuItem>
          <MenuItem as="li">
            {({ active }) => (
              <button
                className={`font-medium text-sm flex items-center py-1 px-3 w-full text-left text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 rounded transition-colors duration-150 cursor-pointer ${
                  active ? 'bg-gray-50 dark:bg-gray-700/30' : ''
                }`}
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            )}
          </MenuItem>
        </ul>
        </MenuItems>
      </Transition>
    </Menu>
  )
}