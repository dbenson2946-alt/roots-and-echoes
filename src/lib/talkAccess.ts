import "server-only";
import { getConversationSettings, getGrant } from "./store";
import type { ConversationSettings } from "./conversation";

/**
 * Who may use Let's Talk: the senior, or a caregiver with "can add" access
 * sitting beside them (a view-only helper can't take part), and only while the
 * account owner has it switched on.
 *
 * `canAsk` is true for a helper with "can add" access: they can send the
 * senior a Family Question (the senior can't send one to themselves).
 */
export async function getTalkAccess(session: {
  isSelf: boolean;
  profile: { id: string };
  activeSeniorId?: string | null;
}): Promise<{ canTalk: boolean; canAsk: boolean; settings: ConversationSettings }> {
  const seniorId = session.activeSeniorId!;
  const [settings, grant] = await Promise.all([
    getConversationSettings(seniorId),
    session.isSelf ? Promise.resolve(undefined) : getGrant(session.profile.id, seniorId),
  ]);
  const mayParticipate = session.isSelf || grant?.permission === "contribute";
  const canTalk = mayParticipate && settings.talkEnabled;
  return { canTalk, canAsk: canTalk && !session.isSelf, settings };
}
