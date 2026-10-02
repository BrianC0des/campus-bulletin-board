import { supabase } from '../config/supabase.js';

/**
 * Database stored procedure wrapper helpers
 */
export async function pairNewDisplay(codeHmac, name, location, credentialHash) {
  return await supabase.rpc('pair_new_display', {
    p_code_hmac: codeHmac,
    p_name: name,
    p_location: location,
    p_credential_hash: credentialHash,
  });
}

export async function reregisterDisplay(codeHmac, displayId, credentialHash) {
  return await supabase.rpc('reregister_existing_display', {
    p_code_hmac: codeHmac,
    p_display_id: displayId,
    p_credential_hash: credentialHash,
  });
}

export async function unregisterDisplay(displayId, reason) {
  return await supabase.rpc('unregister_display', {
    p_display_id: displayId,
    p_reason: reason,
  });
}

export async function saveAnnouncementWithDisplays(announcementData, displayIds, actorId) {
  return await supabase.rpc('save_announcement_with_displays', {
    p_id: announcementData.id || null,
    p_title: announcementData.title,
    p_body: announcementData.body,
    p_image_object_key: announcementData.imageObjectKey || null,
    p_image_mime_type: announcementData.imageMimeType || null,
    p_image_version: announcementData.imageVersion || 1,
    p_starts_at: announcementData.startsAt,
    p_ends_at: announcementData.endsAt,
    p_actor_id: actorId,
    p_display_ids: displayIds,
  });
}
