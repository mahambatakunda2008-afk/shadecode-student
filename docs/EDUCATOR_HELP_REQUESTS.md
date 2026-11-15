# Educator help requests and conversations

## Purpose

Students can contact approved independent educators from the student-facing educator directory. The initial request includes a subject, level, optional topic and a message describing the learning need. The educator can accept or decline, reply, and mark accepted support complete. Students can reply and close their own request.

## Routes

- Student directory: `/learn/educators`
- Student conversations: `/learn/educator-requests`
- Educator inbox: `/teacher/requests`
- API: `/api/educator-requests`

## Authorization

- A request can only be created for an approved educator who lists the selected subject and, when supplied, the selected level.
- A student cannot request help from their own account.
- Only the student and named educator can read the request and its messages.
- Message insertion and status changes are performed through authenticated, SECURITY DEFINER RPCs. Direct client writes are not granted.
- Educators must remain approved or retain an active teaching capability to reply or decide.
- Educators can accept or decline pending requests, then mark accepted requests complete.
- Students can close their own active requests.
- Declined, completed and closed conversations cannot receive further replies.

## Privacy and current limitations

- Public directory data contains only approved educator profile fields.
- The inbox does not expose student email addresses or private contact details.
- Keep personal phone numbers, addresses and other sensitive details out of messages.
- This is asynchronous in-app messaging, not live chat, tutoring booking, payment processing, or a guarantee of response time.
- Attachments, availability calendars, scheduling, notifications, reporting/blocking, moderation tooling and read receipts are not included in this first slice.
- No hosted migration, production data change, merge or deployment was performed by this work.
