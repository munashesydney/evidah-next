'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

interface CountryPickerProps {
  value: string;
  onChange: (country: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

const ALL_COUNTRIES: string[] = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo (Congo-Brazzaville)',
  'Costa Rica',
  'Côte d’Ivoire',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czechia',
  'Democratic Republic of the Congo',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
];

export default function CountryPicker({
  value,
  onChange,
  label,
  placeholder = 'Search countries…',
  id = 'country',
  required = false,
  className = '',
}: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    // When opening, keep focus on the search input; do not steal focus to list items.
    // This avoids losing focus after each keystroke as the filtered list updates.
  }, [open, filtered.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    const items = Array.from(listRef.current?.querySelectorAll('li[role="option"]') || []) as HTMLLIElement[];
    const active = document.activeElement as HTMLLIElement | null;
    const idx = items.findIndex((el) => el === active);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[Math.min(idx + 1, items.length - 1)];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[Math.max(idx - 1, 0)];
      prev?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (active?.dataset.value) {
        onChange(active.dataset.value);
        setOpen(false);
        buttonRef.current?.focus();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor={id}>
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-left text-gray-900 bg-white"
      >
        <span className="block truncate">{value || 'Select a country'}</span>
      </button>

      {open && (
        <div className="relative">
          <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-2 border-b border-gray-200">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900"
                aria-label="Search countries"
              />
            </div>
            <ul
              id={`${id}-listbox`}
              role="listbox"
              ref={listRef}
              tabIndex={-1}
              className="max-h-60 overflow-auto py-1"
              onKeyDown={handleKeyDown}
            >
              {filtered.length === 0 && (
                <li className="px-4 py-2 text-sm text-gray-500 select-none">No results</li>
              )}
              {filtered.map((c) => {
                const selected = c === value;
                return (
                  <li
                    key={c}
                    role="option"
                    aria-selected={selected}
                    data-value={c}
                    tabIndex={0}
                    className={`px-4 py-2 cursor-pointer text-sm focus:bg-violet-50 hover:bg-violet-50 ${
                      selected ? 'text-violet-700 font-medium' : 'text-gray-900'
                    }`}
                    onClick={() => {
                      onChange(c);
                      setOpen(false);
                      buttonRef.current?.focus();
                    }}
                  >
                    {c}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          required
          value={value}
          onChange={() => {}}
        />
      )}
    </div>
  );
}


