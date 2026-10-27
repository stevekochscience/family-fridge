// Offline transformation only: does not authenticate, contact Firebase, or overwrite input.
const fs = require('node:fs');
const people = ['sam', 'grace', 'lisa', 'steve', 'marshall'];
const emojis = ['heart', 'laugh', 'like', 'wow', 'hug', 'paw'];
const legacyId = '-'.repeat(20);
function migrate(source) {
  if (source?.boards || source?.historyMigration) throw Error('History already exists; refusing to replace it.');
  const boards = {};
  for (const person of people) {
    const note = source?.messages?.[person]; if (!note) continue;
    if (typeof note.text !== 'string' || note.text.length > 280 || !Number.isFinite(note.updatedAt)) throw Error('Invalid legacy note; inspect privately before migration.');
    const reactions = {};
    for (const reactor of people) {
      const reaction = source?.reactions?.[person]?.[reactor];
      if (reaction?.noteUpdatedAt === note.updatedAt && emojis.includes(reaction.emoji)) reactions[reactor] = reaction.emoji;
    }
    boards[person] = { [legacyId]: { text: note.text, updatedAt: note.updatedAt, ...(Object.keys(reactions).length ? { reactions } : {}) } };
  }
  return { boards, historyMigration: { version: 1, completedAt: Date.now() } };
}
module.exports = { migrate, legacyId };
if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw Error('Usage: node migrate-history.cjs private-snapshot.json private-update.json');
  const result = migrate(JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '')));
  fs.writeFileSync(output, JSON.stringify(result), { flag: 'wx' });
  console.log(`Prepared ${Object.keys(result.boards).length} note stacks; legacy data remains untouched.`);
}
