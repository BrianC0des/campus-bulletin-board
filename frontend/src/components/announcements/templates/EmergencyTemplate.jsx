import React from 'react';
import { TemplateFrame, bigTitle } from './shared.jsx';

export default function EmergencyTemplate({ announcement = {}, orientation = 'landscape', ...frame }) {
  const data = announcement.template_data || {};
  const theme = data.theme;
  const portrait = orientation === 'portrait';
  return (
    <TemplateFrame tone="emergency" theme={theme} orientation={orientation} {...frame}>
      <div
        className="tpl-emergency"
        style={{
          flex: 1,
          background: theme?.bg_color || '#b3121f',
          color: theme?.text_color || '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: portrait ? 64 : 96,
          gap: 32,
          minHeight: 0,
        }}
      >
        <div
          className="tpl-alert-label"
          style={{
            alignSelf: 'flex-start',
            background: '#fff',
            color: '#b3121f',
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '.12em',
            padding: '10px 28px',
          }}
        >
          ⚠ {data.alert_level || 'EMERGENCY ALERT'}
        </div>
        <h1 style={{ ...bigTitle(orientation), fontSize: portrait ? 110 : 132, color: '#fff' }}>
          {announcement.title || 'Emergency Notice'}
        </h1>
        {announcement.body && (
          <p style={{ fontSize: portrait ? 48 : 46, lineHeight: 1.3, margin: 0, overflowWrap: 'anywhere' }}>
            {announcement.body}
          </p>
        )}
        {data.instructions && (
          <div
            className="tpl-instructions"
            style={{ background: 'rgba(0,0,0,.28)', padding: '24px 32px', fontSize: 40, fontWeight: 600, overflowWrap: 'anywhere' }}
          >
            {data.instructions}
          </div>
        )}
        {data.contact && (
          <div className="tpl-contact" style={{ fontSize: 38, fontWeight: 700 }}>
            CONTACT: {data.contact}
          </div>
        )}
      </div>
    </TemplateFrame>
  );
}
