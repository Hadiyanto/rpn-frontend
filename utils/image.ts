// Cloudinary delivers a resized, auto-format (webp/avif), auto-quality copy when the transform
// is put right after /upload/. Other URLs are returned unchanged.
export const cldImage = (url: string | null | undefined, width: number): string => {
    if (!url) return '';
    if (!/^https:\/\/res\.cloudinary\.com\/.+\/upload\//.test(url)) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
};
