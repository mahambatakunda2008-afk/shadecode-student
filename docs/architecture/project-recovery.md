# Project Studio recovery policy

Project Studio must protect learners from accidental deletion, bad edits, failed synchronization and device/network interruptions.

## Recovery model

- Keep up to 20 recent local snapshots per project.
- Create snapshots on important saves and before destructive actions.
- A deleted project gets a final `delete` snapshot before local removal.
- Recovery is local-first and does not require the network.
- Restoring a snapshot creates a normal new project mutation, so the recovered state can later synchronize to the cloud.

## UX requirements

The production UI should expose `Project history` / `Recover` rather than hiding recovery behind developer tools. Show timestamp, stage and reason for each snapshot. Require confirmation before replacing the current project with a snapshot.

## Safety

Recovery must never silently overwrite the current state. Prefer restoring as a new revision first, with an explicit `Restore this version` confirmation. Keep recovery snapshots separate from normal project records so a corrupted current record does not destroy the recovery history.
