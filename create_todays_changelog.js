#!/usr/bin/env node

process.stderr.write(
  'create_todays_changelog.js is deprecated because it embedded unverifiable host claims.\n'
  + 'Use: node src/changelog/cli.js create --template seiri|seiso\n'
  + 'Then record actual plan, approval, backup, result, and verification evidence.\n'
);
process.exitCode = 2;
