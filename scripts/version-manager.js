#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Version management script for TiNHiH Portal
class VersionManager {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.clientEnvPath = path.join(this.rootDir, 'client', '.env');
    this.serverEnvPath = path.join(this.rootDir, '.env');
  }

  // Read .env file and return key-value pairs
  readEnvFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const envVars = {};
      
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            envVars[key] = valueParts.join('=');
          }
        }
      });
      
      return envVars;
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error.message);
      return {};
    }
  }

  // Write .env file from key-value pairs
  writeEnvFile(filePath, envVars) {
    try {
      const lines = [];
      
      // Add existing content first
      const existingContent = fs.readFileSync(filePath, 'utf8');
      const existingLines = existingContent.split('\n');
      
      existingLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key] = trimmed.split('=');
          if (key && envVars[key] !== undefined) {
            // Update existing key
            lines.push(`${key}=${envVars[key]}`);
            delete envVars[key]; // Mark as processed
    } else {
            // Keep unchanged line
            lines.push(line);
    }
    } else {
          // Keep comments and empty lines
          lines.push(line);
        }
      });
      
      // Add new keys
      Object.entries(envVars).forEach(([key, value]) => {
        lines.push(`${key}=${value}`);
      });
      
      fs.writeFileSync(filePath, lines.join('\n'));
      return true;
    } catch (error) {
      console.error(`Error writing ${filePath}:`, error.message);
      return false;
    }
  }

  // Update version in both client and server .env files
  updateVersion(newVersion) {
    console.log(`🔄 Updating version to: ${newVersion}`);
    
    // Update client .env
    const clientEnv = this.readEnvFile(this.clientEnvPath);
    clientEnv.VITE_APP_VERSION = newVersion;
    
    if (this.writeEnvFile(this.clientEnvPath, clientEnv)) {
      console.log(`✅ Updated client/.env: VITE_APP_VERSION=${newVersion}`);
    } else {
      console.error(`❌ Failed to update client/.env`);
    }
    
    // Update server .env
    const serverEnv = this.readEnvFile(this.serverEnvPath);
    serverEnv.APP_VERSION = newVersion;
    serverEnv.LATEST_VERSION = newVersion;
    
    if (this.writeEnvFile(this.serverEnvPath, serverEnv)) {
      console.log(`✅ Updated .env: APP_VERSION=${newVersion}, LATEST_VERSION=${newVersion}`);
    } else {
      console.error(`❌ Failed to update .env`);
    }
    
    console.log(`\n🎉 Version update complete!`);
    console.log(`📱 Client version: ${newVersion}`);
    console.log(`🖥️  Server version: ${newVersion}`);
    console.log(`\n💡 To apply changes:`);
    console.log(`   1. Restart your development server`);
    console.log(`   2. Users will see the update notification`);
    console.log(`   3. Updates will preserve user authentication`);
  }

  // Show current versions
  showCurrentVersions() {
    console.log(`📋 Current Version Information:\n`);
    
    const clientEnv = this.readEnvFile(this.clientEnvPath);
    const serverEnv = this.readEnvFile(this.serverEnvPath);
    
    console.log(`Client (.env):`);
    console.log(`  VITE_APP_VERSION: ${clientEnv.VITE_APP_VERSION || 'Not set'}`);
    console.log(`\nServer (.env):`);
    console.log(`  APP_VERSION: ${serverEnv.APP_VERSION || 'Not set'}`);
    console.log(`  LATEST_VERSION: ${serverEnv.LATEST_VERSION || 'Not set'}`);
    
    const clientVersion = clientEnv.VITE_APP_VERSION;
    const serverVersion = serverEnv.APP_VERSION;
    const latestVersion = serverEnv.LATEST_VERSION;
    
    if (clientVersion && serverVersion && latestVersion) {
      if (clientVersion === serverVersion && serverVersion === latestVersion) {
        console.log(`\n✅ All versions are in sync!`);
      } else {
        console.log(`\n⚠️  Version mismatch detected!`);
        if (clientVersion !== serverVersion) {
          console.log(`   Client vs Server: ${clientVersion} ≠ ${serverVersion}`);
        }
        if (serverVersion !== latestVersion) {
          console.log(`   Server vs Latest: ${serverVersion} ≠ ${latestVersion}`);
        }
      }
    }
  }

  // Help information
  showHelp() {
    console.log(`🚀 TiNHiH Portal Version Manager\n`);
    console.log(`Usage:`);
    console.log(`  node scripts/version-manager.js [command] [version]\n`);
    console.log(`Commands:`);
    console.log(`  show                    Show current versions`);
    console.log(`  update <version>        Update to specific version (e.g., 1.0.1)`);
    console.log(`  help                    Show this help message\n`);
    console.log(`Examples:`);
    console.log(`  node scripts/version-manager.js show`);
    console.log(`  node scripts/version-manager.js update 1.0.1\n`);
    console.log(`Features:`);
    console.log(`  • Updates both client and server .env files`);
    console.log(`  • Preserves existing .env file structure`);
    console.log(`  • Maintains version synchronization`);
    console.log(`  • User authentication preserved during updates`);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const manager = new VersionManager();

  if (args.length === 0 || args[0] === 'help') {
    manager.showHelp();
  } else if (args[0] === 'show') {
    manager.showCurrentVersions();
  } else if (args[0] === 'update' && args[1]) {
    manager.updateVersion(args[1]);
  } else {
    console.error(`❌ Invalid command. Use 'help' for usage information.`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default VersionManager;
