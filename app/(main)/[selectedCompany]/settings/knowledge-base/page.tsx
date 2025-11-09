'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';
import { BlockPicker } from 'react-color';
import ModalBasic from '@/components/modal-basic';
import Link from 'next/link';

// Import the Firebase app from your config
import { app } from '@/lib/firebase';

const auth = getAuth(app);
const storage = getStorage(app);

interface KBData {
  name: string;
  subdomain: string;
  heading: string;
  subheading: string;
  seoTitle: string;
  seoDescription: string;
  logo: string;
  primaryColor: string;
  published: boolean;
  seoOn: boolean;
  showCompanyName: boolean;
  showLogo: boolean;
  customDomain: string;
  customDomainVerified: boolean;
  customDomainStep: number;
  chosenPicType: number;
}

export default function KnowledgeBasePage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [kbData, setKbData] = useState<KBData>({
    name: '',
    subdomain: '',
    heading: '',
    subheading: '',
    seoTitle: '',
    seoDescription: '',
    logo: '',
    primaryColor: '#1d4ed8',
    published: false,
    seoOn: false,
    showCompanyName: false,
    showLogo: false,
    customDomain: '',
    customDomainVerified: false,
    customDomainStep: 1,
    chosenPicType: 1,
  });

  const [image, setImage] = useState<string | null>(null);
  const [basicModalOpen, setBasicModalOpen] = useState(false);
  const [customDomainError, setCustomDomainError] = useState('');
  const [customDomainLoading, setCustomDomainLoading] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('');

  // Fetch KB data on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        await fetchKbData(user.uid);
      } else {
        router.push('/sign-in');
      }
    });

    return () => unsubscribe();
  }, [router, selectedCompany]);

  const fetchKbData = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/settings/knowledge-base?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const result = await response.json();

      if (result.success) {
        setKbData(result.data);
        setCustomDomainInput(result.data.customDomain || '');
      } else {
        setError(result.error || 'Failed to fetch knowledge base data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch knowledge base data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = document.createElement('img');
    img.onload = async () => {
      // Allow 500x500 (square) or 250x100 (rectangle)
      if ((img.width === 500 && img.height === 500) || (img.width === 250 && img.height === 100)) {
        const chosenPicType = img.width === 500 ? 1 : 2;
        try {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 500,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(file, options);

          const reader = new FileReader();
          reader.onload = (e) => {
            setImage(e.target?.result as string);
            setError('');
            uploadImage(compressedFile, chosenPicType);
          };
          reader.readAsDataURL(compressedFile);
        } catch (error) {
          setError('Error compressing image.');
        }
      } else {
        setError('Image dimensions must be 500x500 (square) or 250x100 (rectangle) pixels.');
        setImage(null);
      }
    };
    img.onerror = () => {
      setError('Invalid image file.');
      setImage(null);
    };
    img.src = URL.createObjectURL(file);
  };

  const uploadImage = async (file: File, chosenPicType: number) => {
    const storageRef = ref(storage, `images/${uid}/${file.name}`);
    setUploading(true);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        console.error('Error uploading file:', error);
        setError('Error uploading file.');
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await updateLogo(downloadURL, chosenPicType);
        setUploading(false);
      }
    );
  };

  const updateLogo = async (url: string, chosenPicType: number) => {
    try {
      const response = await fetch('/api/settings/knowledge-base/logo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, selectedCompany, logo: url, chosenPicType }),
      });

      const result = await response.json();
      if (result.success) {
        setKbData({ ...kbData, logo: url, chosenPicType });
        console.log('Logo updated successfully.');
      } else {
        setError(result.error || 'Error updating logo.');
      }
    } catch (error) {
      console.error('Error updating logo:', error);
      setError('Error updating logo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    const formData = new FormData(e.currentTarget);
    const name = formData.get('kbname') as string;
    const subdomain = formData.get('kbsubdomain') as string;
    const heading = formData.get('kbheading') as string;
    const subheading = formData.get('kbsubheading') as string;
    const seoTitle = formData.get('seotitle') as string;
    const seoDescription = formData.get('seodescription') as string;

    try {
      const response = await fetch('/api/settings/knowledge-base/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
          name,
          subdomain,
          heading,
          subheading,
          seoTitle,
          seoDescription,
          primaryColor: kbData.primaryColor,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setKbData(result.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error || 'Failed to update knowledge base');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update knowledge base');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    const newPublished = !kbData.published;
    try {
      const response = await fetch('/api/settings/knowledge-base/publish', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, selectedCompany, published: newPublished }),
      });

      const result = await response.json();
      if (result.success) {
        setKbData({ ...kbData, published: newPublished });
      } else {
        setError(result.error || 'Failed to update publish status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update publish status');
    }
  };

  const toggleSeo = async () => {
    const newSeoOn = !kbData.seoOn;
    try {
      const response = await fetch('/api/settings/knowledge-base/toggle-seo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, selectedCompany, seoOn: newSeoOn }),
      });

      const result = await response.json();
      if (result.success) {
        setKbData({ ...kbData, seoOn: newSeoOn });
      } else {
        setError(result.error || 'Failed to update SEO status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update SEO status');
    }
  };

  const toggleShowCompanyName = async () => {
    const newShowCompanyName = !kbData.showCompanyName;
    try {
      const response = await fetch('/api/settings/knowledge-base/toggle-show-company-name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, selectedCompany, showCompanyName: newShowCompanyName }),
      });

      const result = await response.json();
      if (result.success) {
        setKbData({ ...kbData, showCompanyName: newShowCompanyName });
      } else {
        setError(result.error || 'Failed to update show company name status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update show company name status');
    }
  };

  const toggleShowLogo = async () => {
    const newShowLogo = !kbData.showLogo;
    try {
      const response = await fetch('/api/settings/knowledge-base/toggle-show-logo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, selectedCompany, showLogo: newShowLogo }),
      });

      const result = await response.json();
      if (result.success) {
        setKbData({ ...kbData, showLogo: newShowLogo });
      } else {
        setError(result.error || 'Failed to update show logo status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update show logo status');
    }
  };

  const handleColorChange = (color: any) => {
    setKbData({ ...kbData, primaryColor: color.hex });
  };

  const submitCustomDomain = async () => {
    setCustomDomainError('');
    setCustomDomainLoading(true);

    if (!customDomainInput) {
      setCustomDomainError('Please enter the domain');
      setCustomDomainLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/settings/knowledge-base/custom-domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, selectedCompany, customDomain: customDomainInput }),
      });

      const result = await response.json();
      if (result.success) {
        setKbData({
          ...kbData,
          customDomain: customDomainInput,
          customDomainVerified: false,
          customDomainStep: 2,
        });
        setCustomDomainLoading(false);
      } else {
        setCustomDomainError(result.error || 'Failed to submit custom domain');
        setCustomDomainLoading(false);
      }
    } catch (err: any) {
      setCustomDomainError(err.message || 'Failed to submit custom domain');
      setCustomDomainLoading(false);
    }
  };

  const choseAgainCustomDomain = async () => {
    setCustomDomainError('');
    setCustomDomainLoading(true);

    try {
      const response = await fetch('/api/settings/knowledge-base/custom-domain/reset', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, selectedCompany }),
      });

      const result = await response.json();
      if (result.success) {
        setKbData({
          ...kbData,
          customDomain: '',
          customDomainVerified: false,
          customDomainStep: 1,
        });
        setCustomDomainInput('');
        setCustomDomainLoading(false);
      } else {
        setCustomDomainError(result.error || 'Failed to reset custom domain');
        setCustomDomainLoading(false);
      }
    } catch (err: any) {
      setCustomDomainError(err.message || 'Failed to reset custom domain');
      setCustomDomainLoading(false);
    }
  };

  const verifyCustomDomain = async () => {
    setCustomDomainError('');
    setCustomDomainLoading(true);

    if (!kbData.customDomain) {
      setCustomDomainError("Ooops, that wasn't supposed to happen. Can't seem to find the custom domain. Please reload the page");
      setCustomDomainLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/settings/knowledge-base/custom-domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, selectedCompany, customDomain: kbData.customDomain }),
      });

      const result = await response.json();

      if (result.success && result.data?.customDomainVerified) {
        setKbData({
          ...kbData,
          customDomainVerified: true,
          customDomainStep: 3,
        });
        setCustomDomainLoading(false);
        setCustomDomainError('');
      } else {
        setCustomDomainError(
          result.message ||
            'Servers are not pointed yet. It can take up to 24 hours to verify DNS. Please check back later.'
        );
        setCustomDomainLoading(false);
      }
    } catch (err: any) {
      setCustomDomainError(
        'This error is on us. Please send us a message and we will investigate. Sorry about that. Error 123'
      );
      setCustomDomainLoading(false);
    }
  };

  const getSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );

  const getRoundSkeleton = () => (
    <div className="animate-pulse">
      <div className="w-[50px] h-[50px] bg-gray-200 dark:bg-gray-700 rounded-full"></div>
    </div>
  );

  return (
    <form className="grow" onSubmit={handleSubmit}>
      <div className="p-6 space-y-6">
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">
          My Knowledge Base
        </h2>

        {/* KB Link */}
        {kbData.customDomainVerified ? (
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-violet-500 hover:text-violet-600"
            href={`https://${kbData.customDomain}`}
          >
            {kbData.customDomain} -&gt;
          </a>
        ) : (
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-violet-500 hover:text-violet-600"
            href={`https://${kbData.subdomain}.ourkd.help`}
          >
            {kbData.subdomain}.ourkd.help -&gt;
          </a>
        )}

        {/* Messages */}
        <div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {saved && <p className="text-green-500 text-sm">Saved</p>}
          {uploading && <p className="text-gray-500 text-sm">Uploading...</p>}
        </div>

        {/* Logo */}
        <section>
          <div className="flex items-center">
            <div className="mr-4">
              {loading ? (
                getRoundSkeleton()
              ) : !image ? (
                kbData.chosenPicType === 1 ? (
                  <Image
                    className="rounded-full"
                    src={kbData.logo || '/user-avatar-80.png'}
                    alt="Logo"
                    width={50}
                    height={50}
                    style={{ maxWidth: '50px', height: '50px' }}
                  />
                ) : (
                  <Image
                    src={kbData.logo || '/user-avatar-80.png'}
                    alt="Logo"
                    width={125}
                    height={50}
                    style={{ maxWidth: '125px', height: '50px' }}
                  />
                )
              ) : (
                <Image
                  className="rounded-full"
                  src={image}
                  alt="Selected"
                  width={50}
                  height={50}
                  style={{ width: '50px', height: '50px' }}
                />
              )}
            </div>
            <div>
              <label
                htmlFor="files"
                className="btn-sm dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 cursor-pointer"
              >
                Change
              </label>
              <input
                id="files"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Publish Knowledge Base */}
          <br />
          <section>
            <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
              Publish Knowledge Base
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              You can publish or unpublish whenever you want.
            </div>
            {loading ? (
              getSkeleton()
            ) : (
              <div className="flex items-center mt-5">
                <div className="form-switch">
                  <input
                    type="checkbox"
                    id="toggle"
                    className="sr-only"
                    checked={kbData.published}
                    onChange={togglePublish}
                  />
                  <label htmlFor="toggle">
                    <span className="bg-white shadow-sm" aria-hidden="true"></span>
                    <span className="sr-only">Publish</span>
                  </label>
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500 italic ml-2">
                  {!kbData.published ? 'Publish' : 'Unpublish'}
                </div>
              </div>
            )}
          </section>
        </section>

        {/* Layout */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Layout
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">Change what is displayed</div>
          <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="kbname">
                Knowledge Base Name
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <input
                  required
                  defaultValue={kbData.name}
                  id="kbname"
                  name="kbname"
                  className="form-input w-full"
                  type="text"
                />
              )}
            </div>
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="kbsubdomain">
                Knowledge Base Subdomain
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <div className="relative">
                  <input
                    required
                    defaultValue={kbData.subdomain}
                    placeholder="example"
                    id="kbsubdomain"
                    name="kbsubdomain"
                    className="form-input w-full pr-24"
                    type="text"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none pr-3">
                    <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                      .ourkd.help
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="kbheading">
                Heading
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <input
                  required
                  defaultValue={kbData.heading}
                  id="kbheading"
                  name="kbheading"
                  className="form-input w-full"
                  type="text"
                />
              )}
            </div>
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="kbsubheading">
                Sub Heading
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <input
                  required
                  defaultValue={kbData.subheading}
                  id="kbsubheading"
                  name="kbsubheading"
                  className="form-input w-full"
                  type="text"
                />
              )}
            </div>
          </div>
        </section>

        {/* Custom Domain */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Custom Domain
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {kbData.customDomainVerified
              ? 'Your SSL can take up to 24 hours to pop up.'
              : 'Add a custom domain eg. help.yourCompany.com'}
          </div>
          <div className="mt-5">
            {kbData.customDomainVerified && (
              <div>
                <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-violet-500 hover:text-violet-600"
                    href={`https://${kbData.customDomain}`}
                  >
                    {kbData.customDomain} -&gt;
                  </a>
                  <div className="m-1.5">
                    <div className="text-sm inline-flex font-medium bg-green-500/20 text-green-700 dark:text-green-400 rounded-full text-center px-2.5 py-1">
                      Verified
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn border-gray-200 dark:border-gray-700/60 shadow-sm text-violet-500 mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    setKbData({ ...kbData, customDomainStep: 1 });
                    setBasicModalOpen(true);
                  }}
                >
                  Change Domain
                </button>
              </div>
            )}

            {!kbData.customDomainVerified && (
              <button
                type="button"
                className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setBasicModalOpen(true);
                }}
              >
                Custom Domain
              </button>
            )}

            <ModalBasic
              title="Custom Domain"
              isOpen={basicModalOpen}
              setIsOpen={setBasicModalOpen}
            >
              {kbData.customDomainStep === 1 && (
                <div className="px-5 pt-4 pb-1">
                  <div className="text-sm">
                    <div className="font-medium text-gray-800 dark:text-gray-100 mb-2">
                      Let's Add a Custom Domain
                    </div>
                    {customDomainError && <p className="text-red-500">{customDomainError}</p>}
                    <div className="space-y-2">
                      <p>Please enter your full domain</p>
                      <input
                        placeholder="Enter domain name"
                        id="customDomain"
                        value={customDomainInput}
                        onChange={(e) => setCustomDomainInput(e.target.value)}
                        className="form-input w-full"
                        type="text"
                      />
                    </div>
                  </div>
                </div>
              )}

              {kbData.customDomainStep === 2 && (
                <div className="px-5 pt-4 pb-1">
                  <div className="text-sm">
                    <div className="font-medium text-gray-800 dark:text-gray-100 mb-2">
                      Let's Verify Your Domain
                    </div>
                    {customDomainError && <p className="text-red-500">{customDomainError}</p>}
                    <div className="space-y-2">
                      <h2>CNAME</h2>
                      <p>
                        Please add a CNAME and point <b>{kbData.customDomain}</b> to{' '}
                        <b>kb.evidah.com</b>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {kbData.customDomainStep === 3 && (
                <div className="px-5 pt-4 pb-1">
                  <div className="text-sm">
                    <div className="font-medium text-gray-800 dark:text-gray-100 mb-2">
                      Domain Verified Successfully!
                    </div>
                    <div className="space-y-2">
                      <p>
                        Your custom domain <b>{kbData.customDomain}</b> has been successfully
                        verified and configured.
                      </p>
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        Your knowledge base is now accessible at:{' '}
                        <a
                          href={`https://${kbData.customDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          https://{kbData.customDomain}
                        </a>
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Note: SSL certificate provisioning may take up to 24 hours to complete.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-5 py-4">
                <div className="flex flex-wrap justify-end space-x-2">
                  {kbData.customDomainStep === 1 && (
                    <button
                      type="button"
                      className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBasicModalOpen(false);
                      }}
                    >
                      Close
                    </button>
                  )}
                  {kbData.customDomainStep === 2 && (
                    <button
                      type="button"
                      className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                      onClick={choseAgainCustomDomain}
                    >
                      Choose again
                    </button>
                  )}
                  {kbData.customDomainStep === 3 && (
                    <button
                      type="button"
                      className="btn-sm bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBasicModalOpen(false);
                      }}
                    >
                      Done
                    </button>
                  )}
                  {!customDomainLoading ? (
                    kbData.customDomainStep === 1 ? (
                      <button
                        onClick={submitCustomDomain}
                        type="button"
                        className="btn-sm bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                      >
                        Next
                      </button>
                    ) : kbData.customDomainStep === 2 ? (
                      <button
                        onClick={verifyCustomDomain}
                        type="button"
                        className="btn-sm bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                      >
                        Verify
                      </button>
                    ) : null
                  ) : (
                    <button
                      type="button"
                      className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled
                    >
                      <svg
                        className="animate-spin fill-current shrink-0"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"></path>
                      </svg>
                      <span className="ml-2">Loading</span>
                    </button>
                  )}
                </div>
              </div>
            </ModalBasic>
          </div>
        </section>

        {/* Visibility */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Visibility
          </h2>
          <ul>
            <li className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700/60">
              <div>
                <div className="text-gray-800 dark:text-gray-100 font-semibold">
                  Show company name
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Turn this on to show your company name
                </div>
              </div>
              <div className="flex items-center ml-4">
                <div className="text-sm text-gray-400 dark:text-gray-500 italic mr-2">
                  {kbData.showCompanyName ? 'On' : 'Off'}
                </div>
                <div className="form-switch">
                  <input
                    type="checkbox"
                    id="showCompanyName"
                    className="sr-only"
                    checked={kbData.showCompanyName}
                    onChange={toggleShowCompanyName}
                  />
                  <label htmlFor="showCompanyName">
                    <span className="bg-white shadow-sm" aria-hidden="true"></span>
                    <span className="sr-only">Show Company Name</span>
                  </label>
                </div>
              </div>
            </li>
            <li className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700/60">
              <div>
                <div className="text-gray-800 dark:text-gray-100 font-semibold">Show logo</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Turn this on to show your logo
                </div>
              </div>
              <div className="flex items-center ml-4">
                <div className="text-sm text-gray-400 dark:text-gray-500 italic mr-2">
                  {kbData.showLogo ? 'On' : 'Off'}
                </div>
                <div className="form-switch">
                  <input
                    type="checkbox"
                    id="showLogo"
                    className="sr-only"
                    checked={kbData.showLogo}
                    onChange={toggleShowLogo}
                  />
                  <label htmlFor="showLogo">
                    <span className="bg-white shadow-sm" aria-hidden="true"></span>
                    <span className="sr-only">Show Logo</span>
                  </label>
                </div>
              </div>
            </li>
          </ul>
        </section>

        {/* Color Settings */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Color Theme
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">Change your primary color</div>
          <br />
          <BlockPicker color={kbData.primaryColor} onChangeComplete={handleColorChange} />
        </section>

        {/* SEO Settings */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            SEO
          </h2>
          <ul>
            <li className="flex justify-between items-center py-3">
              <div>
                <div className="text-gray-800 dark:text-gray-100 font-semibold">Turn on SEO</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  If on, this will allow search engines to display your site.
                </div>
              </div>
              <div className="flex items-center ml-4">
                <div className="text-sm text-gray-400 dark:text-gray-500 italic mr-2">
                  {kbData.seoOn ? 'On' : 'Off'}
                </div>
                <div className="form-switch">
                  <input
                    type="checkbox"
                    id="seoOn"
                    className="sr-only"
                    checked={kbData.seoOn}
                    onChange={toggleSeo}
                  />
                  <label htmlFor="seoOn">
                    <span className="bg-white shadow-sm" aria-hidden="true"></span>
                    <span className="sr-only">Enable SEO</span>
                  </label>
                </div>
              </div>
            </li>
          </ul>
          <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="seotitle">
                SEO Title
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <input
                  required
                  defaultValue={kbData.seoTitle}
                  id="seotitle"
                  name="seotitle"
                  className="form-input w-full"
                  type="text"
                />
              )}
            </div>
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="seodescription">
                SEO Description
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <input
                  required
                  defaultValue={kbData.seoDescription}
                  id="seodescription"
                  name="seodescription"
                  className="form-input w-full"
                  type="text"
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Panel footer */}
      <footer>
        <div className="flex flex-col px-6 py-5 border-t border-gray-200 dark:border-gray-700/60">
          <div className="flex self-end">
            {!saving ? (
              <button
                type="submit"
                className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-3"
              >
                Save Changes
              </button>
            ) : (
              <button
                className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                disabled
              >
                <svg
                  className="animate-spin fill-current shrink-0"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"></path>
                </svg>
                <span className="ml-2">Loading</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </form>
  );
}

