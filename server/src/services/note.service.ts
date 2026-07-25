/**
 * Note business rules: adding a note to a lead also writes a NOTE_ADDED
 * activity, and re-uses leadService's existing visibility check so a
 * member can only note leads assigned to them - the same rule that already
 * governs reading/updating a lead (see lead.service.ts's getLeadById).
 */
import { Role } from "@prisma/client";
import { createActivity } from "../repositories/activity.repository";
import { createNote as createNoteRecord } from "../repositories/note.repository";
import { CreateNoteInput } from "../validators/note.schema";
import { getLeadById } from "./lead.service";

interface RequestingUser {
  id: string;
  role: Role;
}

export async function createNote(requestingUser: RequestingUser, input: CreateNoteInput) {
  // Throws 404 if the lead doesn't exist or isn't visible to this user.
  await getLeadById(requestingUser, input.leadId);

  const note = await createNoteRecord({
    leadId: input.leadId,
    authorId: requestingUser.id,
    body: input.body,
  });

  await createActivity({
    leadId: input.leadId,
    actorId: requestingUser.id,
    type: "NOTE_ADDED",
    message: "Note added",
  });

  return note;
}
