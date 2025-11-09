'use client'

import { useState, useEffect } from 'react'
import ModalBlank from './modal-blank'

interface InboxInputAreaProps {
  uid: string
  selectedCompany: string
  subdomain?: string
  customDomain?: string
  customDomainVerified?: boolean
  ticketId: string
  ticketData: any
  messages: any[]
  onMessageSent?: (newMessage: any) => void
}

interface Template {
  id: string
  title: string
  body: string
}

interface Article {
  id: string
  categoryId: string
  title: string
  link: string
}

export default function InboxInputArea({
  uid,
  selectedCompany,
  subdomain = '',
  customDomain = '',
  customDomainVerified = false,
  ticketId,
  ticketData,
  messages,
  onMessageSent,
}: InboxInputAreaProps) {
  const [showExtraButtons, setShowExtraButtons] = useState(false)
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)
  const [aiSuggestionCollapsed, setAiSuggestionCollapsed] = useState(true)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [currentFrom, setCurrentFrom] = useState<any>(null)
  const [emails, setEmails] = useState<any[]>([])
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [addingTemplate, setAddingTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateBody, setTemplateBody] = useState('')

  // Articles state
  const [articles, setArticles] = useState<Article[]>([])
  const [articleModalOpen, setArticleModalOpen] = useState(false)
  const [articleSearch, setArticleSearch] = useState('')
  const [articlesLoading, setArticlesLoading] = useState(false)

  // Emails state
  const [emailsLoading, setEmailsLoading] = useState(false)

  // Fetch templates
  useEffect(() => {
    if (!uid || !selectedCompany) return

    const fetchTemplates = async () => {
      try {
        const url = new URL('/api/inbox/templates', window.location.origin)
        url.searchParams.append('uid', uid)
        url.searchParams.append('selectedCompany', selectedCompany)

        const response = await fetch(url.toString())
        const data = await response.json()

        if (data.status === 1) {
          setTemplates(data.templates)
        }
      } catch (error) {
        console.error('Error fetching templates:', error)
      }
    }

    fetchTemplates()
  }, [uid, selectedCompany])

  // Fetch emails
  useEffect(() => {
    if (!uid || !selectedCompany) return

    const fetchEmails = async () => {
      setEmailsLoading(true)
      try {
        const url = new URL('/api/inbox/emails', window.location.origin)
        url.searchParams.append('uid', uid)
        url.searchParams.append('selectedCompany', selectedCompany)

        const response = await fetch(url.toString())
        const data = await response.json()

        if (data.status === 1) {
          setEmails(data.emails)
          
          // Try to load from localStorage first
          const companySpecificKey = `currentFrom_${selectedCompany}`
          const storedFrom = localStorage.getItem(companySpecificKey)
          
          if (storedFrom) {
            try {
              const parsed = JSON.parse(storedFrom)
              const matchingEmail = data.emails.find((e: any) => e.emailAddress === parsed.emailAddress)
              if (matchingEmail) {
                setCurrentFrom(matchingEmail)
                return
              }
            } catch (e) {
              console.error('Error parsing stored email:', e)
            }
          }
          
          // Set default email (first one, which is always the default type) if available and none selected
          if (data.emails.length > 0) {
            setCurrentFrom(data.emails[0])
          }
        }
      } catch (error) {
        console.error('Error fetching emails:', error)
      } finally {
        setEmailsLoading(false)
      }
    }

    fetchEmails()
  }, [uid, selectedCompany])

  // Fetch articles
  const fetchArticles = async () => {
    if (!uid) return
    setArticlesLoading(true)
    try {
      const url = new URL('/api/inbox/articles', window.location.origin)
      url.searchParams.append('uid', uid)
      url.searchParams.append('selectedCompany', selectedCompany)

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.status === 1) {
        setArticles(data.articles)
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setArticlesLoading(false)
    }
  }

  // Insert article reference
  const insertArticleReference = (article: Article) => {
    const baseDomain = customDomainVerified && customDomain !== '' ? customDomain : `${subdomain}.ourkd.help`
    const url = `https://${baseDomain}/articles/${article.link}`
    setText((prev) => (prev ? `${prev}\n${url}` : url))
    setArticleModalOpen(false)
    setArticleSearch('')
  }

  // Insert template
  const insertTemplate = (tpl: Template) => {
    setText((prev) => (prev ? `${prev}\n\n${tpl.body}` : tpl.body))
    setTemplateModalOpen(false)
  }

  // Save template (create or update)
  const saveTemplate = async () => {
    if (!templateTitle.trim() || !templateBody.trim()) return

    try {
      if (editingTemplate) {
        // Update existing
        const response = await fetch('/api/inbox/templates/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid,
            selectedCompany,
            templateId: editingTemplate.id,
            title: templateTitle.trim(),
            body: templateBody.trim(),
          }),
        })

        const data = await response.json()
        if (data.status === 1) {
          setTemplates((prev) =>
            prev.map((t) => (t.id === editingTemplate.id ? data.template : t))
          )
          closeTemplateForm()
        }
      } else {
        // Create new
        const response = await fetch('/api/inbox/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid,
            selectedCompany,
            title: templateTitle.trim(),
            body: templateBody.trim(),
          }),
        })

        const data = await response.json()
        if (data.status === 1) {
          setTemplates((prev) => [...prev, data.template])
          closeTemplateForm()
        }
      }
    } catch (error) {
      console.error('Error saving template:', error)
    }
  }

  const closeTemplateForm = () => {
    setAddingTemplate(false)
    setEditingTemplate(null)
    setTemplateTitle('')
    setTemplateBody('')
  }

  const startEditTemplate = (tpl: Template) => {
    setEditingTemplate(tpl)
    setTemplateTitle(tpl.title)
    setTemplateBody(tpl.body)
    setAddingTemplate(true)
  }

  // Handle attachment selection
  const handleAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setAttachments((prev) => [...prev, ...Array.from(files)])
    }
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Upload files to Firebase Storage
  const uploadFiles = async (files: File[]): Promise<{ name: string; url: string }[]> => {
    if (files.length === 0) return []

    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage')
    const storage = getStorage()
    const fileUrls: { name: string; url: string }[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`
      const fileRef = ref(storage, `attachments/${uniqueFileName}`)

      const snapshot = await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      fileUrls.push({ name: file.name, url: downloadURL })
      setUploadProgress(((i + 1) / files.length) * 100)
    }

    return fileUrls
  }

  // Send message
  const sendMessage = async () => {
    setError('')
    setSending(true)
    setShowAiSuggestion(false)

    try {
      // Validation
      if (!text.trim()) {
        setError('Please enter a message')
        setSending(false)
        return
      }

      if (!ticketData?.from) {
        setError('Unable to determine recipient email address')
        setSending(false)
        return
      }

      const lastMessage = messages.length > 0 ? messages[0] : null
      const replyToId = lastMessage?.messageId || ''
      const references = lastMessage?.references || ''
      const subject = lastMessage?.subject || 'Re: Support Ticket'

      // Upload attachments
      let fileUrls: { name: string; url: string }[] = []
      if (attachments.length > 0) {
        setUploadProgress(0)
        fileUrls = await uploadFiles(attachments)
      }

      // Prepare email data
      const emailData = {
        uid,
        selectedCompany,
        ticketId,
        to: ticketData.from,
        subject,
        message: text,
        replyToId,
        references,
        currentFrom: currentFrom ? {
          id: currentFrom.id,
          type: currentFrom.type,
          emailAddress: currentFrom.emailAddress,
        } : undefined,
        fileUrls,
      }

      // Send email
      const response = await fetch('/api/inbox/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      })

      const result = await response.json()

      if (result.status === 1) {
        // Success - clear form
        setText('')
        setAttachments([])
        setUploadProgress(0)
        setError('')
        
        // Save current email selection to localStorage
        if (currentFrom) {
          const companySpecificKey = `currentFrom_${selectedCompany}`
          localStorage.setItem(companySpecificKey, JSON.stringify(currentFrom))
        }
        
        // Create the new message object to append
        const newMessage = {
          id: result.messageId || `temp-${Date.now()}`,
          to: ticketData.from,
          from: currentFrom?.emailAddress || `${subdomain}@ourkd.help`,
          body: text,
          subject,
          date: new Date(),
          messageId: result.messageId,
          inReplyTo: replyToId,
          references,
          type: 'outbound',
          attachments: fileUrls,
          uid,
        }
        
        // Notify parent component with the new message
        if (onMessageSent) {
          onMessageSent(newMessage)
        }
      } else {
        setError(result.message || 'Failed to send email')
      }
    } catch (error: any) {
      console.error('Error sending email:', error)
      setError('Error sending email: ' + error.message)
    } finally {
      setSending(false)
      setUploadProgress(0)
    }
  }

  // Truncate filename for display
  const truncateFileName = (name: string, length = 20) => {
    return name.length > length ? name.substring(0, length) + '...' : name
  }

  const autoGrow = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.minHeight = '40px'
    e.target.style.height = '40px'
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10">
      <div className="mx-4 sm:mx-6 md:mx-5 my-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/60 overflow-hidden">
          {/* Email selection dropdown */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700/60">
            <div className="relative">
              <label htmlFor="email-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From
              </label>
              <select
                id="email-select"
                className="form-select w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500"
                value={currentFrom?.emailAddress || ''}
                onChange={(e) => {
                  const selectedEmail = emails.find((email) => email.emailAddress === e.target.value)
                  setCurrentFrom(selectedEmail || null)
                  // Save to localStorage
                  if (selectedEmail) {
                    const companySpecificKey = `currentFrom_${selectedCompany}`
                    localStorage.setItem(companySpecificKey, JSON.stringify(selectedEmail))
                  }
                }}
                disabled={emailsLoading}
              >
                {emailsLoading ? (
                  <option value="">Loading emails...</option>
                ) : emails.length === 0 ? (
                  <option value="">No emails configured</option>
                ) : (
                  <>
                    <option value="">Select email...</option>
                    {emails.map((email) => (
                      <option key={email.id} value={email.emailAddress}>
                        {email.emailAddress}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* AI Suggestion */}
          {showAiSuggestion && (
            <div className="px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800/60">
              <div className="flex items-start justify-between">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center mr-2">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 0C4.5 0 0 4.5 0 10s4.5 10 10 10 10-4.5 10-10S15.5 0 10 0zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm0-12.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-violet-800 dark:text-violet-300">Charlie Suggestion</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setAiSuggestionCollapsed(!aiSuggestionCollapsed)}
                    className="text-violet-400 hover:text-violet-600 dark:text-violet-500 dark:hover:text-violet-300"
                    title={aiSuggestionCollapsed ? 'Expand suggestion' : 'Collapse suggestion'}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${aiSuggestionCollapsed ? 'rotate-180' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setShowAiSuggestion(false)
                      setAiSuggestion('')
                    }}
                    className="text-violet-400 hover:text-violet-600 dark:text-violet-500 dark:hover:text-violet-300"
                    title="Remove suggestion permanently"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              {!aiSuggestionCollapsed && (
                <>
                  <div className="text-sm text-violet-700 dark:text-violet-400 mb-3">
                    <div
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: aiSuggestion }}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setText(aiSuggestion)
                        setShowAiSuggestion(false)
                        setAiSuggestion('')
                      }}
                      className="px-3 py-1.5 text-xs bg-violet-500 hover:bg-violet-600 text-white rounded-md transition-colors"
                    >
                      Use Suggestion
                    </button>
                    <button
                      onClick={() => {
                        setText(text + (text ? '\n\n' : '') + aiSuggestion)
                        setShowAiSuggestion(false)
                        setAiSuggestion('')
                      }}
                      className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-md transition-colors"
                    >
                      Append to Message
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Display Selected Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <svg
                    className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected Files ({attachments.length})
                  </span>
                </div>
                <button
                  onClick={() => setAttachments([])}
                  className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 group"
                  >
                    <svg
                      className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                      {truncateFileName(file.name)}
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main input area */}
          <div className="p-4">
            {/* Textarea */}
            <textarea
              id="message-input"
              className="form-input w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 rounded-lg placeholder-gray-500 resize-none overflow-y-auto mb-3"
              placeholder="Type your message here..."
              rows={3}
              style={{ height: '40px', minHeight: '40px', maxHeight: '200px', transition: 'all 0.2s ease' }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={(e) => {
                e.target.style.minHeight = '120px'
              }}
              onBlur={autoGrow}
            />

            {/* Error message */}
            {error && (
              <div className="mb-3 p-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md">
                <div className="flex items-center">
                  <svg className="w-4 h-4 shrink-0 fill-current opacity-80 mr-2" viewBox="0 0 16 16">
                    <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Action buttons in a footer */}
            <div className="flex items-center justify-between">
              {/* Left side - Options and attachment buttons */}
              <div className="flex space-x-2">
                <button
                  className="btn-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 rounded-md"
                  onClick={() => setShowExtraButtons(!showExtraButtons)}
                >
                  <svg
                    className="w-4 h-4 fill-current text-gray-400 dark:text-gray-500 shrink-0 mr-1.5"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
                  </svg>
                  <span>{showExtraButtons ? 'Hide options' : 'Options'}</span>
                </button>

                {showExtraButtons && (
                  <>
                    {/* File attachment button */}
                    <div className="relative">
                      <input
                        type="file"
                        id="file-upload"
                        multiple
                        onChange={handleAttachment}
                        className="sr-only"
                      />
                      <label
                        htmlFor="file-upload"
                        className="btn-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 cursor-pointer flex items-center rounded-md"
                      >
                        <svg
                          className="h-4 w-4 mr-1.5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                        <span>Attach</span>
                      </label>
                    </div>

                    {/* Quick Article reference button */}
                    <button
                      className="btn-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 rounded-md flex items-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        setArticleModalOpen(true)
                        if (articles.length === 0) {
                          fetchArticles()
                        }
                      }}
                    >
                      <svg
                        className="w-4 h-4 fill-current text-gray-400 dark:text-gray-500 shrink-0 mr-1.5"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 0a8 8 0 108 8A8 8 0 008 0zm1 12H7V9H4V7h3V4h2v3h3v2H9z" />
                      </svg>
                      <span>Article</span>
                    </button>

                    {/* Template button */}
                    <button
                      className="btn-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 rounded-md flex items-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTemplateModalOpen(true)
                      }}
                    >
                      <svg
                        className="w-4 h-4 fill-current text-gray-400 dark:text-gray-500 shrink-0 mr-1.5"
                        viewBox="0 0 16 16"
                      >
                        <path d="M2 2h12v2H2zm0 4h12v2H2zm0 4h7v2H2z" />
                      </svg>
                      <span>Template</span>
                    </button>
                  </>
                )}
              </div>

              {/* Right side - Send button */}
              <button
                className={`btn-sm bg-violet-500 hover:bg-violet-600 text-white rounded-md shadow-sm hover:shadow transition-all duration-200 ${
                  sending || !text.trim() || !currentFrom ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={sendMessage}
                disabled={sending || !text.trim() || !currentFrom}
              >
                {sending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1.5"></div>
                    <span>{uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${Math.round(uploadProgress)}%` : 'Sending...'}</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 fill-current shrink-0 mr-1.5" viewBox="0 0 16 16">
                      <path d="M15.707 7.293l-6-6a1 1 0 0 0-1.414 1.414L12.586 7H1a1 1 0 0 0 0 2h11.586l-4.293 4.293a1 1 0 1 0 1.414 1.414l6-6a1 1 0 0 0 0-1.414z" />
                    </svg>
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Article Modal */}
      <ModalBlank isOpen={articleModalOpen} setIsOpen={setArticleModalOpen}>
        <div className="p-5 w-full max-w-md">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Insert Article Reference</h3>
          </div>
          <input
            type="text"
            className="form-input w-full mb-4"
            placeholder="Search articles…"
            value={articleSearch}
            onChange={(e) => setArticleSearch(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto">
            {articlesLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : (
              articles
                .filter((a) => a.title?.toLowerCase().includes(articleSearch.toLowerCase()))
                .map((a) => (
                  <button
                    key={a.id}
                    className="block w-full text-left px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => insertArticleReference(a)}
                  >
                    {a.title}
                  </button>
                ))
            )}
            {!articlesLoading &&
              articleSearch.trim() !== '' &&
              articles.filter((a) => a.title?.toLowerCase().includes(articleSearch.toLowerCase())).length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2">No articles found.</p>
              )}
          </div>
          <div className="flex justify-end mt-4 space-x-2">
            <button
              className="btn-sm border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300"
              onClick={(e) => {
                e.stopPropagation()
                setArticleModalOpen(false)
                setArticleSearch('')
              }}
            >
              Close
            </button>
          </div>
        </div>
      </ModalBlank>

      {/* Templates Modal */}
      <ModalBlank isOpen={templateModalOpen} setIsOpen={setTemplateModalOpen}>
        <div className="p-5 w-full max-w-md">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Response Templates</h3>
            {!addingTemplate && (
              <button
                className="btn-sm bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                onClick={() => setAddingTemplate(true)}
              >
                Add New
              </button>
            )}
          </div>

          {/* List or Add form */}
          {!addingTemplate ? (
            <div className="max-h-60 overflow-y-auto">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                >
                  <button className="text-left flex-1" onClick={() => insertTemplate(tpl)}>
                    {tpl.title}
                  </button>
                  <button
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 ml-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditTemplate(tpl)
                    }}
                    aria-label="Edit"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 16 16">
                      <path d="M15.414 2.586a2 2 0 0 0-2.828 0L5 10.172V13h2.828l7.586-7.586a2 2 0 0 0 0-2.828ZM4 12v-1.586l7.293-7.293 1.586 1.586L5.586 12H4Z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                className="form-input w-full"
                placeholder="Template title"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
              />
              <textarea
                className="form-textarea w-full"
                rows={4}
                placeholder="Template body"
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
              ></textarea>
              <div className="flex justify-end space-x-2">
                <button
                  className="btn-sm border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300"
                  onClick={closeTemplateForm}
                >
                  Cancel
                </button>
                <button
                  className="btn-sm bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                  onClick={saveTemplate}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Close */}
          {!addingTemplate && (
            <div className="flex justify-end mt-4 space-x-2">
              <button
                className="btn-sm border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation()
                  setTemplateModalOpen(false)
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </ModalBlank>
    </div>
  )
}

