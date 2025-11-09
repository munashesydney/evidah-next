# Chat Feature - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Set Environment Variable

Create or update `.env.local` in the project root:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. Start Development Server

```bash
cd aikd-next-clone
npm run dev
```

### 3. Navigate to Chat

Open your browser and go to:
```
http://localhost:3000/default/chat/charlie
```

Replace `charlie` with any employee:
- `charlie` - Customer Support (Orange theme)
- `emma` - Knowledge Management (Pink theme)  
- `marquavious` - Live Chat Specialist (Blue theme)
- `sung-wen` - Training Specialist (Green theme)

## 🎯 Quick Test

### Test Basic Chat
1. Type a message: "Hello! Tell me a joke"
2. Watch the AI respond in real-time with streaming

### Test Web Search
1. Click "Tools" button (or see right panel on desktop)
2. Enable "Web Search"
3. Ask: "What's the weather in New York today?"
4. See web search in action with citations

### Test Code Interpreter
1. Enable "Code Interpreter" in tools panel
2. Ask: "Create a bar chart of the top 5 programming languages"
3. See Python code execute and download the chart

### Test Custom Functions
1. Functions are enabled by default
2. Ask: "What's the temperature in London in celsius?"
3. See the get_weather function called with arguments

## 📱 Features At a Glance

### Already Implemented ✅
- ✅ Real-time streaming responses
- ✅ Web search with citations
- ✅ File search (vector stores)
- ✅ Code interpreter with file downloads
- ✅ Custom functions (weather, jokes)
- ✅ Chat history with Firebase
- ✅ Mobile responsive
- ✅ Dark mode
- ✅ Employee-specific theming
- ✅ Tools configuration panel

### Tools Available
- 🌐 **Web Search** - Search the internet
- 📁 **File Search** - Upload & search documents
- 💻 **Code Interpreter** - Run Python code
- ⚡ **Functions** - Custom function calls

## 🔧 Common Commands

```bash
# Install dependencies (already done)
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `app/(main)/[selectedCompany]/chat/[employeeId]/page.tsx` | Main chat page |
| `app/api/chat/turn_response/route.ts` | Streaming API endpoint |
| `components/chat/assistant.tsx` | Chat assistant wrapper |
| `components/chat/chat.tsx` | Chat UI component |
| `lib/chat/assistant.ts` | Message processing logic |
| `stores/chat/useConversationStore.ts` | Chat state management |
| `stores/chat/useToolsStore.ts` | Tools configuration |
| `config/chat/functions.ts` | Custom functions |

## 💡 Pro Tips

1. **Enable Multiple Tools**: Turn on web search + code interpreter for powerful queries like "Get the population of top 10 cities and create a chart"

2. **File Upload**: Click "File Search" → "Create Vector Store" → Upload PDFs to make them searchable

3. **Keyboard Shortcut**: Press `Enter` to send message, `Shift + Enter` for new line

4. **Mobile**: Use hamburger menu (☰) to access chat history and tools panel

5. **Dark Mode**: Automatically follows your system theme preference

## 🐛 Troubleshooting

### "API Key not found"
- Make sure `.env.local` exists with `OPENAI_API_KEY`
- Restart dev server after adding environment variables

### "Firebase error"
- Check Firebase is configured in `lib/firebase.ts`
- User must be signed in (redirect to `/signin` if not)

### Streaming not working
- Check browser console for errors
- Verify OpenAI API key is valid
- Try refreshing the page

### Tools not appearing
- Tools panel is on the right side (desktop)
- Click "Tools" button (mobile)
- Check zustand store is persisting settings

## 📚 Learn More

- Full documentation: `CHAT_IMPLEMENTATION.md`
- OpenAI Docs: https://platform.openai.com/docs/api-reference/responses
- Next.js Docs: https://nextjs.org/docs

## 🎉 You're Ready!

The chat feature is fully implemented and ready to use. Start chatting with your AI employees now!

