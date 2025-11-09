'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

// Import the Firebase app from your config
import { app } from '@/lib/firebase';

const auth = getAuth(app);
const storage = getStorage(app);

interface UserData {
  email: string;
  name: string;
  surname: string;
  companyname: string;
  website: string;
  profilePicture: string;
}

export default function AccountPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const [userData, setUserData] = useState<UserData>({
    email: '',
    name: '',
    surname: '',
    companyname: '',
    website: '',
    profilePicture: '',
  });

  const [image, setImage] = useState<string | null>(null);

  // Fetch user data on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        await fetchUserData(user.uid);
      } else {
        router.push('/sign-in');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserData = async (userId: string) => {
    try {
      const response = await fetch(`/api/settings/account?uid=${userId}`);
      const result = await response.json();

      if (result.success) {
        setUserData(result.data);
      } else {
        setError(result.error || 'Failed to fetch user data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = document.createElement('img');
    img.onload = async () => {
      if (img.width === 500 && img.height === 500) {
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
            uploadImage(compressedFile);
          };
          reader.readAsDataURL(compressedFile);
        } catch (error) {
          setError('Error compressing image.');
        }
      } else {
        setError('Image dimensions must be 500x500 pixels.');
        setImage(null);
      }
    };
    img.onerror = () => {
      setError('Invalid image file.');
      setImage(null);
    };
    img.src = URL.createObjectURL(file);
  };

  const uploadImage = async (file: File) => {
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
        console.log('File available at', downloadURL);
        await updateProfilePicture(downloadURL);
        setUploading(false);
      }
    );
  };

  const updateProfilePicture = async (url: string) => {
    try {
      const response = await fetch('/api/settings/account/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, profilePicture: url }),
      });

      const result = await response.json();
      if (result.success) {
        setUserData(result.data);
        console.log('Profile picture updated successfully.');
      } else {
        setError(result.error || 'Error updating profile picture.');
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      setError('Error updating profile picture.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      setError('Please fill out all required fields.');
      form.reportValidity();
      return;
    }

    setSaving(true);
    setSaved(false);
    setError('');

    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const surname = formData.get('surname') as string;
    const companyname = formData.get('companyname') as string;
    const website = formData.get('website') as string;

    try {
      const response = await fetch('/api/settings/account/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, name, surname, companyname, website }),
      });

      const result = await response.json();
      
      if (result.success) {
        setUserData(result.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error || 'Failed to update account');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update account');
    } finally {
      setSaving(false);
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
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">My Account</h2>
        
        {/* Messages */}
        <div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {saved && <p className="text-green-500 text-sm">Saved</p>}
          {uploading && <p className="text-gray-500 text-sm">Uploading...</p>}
        </div>

        {/* Picture */}
        <section>
          <div className="flex items-center">
            <div className="mr-4">
              {loading ? (
                getRoundSkeleton()
              ) : (
                <Image
                  className="w-[50px] h-[50px] rounded-full object-cover"
                  src={image || userData.profilePicture || '/user-avatar-80.png'}
                  alt="Profile"
                  width={50}
                  height={50}
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
        </section>

        {/* Company Profile */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Company Profile
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            These are the details relating to your company
          </div>
          <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="companyname">
                Company Name
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <input
                  id="companyname"
                  name="companyname"
                  defaultValue={userData.companyname}
                  placeholder="Enter Company Name"
                  className="form-input w-full"
                  type="text"
                />
              )}
            </div>
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="website">
                Company Website
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <input
                  id="website"
                  name="website"
                  defaultValue={userData.website}
                  placeholder="Enter Company Website"
                  className="form-input w-full"
                  type="text"
                  required
                />
              )}
            </div>
          </div>
        </section>

        {/* User Profile */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            User Profile
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            These are your personal details.
          </div>
          <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="name">
                Name
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <input
                  id="name"
                  name="name"
                  defaultValue={userData.name}
                  placeholder="Enter Name"
                  className="form-input w-full"
                  type="text"
                  required
                />
              )}
            </div>
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="surname">
                Surname
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <input
                  id="surname"
                  name="surname"
                  defaultValue={userData.surname}
                  placeholder="Enter Surname"
                  className="form-input w-full"
                  type="text"
                  required
                />
              )}
            </div>
          </div>
          <div className="flex flex-wrap mt-5 items-center gap-2">
            <div className="flex-1">
              <label className="sr-only" htmlFor="email">
                Business email
              </label>
              {loading ? (
                getSkeleton()
              ) : (
                <input
                  id="email"
                  name="email"
                  defaultValue={userData.email}
                  className="form-input w-full"
                  type="email"
                  readOnly
                  disabled
                />
              )}
            </div>
            <button
              type="button"
              disabled
              className="btn dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Change
            </button>
          </div>
        </section>

        {/* Password */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Password
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            You can set a permanent password if you don't want to use temporary login codes.
          </div>
          <div className="mt-5">
            <button
              type="button"
              className="btn border-gray-200 dark:border-gray-700/60 shadow-sm text-violet-500"
            >
              Set New Password
            </button>
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
                  <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
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

