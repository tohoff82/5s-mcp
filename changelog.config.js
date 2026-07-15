export default Object.freeze({
  baseDir: process.env.CHANGELOG_BASE_DIR || 'docs/changes/5s-procedures',
  autoSync: false,
  mongodb: Object.freeze({
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || '5s_procedure_changelog'
  })
});
