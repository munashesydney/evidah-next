import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const inferExtension = (mimeType: string): string => {
  if (MIME_EXTENSION_MAP[mimeType]) {
    return MIME_EXTENSION_MAP[mimeType];
  }

  const match = mimeType.match(/image\/([a-zA-Z0-9.+-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  return 'png';
};

const dataUrlRegex = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/;

const extractDataUrlsFromMarkdown = (markdown: string): string[] => {
  const results: string[] = [];
  const regex = /!\[[^\]]*]\((data:image\/[^\)]+)\)/g;
  let match: RegExpExecArray | null = regex.exec(markdown);

  while (match) {
    if (match[1]) {
      results.push(match[1]);
    }
    match = regex.exec(markdown);
  }

  return results;
};

const buildStoragePath = (parts: Array<string | undefined | null>): string => {
  const filtered = parts.filter(Boolean) as string[];
  return filtered.length ? filtered.join('/') : 'articleImages';
};

type ReplaceBase64Params = {
  html?: string;
  markdown?: string;
  uid?: string | null;
  companyId?: string | null;
  categoryId?: string | null;
  articleId?: string | null;
  pathPrefix?: string;
};

type ReplaceBase64Result = {
  html: string;
  markdown: string;
  replacements: Map<string, string>;
};

export const replaceBase64Images = async ({
  html = '',
  markdown = '',
  uid,
  companyId,
  categoryId,
  articleId,
  pathPrefix,
}: ReplaceBase64Params): Promise<ReplaceBase64Result> => {
  const storage = getStorage();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imageElements = Array.from(doc.querySelectorAll('img'));

  const dataUrls = new Set<string>();

  imageElements.forEach((img) => {
    const src = img.getAttribute('src');
    if (src && src.startsWith('data:image/')) {
      dataUrls.add(src);
    }
  });

  extractDataUrlsFromMarkdown(markdown).forEach((url) => dataUrls.add(url));

  const dataUrlToRemoteUrl = new Map<string, string>();
  const basePath =
    pathPrefix ||
    buildStoragePath([
      'articleImages',
      uid || undefined,
      companyId || undefined,
      categoryId || undefined,
      articleId || undefined,
    ]);

  let index = 0;

  for (const dataUrl of dataUrls) {
    const match = dataUrl.match(dataUrlRegex);
    if (!match) {
      continue;
    }

    const mimeType = match[1];
    const extension = inferExtension(mimeType);
    const fileName = `${Date.now()}-${index}.${extension}`;
    const storageRef = ref(storage, `${basePath}/${fileName}`);

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob, { contentType: mimeType });
      const downloadUrl = await getDownloadURL(storageRef);
      dataUrlToRemoteUrl.set(dataUrl, downloadUrl);
    } catch (error) {
      console.error('Failed to upload base64 image', error);
    }

    index += 1;
  }

  const sanitizeElementAttributes = (element: Element) => {
    const attrs = Array.from(element.attributes);

    attrs.forEach((attr) => {
      for (const [dataUrl, downloadUrl] of dataUrlToRemoteUrl.entries()) {
        if (attr.value.includes(dataUrl)) {
          if (attr.name === 'data-url' || attr.name.startsWith('data-')) {
            element.removeAttribute(attr.name);
          } else {
            element.setAttribute(attr.name, attr.value.split(dataUrl).join(downloadUrl));
          }
        }
      }
    });
  };

  imageElements.forEach((img) => {
    const src = img.getAttribute('src');
    if (src && dataUrlToRemoteUrl.has(src)) {
      img.setAttribute('src', dataUrlToRemoteUrl.get(src) as string);
    }
    sanitizeElementAttributes(img);
  });

  Array.from(doc.body.querySelectorAll('*')).forEach(sanitizeElementAttributes);

  let sanitizedHtml = doc.body.innerHTML;
  let sanitizedMarkdown = markdown;

  for (const [dataUrl, downloadUrl] of dataUrlToRemoteUrl.entries()) {
    sanitizedHtml = sanitizedHtml.split(dataUrl).join(downloadUrl);
    sanitizedMarkdown = sanitizedMarkdown.split(dataUrl).join(downloadUrl);
  }

  return {
    html: sanitizedHtml,
    markdown: sanitizedMarkdown,
    replacements: dataUrlToRemoteUrl,
  };
};

