import { API_URL } from '@/utils/config';

/** Uploads an image through the backend (Cloudinary) and returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_URL}/api/upload-image`, { method: 'POST', body: formData });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== 'ok') throw new Error(json.message || 'Gagal mengunggah gambar');
    return json.imageUrl as string;
}
