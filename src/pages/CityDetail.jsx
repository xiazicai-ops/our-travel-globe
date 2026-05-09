import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

export default function CityDetail({ cityName, goBack }) {
  const [scrollY, setScrollY] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentCity, setCurrentCity] = useState({ mainImage: '', description: '', departure: '', gallery: [] });

  // 从 Supabase 加载城市数据
  useEffect(() => {
    const loadCityData = async () => {
      setLoading(true);
      try {
        const { data: cityData, error: cityError } = await supabase
          .from('cities')
          .select('*')
          .eq('name', cityName.trim())
          .single();

        if (cityError || !cityData) {
          console.error('加载城市失败:', cityError);
          setLoading(false);
          return;
        }

        const { data: imagesData, error: imagesError } = await supabase
          .from('city_images')
          .select('url, sort_order')
          .eq('city_id', cityData.id)
          .order('sort_order', { ascending: true });

        if (imagesError) {
          console.error('加载图片失败:', imagesError);
        }

        setCurrentCity({
          id: cityData.id,
          mainImage: cityData.main_image,
          description: cityData.description || '',
          departure: cityData.departure || '',
          lng: cityData.lng,
          lat: cityData.lat,
          gallery: (imagesData || []).map(img => img.url),
        });
      } catch (e) {
        console.error('加载城市数据出错:', e);
      }
      setLoading(false);
    };

    if (cityName) {
      loadCityData();
    }
  }, [cityName]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setIsDarkMode(currentScrollY < window.innerHeight);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  const openImageViewer = (image, index) => {
    setSelectedImage(image);
    setCurrentImageIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'auto';
  };

  const showPreviousImage = () => {
    const allImages = currentCity.gallery.length > 0 ? currentCity.gallery : [currentCity.mainImage];
    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : allImages.length - 1;
    setCurrentImageIndex(newIndex);
    setSelectedImage(allImages[newIndex]);
  };

  const showNextImage = () => {
    const allImages = currentCity.gallery.length > 0 ? currentCity.gallery : [currentCity.mainImage];
    const newIndex = currentImageIndex < allImages.length - 1 ? currentImageIndex + 1 : 0;
    setCurrentImageIndex(newIndex);
    setSelectedImage(allImages[newIndex]);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!selectedImage) return;
      if (e.key === 'Escape') closeImageViewer();
      else if (e.key === 'ArrowLeft') showPreviousImage();
      else if (e.key === 'ArrowRight') showNextImage();
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedImage, currentImageIndex]);

  if (loading) {
    return (
      <div style={{
        width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)', color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px', fontFamily: '"Noto Serif SC", serif' }}>加载中...</div>
          <div style={{ fontSize: '1rem', opacity: 0.6 }}>{cityName}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
      {/* 返回按钮 */}
      <button
        onClick={goBack}
        style={{
          position: 'fixed',
          top: '30px',
          left: '30px',
          padding: '12px 24px',
          borderRadius: '30px',
          border: 'none',
          background: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
          color: isDarkMode ? 'white' : 'black',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          zIndex: 100,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease',
          fontFamily: '"Noto Serif SC", serif',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        返回地球
      </button>

      {/* 全屏主图区域 */}
      <div style={{
        position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div
          style={{
            position: 'absolute', top: '-20%', left: '-20%', width: '140%', height: '140%',
            backgroundImage: `url("${currentCity.mainImage}")`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            transform: `translateY(${scrollY * 0.5}px)`,
            cursor: 'pointer',
          }}
          onClick={() => openImageViewer(currentCity.mainImage, 0)}
        />
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 0, 0, 0.4)',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          style={{ position: 'relative', zIndex: 5, textAlign: 'center', color: 'white', maxWidth: '80%' }}
        >
          <h1 style={{
            fontSize: 'clamp(3rem, 10vw, 6rem)', fontWeight: 800, margin: '0 0 20px 0',
            letterSpacing: '-2px', textShadow: '0 2px 20px rgba(0,0,0,0.5)',
            fontFamily: '"Noto Serif SC", serif',
          }}>
            {cityName}
          </h1>
          {currentCity.description && (
            <div style={{ fontSize: '1.4rem', opacity: 0.9, fontWeight: 300, letterSpacing: '1px' }}>
              {currentCity.description}
            </div>
          )}
        </motion.div>

        <div style={{
          position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
          color: 'white', textAlign: 'center', zIndex: 10, animation: 'bounce 2s infinite',
        }}>
          <span style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>向下滑动查看更多</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* 图片流 */}
      <div style={{ background: 'white', padding: '80px 0', minHeight: '50vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
          <h2 style={{
            fontSize: '2.5rem', textAlign: 'center', marginBottom: '60px', color: '#333',
            fontFamily: '"Noto Serif SC", serif',
          }}>
            那些瞬间
          </h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px', marginBottom: '80px'
          }}>
            {currentCity.gallery.length > 0 ? (
              currentCity.gallery.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  onClick={() => openImageViewer(image, index)}
                  style={{
                    borderRadius: '12px', overflow: 'hidden',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer', transition: 'transform 0.3s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <img
                    src={image}
                    alt={`${cityName} ${index + 1}`}
                    onError={handleImageError}
                    style={{ width: '100%', height: '250px', objectFit: 'cover', display: 'block' }}
                  />
                </motion.div>
              ))
            ) : (
              <div style={{
                gridColumn: '1 / -1', textAlign: 'center', padding: '100px 0',
                color: '#999', fontSize: '1.1rem', letterSpacing: '1px'
              }}>
                还没有照片，去管理面板上传吧～
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 图片查看器 */}
      {selectedImage && (
        <div
          onClick={closeImageViewer}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.95)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <button onClick={closeImageViewer} style={{
              position: 'absolute', top: '-50px', right: '-50px',
              background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: 'white',
              width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)', zIndex: 1001,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button onClick={showPreviousImage} style={{
              position: 'absolute', left: '-80px', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: 'white',
              width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)', zIndex: 1001,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button onClick={showNextImage} style={{
              position: 'absolute', right: '-80px', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: 'white',
              width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)', zIndex: 1001,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <img
              src={selectedImage}
              alt="放大查看"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' }}
              onError={handleImageError}
            />

            <div style={{
              position: 'absolute', bottom: '-50px', left: '50%', transform: 'translateX(-50%)',
              color: 'white', background: 'rgba(0, 0, 0, 0.5)', padding: '8px 16px',
              borderRadius: '20px', fontSize: '14px', backdropFilter: 'blur(10px)',
            }}>
              {currentImageIndex + 1} / {currentCity.gallery.length || 1}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
          40% { transform: translateX(-50%) translateY(-10px); }
          60% { transform: translateX(-50%) translateY(-5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
