import "server-only";
import { getConversationSettings, getGrant } from "./store";
import type { ConversationSettings } from "./conversation";

/**
 * Who may use Let's Talk: the senior, or a caregiver with "can add" access
 * sitting beside them (a view-only helper can't take part), and only while the
 * account owner has it switched on.
 */
export async function getTalkAccess(session: {
  isSelf: boolean;
  profile: { id: string };
  activeSeniorId?: string | null;
}): Promise<{ canTalk: boolean; settings: ConversationSettings }> {
  const seniorId = session.activeSeniorId!;
  const [settings, grant] = await Promise.all([
    getConversationSettings(seniorId),
    session.isSelf ? Promise.resolve(undefined) : getGrant(session.profile.id, seniorId),
  ]);
  const mayParticipate = session.isSelf || grant?.permission === "contribute";
  return { canTalk: mayParticipate && settings.talkEnabled, settings };
}
