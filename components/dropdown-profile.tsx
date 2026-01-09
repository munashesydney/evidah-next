'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import UserAvatar from '@/public/images/user-avatar-32.png'
import ModalBasic from '@/components/modal-basic'

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
  const [agentEmail, setAgentEmail] = useState<string>('') // Agent's email from custom claims
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [currentCompanyName, setCurrentCompanyName] = useState('Loading...')
  const [isOwner, setIsOwner] = useState(false)
  const [addWorkspaceModalOpen, setAddWorkspaceModalOpen] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceWebsite, setWorkspaceWebsite] = useState('')
  const [workspaceIndustry, setWorkspaceIndustry] = useState('')
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [workspaceError, setWorkspaceError] = useState('')

  // Fetch user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        setUserEmail(user.email || '')
        
        // Get custom claims for role and agent email
        try {
          const idTokenResult = await user.getIdTokenResult();
          const role = typeof idTokenResult.claims.role === 'string' ? idTokenResult.claims.role : '';
          const agentEmailFromClaims = typeof idTokenResult.claims.userEmail === 'string' ? idTokenResult.claims.userEmail : '';
          
          setUserRole(role);
          setAgentEmail(agentEmailFromClaims);
          
          // Check if user is an agent (role is NOT 'Owner')
          const isAgent = role && role !== 'Owner';
          setIsOwner(!isAgent); // Owner if not an agent
          
          // Fetch companies - pass agentEmail if user is an agent
          fetchCompanies(user.uid, isAgent ? agentEmailFromClaims : undefined)
        } catch (error) {
          console.error('Error getting user role:', error);
          // Fallback: fetch without agent filter
          fetchCompanies(user.uid)
        }
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

  const fetchCompanies = async (uid: string, agentEmail?: string) => {
    try {
      setLoadingCompanies(true)
      console.log('Fetching companies for uid:', uid, agentEmail ? `(agent: ${agentEmail})` : '(owner)')
      
      // Build URL with optional agentEmail parameter
      const url = agentEmail 
        ? `/api/companies?uid=${uid}&agentEmail=${encodeURIComponent(agentEmail)}`
        : `/api/companies?uid=${uid}`
      
      const response = await fetch(url)
      const result = await response.json()

      console.log('Companies API response:', result)

      if (result.success) {
        setCompanies(result.data)
        console.log('Companies loaded:', result.data.length, agentEmail ? '(filtered by agent access)' : '(all workspaces)')
      } else {
        console.error('Failed to fetch companies:', result.error)
        setCompanies([]) // Set empty array on error
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
      setCompanies([]) // Set empty array on error
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

  const handleAddWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !workspaceName.trim()) {
      setWorkspaceError('Workspace name is required')
      return
    }

    setCreatingWorkspace(true)
    setWorkspaceError('')

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          name: workspaceName.trim(),
          website: workspaceWebsite.trim(),
          industry: workspaceIndustry.trim(),
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Refresh companies list
        await fetchCompanies(user.uid)
        
        // Reset form and close modal
        setWorkspaceName('')
        setWorkspaceWebsite('')
        setWorkspaceIndustry('')
        setAddWorkspaceModalOpen(false)
        
        // Set the new workspace in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedCompany', result.data.id)
        }
        
        // Navigate directly to onboarding completion for the new workspace
        // This ensures the onboarding page loads the correct workspace
        router.push(`/onboardingcompletion?workspace=${result.data.id}`)
      } else {
        setWorkspaceError(result.error || 'Failed to create workspace')
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      setWorkspaceError('Failed to create workspace. Please try again.')
    } finally {
      setCreatingWorkspace(false)
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
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Companies
            </div>
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setAddWorkspaceModalOpen(true)
                }}
                className="text-xs text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 font-medium"
                title="Add Workspace"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                  <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                </svg>
              </button>
            )}
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

      {/* Add Workspace Modal */}
      <ModalBasic title="Add Workspace" isOpen={addWorkspaceModalOpen} setIsOpen={setAddWorkspaceModalOpen}>
        <form onSubmit={handleAddWorkspace}>
          <div className="px-5 py-4">
            <div className="text-sm">
              <div className="font-medium text-gray-800 dark:text-gray-100 mb-3">
                Create a new workspace
              </div>
              {workspaceError && <p className="text-red-500 mb-3 text-sm">{workspaceError}</p>}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="workspace_name">
                  Workspace Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="workspace_name"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="form-input w-full"
                  placeholder="Enter workspace name"
                  required
                  disabled={creatingWorkspace}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="workspace_website">
                  Website
                </label>
                <input
                  id="workspace_website"
                  type="url"
                  value={workspaceWebsite}
                  onChange={(e) => setWorkspaceWebsite(e.target.value)}
                  className="form-input w-full"
                  placeholder="https://example.com"
                  disabled={creatingWorkspace}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="workspace_industry">
                  Industry
                </label>
                <input
                  id="workspace_industry"
                  type="text"
                  value={workspaceIndustry}
                  onChange={(e) => setWorkspaceIndustry(e.target.value)}
                  className="form-input w-full"
                  placeholder="e.g., Technology, Healthcare, etc."
                  disabled={creatingWorkspace}
                />
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700/60">
            <div className="flex flex-wrap justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setAddWorkspaceModalOpen(false)
                  setWorkspaceName('')
                  setWorkspaceWebsite('')
                  setWorkspaceIndustry('')
                  setWorkspaceError('')
                }}
                className="btn-sm border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300"
                disabled={creatingWorkspace}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-sm bg-violet-500 hover:bg-violet-600 text-white"
                disabled={creatingWorkspace || !workspaceName.trim()}
              >
                {creatingWorkspace ? (
                  <>
                    <svg className="animate-spin fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </button>
            </div>
          </div>
        </form>
      </ModalBasic>
    </Menu>
  )
}