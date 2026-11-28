import React, { useState, useEffect, useId, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Facebook, RotateCcw, ExternalLink, CheckCircle2, Sparkles, Globe, ThumbsUp, MessageCircle, Share2, Download } from 'lucide-react';
import TemplateRenderer, { ScaledStage } from './templates/TemplateRenderer.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { readSignageSettings } from '../../utils/signageSettings.js';
import { renderAnnouncementToPng, getAnnouncementImageBlob } from '../../utils/renderAnnouncementToPng.js';
import api from '../../services/api.js';

export function buildDefaultFbCaption(ann) {
  if (!ann) return '';
  const parts = [];
  const rawTitle = typeof ann.title === 'string' ? ann.title.trim() : '';
  if (rawTitle && rawTitle !== 'Graphic Poster') {
    parts.push(rawTitle.toUpperCase());
  }
  const rawBody = typeof ann.body === 'string' ? ann.body.trim() : '';
  if (rawBody) {
    if (parts.length > 0) parts.push('');
    parts.push(rawBody);
  }
  const data = ann.template_data || {};
  const meta = [];
  if (data.event_date) meta.push(`📅 Date: ${data.event_date}`);
  if (data.event_time) meta.push(`🕒 Time: ${data.event_time}${data.event_end_time ? ` – ${data.event_end_time}` : ''}`);
  if (data.venue) meta.push(`📍 Venue: ${data.venue}`);
  if (meta.length > 0) {
    if (parts.length > 0) parts.push('');
    parts.push(...meta);
  }
  return parts.join('\n');
}

export function FacebookFeedPreview({
  announcement,
  caption,
  pageName,
  includeMedia = true,
}) {
  const [resolvedPageName, setResolvedPageName] = useState(pageName || '');

  const collegeParam =
    !announcement?.target_college || announcement.target_college === 'Campus-Wide'
      ? 'ALL'
      : announcement.target_college;

  useEffect(() => {
    if (pageName) {
      setResolvedPageName(pageName);
      return;
    }
    let mounted = true;
    api.get(`/announcements/facebook/status?college=${encodeURIComponent(collegeParam)}`)
      .then((res) => {
        if (mounted && res?.pageName) setResolvedPageName(res.pageName);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [pageName, collegeParam]);

  const displayPageName = pageName || resolvedPageName || 'Campus Bulletin Board Page';
  const avatarLetter = displayPageName.trim().charAt(0).toUpperCase() || 'P';

  const images = Array.isArray(announcement?.image_urls) && announcement.image_urls.length > 0
    ? announcement.image_urls
    : announcement?.image_url
      ? [announcement.image_url]
      : [];

  return (
    <div className="fb-feed-mockup" aria-label="Facebook post preview">
      <div className="fb-feed-header">
        <div className="fb-feed-avatar" aria-hidden="true">{avatarLetter}</div>
        <div>
          <strong>{displayPageName}</strong>
          <small>
            Just now • <Globe size={11} style={{ verticalAlign: 'middle' }} /> Public
          </small>
        </div>
      </div>

      <div className="fb-feed-caption">
        {caption ? caption : <span style={{ opacity: 0.5 }}>Your Facebook caption will appear here...</span>}
      </div>

      {includeMedia && (
        <div className="fb-feed-media">
          {images.length === 1 ? (
            <img
              src={images[0].startsWith('blob:') ? images[0] : getImageUrl(images[0])}
              alt={announcement?.title || 'Post graphic'}
              className="fb-feed-single-img"
            />
          ) : images.length > 1 ? (
            <div className={`fb-feed-photo-grid count-${Math.min(4, images.length)}`}>
              {images.slice(0, 4).map((url, idx) => (
                <div key={`${url}-${idx}`} className="fb-feed-photo-cell">
                  <img src={url.startsWith('blob:') ? url : getImageUrl(url)} alt={`Photo ${idx + 1}`} />
                  {idx === 3 && images.length > 4 && (
                    <span className="fb-feed-photo-more">+{images.length - 4}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="fb-feed-card-stage">
              <ScaledStage orientation="landscape" fit="contain">
                <TemplateRenderer
                  announcement={announcement}
                  orientation="landscape"
                  displayName={displayPageName}
                  itemLabel="ANNOUNCEMENT"
                />
              </ScaledStage>
            </div>
          )}
        </div>
      )}

      <div className="fb-feed-actions" aria-hidden="true">
        <span><ThumbsUp size={13} /> Like</span>
        <span><MessageCircle size={13} /> Comment</span>
        <span><Share2 size={13} /> Share</span>
      </div>
    </div>
  );
}

export default function FacebookShareModal({ announcement, onClose, onPublished }) {
  const titleId = useId();
  const navigate = useNavigate();
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingDraft, setSendingDraft] = useState(false);
  const [composerHint, setComposerHint] = useState(null);
  const [draftWarning, setDraftWarning] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [fbStatus, setFbStatus] = useState(null);
  const [renderedMedia, setRenderedMedia] = useState(null);
  const renderedMediaRef = useRef(null);

  useEffect(() => {
    if (!announcement) return;
    setCaption(buildDefaultFbCaption(announcement));
    setError('');
    setDraftWarning('');
    setComposerHint(null);
    setResult(null);
    setRenderedMedia(null);
    renderedMediaRef.current = null;
    const collegeParam =
      !announcement.target_college || announcement.target_college === 'Campus-Wide'
        ? 'ALL'
        : announcement.target_college;
    api.get(`/announcements/facebook/status?college=${encodeURIComponent(collegeParam)}`)
      .then((res) => setFbStatus(res))
      .catch(() => setFbStatus({ connected: false, mode: 'demo' }));

    let cancelled = false;
    getAnnouncementImageBlob(announcement)
      .then((media) => {
        if (!cancelled && media) {
          renderedMediaRef.current = media;
          setRenderedMedia(media);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [announcement]);

  useEffect(() => {
    if (!announcement) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [announcement, onClose]);

  if (!announcement) return null;

  const composerUrl = `https://business.facebook.com/latest/composer${fbStatus?.pageId ? `?asset_id=${encodeURIComponent(fbStatus.pageId)}` : ''}`;
  const draftsUrl = `https://business.facebook.com/latest/posts/draft_posts${fbStatus?.pageId ? `?asset_id=${encodeURIComponent(fbStatus.pageId)}` : ''}`;
  const hasUploadedPhotos =
    (Array.isArray(announcement.image_urls) && announcement.image_urls.length > 0) ||
    Boolean(announcement.image_url);

  const appendEventDetails = () => {
    const data = announcement.template_data || {};
    const lines = [];
    if (data.event_date) lines.push(`📅 Date: ${data.event_date}`);
    if (data.event_time) lines.push(`🕒 Time: ${data.event_time}${data.event_end_time ? ` – ${data.event_end_time}` : ''}`);
    if (data.venue) lines.push(`📍 Venue: ${data.venue}`);
    if (data.cta_text) lines.push(`👉 ${data.cta_text}${data.cta_link ? ` (${data.cta_link})` : ''}`);
    if (lines.length === 0) return;
    setCaption((prev) => `${prev.trim()}\n\n${lines.join('\n')}`);
  };

  const ensureRenderedMedia = async () => {
    if (renderedMediaRef.current) return renderedMediaRef.current;
    const media = await getAnnouncementImageBlob(announcement);
    if (media) {
      renderedMediaRef.current = media;
      setRenderedMedia(media);
    }
    return media;
  };

  const getDownloadFilename = () => {
    const slug = String(announcement.title || `announcement-${announcement.id || 'graphic'}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `announcement-${announcement.id || 'graphic'}`;
    return `${slug}.png`;
  };

  const handleDownloadPng = async () => {
    try {
      setError('');
      const media = await ensureRenderedMedia();
      if (!media?.dataUrl) {
        setError('Could not generate announcement PNG for download.');
        return;
      }
      const link = document.createElement('a');
      link.href = media.dataUrl;
      link.download = getDownloadFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err.message || 'Could not download announcement PNG.');
    }
  };

  const handleSendDraft = async () => {
    if (!caption.trim() && !hasUploadedPhotos) {
      setError('Facebook caption cannot be empty.');
      return;
    }
    try {
      setSendingDraft(true);
      setError('');
      setDraftWarning('');
      setComposerHint(null);
      const media = await ensureRenderedMedia();
      await api.post(`/announcements/${announcement.id}/facebook`, {
        custom_message: caption.trim(),
        published: false,
        visibility: 'draft',
        include_media: true,
        generated_image_base64: hasUploadedPhotos ? null : media?.dataUrl || null,
      });
      setComposerHint({
        text: 'Draft with attached image saved to your Facebook Page Drafts.',
        url: draftsUrl,
      });
    } catch (err) {
      const reason = err?.message || 'Graph API draft creation failed.';
      setDraftWarning(
        `Could not send draft to Facebook Page (${reason}). Use Download PNG to upload manually.`
      );
    } finally {
      setSendingDraft(false);
    }
  };

  const handleConfirmShare = async () => {
    if (!caption.trim() && !hasUploadedPhotos) {
      setError('Facebook caption cannot be empty.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      let generatedImageBase64 = null;
      if (!hasUploadedPhotos) {
        const rendered = await renderAnnouncementToPng(announcement);
        generatedImageBase64 = rendered?.dataUrl || null;
      }
      const res = await api.post(`/announcements/${announcement.id}/facebook`, {
        custom_message: caption.trim(),
        published: true,
        visibility: 'public',
        include_media: true,
        generated_image_base64: generatedImageBase64,
      });
      setResult(res);
      onPublished?.(announcement.id, res);
      if (!res?.simulated && res?.fb_post_url) {
        window.open(res.fb_post_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err.message || 'Failed to publish to Facebook Page.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="user-modal-wash" onClick={onClose}>
      <div
        className="sketch-box facebook-modal facebook-modal-wide fb-composer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="fb-page-avatar" aria-hidden="true">
              <Facebook size={20} />
            </div>
            <div>
              <div className="eyebrow">
                SOCIAL BROADCAST • {fbStatus?.connected ? `CONNECTED (${fbStatus.pageName})` : 'LOCAL DEMO MODE'}
              </div>
              <h2 id={titleId}>Preview &amp; Share to Facebook</h2>
            </div>
          </div>
          <button type="button" className="text-action" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="fb-composer-layout" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FacebookFeedPreview
              announcement={announcement}
              caption={caption}
              pageName={fbStatus?.pageName}
              includeMedia
            />
          </div>

          <div className="fb-editor-card">
            <div className="scheduler-row-head">
              <span className="field-caption" style={{ margin: 0 }}>EDIT FACEBOOK CAPTION</span>
              <div className="scheduler-quick-links">
                {(announcement.template_data?.event_date || announcement.template_data?.venue) && (
                  <button type="button" className="text-action" onClick={appendEventDetails}>
                    <Sparkles size={12} /> + Event Info
                  </button>
                )}
                <button
                  type="button"
                  className="text-action"
                  onClick={() => setCaption(buildDefaultFbCaption(announcement))}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
            </div>

            <textarea
              className="field fb-caption-textarea"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={8}
              placeholder="Write the Facebook post caption (optional for image-only posts)..."
            />
            <div className="scheduler-row-head" style={{ marginTop: 4, justifyContent: 'flex-end' }}>
              <span className="fb-char-count">{caption.length} characters</span>
            </div>

            {announcement.fb_post_id && !result && (
              <div className="scoping-hint" role="alert" style={{ marginTop: 8 }}>
                <strong>Already posted — confirm re-post:</strong>{' '}
                This announcement was already shared to Facebook. Confirming will publish it again.
              </div>
            )}

            {!fbStatus?.connected && (
              <div className="fb-settings-note">
                Running in Demo Mode. Configure your Page credentials in{' '}
                <Link to="/settings" onClick={onClose}>Settings</Link>.
              </div>
            )}

            {composerHint && (
              <div className="scoping-hint" role="status" style={{ marginTop: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{composerHint.text}</span>
                {composerHint.url && (
                  <a
                    href={composerHint.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 8 }}
                  >
                    Open Meta <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                  </a>
                )}
              </div>
            )}

            {draftWarning && (
              <div className="pairing-error" role="alert" style={{ marginTop: 8 }}>
                {draftWarning}
              </div>
            )}

            {error && (
              <div className="pairing-error" role="alert" style={{ marginTop: 8 }}>
                {error}
              </div>
            )}

            {result && (
              <div className="fb-success-toast" role="status">
                <CheckCircle2 size={18} />
                <div style={{ flex: 1 }}>
                  <strong>
                    {result.simulated
                      ? 'Facebook Share Recorded (Local Demo Mode)'
                      : 'Published to Facebook Page'}
                  </strong>
                  <a
                    href={result.fb_post_url || composerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Post on Facebook <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="wizard-nav-footer" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="wire-button" onClick={onClose}>
              {result ? 'Done' : 'Cancel'}
            </button>
            {!result && (
              <button
                type="button"
                className="wire-button"
                disabled={submitting || sendingDraft}
                onClick={handleDownloadPng}
                title={renderedMedia ? 'Download announcement graphic as PNG' : 'Preparing graphic...'}
              >
                <Download size={14} /> Download PNG
              </button>
            )}
          </div>
          {!result && (
            <div className="wizard-nav-right" style={{ gap: 10 }}>
              {fbStatus?.connected && (
                <button
                  type="button"
                  className="wire-button"
                  disabled={sendingDraft || submitting}
                  onClick={handleSendDraft}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
                  </svg>{' '}
                  {sendingDraft ? 'Sending Draft...' : 'Send Draft to Meta'}
                </button>
              )}
              {fbStatus === null ? (
                <button type="button" className="wire-button dark" disabled>
                  <Facebook size={14} /> Checking FB...
                </button>
              ) : !fbStatus.connected ? (
                <button
                  type="button"
                  className="wire-button dark"
                  onClick={() => {
                    onClose();
                    navigate('/settings');
                  }}
                >
                  <Facebook size={14} /> Connect FB in Settings →
                </button>
              ) : (
                <button
                  type="button"
                  className="wire-button dark"
                  disabled={submitting || sendingDraft}
                  onClick={handleConfirmShare}
                >
                  <Facebook size={14} />{' '}
                  {submitting ? 'Sharing...' : (announcement.fb_post_id ? 'Confirm Re-post to FB' : 'Confirm & Post to FB')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
