--- a/src/changelog/mongodb-connector.js
+++ b/src/changelog/mongodb-connector.js
@@ -10,7 +10,7 @@ class FiveSChangelogMongo {
   constructor(config = {}) {
     this.config = {
       uri: config.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017',
-      database: config.database || process.env.MONGODB_DATABASE || 'ui_agent_changelog',
+      database: config.database || process.env.MONGODB_DATABASE || '5s_procedure_changelog',
       collections: {
         main: 'fiveS_changelog',
         archive: 'fiveS_changelog_archive',