// src/components/CertificateGenerator.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { Award, Download, Lock, CheckCircle, RefreshCw, User } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props {
  xp: number;
}

const CertificateGenerator: React.FC<Props> = ({ xp }) => {
  const { user } = useAuth();
  
  // Custom name state initialized from localStorage, profile or email
  const [name, setName] = useState<string>('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Certificate level selectors
  const [selectedLevel, setSelectedLevel] = useState<'bronze' | 'silver' | 'gold'>('bronze');

  // Load name on mount
  useEffect(() => {
    const loadProfileName = async () => {
      if (!user) return;
      
      const cachedName = localStorage.getItem(`codcraft_fullname_${user.id}`);
      if (cachedName) {
        setName(cachedName);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('student_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (!error && data && data.full_name) {
          setName(data.full_name);
          localStorage.setItem(`codcraft_fullname_${user.id}`, data.full_name);
        } else {
          const emailPrefix = user.email ? user.email.split('@')[0] : 'Student';
          const formatted = emailPrefix.split(/[-_.]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          setName(formatted);
        }
      } catch (err) {
        const emailPrefix = user.email ? user.email.split('@')[0] : 'Student';
        const formatted = emailPrefix.split(/[-_.]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        setName(formatted);
      }
    };

    loadProfileName();
  }, [user]);

  // Determine current earned tier
  const getEarnedTier = (): 'none' | 'bronze' | 'silver' | 'gold' => {
    if (xp >= 500) return 'gold';
    if (xp >= 300) return 'silver';
    if (xp >= 100) return 'bronze';
    return 'none';
  };

  const earnedTier = getEarnedTier();

  // Set default preview level based on current earned tier
  useEffect(() => {
    if (earnedTier !== 'none') {
      setSelectedLevel(earnedTier);
    }
  }, [earnedTier]);

  // Save customized name
  const saveName = async () => {
    if (!user || !name.trim()) return;
    setIsUpdatingProfile(true);
    setSaveSuccess(false);

    localStorage.setItem(`codcraft_fullname_${user.id}`, name.trim());
    try {
      const { error } = await supabase
        .from('student_profiles')
        .update({ full_name: name.trim() })
        .eq('id', user.id);
      
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.warn("Failed to sync full_name to Supabase, saved locally.", err);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Get details for rendered/previewed level
  const getLevelConfig = (lvl: 'bronze' | 'silver' | 'gold') => {
    switch (lvl) {
      case 'gold':
        return {
          threshold: 500,
          title: 'GOLD LEVEL CODING SPECIALIST',
          color: 'text-amber-400',
          gradient: 'from-amber-200 via-amber-400 to-amber-600',
          borderColor: '#d4af37',
          description: 'for demonstrating advanced algorithmic mastery, solving dynamic programming, graph, and system-design-lite challenges with exceptional efficiency and rolling execution accuracy.'
        };
      case 'silver':
        return {
          threshold: 300,
          title: 'SILVER LEVEL CODING SPECIALIST',
          color: 'text-slate-300',
          gradient: 'from-slate-200 via-slate-300 to-slate-500',
          borderColor: '#a1a1aa',
          description: 'for demonstrating strong proficiency in data structures, recursion, complexity estimation, and core programming paradigms across multiple syllabus tracks.'
        };
      case 'bronze':
      default:
        return {
          threshold: 100,
          title: 'BRONZE LEVEL CODING SPECIALIST',
          color: 'text-amber-600',
          gradient: 'from-amber-500 via-amber-600 to-amber-800',
          borderColor: '#b45309',
          description: 'for establishing a solid coding foundation, covering syntax controls, basic loops, conditionals, and functional structures mapping to KTU programming fundamentals.'
        };
    }
  };

  const currentLevelConfig = getLevelConfig(selectedLevel);
  const isSelectedLevelLocked = xp < currentLevelConfig.threshold;

  // Format today's date
  const dateString = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Export high-resolution PNG
  const downloadPNG = () => {
    if (isSelectedLevelLocked) {
      alert("This certificate is locked. Solve more challenges to earn enough XP!");
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Load Yantrixa logo for watermark background
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}yantrixa-logo.png`;

    const drawContent = () => {
      // 1. Dark background
      ctx.fillStyle = '#0d0c0b';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw subtle background radial gradient/glow
      const glow = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.7);
      glow.addColorStop(0, 'rgba(217, 119, 6, 0.04)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Draw Yantrixa logo watermark centered
      try {
        ctx.save();
        ctx.globalAlpha = 0.04;
        const imgWidth = width * 0.4;
        const imgHeight = (imgWidth * img.naturalHeight) / img.naturalWidth;
        ctx.drawImage(img, (width - imgWidth) / 2, (height - imgHeight) / 2, imgWidth, imgHeight);
        ctx.restore();
      } catch (err) {
        console.warn("Failed to draw background watermark logo:", err);
      }

      // 3. Outer thin border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      // 4. Inner gold/tier double border
      const themeColor = currentLevelConfig.borderColor;
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 50, width - 100, height - 100);
      ctx.lineWidth = 1;
      ctx.strokeRect(62, 62, width - 124, height - 124);

      // 5. Header: CODCRAFT BY YANTRIXA
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = themeColor;
      ctx.font = 'bold 24px "Outfit", sans-serif';
      ctx.fillText('C O D C R A F T   B Y   Y A N T R I X A', width / 2, 160);

      // Header divider line
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 120, 190);
      ctx.lineTo(width / 2 + 120, 190);
      ctx.stroke();

      // 6. Title: CERTIFICATE OF ACHIEVEMENT
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 58px "Outfit", sans-serif';
      ctx.fillText('CERTIFICATE OF ACHIEVEMENT', width / 2, 290);

      ctx.fillStyle = '#9ca3af';
      ctx.font = 'italic 28px "Georgia", serif';
      ctx.fillText('This is proudly presented to', width / 2, 370);

      // 7. Student Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 84px "Outfit", sans-serif';
      const nameGrad = ctx.createLinearGradient(width / 2 - 300, 0, width / 2 + 300, 0);
      nameGrad.addColorStop(0, '#fef3c7');
      nameGrad.addColorStop(0.5, '#fbbf24');
      nameGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = nameGrad;
      ctx.fillText(name.toUpperCase() || 'KERALA ENGINEERING STUDENT', width / 2, 490);

      // Name divider
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 250, 560);
      ctx.lineTo(width / 2 + 250, 560);
      ctx.stroke();

      // 8. Description / Qualifying status
      ctx.fillStyle = '#9ca3af';
      ctx.font = 'italic 26px "Georgia", serif';
      ctx.fillText('for successfully qualifying as a', width / 2, 630);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px "Outfit", sans-serif';
      ctx.fillText(currentLevelConfig.title, width / 2, 710);

      // Body text wrapped
      ctx.fillStyle = '#888888';
      ctx.font = '300 24px "Outfit", sans-serif';
      const bodyStr = currentLevelConfig.description;
      
      const words = bodyStr.split(' ');
      let line = '';
      let currentY = 780;
      const maxWidth = 1100;
      const lineHeight = 38;
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, width / 2, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, width / 2, currentY);

      // 9. Signatures and Seal row
      const rowY = 1080;

      // Left Signature
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.25 - 120, rowY);
      ctx.lineTo(width * 0.25 + 120, rowY);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'italic 28px "Georgia", serif';
      ctx.fillText('CodCraft Board', width * 0.25, rowY - 30);

      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 18px "Outfit", sans-serif';
      ctx.fillText('ISSUING AUTHORITY', width * 0.25, rowY + 30);

      // Right Signature
      ctx.beginPath();
      ctx.moveTo(width * 0.75 - 120, rowY);
      ctx.lineTo(width * 0.75 + 120, rowY);
      ctx.stroke();

      ctx.fillStyle = '#93c5fd';
      ctx.font = 'italic 28px "Georgia", serif';
      ctx.fillText('yantrixa.in', width * 0.75, rowY - 30);

      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 18px "Outfit", sans-serif';
      ctx.fillText('OFFICIAL PLATFORM SPONSOR', width * 0.75, rowY + 30);

      // Center Official Seal Circle
      const sealX = width / 2;
      const sealY = rowY - 15;
      const sealRadius = 75;

      ctx.fillStyle = '#161513';
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(sealX, sealY, sealRadius - 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 16px "Outfit", sans-serif';
      ctx.fillText('OFFICIAL', sealX, sealY - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Outfit", sans-serif';
      ctx.fillText('SEAL', sealX, sealY);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px "Outfit", sans-serif';
      ctx.fillText('CODCRAFT', sealX, sealY + 20);

      // 10. Date of Issuance (Bottom)
      ctx.fillStyle = '#6b7280';
      ctx.font = '300 20px "Outfit", sans-serif';
      ctx.fillText(`Date of Issuance: ${dateString}`, width / 2, height - 100);

      // Trigger local PNG download
      const link = document.createElement('a');
      link.download = `CodCraft_Certificate_${selectedLevel}_${name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.onload = drawContent;
    img.onerror = drawContent;
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* Overview stats & eligibility card */}
      <div className="card card-p" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)', display: 'flex', alignItems: 'center' }}>
            <Award className="text-indigo animate-pulse" /> My Certification Center
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)', maxWidth: '540px', lineHeight: 1.5 }}>
            Qualify for coding credentials as you reach milestones. Leaderboard score and active XP determine your certificate level.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg)', padding: '0.55rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div className="text-right">
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Your Current XP</span>
            <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', display: 'block' }}>{xp} XP</span>
          </div>
          <div style={{ height: '24px', width: '1px', background: 'var(--border)' }}></div>
          <div>
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Earned Tier</span>
            <span style={{
              fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', display: 'block',
              color: earnedTier === 'gold' ? 'var(--gold)' : earnedTier === 'silver' ? 'var(--muted)' : earnedTier === 'bronze' ? '#b45309' : 'var(--muted2)'
            }}>
              {earnedTier === 'none' ? 'No Tier' : earnedTier}
            </span>
          </div>
        </div>
      </div>


      {/* Two-col layout: cert-layout class handles responsive stacking in styles.css */}
      <div className="cert-layout cert-two-col" style={{ minWidth: 0 }}>
        
        {/* Certificate Display & Preview (Left Pane) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', minWidth: 0, overflow: 'hidden' }}>

          <div className="cert-tier-tabs">
            {(['bronze', 'silver', 'gold'] as const).map(lvl => {
              const cfg = getLevelConfig(lvl);
              const isLocked = xp < cfg.threshold;
              const isActive = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`cert-tier-tab${isActive ? ' active' : ''}`}
                >
                  {isLocked && <Lock size={11} />}
                  {lvl} ({cfg.threshold} XP)
                </button>
              );
            })}
          </div>

          {/* Render Certificate frame preview */}
          <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '0.5rem', borderRadius: 'var(--radius-lg)' }} className="cert-preview-scroll-container">
            <div style={{ position: 'relative', minWidth: '680px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', aspectRatio: '1.414 / 1', backgroundColor: '#0d0c0b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem', userSelect: 'none' }}>
              {/* Watermark gradient */}
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />

              {/* Watermark image */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.03, pointerEvents: 'none' }}>
                <img 
                  src={`${import.meta.env.BASE_URL}yantrixa-logo.png`} 
                  alt="Watermark Logo" 
                  style={{ width: '45%', objectFit: 'contain' }} 
                />
              </div>

              {/* Lock overlay if previewing locked tier */}
              {isSelectedLevelLocked && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', marginBottom: '1rem', boxShadow: 'var(--shadow)' }}>
                    <Lock size={24} />
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.4rem' }}>Certificate Level Locked</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted2)', maxWidth: '320px', lineHeight: 1.5, marginBottom: '1rem' }}>
                    You need at least <strong style={{ color: 'var(--warning)' }}>{currentLevelConfig.threshold} XP</strong> to unlock the {selectedLevel} certification. You currently have <strong>{xp} XP</strong>.
                  </p>
                  <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--warning)' }}>
                    Earn {currentLevelConfig.threshold - xp} more XP to qualify!
                  </span>
                </div>
              )}

              {/* Outer border */}
              <div style={{ position: 'absolute', inset: '8px', border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none', borderRadius: 'calc(var(--radius-lg) - 4px)' }}></div>
              
              {/* Inner Gold/Silver/Bronze border */}
              <div 
                style={{ position: 'absolute', inset: '16px', border: '3px double', borderColor: currentLevelConfig.borderColor, pointerEvents: 'none', transition: 'border-color 0.3s', borderRadius: 'calc(var(--radius-lg) - 8px)' }}
              ></div>

              {/* Certificate content layout */}
              <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', padding: '0.5rem 0', zIndex: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p 
                    style={{ fontSize: '0.62rem', letterSpacing: '0.25em', fontWeight: 800, textTransform: 'uppercase', color: currentLevelConfig.borderColor, transition: 'all 0.3s' }}
                  >
                    C O D C R A F T   B Y   Y A N T R I X A
                  </p>
                  <div style={{ height: '1px', width: '80px', background: 'var(--border)', margin: '0 auto', opacity: 0.3 }}></div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', textTransform: 'uppercase' }}>
                    Certificate of Achievement
                  </h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--muted2)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                    This is proudly presented to
                  </p>
                </div>

                <div style={{ padding: '0.4rem 0' }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', background: 'linear-gradient(to right, #fef3c7, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {name.toUpperCase() || 'KERALA ENGINEERING STUDENT'}
                  </h2>
                  <div style={{ height: '1px', width: '160px', background: 'linear-gradient(to right, transparent, rgba(251, 191, 36, 0.4), transparent)', margin: '0 auto', marginTop: '0.5rem' }}></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '480px', margin: '0 auto', padding: '0 1rem' }}>
                  <p style={{ fontSize: '0.62rem', color: 'var(--muted2)' }}>for successfully qualifying as a</p>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {currentLevelConfig.title}
                  </h4>
                  <p style={{ fontSize: '0.65rem', color: 'var(--muted2)', lineHeight: 1.4, maxWidth: '420px', margin: '0 auto' }}>
                    {currentLevelConfig.description}
                  </p>
                </div>

                {/* Bottom Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', marginTop: '0.4rem' }}>
                  <div style={{ textAlign: 'center', width: '33.33%' }}>
                    <span style={{ fontStyle: 'italic', fontSize: '0.75rem', color: 'rgba(254, 243, 199, 0.7)', userSelect: 'none', display: 'block' }}>
                      CodCraft Board
                    </span>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', width: '70px', margin: '0.25rem auto' }}></div>
                    <p style={{ fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted2)' }}>ISSUING AUTHORITY</p>
                  </div>

                  <div 
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
                      width: '56px', height: '56px', borderRadius: '50%', border: '1px solid', borderColor: currentLevelConfig.borderColor,
                      backgroundColor: '#161513', boxShadow: 'var(--shadow)', transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ position: 'absolute', inset: '3px', borderRadius: '50%', border: '1px dashed rgba(212, 175, 55, 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.35rem', fontWeight: 900, color: '#fbbf24' }}>OFFICIAL</span>
                      <span style={{ fontSize: '0.3rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.1em' }}>SEAL</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', width: '33.33%' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'rgba(191, 219, 254, 0.7)', userSelect: 'none', display: 'block' }}>
                      yantrixa.in
                    </span>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', width: '70px', margin: '0.25rem auto' }}></div>
                    <p style={{ fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted2)' }}>PLATFORM SPONSOR</p>
                  </div>
                </div>

                <div style={{ fontSize: '0.55rem', color: 'var(--muted2)', marginTop: '0.4rem' }}>
                  Date of Issuance: <span style={{ color: '#ffffff', fontFamily: 'var(--mono)' }}>{dateString}</span>
                </div>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)', textAlign: 'center', marginTop: '-0.2rem', marginBottom: '0.4rem' }} className="cert-swipe-hint">
            ↔ Swipe preview card to see complete details
          </span>
        </div>

        {/* Certificate Sidebar Settings (Right Pane) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', minWidth: 0 }}>

          <div className="card card-p flex flex-col gap-4">
            <h3 style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={14} className="text-indigo" /> Certificate Settings
            </h3>
            
            <div className="flex flex-col gap-2">
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Student Full Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..."
                  className="input"
                  style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                />
                <button
                  onClick={saveName}
                  disabled={isUpdatingProfile || !name.trim()}
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem' }}
                >
                  {isUpdatingProfile ? <RefreshCw size={11} className="animate-spin" /> : 'Save'}
                </button>
              </div>
              {saveSuccess && (
                <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600, display: 'block', marginTop: '0.2rem' }}>
                  ✓ Profile name synchronized!
                </span>
              )}
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }}></div>

            <div className="flex flex-col gap-3">
              <h4 style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Qualifying Credentials</h4>
              <div className="flex flex-col gap-2">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.65rem 0.85rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text2)' }}>Bronze Tier (100 XP)</span>
                  {xp >= 100 ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                      <CheckCircle size={11} /> Earned
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Lock size={10} /> Locked
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.65rem 0.85rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text2)' }}>Silver Tier (300 XP)</span>
                  {xp >= 300 ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                      <CheckCircle size={11} /> Earned
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Lock size={10} /> Locked
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.65rem 0.85rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text2)' }}>Gold Tier (500 XP)</span>
                  {xp >= 500 ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                      <CheckCircle size={11} /> Earned
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Lock size={10} /> Locked
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={downloadPNG}
              disabled={isSelectedLevelLocked}
              className="btn btn-gold btn-full btn-lg"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              <Download size={14} /> Download PNG Certificate
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CertificateGenerator;
