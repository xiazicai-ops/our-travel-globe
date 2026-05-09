import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { uploadToSupabase } from '../lib/supabaseStorage';

export default function AdminPanel({ isOpen, onClose, onCityCreated }) {
  const [view, setView] = useState('main'); // 'main' | 'addCity' | 'manageCity'
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [loading, setLoading] = useState(false);

  // 添加城市表单
  const [newCityName, setNewCityName] = useState('');
  const [newCityLng, setNewCityLng] = useState('');
  const [newCityLat, setNewCityLat] = useState('');
  const [newCityDesc, setNewCityDesc] = useState('');
  const [newCityColor, setNewCityColor] = useState('#FF6B9D');
  const [newCityMainImage, setNewCityMainImage] = useState('');
  const [uploadingMainImage, setUploadingMainImage] = useState(false);

  // 上传照片
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // 常用城市坐标快捷选择
  const PRESET_CITIES = [
    { name: '深圳', lng: 114.0579, lat: 22.5431 },
    { name: '广州', lng: 113.2644, lat: 23.1291 },
    { name: '北京', lng: 116.4074, lat: 39.9042 },
    { name: '上海', lng: 121.4737, lat: 31.2304 },
    { name: '成都', lng: 104.0665, lat: 30.5723 },
    { name: '重庆', lng: 106.5516, lat: 29.5630 },
    { name: '杭州', lng: 120.1551, lat: 30.2741 },
    { name: '香港', lng: 114.1694, lat: 22.3193 },
    { name: '台北', lng: 121.5654, lat: 25.0330 },
    { name: '东京', lng: 139.6917, lat: 35.6895 },
    { name: '曼谷', lng: 100.5018, lat: 13.7563 },
    { name: '新加坡', lng: 103.8198, lat: 1.3521 },
  ];

  // 加载城市列表
  const fetchCities = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('id, name, lng, lat, color, description, main_image, sort_order')
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setCities(data);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCities();
      setView('main');
    }
  }, [isOpen]);

  // 选择预设城市
  const selectPreset = (preset) => {
    setNewCityName(preset.name);
    setNewCityLng(String(preset.lng));
    setNewCityLat(String(preset.lat));
  };

  // 上传主图
  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingMainImage(true);
    try {
      const { publicUrl } = await uploadToSupabase(file, 'city-images');
      setNewCityMainImage(publicUrl);
    } catch (err) {
      alert('主图上传失败：' + err.message);
    }
    setUploadingMainImage(false);
  };

  // 添加城市
  const handleAddCity = async () => {
    if (!newCityName.trim() || !newCityLng || !newCityLat) {
      alert('请填写城市名称和坐标');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('cities')
        .insert({
          name: newCityName.trim(),
          lng: parseFloat(newCityLng),
          lat: parseFloat(newCityLat),
          description: newCityDesc.trim(),
          color: newCityColor,
          main_image: newCityMainImage || '',
          sort_order: cities.length + 1,
        });

      if (error) {
        alert('添加城市失败：' + error.message);
      } else {
        // 清空表单
        setNewCityName('');
        setNewCityLng('');
        setNewCityLat('');
        setNewCityDesc('');
        setNewCityColor('#FF6B9D');
        setNewCityMainImage('');
        fetchCities();
        if (onCityCreated) onCityCreated();
        alert('添加成功！');
      }
    } catch (err) {
      alert('添加出错：' + err.message);
    }
    setLoading(false);
  };

  // 上传城市照片
  const handlePhotosUpload = async (e) => {
    if (!selectedCity) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`上传中 ${i + 1}/${files.length}...`);
      try {
        const { publicUrl } = await uploadToSupabase(files[i], 'city-images');

        await supabase
          .from('city_images')
          .insert({
            city_id: selectedCity.id,
            url: publicUrl,
            sort_order: i + 1,
          });

        successCount++;
      } catch (err) {
        console.error('上传失败:', err);
      }
    }

    setUploadProgress(`完成！成功上传 ${successCount}/${files.length} 张照片`);
    setTimeout(() => setUploadProgress(''), 3000);
    setUploadingPhotos(false);
  };

  // 删除城市
  const handleDeleteCity = async (cityId) => {
    if (!confirm('确定要删除这个城市吗？关联的照片也会被删除。')) return;

    try {
      // 先删除关联图片记录
      await supabase.from('city_images').delete().eq('city_id', cityId);
      // 再删除城市
      await supabase.from('cities').delete().eq('id', cityId);
      fetchCities();
      if (onCityCreated) onCityCreated();
    } catch (err) {
      alert('删除失败：' + err.message);
    }
  };

  // 删除单张照片
  const handleDeleteImage = async (imageId) => {
    try {
      await supabase.from('city_images').delete().eq('id', imageId);
      // 刷新选中城市的图片
      const { data } = await supabase
        .from('cities')
        .select('id, name, lng, lat, color, description, main_image, sort_order')
        .eq('id', selectedCity.id)
        .single();

      const { data: images } = await supabase
        .from('city_images')
        .select('id, url, sort_order')
        .eq('city_id', selectedCity.id)
        .order('sort_order', { ascending: true });

      setSelectedCity({ ...data, images: images || [] });
    } catch (err) {
      alert('删除失败：' + err.message);
    }
  };

  // 查看城市照片
  const openCityManage = async (city) => {
    const { data: images } = await supabase
      .from('city_images')
      .select('id, url, sort_order')
      .eq('city_id', city.id)
      .order('sort_order', { ascending: true });

    setSelectedCity({ ...city, images: images || [] });
    setView('manageCity');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'rgba(20, 20, 40, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
            color: 'white',
          }}
        >
          {/* 标题栏 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, fontFamily: '"Noto Serif SC", serif' }}>
              {view === 'main' && '城市管理'}
              {view === 'addCity' && '添加城市'}
              {view === 'manageCity' && selectedCity?.name + ' - 照片管理'}
            </h2>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
              fontSize: '24px', cursor: 'pointer',
            }}>✕</button>
          </div>

          {/* 主视图 - 城市列表 */}
          {view === 'main' && (
            <div>
              <button
                onClick={() => setView('addCity')}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: '2px dashed rgba(255, 107, 157, 0.5)',
                  background: 'rgba(255, 107, 157, 0.1)', color: '#FF6B9D',
                  fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px',
                  fontFamily: '"Noto Serif SC", serif',
                }}
              >
                + 添加新城市
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cities.map((city) => (
                  <div
                    key={city.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: city.color || '#FF6B9D', fontSize: '18px' }}>●</span>
                      <span style={{ fontSize: '15px' }}>{city.name}</span>
                      {city.description && (
                        <span style={{ fontSize: '12px', opacity: 0.5 }}>- {city.description}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openCityManage(city)}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: 'none',
                          background: 'rgba(255, 255, 255, 0.1)', color: 'white',
                          fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        照片
                      </button>
                      <button
                        onClick={() => handleDeleteCity(city.id)}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: 'none',
                          background: 'rgba(255, 50, 50, 0.2)', color: '#ff6b6b',
                          fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}

                {cities.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5, fontSize: '14px' }}>
                    还没有城市，点击上方按钮添加
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 添加城市视图 */}
          {view === 'addCity' && (
            <div>
              {/* 快捷选择 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', opacity: 0.7, marginBottom: '8px' }}>
                  快捷选择常用城市
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {PRESET_CITIES.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => selectPreset(preset)}
                      style={{
                        padding: '5px 12px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.2)',
                        background: newCityName === preset.name ? 'rgba(255, 107, 157, 0.3)' : 'rgba(255,255,255,0.05)',
                        color: 'white', fontSize: '13px', cursor: 'pointer',
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 城市名称 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', opacity: 0.7, marginBottom: '6px' }}>城市名称 *</label>
                <input
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="例如：巴黎"
                  style={{
                    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                    color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 经纬度 */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', opacity: 0.7, marginBottom: '6px' }}>经度 *</label>
                  <input
                    value={newCityLng}
                    onChange={(e) => setNewCityLng(e.target.value)}
                    placeholder="116.4074"
                    style={{
                      width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                      color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', opacity: 0.7, marginBottom: '6px' }}>纬度 *</label>
                  <input
                    value={newCityLat}
                    onChange={(e) => setNewCityLat(e.target.value)}
                    placeholder="39.9042"
                    style={{
                      width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                      color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* 描述 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', opacity: 0.7, marginBottom: '6px' }}>一句话描述</label>
                <input
                  value={newCityDesc}
                  onChange={(e) => setNewCityDesc(e.target.value)}
                  placeholder="第一次一起远行的地方"
                  style={{
                    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                    color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 标点颜色 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', opacity: 0.7, marginBottom: '6px' }}>标点颜色</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#FF6B9D', '#FFD93D', '#4ECDC4', '#A78BFA', '#F97316', '#10B981'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCityColor(color)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                        background: color, cursor: 'pointer',
                        outline: newCityColor === color ? '3px solid white' : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 主图上传 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', opacity: 0.7, marginBottom: '6px' }}>城市主图</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageUpload}
                  style={{ display: 'none' }}
                  id="main-image-upload"
                />
                <label
                  htmlFor="main-image-upload"
                  style={{
                    display: 'block', padding: '20px', borderRadius: '10px',
                    border: '2px dashed rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.03)', textAlign: 'center',
                    cursor: 'pointer', fontSize: '14px', opacity: uploadingMainImage ? 0.5 : 1,
                  }}
                >
                  {uploadingMainImage ? '上传中...' : newCityMainImage ? '✓ 已选择主图（点击更换）' : '点击上传主图'}
                </label>
                {newCityMainImage && (
                  <img src={newCityMainImage} alt="预览" style={{
                    width: '100%', maxHeight: '200px', objectFit: 'cover',
                    borderRadius: '8px', marginTop: '10px',
                  }} />
                )}
              </div>

              {/* 按钮组 */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setView('main')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent', color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleAddCity}
                  disabled={loading || !newCityName.trim()}
                  style={{
                    flex: 2, padding: '12px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #FF6B9D 0%, #C084FC 100%)',
                    color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    opacity: (loading || !newCityName.trim()) ? 0.5 : 1,
                  }}
                >
                  {loading ? '添加中...' : '添加城市'}
                </button>
              </div>
            </div>
          )}

          {/* 照片管理视图 */}
          {view === 'manageCity' && selectedCity && (
            <div>
              {/* 上传照片 */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotosUpload}
                  style={{ display: 'none' }}
                  id="photos-upload"
                />
                <label
                  htmlFor="photos-upload"
                  style={{
                    display: 'block', padding: '20px', borderRadius: '10px',
                    border: '2px dashed rgba(255, 107, 157, 0.4)',
                    background: 'rgba(255, 107, 157, 0.05)', textAlign: 'center',
                    cursor: 'pointer', fontSize: '14px',
                    opacity: uploadingPhotos ? 0.5 : 1,
                  }}
                >
                  {uploadingPhotos ? uploadProgress : '点击上传照片（支持多选）'}
                </label>
                {uploadProgress && !uploadingPhotos && (
                  <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: '#4ECDC4' }}>
                    {uploadProgress}
                  </div>
                )}
              </div>

              {/* 照片网格 */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '10px', marginBottom: '20px',
              }}>
                {selectedCity.images && selectedCity.images.map((img) => (
                  <div key={img.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                    <img
                      src={img.url}
                      alt=""
                      style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
                    />
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      style={{
                        position: 'absolute', top: '4px', right: '4px',
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.7)', border: 'none',
                        color: 'white', fontSize: '12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {(!selectedCity.images || selectedCity.images.length === 0) && (
                <div style={{ textAlign: 'center', padding: '30px', opacity: 0.5, fontSize: '14px' }}>
                  还没有照片，快上传吧～
                </div>
              )}

              <button
                onClick={() => { setView('main'); setSelectedCity(null); }}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent', color: 'rgba(255,255,255,0.7)',
                  fontSize: '14px', cursor: 'pointer',
                }}
              >
                返回城市列表
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
