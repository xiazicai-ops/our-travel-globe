import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as Cesium from 'cesium';

export default function CesiumGlobe({ goToCity, cityPoints = [] }) {
  const cesiumContainer = useRef(null);
  const viewer = useRef(null);
  const starsRef = useRef(null);
  const cityEntitiesRef = useRef([]);
  const masterAngleRef = useRef(0);
  const lastTickTimeRef = useRef(performance.now());

  const [mapStyle, setMapStyle] = useState('satellite');

  // 地图风格配置
  const mapStyles = {
    satellite: {
      name: '卫星图',
      provider: () => new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri'
      })
    },
    street: {
      name: '街道图',
      provider: () => new Cesium.UrlTemplateImageryProvider({
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
        credit: 'OpenStreetMap contributors'
      })
    }
  };

  const switchMapStyle = (styleKey) => {
    if (!viewer.current) return;
    const styleConfig = mapStyles[styleKey];
    if (!styleConfig) return;

    try {
      viewer.current.imageryLayers.removeAll();
      const provider = styleConfig.provider();
      viewer.current.imageryLayers.addImageryProvider(provider);
    } catch (error) {
      console.error('切换地图失败:', error);
    }
  };

  useEffect(() => {
    if (!cesiumContainer.current || viewer.current) return;

    try {
      window.CESIUM_BASE_URL = import.meta.env.BASE_URL + 'cesium/';

      viewer.current = new Cesium.Viewer(cesiumContainer.current, {
        contextOptions: { webgl: { alpha: true } },
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        navigationHelpButton: false,
        homeButton: false,
        geocoder: false,
        sceneModePicker: false,
        infoBox: false,
        selectionIndicator: false,
        fullscreenButton: false,
        vrButton: false,
        creditContainer: document.createElement('div'),
      });

      viewer.current.clock.shouldAnimate = true;
      viewer.current.cesiumWidget.creditContainer.style.display = 'none';

      // 地球样式
      viewer.current.scene.globe.enableLighting = false;
      viewer.current.scene.globe.show = true;
      viewer.current.scene.globe.preloadAncestors = true;
      viewer.current.scene.globe.preloadSiblings = true;
      viewer.current.scene.globe.maximumScreenSpaceError = 1.5;
      viewer.current.scene.globe.tileCacheSize = 1000;
      viewer.current.scene.globe.baseColor = Cesium.Color.BLACK;

      // 深色大气层
      viewer.current.scene.skyAtmosphere.show = false;

      // 自定义星空背景
      viewer.current.scene.skyBox = undefined;
      viewer.current.scene.backgroundColor = Cesium.Color.BLACK;
      const starPoints = viewer.current.scene.primitives.add(new Cesium.PointPrimitiveCollection());
      starsRef.current = starPoints;
      for (let i = 0; i < 3000; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1e9;
        starPoints.add({
          position: new Cesium.Cartesian3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
          ),
          pixelSize: 0.8 + Math.random() * 1.8,
          color: Cesium.Color.fromAlpha(Cesium.Color.WHITE, 0.5 + Math.random() * 0.5)
        });
      }

      // 移除默认影像层，使用卫星图
      viewer.current.imageryLayers.removeAll();
      switchMapStyle(mapStyle);

      // 初始视角：看向中国
      viewer.current.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(110, 30, 15000000),
        orientation: {
          heading: 0,
          pitch: -Math.PI / 2.5,
          roll: 0
        }
      });

      // 缓慢自转动画
      const tick = (time) => {
        const dt = (time - lastTickTimeRef.current) / 16.666;
        lastTickTimeRef.current = time;
        const safeDt = Math.min(dt, 2.0);
        masterAngleRef.current += 0.001 * safeDt; // 慢速自转

        // 星空随地球旋转稳定
        if (starsRef.current) {
          const starRotation = Cesium.Matrix3.fromRotationZ(-masterAngleRef.current);
          starsRef.current.modelMatrix = Cesium.Matrix4.fromRotationTranslation(starRotation);
        }

        requestAnimationFrame(tick);
      };
      tick(performance.now());

      // 标签遮挡检测
      const resolveLabelOcclusion = () => {
        if (!viewer.current) return;
        const labels = viewer.current.entities.values.filter(e => e.label);
        const screenCoords = [];

        labels.forEach(e => {
          const pos = e.position.getValue(viewer.current.clock.currentTime);
          if (!pos) return;
          const pixelPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.current.scene, pos);
          if (pixelPos) {
            screenCoords.push({ entity: e, x: pixelPos.x, y: pixelPos.y, hidden: false });
          }
        });

        const MIN_DIST = 100;
        for (let i = 0; i < screenCoords.length; i++) {
          if (screenCoords[i].hidden) continue;
          for (let j = i + 1; j < screenCoords.length; j++) {
            if (screenCoords[j].hidden) continue;
            const dx = screenCoords[i].x - screenCoords[j].x;
            const dy = screenCoords[i].y - screenCoords[j].y;
            const distSq = dx * dx + dy * dy;
            if (distSq < MIN_DIST * MIN_DIST) {
              screenCoords[j].hidden = true;
              screenCoords[j].entity.label.show = false;
            }
          }
        }

        screenCoords.forEach(c => {
          if (!c.hidden) c.entity.label.show = true;
        });
      };
      viewer.current.scene.postRender.addEventListener(resolveLabelOcclusion);

      // 点击城市标点
      const clickHandler = (event) => {
        try {
          const pickedObject = viewer.current.scene.pick(new Cesium.Cartesian2(event.clientX, event.clientY));
          if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
            const entity = pickedObject.id;
            if (entity.pointData) {
              goToCity(entity.pointData.name);
            }
          }
        } catch (error) {
          console.error('点击事件处理错误:', error);
        }
      };
      viewer.current.cesiumWidget.canvas.addEventListener('click', clickHandler);

    } catch (error) {
      console.error('Cesium 初始化错误:', error);
    }

    return () => {
      try {
        if (viewer.current) {
          viewer.current.destroy();
          viewer.current = null;
        }
      } catch (error) {
        console.error('Cesium 清理错误:', error);
      }
    };
  }, []);

  // 监听地图风格变化
  useEffect(() => {
    if (viewer.current) {
      switchMapStyle(mapStyle);
    }
  }, [mapStyle]);

  // 动态加载城市标点
  useEffect(() => {
    if (!viewer.current || !cityPoints || cityPoints.length === 0) return;

    // 移除旧的标点
    cityEntitiesRef.current.forEach(entity => {
      try {
        if (viewer.current && viewer.current.entities.contains(entity)) {
          viewer.current.entities.remove(entity);
        }
      } catch (e) { /* ignore */ }
    });
    cityEntitiesRef.current = [];

    cityPoints.forEach((pt) => {
      try {
        const position = Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, 0);

        const entity = viewer.current.entities.add({
          name: pt.name,
          position: position,
          point: {
            pixelSize: new Cesium.CallbackProperty((time) => {
              const phase = Cesium.JulianDate.secondsDifference(time, viewer.current.clock.currentTime) * 2 * Math.PI / 2;
              return 12 + Math.sin(phase) * 2;
            }, false),
            color: Cesium.Color.fromCssColorString(pt.color || '#FF6B9D').withAlpha(0.9),
            outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
            outlineWidth: new Cesium.CallbackProperty((time) => {
              const phase = Cesium.JulianDate.secondsDifference(time, viewer.current.clock.currentTime) * 2 * Math.PI / 2;
              return 2 + Math.sin(phase) * 2;
            }, false),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.5, 1.5e7, 0.5),
          },
          label: {
            text: pt.name,
            font: 'bold 16px "Noto Serif SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -30),
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
            backgroundPadding: new Cesium.Cartesian2(10, 6),
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.2, 1.5e7, 0.6),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          },
          description: pt.name,
          pointData: pt,
        });

        cityEntitiesRef.current.push(entity);
      } catch (error) {
        console.error(`添加标点 ${pt.name} 失败:`, error);
      }
    });
  }, [cityPoints]);

  // 城市坐标（用于飞行动画）
  const cityPositions = useMemo(() => {
    const positions = {};
    if (cityPoints && cityPoints.length > 0) {
      cityPoints.forEach(pt => {
        positions[pt.name] = Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, 0);
      });
    }
    return positions;
  }, [cityPoints]);

  // 飞到指定城市
  const flyToCity = (cityName) => {
    const coord = cityPositions[cityName];
    if (!coord || !viewer.current) return;
    const carto = Cesium.Cartographic.fromCartesian(coord);
    const lng = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);

    viewer.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, 800000),
      orientation: { heading: 0, pitch: -Math.PI / 3, roll: 0 },
      duration: 2,
    });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', position: 'relative', background: '#000' }}>
      <div ref={cesiumContainer} style={{ width: '100%', height: '100%', background: '#000' }} />

      {/* 左上角标题 */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '30px',
        zIndex: 100,
        pointerEvents: 'none',
      }}>
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: 600,
          color: 'white',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          margin: 0,
          fontFamily: '"Noto Serif SC", serif',
          letterSpacing: '3px',
        }}>
          我们走过的世界
        </h1>
        <p style={{
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.6)',
          margin: '6px 0 0 0',
          fontWeight: 300,
          letterSpacing: '1px',
        }}>
          点击城市，重温那些日子
        </p>
      </div>

      {/* 右下角地图切换 */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '30px',
        zIndex: 100,
        display: 'flex',
        gap: '8px',
      }}>
        {Object.entries(mapStyles).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setMapStyle(key)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: mapStyle === key
                ? 'rgba(255, 107, 157, 0.8)'
                : 'rgba(255, 255, 255, 0.15)',
              color: mapStyle === key ? 'white' : 'rgba(255,255,255,0.7)',
              fontSize: '13px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              fontWeight: mapStyle === key ? 600 : 400,
            }}
          >
            {val.name}
          </button>
        ))}
      </div>

      {/* 城市列表（右下角地图切换上方） */}
      {cityPoints.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '30px',
          zIndex: 100,
          maxHeight: '40vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          paddingRight: '4px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.2) transparent',
        }}>
          {cityPoints.map((pt) => (
            <button
              key={pt.name}
              onClick={() => { flyToCity(pt.name); }}
              onDoubleClick={() => goToCity(pt.name)}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                fontFamily: '"Noto Serif SC", serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 107, 157, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(255, 107, 157, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              <span style={{ marginRight: '8px' }}>{pt.color ? '●' : '●'}</span>
              {pt.name}
              <span style={{ fontSize: '11px', opacity: 0.5, marginLeft: '6px' }}>双击查看</span>
            </button>
          ))}
        </div>
      )}

      {/* 城市数量统计 */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '30px',
        zIndex: 100,
        color: 'rgba(255,255,255,0.5)',
        fontSize: '13px',
        pointerEvents: 'none',
      }}>
        已记录 {cityPoints.length} 个城市
      </div>
    </div>
  );
}
