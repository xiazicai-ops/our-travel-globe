import React, { useState, useEffect, useCallback, useRef } from 'react';
import CesiumGlobe from './components/CesiumGlobe';
import CityDetail from './pages/CityDetail';
import AdminPanel from './components/AdminPanel';
import { supabase } from './lib/supabaseClient';

export default function App() {
  const [page, setPage] = useState('home');
  const [selectedCity, setSelectedCity] = useState(null);
  const [cities, setCities] = useState([]);
  const [cityPoints, setCityPoints] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);

  // 管理面板彩蛋：标题连点5次
  const titleClickCount = useRef(0);
  const titleClickTimer = useRef(null);

  // 加载城市数据
  const fetchCities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('name, lng, lat, color')
        .order('sort_order', { ascending: true });

      if (data && !error) {
        setCities(data.map(c => c.name));
        setCityPoints(data.filter(c => c.lng && c.lat).map(c => ({
          name: c.name, lng: c.lng, lat: c.lat, color: c.color || '#FF6B9D'
        })));
      }
    } catch (e) {
      console.error('加载城市数据失败:', e);
    }
  }, []);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  // 处理 URL hash（城市直链）
  useEffect(() => {
    const path = decodeURIComponent(window.location.pathname);
    if (path.startsWith('/city/')) {
      const cityName = path.replace('/city/', '');
      if (cityName) {
        setSelectedCity(cityName);
        setPage('city');
      }
    }
  }, []);

  const goToCity = useCallback((cityName) => {
    setSelectedCity(cityName);
    setPage('city');
  }, []);

  const goBackToGlobe = useCallback(() => {
    setSelectedCity(null);
    setPage('home');
  }, []);

  const handleTitleClick = useCallback(() => {
    titleClickCount.current += 1;
    if (titleClickTimer.current) clearTimeout(titleClickTimer.current);
    if (titleClickCount.current >= 5) {
      titleClickCount.current = 0;
      setShowAdmin(true);
    } else {
      titleClickTimer.current = setTimeout(() => {
        titleClickCount.current = 0;
      }, 3000);
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}>
      {/* 地球主页 */}
      {page === 'home' && (
        <CesiumGlobe goToCity={goToCity} cityPoints={cityPoints} />
      )}

      {/* 城市详情页 */}
      {page === 'city' && selectedCity && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100vw', height: '100%', zIndex: 9999,
          background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)'
        }}>
          <CityDetail cityName={selectedCity} goBack={goBackToGlobe} />
        </div>
      )}

      {/* 管理面板入口按钮（右下角齿轮） */}
      <button
        onClick={() => setShowAdmin(true)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '50%',
          transform: 'translateX(50%)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '18px',
          cursor: 'pointer',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 107, 157, 0.4)';
          e.currentTarget.style.color = 'white';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
        }}
        title="管理面板"
      >
        ⚙
      </button>

      {/* 管理面板 */}
      <AdminPanel
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
        onCityCreated={fetchCities}
      />
    </div>
  );
}
