# Employee Images

## Required Images

Copy the following images from the old app to this directory:

### From: `evidah-web/aiknowledgedesk-web/images/characters/pricing/`

1. **charlie.png** → Copy to `charlie.png`
2. **mq.png** → Copy to `marquavious.png`
3. **emma.png** → Copy to `emma.png`
4. **sw.png** → Copy to `sung-wen.png`

### Additional Image Needed

5. **evidah-q.png** - Create a composite image or use the "All-Employees.png" from the old app

## Manual Copy Commands

```bash
# From the project root
cp evidah-web/aiknowledgedesk-web/images/characters/pricing/charlie.png aikd-next-clone/public/images/employees/charlie.png
cp evidah-web/aiknowledgedesk-web/images/characters/pricing/mq.png aikd-next-clone/public/images/employees/marquavious.png
cp evidah-web/aiknowledgedesk-web/images/characters/pricing/emma.png aikd-next-clone/public/images/employees/emma.png
cp evidah-web/aiknowledgedesk-web/images/characters/pricing/sw.png aikd-next-clone/public/images/employees/sung-wen.png
cp evidah-web/aiknowledgedesk-web/images/All-Employees.png aikd-next-clone/public/images/employees/evidah-q.png
```

## Fallback

If images are not found, the component will fall back to `/user-avatar-80.png`
