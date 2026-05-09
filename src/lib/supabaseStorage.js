import { supabase } from './supabaseClient';

/**
 * 上传图片到 Supabase Storage
 * @param {File|Blob} file - 要上传的文件
 * @param {string} bucket - Bucket 名称 (默认 'city-images')
 * @returns {Promise<{publicUrl: string, path: string}>}
 */
export async function uploadToSupabase(file, bucket = 'city-images') {
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${file.name?.split('.').pop() || 'jpg'}`;
  const filePath = fileName;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return { publicUrl, path: filePath };
}

/**
 * 删除 Supabase Storage 中的图片
 * @param {string} path - 文件路径
 * @param {string} bucket - Bucket 名称
 */
export async function deleteFromSupabase(path, bucket = 'city-images') {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  if (error) throw error;
}

/**
 * 获取图片的公开 URL
 */
export function getSupabasePublicUrl(path, bucket = 'city-images') {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  return publicUrl;
}
