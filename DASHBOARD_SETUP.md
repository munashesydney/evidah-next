# Dashboard Setup Guide

## Overview
The dashboard has been set up in the `(main)/[selectedCompany]` route with a complete sidebar and header navigation system.

## Structure

```
app/
└── (main)/
    ├── layout.tsx                    # Main route group wrapper
    ├── sign-in/
    │   └── page.tsx                  # Sign-in page
    └── [selectedCompany]/            # Dynamic company route
        ├── layout.tsx                # Dashboard layout with sidebar & header
        ├── sidebar.tsx               # Sidebar navigation component
        ├── header.tsx                # Header with search, help, theme toggle
        └── page.tsx                  # Main dashboard page (black background)
```

## Features

### Layout (`[selectedCompany]/layout.tsx`)
- Full-height flex container
- Sidebar on the left
- Main content area with black background
- Responsive design with mobile sidebar toggle

### Sidebar (`[selectedCompany]/sidebar.tsx`)
- Collapsible on desktop (20px collapsed, 256px expanded)
- Mobile drawer with backdrop
- Logo that changes based on theme (light/dark mode)
- Navigation sections:
  - **EMPLOYEES**: Chat (AI Chat interface)
  - **Knowledge Base**: Dashboard
  - **Help Desk**: Inbox
  - **Live Chat**: Live Chat management
  - **THE BRAIN**: Training
  - **General Settings**: Settings
- Active route highlighting with violet gradient
- Smooth transitions and animations
- localStorage persistence for expanded/collapsed state

### Header (`[selectedCompany]/header.tsx`)
- Sticky header with backdrop blur
- Hamburger menu for mobile
- Search button with modal
- Help dropdown
- Theme toggle (light/dark mode)
- Profile dropdown
- Responsive design

### Main Page (`[selectedCompany]/page.tsx`)
- Black background (`bg-black`)
- White text for contrast
- Ready for content implementation

## Navigation Structure

All routes are scoped under `[selectedCompany]` parameter:

- `/[selectedCompany]` - Main dashboard (Chat)
- `/[selectedCompany]/dashboard` - Knowledge Base Dashboard
- `/[selectedCompany]/inbox` - Help Desk Inbox
- `/[selectedCompany]/live-chat` - Live Chat
- `/[selectedCompany]/training` - Training
- `/[selectedCompany]/settings` - Settings

## Styling

- Uses the existing template's Tailwind classes
- Dark mode support throughout
- Violet accent color (`violet-500`) for active states
- Smooth transitions and hover effects
- Responsive breakpoints (mobile, tablet, desktop)

## Assets Copied

- `/public/dark-mode-logo.png` - Logo for dark mode
- `/public/light-mode-logo.png` - Logo for light mode
- `/public/user-avatar-80.png` - Default user avatar

## Usage

1. Navigate to `/[selectedCompany]` where `[selectedCompany]` is your company identifier
2. Example: `/default` or `/my-company`
3. The sidebar will automatically highlight the active route
4. Click the hamburger menu on mobile to toggle the sidebar
5. Use the theme toggle in the header to switch between light/dark modes

## Next Steps

1. Implement the actual dashboard content in `page.tsx`
2. Create pages for other routes (dashboard, inbox, live-chat, training, settings)
3. Add authentication guards to protect routes
4. Implement company context to manage selectedCompany state
5. Add real data fetching and display logic
6. Implement the search modal functionality
7. Add user profile data to the header

## Notes

- The layout uses `'use client'` directive for state management (sidebar toggle)
- The sidebar uses localStorage to persist expanded/collapsed state
- All navigation links use Next.js `Link` component for client-side routing
- The black background is applied to the main content area in the layout
- Theme detection uses `next-themes` package
